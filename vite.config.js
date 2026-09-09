import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';

const execFileAsync = promisify(execFile);

function cleanInstagramUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  let url = rawUrl.trim();
  const urlMatch = url.match(/https?:\/\/[^\s<>"']+/i) || url.match(/(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)[^\s<>"']+/i);
  if (urlMatch) {
    url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
  }
  return url;
}

function instagramApiPlugin() {
  return {
    name: 'instagram-api-plugin',
    configureServer(server) {
      // 1. Metadata Extraction Route: /api/instagram?url=...
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url, 'http://localhost:5173');
        if (urlObj.pathname === '/api/instagram') {
          const rawTargetUrl = urlObj.searchParams.get('url');
          if (!rawTargetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Missing url parameter' }));
            return;
          }

          const targetUrl = cleanInstagramUrl(rawTargetUrl);

          try {
            const { stdout } = await execFileAsync('python', ['extract_instagram.py', targetUrl], {
              timeout: 30000,
              maxBuffer: 15 * 1024 * 1024
            });

            const result = JSON.parse(stdout.trim());
            if (!result.success) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: result.error || 'Failed to extract Instagram media.' }));
              return;
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

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
          } catch (err) {
            console.error('API Extraction Error:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 2. Direct Media Stream / Download Proxy Route: /api/stream?url=...&filename=...
        if (urlObj.pathname === '/api/stream') {
          const streamUrl = urlObj.searchParams.get('url');
          const filename = urlObj.searchParams.get('filename') || 'instagram_media.mp4';
          const isInline = urlObj.searchParams.get('inline') === 'true';
          
          if (!streamUrl) {
            res.statusCode = 400;
            res.end('Missing stream url');
            return;
          }

          const isAudio = filename.toLowerCase().endsWith('.mp3') || filename.toLowerCase().endsWith('.m4a') || filename.toLowerCase().endsWith('.aac');
          const contentType = isAudio ? 'audio/mpeg' : filename.toLowerCase().endsWith('.jpg') ? 'image/jpeg' : 'video/mp4';

          const fetchWithRedirects = (targetUrl, redirectCount = 0) => {
            if (redirectCount > 5) {
              res.statusCode = 500;
              res.end('Too many redirects');
              return;
            }

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
                fetchWithRedirects(nextUrl, redirectCount + 1);
                return;
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

              if (isInline) {
                res.setHeader('Content-Disposition', 'inline');
              } else {
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
              }

              proxyRes.pipe(res);
            });

            request.on('error', (e) => {
              console.error('Streaming error:', e.message);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.end('Proxy streaming error: ' + e.message);
              }
            });
          };

          fetchWithRedirects(streamUrl);
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    instagramApiPlugin()
  ],
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/*.exe', '**/.git/**', '**/dist/**', '**/*.log']
    }
  }
});
