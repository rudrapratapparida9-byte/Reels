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
    let stdout;
    try {
      const pyRes = await execFileAsync('python3', ['extract_instagram.py', targetUrl], {
        timeout: 45000,
        maxBuffer: 15 * 1024 * 1024
      });
      stdout = pyRes.stdout;
    } catch (pyErr) {
      const pyRes = await execFileAsync('python', ['extract_instagram.py', targetUrl], {
        timeout: 45000,
        maxBuffer: 15 * 1024 * 1024
      });
      stdout = pyRes.stdout;
    }

    const result = JSON.parse(stdout.trim());
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'Failed to extract Instagram media.' });
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

// 2. API: Media Stream & Proxy Route
app.get('/api/stream', (req, res) => {
  let streamUrl = req.query.url;
  const filename = req.query.filename || 'instagram_media.mp4';
  const isInline = req.query.inline === 'true';

  if (!streamUrl) {
    return res.status(400).send('Missing stream url');
  }

  // If a relative or nested /api/stream was passed, unwrap it
  if (streamUrl.startsWith('/api/stream')) {
    try {
      const parsed = new URL(streamUrl, 'http://localhost:5000');
      streamUrl = parsed.searchParams.get('url') || streamUrl;
    } catch (e) {}
  }

  const isAudio = filename.toLowerCase().endsWith('.mp3') || filename.toLowerCase().endsWith('.m4a') || filename.toLowerCase().endsWith('.aac');
  const isJpg = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') || filename.toLowerCase().endsWith('.png');
  const contentType = isAudio ? 'audio/mpeg' : isJpg ? 'image/jpeg' : 'video/mp4';

  const fetchWithRedirects = (targetUrl, redirectCount = 0) => {
    if (redirectCount > 5) {
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

      const request = client.get(targetUrl, { headers }, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          const nextUrl = new URL(proxyRes.headers.location, targetUrl).toString();
          return fetchWithRedirects(nextUrl, redirectCount + 1);
        }

        res.statusCode = proxyRes.statusCode || 200;
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

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
        if (isInline) {
          res.setHeader('Content-Disposition', 'inline');
        } else {
          res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        }

        proxyRes.pipe(res);
      });

      request.on('error', (e) => {
        console.error('Streaming error:', e.message);
        if (!res.headersSent) {
          res.status(500).send('Proxy streaming error: ' + e.message);
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
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ReelsVault Server running on http://localhost:${PORT}`);
});
