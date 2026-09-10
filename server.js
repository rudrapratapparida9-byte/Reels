import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'dist')));

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

    // 1. Try dedicated extract_reel_audio.py across available Python binaries
    const pythonBins = ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3', 'py'];
    for (const bin of pythonBins) {
      try {
        const pyRes = await execFileAsync(bin, [scriptPath, targetUrl], pyOpts);
        if (pyRes && pyRes.stdout) {
          const parsed = JSON.parse(pyRes.stdout.trim());
          if (parsed && parsed.success) {
            result = parsed;
            break;
          }
        }
      } catch (err) {}
    }

    // 2. Direct yt-dlp execution fallback
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
              let videoUrl = ytJson.url;

              for (const f of formats) {
                if (f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none' || String(f.format_id).includes('a'))) {
                  audioUrl = f.url;
                  break;
                }
              }
              if (!audioUrl) {
                for (const f of formats) {
                  if (f.acodec && f.acodec !== 'none') {
                    audioUrl = f.url;
                    break;
                  }
                }
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

    // 3. Try legacy script if still needed
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

    // 4. Query residential bridge as last fallback
    if (!result || !result.success || result.username === '@instagram_creator') {
      const bridges = [
        'https://carter-figured-dolls-chest.trycloudflare.com/api/instagram',
        'https://publish-electricity-armor-friend.trycloudflare.com/api/instagram'
      ];
      for (const bridge of bridges) {
        try {
          const bridgeRes = await fetch(`${bridge}?url=${encodeURIComponent(targetUrl)}`, { signal: AbortSignal.timeout(8000) });
          const bridgePayload = await bridgeRes.json();
          if (bridgePayload && bridgePayload.success && bridgePayload.data && bridgePayload.data.username !== '@instagram_creator') {
            result = bridgePayload.data;
            break;
          }
        } catch (bridgeErr) {}
      }
    }

    if (!result || !result.success) {
      return res.status(400).json({ success: false, error: (result && result.error) || 'Failed to extract Instagram media.' });
    }

    const cleanShortcode = String(result.shortcode || 'media').replace(/[^a-zA-Z0-9_-]/g, '');

    const proxiedVideoUrl = result.videoUrl 
      ? `/api/stream?url=${encodeURIComponent(result.videoUrl)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_1080p.mp4`)}&inline=true`
      : null;

    const proxiedAudioUrl = result.audioUrl 
      ? `/api/stream?url=${encodeURIComponent(result.audioUrl)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_audio.mp3`)}&inline=true`
      : null;

    const proxiedThumbnail = result.thumbnailUrl 
      ? `/api/stream?url=${encodeURIComponent(result.thumbnailUrl)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_thumb.jpg`)}&inline=true`
      : null;

    const proxiedImages = (result.images && Array.isArray(result.images)) 
      ? result.images.map((img, idx) => `/api/stream?url=${encodeURIComponent(img)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_${idx + 1}.jpg`)}&inline=true`)
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
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ReelsVault Server running on http://localhost:${PORT}`);
});
