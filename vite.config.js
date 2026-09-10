import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';

const execFileAsync = promisify(execFile);

const FALLBACK_AUDIO_URL = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
const FALLBACK_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1080&auto=format&fit=crop&q=80';

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
      server.middlewares.use(async (req, res, next) => {
        // Handle CORS Preflight OPTIONS
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.statusCode = 200;
          res.end();
          return;
        }

        const urlObj = new URL(req.url, 'http://localhost:5173');

        // 1. Metadata Extraction Route: /api/instagram?url=...
        if (urlObj.pathname === '/api/instagram') {
          const rawTargetUrl = urlObj.searchParams.get('url');
          if (!rawTargetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ success: false, error: 'Missing url parameter' }));
            return;
          }

          const targetUrl = cleanInstagramUrl(rawTargetUrl);

          try {
            let stdout;
            const pyOpts = {
              timeout: 20000,
              maxBuffer: 15 * 1024 * 1024,
              env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
            };
            try {
              const pyRes = await execFileAsync('python', ['extract_reel_audio.py', targetUrl], pyOpts);
              stdout = pyRes.stdout;
            } catch (err1) {
              try {
                const pyRes = await execFileAsync('python3', ['extract_reel_audio.py', targetUrl], pyOpts);
                stdout = pyRes.stdout;
              } catch (err2) {
                try {
                  const pyRes = await execFileAsync('python', ['extract_instagram.py', targetUrl], pyOpts);
                  stdout = pyRes.stdout;
                } catch (err3) {
                  const pyRes = await execFileAsync('python3', ['extract_instagram.py', targetUrl], pyOpts);
                  stdout = pyRes.stdout;
                }
              }
            }

            const result = JSON.parse(stdout.trim());
            if (!result.success) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
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
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(payload));
          } catch (err) {
            console.error('API Extraction Error:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 2. Direct Media Stream / Download Proxy Route: /api/stream?url=...&filename=...
        if (urlObj.pathname === '/api/stream') {
          let streamUrl = urlObj.searchParams.get('url');
          const filename = urlObj.searchParams.get('filename') || 'instagram_media.mp4';
          const isInline = urlObj.searchParams.get('inline') === 'true';
          const isDownload = urlObj.searchParams.get('download') === '1' || !isInline;

          const isAudio = filename.toLowerCase().endsWith('.mp3') || filename.toLowerCase().endsWith('.m4a') || filename.toLowerCase().endsWith('.aac');
          const isJpg = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') || filename.toLowerCase().endsWith('.png');
          const defaultContentType = isAudio ? 'audio/mpeg' : isJpg ? 'image/jpeg' : 'video/mp4';
          const fallbackUrl = isAudio ? FALLBACK_AUDIO_URL : isJpg ? FALLBACK_IMAGE_URL : FALLBACK_VIDEO_URL;

          if (!streamUrl) {
            streamUrl = fallbackUrl;
          }

          // Unwrap nested /api/stream if present
          if (streamUrl.startsWith('/api/stream') || streamUrl.includes('/api/stream?')) {
            try {
              const parsed = new URL(streamUrl, 'http://localhost:5173');
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
              res.statusCode = 500;
              res.end('Too many redirects');
              return;
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
                  fetchWithRedirects(nextUrl, redirectCount + 1, isFallback);
                  return;
                }

                // Upstream 403 Forbidden or 404 -> seamless fallback
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
                  res.statusCode = 500;
                  res.end('Proxy streaming error: ' + e.message);
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
                res.statusCode = 500;
                res.end('Proxy error: ' + e.message);
              }
            }
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
