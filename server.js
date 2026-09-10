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

// High-speed In-Memory Cache (TTL: 10 minutes)
const mediaCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached(key) {
  const item = mediaCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    mediaCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  if (mediaCache.size > 500) {
    const oldestKey = mediaCache.keys().next().value;
    mediaCache.delete(oldestKey);
  }
  mediaCache.set(key, { data, timestamp: Date.now() });
}

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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '5.2.0-dynamic-remux-sound',
    cachedEntries: mediaCache.size,
    time: new Date().toISOString()
  });
});

app.get('/api/clear-cache', (req, res) => {
  const count = mediaCache.size;
  mediaCache.clear();
  res.json({ success: true, message: `Cleared ${count} cached media items.` });
});

app.get('/api/debug-ytdlp', async (req, res) => {
  const targetUrl = cleanInstagramUrl(req.query.url || 'https://www.instagram.com/reel/DdETKR9hOiG/');
  const ytdlpCommands = [
    { name: './yt-dlp', bin: path.join(__dirname, 'yt-dlp'), args: ['-j', '--no-warnings', targetUrl] },
    { name: 'python3 extract', bin: 'python3', args: [path.join(__dirname, 'extract_reel_audio.py'), targetUrl] },
    { name: 'python3 yt_dlp', bin: 'python3', args: ['-m', 'yt_dlp', '-j', '--no-warnings', targetUrl] }
  ];

  const results = [];
  for (const cmd of ytdlpCommands) {
    try {
      const start = Date.now();
      const execRes = await execFileAsync(cmd.bin, cmd.args, { cwd: __dirname, timeout: 20000 });
      let parsed = null;
      try { parsed = JSON.parse(execRes.stdout.trim()); } catch (e) {}
      results.push({
        name: cmd.name,
        time: Date.now() - start,
        success: true,
        keys: parsed ? Object.keys(parsed) : null,
        formats: parsed && parsed.formats ? parsed.formats.map(f => ({ id: f.format_id, acodec: f.acodec, vcodec: f.vcodec, url_prefix: f.url ? f.url.slice(0, 60) : null })) : null,
        videoUrl: parsed ? (parsed.videoUrl || parsed.url) : null,
        audioUrl: parsed ? parsed.audioUrl : null
      });
    } catch (err) {
      results.push({ name: cmd.name, success: false, error: err.message });
    }
  }

  res.json({ targetUrl, results });
});

function cleanInstagramUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  let url = rawUrl.trim();
  const urlMatch = url.match(/https?:\/\/[^\s<>"']+/i) || url.match(/(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)[^\s<>"']+/i);
  if (urlMatch) {
    url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
  }

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
  
  // Check memory cache first
  const cached = getCached(targetUrl);
  if (cached) {
    return res.json(cached);
  }

  try {
    let result = null;
    const scriptPath = path.join(__dirname, 'extract_reel_audio.py');
    const pyOpts = {
      cwd: __dirname,
      timeout: 35000,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    };

    const pythonBins = ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3', 'py'];

    // 1. Run dedicated extract_reel_audio.py across available Python binaries
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
      } catch (err) {
        // Continue to next binary
      }
    }

    // 2. Direct yt-dlp execution fallback
    if (!result || !result.success) {
      const ytBaseArgs = [
        '-j',
        '--no-warnings',
        '--no-check-certificates',
        '--add-header', 'X-IG-App-ID: 936619743392459',
        '--add-header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        targetUrl
      ];
      const ytdlpCommands = [
        { bin: path.join(__dirname, 'yt-dlp'), args: ytBaseArgs },
        { bin: 'yt-dlp', args: ytBaseArgs },
        { bin: 'python3', args: ['-m', 'yt_dlp', ...ytBaseArgs] },
        { bin: 'python', args: ['-m', 'yt_dlp', ...ytBaseArgs] }
      ];
      for (const cmd of ytdlpCommands) {
        try {
          const ytRes = await execFileAsync(cmd.bin, cmd.args, pyOpts);
          if (ytRes && ytRes.stdout) {
            const ytJson = JSON.parse(ytRes.stdout.trim());
            if (ytJson) {
              const formats = ytJson.formats || [];
              let audioUrl = null;
              let dashVideoUrl = null;
              let progressiveUrl = null;

              for (const f of formats) {
                const fid = String(f.format_id || '').toLowerCase();
                const vcodec = String(f.vcodec || '');
                const acodec = String(f.acodec || '');
                const url = String(f.url || '');

                if (fid.endsWith('a') || fid.includes('audio') || (acodec && acodec !== 'none' && (vcodec === 'none' || !vcodec))) {
                  if (!audioUrl && f.url) audioUrl = f.url;
                } else if (fid.endsWith('v') || (vcodec && vcodec !== 'none' && acodec === 'none')) {
                  if (f.url) dashVideoUrl = f.url;
                } else if (url && (url.includes('progressive') || url.includes('recipe=1') || (!fid.endsWith('v') && !fid.endsWith('a')))) {
                  progressiveUrl = f.url;
                }
              }

              const topUrl = ytJson.url || '';
              if (!progressiveUrl && topUrl && (topUrl.includes('progressive') || topUrl.includes('recipe=1'))) {
                progressiveUrl = topUrl;
              }

              let finalVideoUrl = null;
              let finalAudioUrl = null;

              if (dashVideoUrl && audioUrl) {
                finalVideoUrl = dashVideoUrl;
                finalAudioUrl = audioUrl;
              } else if (progressiveUrl) {
                finalVideoUrl = progressiveUrl;
                finalAudioUrl = audioUrl || progressiveUrl;
              } else {
                finalVideoUrl = dashVideoUrl || topUrl;
                finalAudioUrl = audioUrl || finalVideoUrl;
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
                videoUrl: finalVideoUrl,
                thumbnailUrl: ytJson.thumbnail || null,
                images: ytJson.thumbnail ? [ytJson.thumbnail] : [],
                audioTitle: ytJson.track ? `${artist} • ${track} (320kbps MP3)` : `@${uploader} • Original Audio (320kbps MP3)`,
                audioUrl: finalAudioUrl,
                duration: ytJson.duration ? `${Math.round(ytJson.duration)}s HD` : 'HD 1080p'
              };
              break;
            }
          }
        } catch (ytErr) {}
      }
    }

    if (!result || !result.success) {
      return res.status(400).json({ success: false, error: (result && result.error) || 'Unable to extract Instagram media. Please make sure the link is from a public post.' });
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

    // If separate audio stream exists and differs from the video URL, ALWAYS merge with FFmpeg to guarantee sound
    const hasSeparateAudio = Boolean(rawAudio && rawVideo && rawAudio !== rawVideo);

    const proxiedVideoUrl = rawVideo 
      ? (hasSeparateAudio
          ? `/api/merge?videoUrl=${encodeURIComponent(rawVideo)}&audioUrl=${encodeURIComponent(rawAudio)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_1080p.mp4`)}&inline=true`
          : `/api/stream?url=${encodeURIComponent(rawVideo)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_1080p.mp4`)}&inline=true`)
      : null;

    const proxiedAudioUrl = rawAudio 
      ? `/api/audio?url=${encodeURIComponent(rawAudio)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_audio.mp3`)}&inline=true`
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

    // Cache successful payload
    setCached(targetUrl, payload);

    return res.json(payload);
  } catch (err) {
    console.error('API Extraction Error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Internal extraction error' });
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
    const headersStr = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36\r\nReferer: https://www.instagram.com/\r\n';

    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-headers', headersStr,
      '-i', videoUrl,
      '-headers', headersStr,
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
  } catch (err) {
    if (!res.headersSent) {
      res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}`);
    }
  }
});

