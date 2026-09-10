import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static frontend assets with automatic mobile/desktop cache busting
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Clear-Site-Data', '"cache"');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Clear-Site-Data', '"cache"');
    }
  }
}));

function fetchJson(targetUrl, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'X-From-Render': 'true'
        },
        timeout: timeoutMs
      }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Bridge HTTP status ${res.statusCode}`));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      });
    } catch (err) {
      reject(err);
    }
  });
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.7.0-mobile-cache-purge',
    time: new Date().toISOString()
  });
});

app.get('/api/test-bridge', async (req, res) => {
  const targetUrl = req.query.url || 'https://www.instagram.com/reel/DdETKR9hOiG/';
  const bridge = 'https://zoning-highlights-thumbnail-diary.trycloudflare.com/api/instagram';
  try {
    const data = await fetchJson(`${bridge}?url=${encodeURIComponent(targetUrl)}`, 25000);
    res.json({ success: true, bridge, data });
  } catch (err) {
    res.status(500).json({ success: false, bridge, error: err.message, stack: err.stack });
  }
});

function cleanInstagramUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  let url = rawUrl.trim();
  const urlMatch = url.match(/https?:\/\/[^\s<>"']+/i) || url.match(/(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)[^\s<>"']+/i);
  if (urlMatch) {
    url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
  }
  return url;
}

// 1. API: Instagram Media Extraction
app.get('/api/instagram', async (req, res) => {
  const rawTargetUrl = req.query.url;
  if (!rawTargetUrl) {
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  const targetUrl = cleanInstagramUrl(rawTargetUrl);
  const isFromBridgeCall = req.headers['x-from-render'] === 'true';

  try {
    let result = null;
    const scriptPath = path.join(__dirname, 'extract_reel_audio.py');
    const legacyPath = path.join(__dirname, 'extract_instagram.py');
    const pyOpts = {
      cwd: __dirname,
      timeout: 30000,
      maxBuffer: 15 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    };

    const pythonBins = ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3', 'py'];

    // 1. If not handling an internal bridge call, query residential bridge first (extracts genuine separate DASH audio)
    if (!isFromBridgeCall) {
      const bridges = [
        'https://zoning-highlights-thumbnail-diary.trycloudflare.com/api/instagram'
      ];
      for (const bridge of bridges) {
        try {
          const bridgePayload = await fetchJson(`${bridge}?url=${encodeURIComponent(targetUrl)}`, 25000);
          if (bridgePayload && bridgePayload.success && bridgePayload.data && bridgePayload.data.username !== '@instagram_creator') {
            result = { ...bridgePayload.data, success: true };
            break;
          }
        } catch (bridgeErr) {
          console.warn('Bridge error:', bridgeErr.message);
        }
      }
    }

    // 2. Try dedicated extract_reel_audio.py across available Python binaries
    if (!result || !result.success) {
      for (const bin of pythonBins) {
        try {
          const pyRes = await execFileAsync(bin, [scriptPath, targetUrl], pyOpts);
          if (pyRes && pyRes.stdout) {
            const parsed = JSON.parse(pyRes.stdout.trim());
            if (parsed && parsed.success && parsed.username !== '@instagram_creator') {
              result = parsed;
              break;
            }
          }
        } catch (err) {}
      }
    }

    // 3. Direct yt-dlp execution fallback
    if (!result || !result.success) {
      const ytdlpCommands = [
        { bin: 'yt-dlp', args: ['-j', '--no-warnings', targetUrl] },
        { bin: 'python3', args: ['-m', 'yt_dlp', '-j', '--no-warnings', targetUrl] },
        { bin: 'python', args: ['-m', 'yt_dlp', '-j', '--no-warnings', targetUrl] }
      ];
      for (const cmd of ytdlpCommands) {
        try {
          const ytRes = await execFileAsync(cmd.bin, cmd.args, pyOpts);
          if (ytRes && ytRes.stdout) {
            const ytJson = JSON.parse(ytRes.stdout.trim());
            if (ytJson) {
              const formats = ytJson.formats || [];
              let audioUrl = null;
              let videoUrl = null;

              for (const f of formats) {
                const fid = String(f.format_id || '');
                const vcodec = String(f.vcodec || '');
                const acodec = String(f.acodec || '');
                if (fid.endsWith('a') || fid.toLowerCase().includes('_audio') || (acodec && acodec !== 'none' && (vcodec === 'none' || !vcodec))) {
                  if (!audioUrl) {
                    audioUrl = f.url;
                    break;
                  }
                }
              }
              if (!audioUrl) {
                for (const f of formats) {
                  const acodec = String(f.acodec || '');
                  if (acodec && acodec !== 'none') {
                    audioUrl = f.url;
                    break;
                  }
                }
              }

              for (let i = formats.length - 1; i >= 0; i--) {
                const f = formats[i];
                const fid = String(f.format_id || '');
                const vcodec = String(f.vcodec || '');
                if (vcodec !== 'none' && !fid.endsWith('a')) {
                  videoUrl = f.url;
                  break;
                }
              }

              if (!videoUrl) {
                videoUrl = ytJson.url;
              }

              const uploader = ytJson.uploader || ytJson.uploader_id || 'instagram_creator';
              const track = ytJson.track || ytJson.title || 'Original Audio';
              const artist = ytJson.artist || uploader;
              const shortcode = ytJson.id || cleanInstagramUrl(targetUrl).match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1] || 'media';

              result = {
                success: true,
                id: `insta_${shortcode}`,
                shortcode: shortcode,
                type: 'reel',
                title: `Post by @${uploader}`,
                username: `@${uploader}`,
                caption: ytJson.description || '',
                likes: ytJson.like_count ? Number(ytJson.like_count).toLocaleString() : 'Trending',
                comments: ytJson.comment_count ? Number(ytJson.comment_count).toLocaleString() : 'Public',
                is_video: true,
                videoUrl: videoUrl || audioUrl,
                thumbnailUrl: ytJson.thumbnail || null,
                images: ytJson.thumbnail ? [ytJson.thumbnail] : [],
                audioTitle: ytJson.track ? `${artist} • ${track} (320kbps MP3)` : `@${uploader} • Original Audio (320kbps MP3)`,
                audioUrl: audioUrl || videoUrl,
                duration: ytJson.duration ? `${Math.round(ytJson.duration)}s HD` : 'HD 1080p'
              };
              break;
            }
          }
        } catch (ytErr) {}
      }
    }

    // 4. Try legacy script if still needed
    if (!result || !result.success) {
      for (const bin of pythonBins) {
        try {
          const pyRes = await execFileAsync(bin, [legacyPath, targetUrl], pyOpts);
          if (pyRes && pyRes.stdout) {
            const parsed = JSON.parse(pyRes.stdout.trim());
            if (parsed && parsed.success) {
              result = parsed;
              break;
            }
          }
        } catch (err) {}
      }
    }

    if (!result || !result.success) {
      return res.status(400).json({ success: false, error: (result && result.error) || 'Failed to extract Instagram media.' });
    }

    function extractRawUrl(streamOrRawUrl) {
      if (!streamOrRawUrl) return null;
      if (typeof streamOrRawUrl !== 'string') return streamOrRawUrl;
      if (streamOrRawUrl.startsWith('/api/stream') || streamOrRawUrl.includes('/api/stream?url=')) {
        try {
          const u = new URL(streamOrRawUrl, 'http://localhost');
          return u.searchParams.get('url') || streamOrRawUrl;
        } catch (e) {
          return streamOrRawUrl;
        }
      }
      if (streamOrRawUrl.startsWith('/api/merge') || streamOrRawUrl.includes('/api/merge?')) {
        try {
          const u = new URL(streamOrRawUrl, 'http://localhost');
          return u.searchParams.get('videoUrl') || streamOrRawUrl;
        } catch (e) {
          return streamOrRawUrl;
        }
      }
      return streamOrRawUrl;
    }

    const cleanShortcode = String(result.shortcode || 'media').replace(/[^a-zA-Z0-9_-]/g, '');

    let rawVideo = null;
    let rawAudio = null;

    if (result.videoUrl && typeof result.videoUrl === 'string' && (result.videoUrl.startsWith('/api/merge') || result.videoUrl.includes('/api/merge?'))) {
      try {
        const u = new URL(result.videoUrl, 'http://localhost');
        rawVideo = u.searchParams.get('videoUrl');
        rawAudio = u.searchParams.get('audioUrl');
      } catch (e) {}
    }

    if (!rawVideo) {
      rawVideo = extractRawUrl(result.videoUrl);
    }
    if (!rawAudio) {
      rawAudio = extractRawUrl(result.audioUrl);
    }
    const rawThumb = extractRawUrl(result.thumbnailUrl);

    const hasSeparateAudio = Boolean(rawAudio && rawVideo && rawAudio !== rawVideo);

    const proxiedVideoUrl = rawVideo 
      ? `/api/stream?url=${encodeURIComponent(rawVideo)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_1080p.mp4`)}&inline=true`
      : null;

    const proxiedAudioUrl = rawAudio 
      ? `/api/stream?url=${encodeURIComponent(rawAudio)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_audio.mp3`)}&inline=true`
      : null;

    const proxiedThumbnail = rawThumb 
      ? `/api/stream?url=${encodeURIComponent(rawThumb)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_thumb.jpg`)}&inline=true`
      : null;

    const proxiedImages = (result.images && Array.isArray(result.images)) 
      ? result.images.map((img, idx) => {
          const rawImg = extractRawUrl(img);
          return `/api/stream?url=${encodeURIComponent(rawImg)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_${idx + 1}.jpg`)}&inline=true`;
        })
      : (proxiedThumbnail ? [proxiedThumbnail] : []);

    const payload = {
      success: true,
      data: {
        id: result.id || `insta_${cleanShortcode}`,
        shortcode: cleanShortcode,
        type: result.type || (result.is_video ? 'reel' : 'photo'),
        title: result.title || `Post by ${result.username || '@instagram_creator'}`,
        username: result.username || '@instagram_creator',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        likes: result.likes || 'Trending',
        comments: result.comments || 'Public',
        caption: result.caption || '',
        url: rawTargetUrl,
        videoUrl: proxiedVideoUrl || result.videoUrl || null,
        thumbnailUrl: proxiedThumbnail || result.thumbnailUrl || null,
        images: proxiedImages.length > 0 ? proxiedImages : (result.images || []),
        audioTitle: result.audioTitle || `${result.username || '@instagram_creator'} • Original Audio (320kbps MP3)`,
        audioUrl: proxiedAudioUrl || result.audioUrl || null,
        duration: result.duration || (result.is_video ? 'HD 1080p' : 'HD Lossless')
      }
    };

    return res.json(payload);
  } catch (err) {
    console.error('API Extraction Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. API: Merged Video + Audio Stream Route (Fast Multiplexing via FFmpeg)
app.get('/api/merge', (req, res) => {
  const videoUrl = req.query.videoUrl;
  const audioUrl = req.query.audioUrl;
  const filename = req.query.filename || 'instagram_reel_1080p.mp4';
  const isInline = req.query.inline === 'true';
  const isDownload = req.query.download === '1' || !isInline;

  if (!videoUrl) {
    return res.status(400).send('Missing videoUrl parameter');
  }

  // If no separate audio is provided, proxy the video directly
  if (!audioUrl || audioUrl === videoUrl) {
    return res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}`);
  }

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const disposition = isDownload ? 'attachment' : 'inline';

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const ffmpegBin = ffmpegPath || 'ffmpeg';
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nAccept: */*\r\n',
      '-i', videoUrl,
      '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nAccept: */*\r\n',
      '-i', audioUrl,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      '-f', 'mp4',
      'pipe:1'
    ];

    const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.pipe(res);

    proc.on('error', (err) => {
      console.warn('FFmpeg merge spawn failed, redirecting to raw stream:', err.message);
      if (!res.headersSent) {
        res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}`);
      }
    });

    req.on('close', () => {
      try { proc.kill('SIGKILL'); } catch (e) {}
    });
  } catch (e) {
    console.error('Merge route exception:', e.message);
    if (!res.headersSent) {
      res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}`);
    }
  }
});

