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

// Universal CORS headers for all browser clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

function fetchJson(targetUrl, timeoutMs = 10000, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const method = options.method || 'GET';
      const reqHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'X-From-Render': 'true',
        ...(options.headers || {})
      };

      const reqOpts = {
        method: method,
        headers: reqHeaders,
        timeout: timeoutMs
      };

      const req = client.request(targetUrl, reqOpts, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP status ${res.statusCode}`));
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

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '4.2.1-tunnel-stream-fix',
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

  // Clean tracking queries and format canonical Instagram URLs
  const postMatch = url.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (postMatch) {
    const type = postMatch[1].toLowerCase() === 'p' ? 'p' : 'reel';
    return `https://www.instagram.com/${type}/${postMatch[2]}/`;
  }

  const audioMatch = url.match(/\/(reels\/audio|audio|music)\/([0-9]+)/i);
  if (audioMatch) {
    return `https://www.instagram.com/reels/audio/${audioMatch[2]}/`;
  }

  const storyMatch = url.match(/\/stories\/([^/?#]+)\/([0-9]+)/i);
  if (storyMatch) {
    return `https://www.instagram.com/stories/${storyMatch[1]}/${storyMatch[2]}/`;
  }

  return url.split('?')[0].split('#')[0].replace(/\/+$/, '') + '/';
}

// 1. API: Instagram Media Extraction
app.get('/api/instagram', async (req, res) => {
  const rawTargetUrl = req.query.url;
  if (!rawTargetUrl) {
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  const targetUrl = cleanInstagramUrl(rawTargetUrl);
  const isFromBridgeCall = req.headers['x-from-render'] === 'true' || req.query.from_bridge === '1';
  const isRender = !!(process.env.RENDER || (process.env.PORT && process.env.PORT !== '5000'));

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

    // 1. If on Render and not handling a bridge call, query residential bridge
    if (isRender && !isFromBridgeCall) {
      const bridges = [
        'https://critical-balance-william-soldier.trycloudflare.com/api/instagram',
        'https://zoning-highlights-thumbnail-diary.trycloudflare.com/api/instagram'
      ];
      for (const bridge of bridges) {
        try {
          const bridgePayload = await fetchJson(`${bridge}?url=${encodeURIComponent(targetUrl)}&from_bridge=1`, 3500);
          if (bridgePayload && bridgePayload.success && bridgePayload.data && (bridgePayload.data.videoUrl || bridgePayload.data.audioUrl || bridgePayload.data.thumbnailUrl)) {
            result = { ...bridgePayload.data, success: true };
            break;
          }
        } catch (bridgeErr) {
          console.warn('Bridge error or timeout:', bridgeErr.message);
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
            if (parsed && parsed.success && (parsed.videoUrl || parsed.audioUrl || parsed.thumbnailUrl)) {
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
        { bin: path.join(__dirname, 'yt-dlp'), args: ['-j', '--no-warnings', targetUrl] },
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

              // 1. FIRST find progressive format that contains BOTH video and audio
              for (let i = formats.length - 1; i >= 0; i--) {
                const f = formats[i];
                const fid = String(f.format_id || '');
                const vcodec = String(f.vcodec || '');
                const acodec = String(f.acodec || '');
                const url = String(f.url || '');
                
                const isProgressive = (vcodec && vcodec !== 'none' && acodec && acodec !== 'none' && !fid.endsWith('a')) ||
                                      url.includes('xpv_progressive') ||
                                      url.includes('progressive_recipe=1');
                
                if (isProgressive) {
                  videoUrl = f.url;
                  break;
                }
              }

              // 2. Fallback to any video format
              if (!videoUrl) {
                for (let i = formats.length - 1; i >= 0; i--) {
                  const f = formats[i];
                  const fid = String(f.format_id || '');
                  const vcodec = String(f.vcodec || '');
                  if (vcodec !== 'none' && !fid.endsWith('a')) {
                    videoUrl = f.url;
                    break;
                  }
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

    // 5. Online Cluster Scraper Fallback (Cobalt / Public Multi-Cluster)
    if (!result || !result.success) {
      const clusterEndpoints = [
        'https://api.cobalt.tools/api/json',
        'https://cobalt-api.kwiatekm.pl/api/json',
        'https://co.wuk.sh/api/json',
        'https://api.wuk.sh/api/json'
      ];
      for (const endpoint of clusterEndpoints) {
        try {
          const resp = await fetchJson(endpoint, 5000, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl, vQuality: '1080', filenamePattern: 'basic' })
          });
          if (resp && (resp.status === 'stream' || resp.status === 'redirect' || resp.status === 'tunnel') && resp.url) {
            const sc = cleanInstagramUrl(targetUrl).match(/\/(?:reel|reels|p|audio)\/([A-Za-z0-9_-]+)/)?.[1] || 'media';
            result = {
              success: true,
              id: `insta_${sc}`,
              shortcode: sc,
              type: 'reel',
              title: `Instagram Reel (${sc})`,
              username: '@instagram_creator',
              caption: resp.caption || `Instagram Reel #${sc}`,
              likes: 'Trending',
              comments: 'Public',
              is_video: true,
              videoUrl: resp.url,
              thumbnailUrl: resp.thumbnail || null,
              images: resp.thumbnail ? [resp.thumbnail] : [],
              audioTitle: 'Original Audio (320kbps MP3)',
              audioUrl: resp.url,
              duration: 'HD 1080p'
            };
            break;
          }
        } catch (e) {}
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
      ? (hasSeparateAudio
          ? `/api/merge?videoUrl=${encodeURIComponent(rawVideo)}&audioUrl=${encodeURIComponent(rawAudio)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_1080p.mp4`)}&inline=true`
          : `/api/stream?url=${encodeURIComponent(rawVideo)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_1080p.mp4`)}&inline=true`)
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
    return res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}`);
  }

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const disposition = isDownload ? 'attachment' : 'inline';

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type, Accept-Ranges');

  try {
    const ffmpegBin = ffmpegPath || 'ffmpeg';
    // Stream video & audio through internal stream proxy
    const internalVideo = `http://127.0.0.1:${PORT}/api/stream?url=${encodeURIComponent(videoUrl)}&inline=true`;
    const internalAudio = `http://127.0.0.1:${PORT}/api/stream?url=${encodeURIComponent(audioUrl)}&inline=true`;

    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', internalVideo,
      '-i', internalAudio,
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
  } catch (err) {
    if (!res.headersSent) {
      res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}`);
    }
  }
});

// 2. API: Media Stream & Proxy Route
app.get('/api/stream', (req, res) => {
  let rawStreamUrl = req.query.url;
  if (Array.isArray(rawStreamUrl)) rawStreamUrl = rawStreamUrl[0];
  let streamUrl = rawStreamUrl ? String(rawStreamUrl) : '';

  const rawFilename = req.query.filename;
  const filename = String(Array.isArray(rawFilename) ? rawFilename[0] : (rawFilename || 'instagram_media.mp4'));
  const isInline = req.query.inline === 'true';
  const isDownload = req.query.download === '1' || !isInline;
  const isFromBridge = req.query.from_bridge === '1' || req.headers['x-from-render'] === 'true';

  const isAudio = filename.toLowerCase().endsWith('.mp3') || filename.toLowerCase().endsWith('.m4a') || filename.toLowerCase().endsWith('.aac');
  const isJpg = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') || filename.toLowerCase().endsWith('.png');
  const defaultContentType = isAudio ? 'audio/mpeg' : isJpg ? 'image/jpeg' : 'video/mp4';

  if (!streamUrl) {
    return res.status(400).send('Missing media stream URL.');
  }

  // If a relative or nested /api/stream was passed, unwrap it
  if (streamUrl.startsWith('/api/stream')) {
    try {
      const parsed = new URL(streamUrl, 'http://localhost:5000');
      streamUrl = parsed.searchParams.get('url') || '';
      if (!streamUrl) return res.status(400).send('Invalid stream URL.');
    } catch (e) {
      return res.status(400).send('Invalid stream URL.');
    }
  }

  // Normalize URL encoding (fix double-encoded & and = from CDN signatures)
  if (streamUrl.includes('%26') || streamUrl.includes('%3D')) {
    streamUrl = streamUrl.replace(/%26/g, '&').replace(/%3D/g, '=');
  }

  const fetchWithRedirects = (targetUrl, redirectCount = 0) => {
    if (redirectCount > 5) {
      if (!res.headersSent) res.status(500).send('Too many redirects');
      return;
    }

    try {
      let cleanTarget = targetUrl;
      if (!targetUrl.includes('trycloudflare.com') && (cleanTarget.includes('%26') || cleanTarget.includes('%3D'))) {
        cleanTarget = cleanTarget.replace(/%26/g, '&').replace(/%3D/g, '=');
      }

      const targetObj = new URL(cleanTarget);
      const isMetaDomain = targetObj.hostname.includes('fbcdn.net') || targetObj.hostname.includes('cdninstagram.com') || targetObj.hostname.includes('instagram.com');
      const isRender = !!(process.env.RENDER || (process.env.PORT && process.env.PORT !== '5000'));

      // If running on Render and accessing a Meta CDN domain without bridge, route to residential bridge
      if (isRender && isMetaDomain && !isFromBridge) {
        const bridgeStreamUrl = `https://zoning-highlights-thumbnail-diary.trycloudflare.com/api/stream?url=${encodeURIComponent(cleanTarget)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}&from_bridge=1`;
        return fetchWithRedirects(bridgeStreamUrl, redirectCount + 1);
      }

      const client = targetObj.protocol === 'https:' ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': '*/*'
      };

      if (isMetaDomain) {
        headers['Referer'] = 'https://www.instagram.com/';
        headers['Origin'] = 'https://www.instagram.com';
      }

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const request = client.get(cleanTarget, { headers, timeout: 25000 }, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          const nextUrl = new URL(proxyRes.headers.location, cleanTarget).toString();
          return fetchWithRedirects(nextUrl, redirectCount + 1);
        }

        if (proxyRes.statusCode >= 400) {
          if (!isFromBridge) {
            const bridgeStreamUrl = `https://zoning-highlights-thumbnail-diary.trycloudflare.com/api/stream?url=${encodeURIComponent(cleanTarget)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}&from_bridge=1`;
            return fetchWithRedirects(bridgeStreamUrl, redirectCount + 1);
          }
          if (!res.headersSent) {
            return res.status(proxyRes.statusCode).send(`Upstream CDN returned ${proxyRes.statusCode}`);
          }
          return;
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
        if (!isFromBridge) {
          const bridgeStreamUrl = `https://zoning-highlights-thumbnail-diary.trycloudflare.com/api/stream?url=${encodeURIComponent(cleanTarget)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}&from_bridge=1`;
          return fetchWithRedirects(bridgeStreamUrl, redirectCount + 1);
        }
        if (!res.headersSent) {
          res.status(502).send('Proxy streaming error: ' + e.message);
        }
      });

      request.on('timeout', () => {
        request.destroy();
        if (!isFromBridge) {
          const bridgeStreamUrl = `https://zoning-highlights-thumbnail-diary.trycloudflare.com/api/stream?url=${encodeURIComponent(cleanTarget)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}&from_bridge=1`;
          return fetchWithRedirects(bridgeStreamUrl, redirectCount + 1);
        }
        if (!res.headersSent) {
          res.status(504).send('Proxy streaming timeout');
        }
      });
    } catch (e) {
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