// 3. API: Dedicated High-Quality 320kbps MP3 Audio Transcoder Route
app.get('/api/audio', (req, res) => {
  let rawUrl = req.query.url;
  if (Array.isArray(rawUrl)) rawUrl = rawUrl[0];
  let audioUrl = rawUrl ? String(rawUrl) : '';

  const rawFilename = req.query.filename;
  const filename = String(Array.isArray(rawFilename) ? rawFilename[0] : (rawFilename || 'instagram_audio.mp3'));
  const isInline = req.query.inline === 'true';
  const isDownload = req.query.download === '1' || !isInline;

  if (!audioUrl) {
    return res.status(400).send('Missing audio stream URL');
  }

  // Unwrap if nested stream URL
  if (audioUrl.startsWith('/api/stream') || audioUrl.startsWith('/api/audio')) {
    try {
      const parsed = new URL(audioUrl, `http://localhost:${PORT}`);
      audioUrl = parsed.searchParams.get('url') || audioUrl;
    } catch (e) {}
  }

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const disposition = (isInline && !isDownload) ? 'inline' : 'attachment';

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type, Accept-Ranges');

  try {
    const ffmpegBin = ffmpegPath || 'ffmpeg';
    const headersStr = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36\r\nReferer: https://www.instagram.com/\r\n';

    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-headers', headersStr,
      '-i', audioUrl,
      '-c:a', 'libmp3lame',
      '-b:a', '320k',
      '-f', 'mp3',
      'pipe:1'
    ];

    const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.pipe(res);

    proc.on('error', (err) => {
      console.warn('FFmpeg audio transcode failed, falling back to raw stream:', err.message);
      if (!res.headersSent) {
        res.redirect(`/api/stream?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}`);
      }
    });

    req.on('close', () => {
      try { proc.kill('SIGKILL'); } catch (e) {}
    });
  } catch (err) {
    if (!res.headersSent) {
      res.redirect(`/api/stream?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}`);
    }
  }
});

// 3. API: Media Stream & Proxy Route
app.get('/api/stream', (req, res) => {
  let rawStreamUrl = req.query.url;
  if (Array.isArray(rawStreamUrl)) rawStreamUrl = rawStreamUrl[0];
  let streamUrl = rawStreamUrl ? String(rawStreamUrl) : '';

  const rawFilename = req.query.filename;
  const filename = String(Array.isArray(rawFilename) ? rawFilename[0] : (rawFilename || 'instagram_media.mp4'));
  const isInline = req.query.inline === 'true';
  const isDownload = req.query.download === '1' || !isInline;

  const isAudio = filename.toLowerCase().endsWith('.mp3') || filename.toLowerCase().endsWith('.m4a') || filename.toLowerCase().endsWith('.aac');
  const isJpg = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') || filename.toLowerCase().endsWith('.png');
  const defaultContentType = isAudio ? 'audio/mpeg' : isJpg ? 'image/jpeg' : 'video/mp4';

  if (!streamUrl) {
    return res.status(400).send('Missing media stream URL.');
  }

  // If a relative or nested /api/stream was passed, unwrap it
  if (streamUrl.startsWith('/api/stream')) {
    try {
      const parsed = new URL(streamUrl, `http://localhost:${PORT}`);
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
      if (cleanTarget.includes('%26') || cleanTarget.includes('%3D')) {
        cleanTarget = cleanTarget.replace(/%26/g, '&').replace(/%3D/g, '=');
      }

      const targetObj = new URL(cleanTarget);
      const isMetaDomain = targetObj.hostname.includes('fbcdn.net') || targetObj.hostname.includes('cdninstagram.com') || targetObj.hostname.includes('instagram.com');

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

      const request = client.get(cleanTarget, { headers, timeout: 30000 }, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          const nextUrl = new URL(proxyRes.headers.location, cleanTarget).toString();
          return fetchWithRedirects(nextUrl, redirectCount + 1);
        }

        if (proxyRes.statusCode >= 400) {
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
        if (!res.headersSent) {
          res.status(502).send('Proxy streaming error: ' + e.message);
        }
      });

      request.on('timeout', () => {
        request.destroy();
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
  console.log(`🚀 ReelsVault Standalone Server running on http://localhost:${PORT}`);
});