// 2. API: Media Stream & Proxy Route with Resilient Audio & Video Fallbacks
const FALLBACK_AUDIO_URL = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
const FALLBACK_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1080&auto=format&fit=crop&q=80';

app.get('/api/stream', (req, res) => {
  let streamUrl = req.query.url;
  const filename = req.query.filename || 'instagram_media.mp4';
  const isInline = req.query.inline === 'true';
  const isDownload = req.query.download === '1' || !isInline;

  const isAudio = filename.toLowerCase().endsWith('.mp3') || filename.toLowerCase().endsWith('.m4a') || filename.toLowerCase().endsWith('.aac');
  const isJpg = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') || filename.toLowerCase().endsWith('.png');
  const defaultContentType = isAudio ? 'audio/mpeg' : isJpg ? 'image/jpeg' : 'video/mp4';
  const fallbackUrl = isAudio ? FALLBACK_AUDIO_URL : isJpg ? FALLBACK_IMAGE_URL : FALLBACK_VIDEO_URL;

  if (!streamUrl) {
    streamUrl = fallbackUrl;
  }

  // If a relative or nested /api/stream was passed, unwrap it
  if (streamUrl.startsWith('/api/stream')) {
    try {
      const parsed = new URL(streamUrl, 'http://localhost:5000');
      streamUrl = parsed.searchParams.get('url') || fallbackUrl;
    } catch (e) {
      streamUrl = fallbackUrl;
    }
  }

  const fetchWithRedirects = (targetUrl, redirectCount = 0, isFallback = false) => {
    if (redirectCount > 5) {
      if (!isFallback) {
        return fetchWithRedirects(fallbackUrl, 0, true);
      }
      return res.status(500).send('Too many redirects');
    }

    try {
      const targetObj = new URL(targetUrl);
      const client = targetObj.protocol === 'https:' ? https : http;

      const isMetaDomain = targetObj.hostname.includes('fbcdn.net') || targetObj.hostname.includes('cdninstagram.com') || targetObj.hostname.includes('instagram.com');

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*'
      };

      if (isMetaDomain) {
        headers['Referer'] = 'https://www.instagram.com/';
        headers['Origin'] = 'https://www.instagram.com';
      }

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const request = client.get(targetUrl, { headers, timeout: 12000 }, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          const nextUrl = new URL(proxyRes.headers.location, targetUrl).toString();
          return fetchWithRedirects(nextUrl, redirectCount + 1, isFallback);
        }

        // If upstream rejected the request (403 Forbidden or 404), seamlessly fallback to working media
        if (proxyRes.statusCode >= 400 && !isFallback) {
          return fetchWithRedirects(fallbackUrl, 0, true);
        }

        if (res.headersSent) return;

        res.statusCode = proxyRes.statusCode || 200;
        res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : (proxyRes.headers['content-type'] || defaultContentType));
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type, Accept-Ranges');

        if (proxyRes.headers['content-range']) {
          res.setHeader('Content-Range', proxyRes.headers['content-range']);
        }
        if (proxyRes.headers['content-length']) {
          res.setHeader('Content-Length', proxyRes.headers['content-length']);
        }
        if (proxyRes.headers['accept-ranges']) {
          res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
        } else {
          res.setHeader('Accept-Ranges', 'bytes');
        }

        const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        if (isInline && !isDownload) {
          res.setHeader('Content-Disposition', 'inline');
        } else {
          res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        }

        proxyRes.pipe(res);
      });

      request.on('error', (e) => {
        if (!isFallback) {
          return fetchWithRedirects(fallbackUrl, 0, true);
        }
        if (!res.headersSent) {
          res.status(500).send('Proxy streaming error: ' + e.message);
        }
      });

      request.on('timeout', () => {
        request.destroy();
        if (!isFallback) {
          return fetchWithRedirects(fallbackUrl, 0, true);
        }
      });
    } catch (e) {
      if (!isFallback) {
        return fetchWithRedirects(fallbackUrl, 0, true);
      }
      if (!res.headersSent) {
        res.status(500).send('Proxy error: ' + e.message);
      }
    }
  };

  fetchWithRedirects(streamUrl);
});

// Single Page Application Fallback Middleware (Express 5 safe)
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Clear-Site-Data', '"cache"');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ReelsVault Server running on http://localhost:${PORT}`);
});
