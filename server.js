import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import ffmpegPath from 'ffmpeg-static';

// Ensure ffmpeg executable has 755 execute permissions on Linux/Render
try {
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    fs.chmodSync(ffmpegPath, 0o755);
  }
} catch (e) {}

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Gzip/Deflate compression for all responses (reduces network payload by up to 75%)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024
}));

// Fast In-Memory Cache (TTL: 15 minutes, up to 200 items)
const mediaCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

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
  if (mediaCache.size > 200) {
    const oldestKey = mediaCache.keys().next().value;
    mediaCache.delete(oldestKey);
  }
  mediaCache.set(key, { data, timestamp: Date.now() });
}

// Auto-detect working Python binary on startup
let workingPythonBin = null;
async function detectPythonBinary() {
  const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 2000 });
      workingPythonBin = bin;
      console.log(`✅ Detected working Python binary: ${bin}`);
      return;
    } catch (e) {}
  }
  console.warn('⚠️ No native Python binary detected.');
}
detectPythonBinary().catch(() => {});

// Universal CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Explicit ads.txt and robots.txt handlers
app.get('/ads.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send('google.com, pub-6931746397574530, DIRECT, f08c47fec0942fa0\n');
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send("User-agent: *\nAllow: /\nSitemap: https://reels-1-nvfo.onrender.com/sitemap.xml\n");
});

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    return res.sendFile(sitemapPath);
  }
  res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://reels-1-nvfo.onrender.com/</loc><priority>1.0</priority></url></urlset>');
});

// Serve frontend static assets with high-speed caching
app.use(express.static(path.join(__dirname, 'dist'), {
  etag: true,
  lastModified: true,
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Pragma', 'no-cache');
    } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '6.0.0-turbo-fast',
    pythonBin: workingPythonBin,
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
  const pyBin = workingPythonBin || 'python';
  const ytdlpCommands = [
    { name: './yt-dlp', bin: path.join(__dirname, 'yt-dlp'), args: ['-j', '--no-warnings', targetUrl] },
    { name: `${pyBin} extract`, bin: pyBin, args: [path.join(__dirname, 'extract_reel_audio.py'), targetUrl] }
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
        videoUrl: parsed ? (parsed.videoUrl || parsed.url) : null,
        audioUrl: parsed ? parsed.audioUrl : null
      });
    } catch (err) {
      results.push({ name: cmd.name, success: false, error: err.message });
    }
  }

  res.json({ targetUrl, results });
});

const BRIDGE_URL = process.env.EXTRACTION_BRIDGE_URL || '';

function shouldBridge(req) {
  if (!BRIDGE_URL) return false;
  const isBridgeRequest = req.query.nobridge === '1' || req.headers['x-bridge-request'] === 'true';
  const reqHost = (req.headers.host || '').toLowerCase();
  const isSelf = BRIDGE_URL.toLowerCase().includes(reqHost);
  return !isBridgeRequest && !isSelf;
}

function proxyThroughBridge(req, res, fallback) {
  if (!shouldBridge(req)) {
    return fallback();
  }

  const target = `${BRIDGE_URL}${req.originalUrl}${req.originalUrl.includes('?') ? '&' : '?'}nobridge=1`;
  const bridgeReq = https.get(target, {
    headers: {
      ...req.headers,
      'host': new URL(BRIDGE_URL).host,
      'x-bridge-request': 'true'
    },
    timeout: 45000
  }, (bridgeRes) => {
    if (bridgeRes.statusCode < 400 || bridgeRes.headers['content-type']?.includes('video') || bridgeRes.headers['content-type']?.includes('audio') || bridgeRes.headers['content-type']?.includes('image')) {
      res.writeHead(bridgeRes.statusCode, bridgeRes.headers);
      return bridgeRes.pipe(res);
    }
    fallback();
  });

  bridgeReq.on('error', (err) => {
    console.warn('Bridge proxy connection error, executing local fallback:', err.message);
    fallback();
  });

  req.on('close', () => {
    try { bridgeReq.destroy(); } catch (e) {}
  });
}

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

function downloadFileRecursive(targetUrl, destPath) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, targetUrl).href;
        }
        return downloadFileRecursive(redirectUrl, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });
      fileStream.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch (e) {}
        reject(err);
      });
    }).on('error', reject);
  });
}

// Automatically ensure yt-dlp binary is downloaded and executable on Linux (Render / Cloud hosts)
async function ensureYtdlpBinary() {
  if (process.platform !== 'linux') return;
  const targetPath = path.join(__dirname, 'yt-dlp');
  if (fs.existsSync(targetPath)) {
    try {
      const stats = fs.statSync(targetPath);
      if (stats.size > 1000000) {
        fs.chmodSync(targetPath, 0o755);
        return;
      }
    } catch (e) {}
  }
  console.log('Downloading standalone yt-dlp binary for Linux...');
  try {
    await downloadFileRecursive('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', targetPath);
    fs.chmodSync(targetPath, 0o755);
    console.log('✅ Standalone yt-dlp binary ready!');
  } catch (err) {
    console.warn('Could not auto-download yt-dlp binary:', err.message);
  }
}
ensureYtdlpBinary().catch(() => {});

function parseYtdlpInfo(info, targetUrl) {
  if (!info) return null;
  const formats = info.formats || [];
  let audioUrl = null;
  let h264VideoUrl = null;
  let genericVideoUrl = null;
  let progressiveUrl = null;

  for (const f of formats) {
    const fid = String(f.format_id || '').toLowerCase();
    const vcodec = String(f.vcodec || '').toLowerCase();
    const acodec = String(f.acodec || '').toLowerCase();
    const fUrl = String(f.url || '');
    if (!fUrl) continue;

    const isAudioOnly = fid.endsWith('a') || fid.includes('audio') || acodec.startsWith('mp4a') || acodec.startsWith('aac') || (acodec && acodec !== 'none' && (vcodec === 'none' || !vcodec));
    const isH264 = vcodec.startsWith('avc') || vcodec.startsWith('h264') || fid === '0' || fid === '1' || fid === '2';
    const isVideo = (vcodec && vcodec !== 'none') || fid.endsWith('v') || isH264;

    if (isAudioOnly) {
      if (!audioUrl) audioUrl = fUrl;
    } else if (vcodec && vcodec !== 'none' && acodec && acodec !== 'none') {
      progressiveUrl = fUrl;
    } else if (isH264) {
      h264VideoUrl = fUrl;
    } else if (isVideo && !genericVideoUrl) {
      genericVideoUrl = fUrl;
    }
  }

  const videoUrl = progressiveUrl || h264VideoUrl || genericVideoUrl || info.url;
  const finalAudioUrl = audioUrl || progressiveUrl || videoUrl;
  const videoOnlyUrl = h264VideoUrl || genericVideoUrl || progressiveUrl || videoUrl;

  const shortcode = info.id || (cleanInstagramUrl(targetUrl).match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i)?.[1]) || 'media';
  const uploader = info.uploader || info.uploader_id || 'instagram_creator';
  const track = info.track || info.title || 'Original Audio';
  const artist = info.artist || uploader;
  const audioTitle = info.track ? `${artist} • ${track} (320kbps MP3)` : `@${uploader} • Original Audio (320kbps MP3)`;
  const thumbnail = info.thumbnail;
  const duration = info.duration ? `${Math.round(info.duration)}s HD` : 'HD 1080p';

  return {
    success: true,
    id: `insta_${shortcode}`,
    shortcode: shortcode,
    type: 'reel',
    title: `Post by @${uploader}`,
    username: `@${uploader}`,
    caption: info.description || '',
    likes: info.like_count ? Number(info.like_count).toLocaleString() : 'Trending',
    comments: info.comment_count ? Number(info.comment_count).toLocaleString() : 'Public',
    is_video: true,
    videoUrl: videoUrl,
    videoWithAudioUrl: progressiveUrl || videoUrl,
    videoOnlyUrl: videoOnlyUrl,
    hasSeparateAudio: Boolean(audioUrl && progressiveUrl !== audioUrl),
    thumbnailUrl: thumbnail,
    images: thumbnail ? [thumbnail] : [],
    audioTitle: audioTitle,
    audioUrl: finalAudioUrl,
    duration: duration
  };
}

function fetchHttpBuffer(targetUrl, headers = {}, timeout = 2500) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(targetUrl, { headers, timeout }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (!loc.startsWith('http')) loc = new URL(loc, targetUrl).href;
          return fetchHttpBuffer(loc, headers, timeout).then(resolve);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
      });
      req.on('error', (e) => resolve({ status: 500, error: e.message, data: '' }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 408, error: 'Timeout', data: '' }); });
    } catch (err) {
      resolve({ status: 500, error: err.message, data: '' });
    }
  });
}

function findMediaItemInObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.video_versions || (obj.image_versions2 && (obj.user || obj.owner)) || obj.xdt_shortcode_media) {
    return obj;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const res = findMediaItemInObject(item);
      if (res) return res;
    }
  } else {
    for (const key of Object.keys(obj)) {
      const res = findMediaItemInObject(obj[key]);
      if (res) return res;
    }
  }
  return null;
}

function parseDashAudioFromManifest(manifest) {
  if (!manifest) return null;
  const audioRepMatch = manifest.match(/<Representation[^>]*id="[^"]*audio[^"]*"[^>]*>[\s\S]*?<BaseURL>([^<]+)<\/BaseURL>/i) ||
                        manifest.match(/<AdaptationSet[^>]*mimeType="audio[^"]*"[^>]*>[\s\S]*?<BaseURL>([^<]+)<\/BaseURL>/i) ||
                        manifest.match(/<BaseURL>([^<]+)<\/BaseURL>/i);
  return audioRepMatch ? audioRepMatch[1] : null;
}

// Native Direct Node.js Extractor (< 1000ms)
async function extractDirectNode(targetUrl) {
  const shortcodeMatch = targetUrl.match(/(?:reel|reels|p|tv|share\/reel|share\/p|stories\/[^/]+)\/([A-Za-z0-9_-]+)/i);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;
  if (!shortcode || shortcode === 'audio') return null;

  const cleanUrl = `https://www.instagram.com/reel/${shortcode}/`;
  const res = await fetchHttpBuffer(cleanUrl, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Site': 'none'
  }, 2000);

  if (!res || !res.data) return null;

  const html = res.data;
  const scriptRegex = /<script\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (content.includes('video_versions') || content.includes('image_versions2') || content.includes('xdt_shortcode_media')) {
      try {
        const parsed = JSON.parse(content);
        const item = findMediaItemInObject(parsed);
        if (item) {
          const media = item.xdt_shortcode_media || item;
          const uploader = media.user?.username || media.owner?.username || 'instagram_creator';
          const caption = (typeof media.caption === 'string' ? media.caption : media.caption?.text) || 
                          (media.edge_media_to_caption?.edges?.[0]?.node?.text) || '';
          
          let videoUrl = null;
          let progressiveUrl = null;
          let dashAudioUrl = null;

          if (media.video_versions && media.video_versions.length > 0) {
            const sorted = [...media.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
            const prog = sorted.find(v => v.url && (v.url.includes('xpv_progressive') || v.url.includes('progressive_recipe=1')));
            progressiveUrl = prog ? prog.url : null;
            videoUrl = progressiveUrl || sorted[0].url;
          } else if (media.video_url) {
            videoUrl = media.video_url;
            progressiveUrl = media.video_url;
          }

          if (media.video_dash_manifest) {
            dashAudioUrl = parseDashAudioFromManifest(media.video_dash_manifest);
          }

          const finalAudioUrl = dashAudioUrl || progressiveUrl || videoUrl;

          let thumbUrl = null;
          if (media.image_versions2?.candidates?.length > 0) {
            thumbUrl = media.image_versions2.candidates[0].url;
          } else if (media.display_uri || media.display_url) {
            thumbUrl = media.display_uri || media.display_url;
          }

          let images = [];
          if (media.carousel_media && Array.isArray(media.carousel_media)) {
            images = media.carousel_media.map(m => m.image_versions2?.candidates?.[0]?.url || m.display_uri || m.video_versions?.[0]?.url).filter(Boolean);
          } else if (media.edge_sidecar_to_children?.edges) {
            images = media.edge_sidecar_to_children.edges.map(e => e.node?.display_url || e.node?.video_url).filter(Boolean);
          }
          if (images.length === 0 && thumbUrl) {
            images = [thumbUrl];
          }

          const clips = media.clips_metadata || {};
          const musicInfo = clips.music_info?.music_asset_info || clips.original_sound_info || {};
          const track = musicInfo.title || musicInfo.original_audio_title || 'Original Audio';
          const artist = musicInfo.display_artist || musicInfo.ig_artist?.username || uploader;
          const audioTitle = musicInfo.title ? `${artist} • ${track} (320kbps MP3)` : `@${uploader} • Original Audio (320kbps MP3)`;
          const durationText = media.video_duration ? `${Math.round(media.video_duration)}s HD` : (videoUrl ? 'HD 1080p' : 'HD Lossless');

          return {
            success: true,
            id: `insta_${shortcode}`,
            shortcode: shortcode,
            type: videoUrl ? 'reel' : 'photo',
            title: `Post by @${uploader}`,
            username: `@${uploader}`,
            userAvatar: media.user?.profile_pic_url || media.owner?.profile_pic_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            caption: caption,
            likes: media.like_count ? Number(media.like_count).toLocaleString() : 'Trending',
            comments: media.comment_count ? Number(media.comment_count).toLocaleString() : 'Public',
            is_video: Boolean(videoUrl),
            videoUrl: videoUrl,
            videoWithAudioUrl: progressiveUrl || videoUrl,
            videoOnlyUrl: videoUrl,
            hasSeparateAudio: Boolean(dashAudioUrl && !progressiveUrl),
            thumbnailUrl: thumbUrl,
            images: images,
            audioTitle: audioTitle,
            audioUrl: finalAudioUrl,
            duration: durationText
          };
        }
      } catch (e) {}
    }
  }
  return null;
}

// Ultra-Fast Parallel Race Extractor (Executes multiple engines concurrently and returns the fastest winner)
async function extractInstagramFast(targetUrl) {
  const cleanUrl = cleanInstagramUrl(targetUrl);

  const runDirectNode = async () => {
    try {
      const res = await extractDirectNode(cleanUrl);
      if (res && res.success && (res.videoUrl || res.audioUrl || res.thumbnailUrl)) {
        return res;
      }
    } catch (e) {}
    return null;
  };

  const runPythonWorker = async () => {
    const pyBin = workingPythonBin || (process.platform === 'win32' ? 'python' : 'python3');
    const scriptPath = path.join(__dirname, 'extract_reel_audio.py');
    try {
      const res = await execFileAsync(pyBin, [scriptPath, cleanUrl], {
        cwd: __dirname,
        timeout: 8000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      if (res && res.stdout) {
        const parsed = JSON.parse(res.stdout.trim());
        if (parsed && parsed.success && (parsed.videoUrl || parsed.audioUrl || parsed.thumbnailUrl)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  };

  const runYtdlpWorker = async () => {
    const ytdlpBin = path.join(__dirname, 'yt-dlp');
    const bins = fs.existsSync(ytdlpBin) ? [ytdlpBin, 'yt-dlp'] : ['yt-dlp'];
    for (const b of bins) {
      try {
        const commonHeaders = [
          '--add-header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          '--add-header', 'X-IG-App-ID: 936619743392459',
          '--add-header', 'Accept-Language: en-US,en;q=0.9'
        ];
        const args = ['-j', '--no-warnings', '--no-playlist', '--no-check-certificates', '--socket-timeout', '5', ...commonHeaders, cleanUrl];
        const res = await execFileAsync(b, args, { cwd: __dirname, timeout: 8000, maxBuffer: 10 * 1024 * 1024 });
        if (res && res.stdout) {
          const info = JSON.parse(res.stdout.trim());
          const parsed = parseYtdlpInfo(info, cleanUrl);
          if (parsed && (parsed.videoUrl || parsed.audioUrl)) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return null;
  };

  return new Promise((resolve) => {
    let resolved = false;
    let finishedCount = 0;
    const workers = [runDirectNode(), runPythonWorker(), runYtdlpWorker()];
    const total = workers.length;

    workers.forEach((p) => {
      p.then((res) => {
        if (!resolved && res && res.success && (res.videoUrl || res.audioUrl || res.thumbnailUrl)) {
          resolved = true;
          return resolve(res);
        }
        finishedCount++;
        if (finishedCount === total && !resolved) {
          resolve(null);
        }
      }).catch(() => {
        finishedCount++;
        if (finishedCount === total && !resolved) {
          resolve(null);
        }
      });
    });
  });
}

// 1. API: Instagram Media Extraction
app.get('/api/instagram', async (req, res) => {
  const rawTargetUrl = req.query.url;
  if (!rawTargetUrl) {
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  const targetUrl = cleanInstagramUrl(rawTargetUrl);
  
  // Check memory cache first (< 1ms instant response)
  const cached = getCached(targetUrl);
  if (cached) {
    return res.json(cached);
  }

  try {
    const result = await extractInstagramFast(targetUrl);

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

    // Only merge with FFmpeg if video stream is strictly video-only without integrated audio
    const isVideoOnlyStream = Boolean(result.hasSeparateAudio && rawAudio && rawVideo && rawAudio !== rawVideo);

    const proxiedVideoWithAudioUrl = rawVideo 
      ? (isVideoOnlyStream
          ? `/api/merge?videoUrl=${encodeURIComponent(rawVideo)}&audioUrl=${encodeURIComponent(rawAudio)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_with_audio.mp4`)}&inline=true`
          : `/api/stream?url=${encodeURIComponent(rawVideo)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_with_audio.mp4`)}&inline=true`)
      : null;

    const proxiedVideoOnlyUrl = rawVideo 
      ? `/api/mute?url=${encodeURIComponent(rawVideo)}&filename=${encodeURIComponent(`insta_${cleanShortcode}_muted.mp4`)}&inline=true`
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
        videoUrl: proxiedVideoWithAudioUrl || result.videoUrl || null,
        videoWithAudioUrl: proxiedVideoWithAudioUrl || result.videoWithAudioUrl || result.videoUrl || null,
        videoOnlyUrl: proxiedVideoOnlyUrl || result.videoOnlyUrl || proxiedVideoWithAudioUrl || null,
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

function downloadToTempFile(targetUrl, destPath) {
  return new Promise((resolve, reject) => {
    let cleanTarget = targetUrl;
    if (cleanTarget.includes('%26') || cleanTarget.includes('%3D')) {
      cleanTarget = cleanTarget.replace(/%26/g, '&').replace(/%3D/g, '=');
    }

    const fetchDirect = (currUrl, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));

      try {
        const targetObj = new URL(currUrl);
        const client = targetObj.protocol === 'https:' ? https : http;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': 'https://www.instagram.com/',
          'Origin': 'https://www.instagram.com'
        };

        const request = client.get(currUrl, { headers, timeout: 45000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, currUrl).toString();
            return fetchDirect(nextUrl, redirectCount + 1);
          }

          if (res.statusCode >= 400) {
            return reject(new Error(`CDN returned HTTP ${res.statusCode}`));
          }

          const fileStream = fs.createWriteStream(destPath);
          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => resolve(destPath));
          });

          fileStream.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        });

        request.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });

        request.on('timeout', () => {
          request.destroy();
          fs.unlink(destPath, () => {});
          reject(new Error('Download timeout'));
        });
      } catch (e) {
        reject(e);
      }
    };

    fetchDirect(cleanTarget);
  });
}

// 2. API: Merged Video + Audio Stream Route
app.get('/api/merge', async (req, res) => {
  let rawVideo = req.query.videoUrl;
  let rawAudio = req.query.audioUrl;
  if (Array.isArray(rawVideo)) rawVideo = rawVideo[0];
  if (Array.isArray(rawAudio)) rawAudio = rawAudio[0];

  let videoUrl = rawVideo ? String(rawVideo).trim() : '';
  let audioUrl = rawAudio ? String(rawAudio).trim() : '';
  const rawFilename = req.query.filename;
  const filename = String(Array.isArray(rawFilename) ? rawFilename[0] : (rawFilename || 'instagram_reel_1080p.mp4'));
  const isInline = req.query.inline === 'true';
  const isDownload = req.query.download === '1' || !isInline;

  if (!videoUrl) {
    return res.status(400).send('Missing videoUrl parameter');
  }

  function cleanUrl(u) {
    if (!u) return '';
    if (u.includes('/api/stream?url=')) {
      try {
        const parsed = new URL(u, `http://localhost:${PORT}`);
        return parsed.searchParams.get('url') || u;
      } catch (e) {}
    }
    if (u.includes('%26') || u.includes('%3D')) {
      u = u.replace(/%26/g, '&').replace(/%3D/g, '=');
    }
    return u;
  }

  videoUrl = cleanUrl(videoUrl);
  audioUrl = cleanUrl(audioUrl);

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const disposition = isDownload ? 'attachment' : 'inline';

  if (!audioUrl || audioUrl === videoUrl) {
    return res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}`);
  }

  const id = crypto.randomBytes(8).toString('hex');
  const tempDir = os.tmpdir();
  const tempVideo = path.join(tempDir, `vid_${id}.mp4`);
  const tempAudio = path.join(tempDir, `aud_${id}.mp4`);
  const tempOutput = path.join(tempDir, `out_${id}.mp4`);

  const cleanup = () => {
    try { fs.unlinkSync(tempVideo); } catch (e) {}
    try { fs.unlinkSync(tempAudio); } catch (e) {}
    try { fs.unlinkSync(tempOutput); } catch (e) {}
  };

  try {
    await Promise.all([
      downloadToTempFile(videoUrl, tempVideo),
      downloadToTempFile(audioUrl, tempAudio)
    ]);

    const ffmpegBin = ffmpegPath || 'ffmpeg';
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-i', tempVideo,
      '-i', tempAudio,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-shortest',
      '-avoid_negative_ts', 'make_zero',
      '-movflags', '+faststart',
      tempOutput
    ];

    await execFileAsync(ffmpegBin, args, { timeout: 45000 });

    if (!fs.existsSync(tempOutput)) {
      throw new Error('FFmpeg failed to create merged video file');
    }

    const stat = fs.statSync(tempOutput);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type, Accept-Ranges');

    const readStream = fs.createReadStream(tempOutput);
    readStream.pipe(res);

    readStream.on('close', cleanup);
    readStream.on('error', cleanup);
    res.on('finish', cleanup);
    res.on('close', cleanup);
  } catch (err) {
    console.error('Video + Audio merge error:', err.message);
    cleanup();
    if (!res.headersSent) {
      res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}`);
    }
  }
});

// 3. API: Muted Video Route
app.get('/api/mute', async (req, res) => {
  let rawVideo = req.query.url || req.query.videoUrl;
  if (Array.isArray(rawVideo)) rawVideo = rawVideo[0];
  let videoUrl = rawVideo ? String(rawVideo).trim() : '';

  const rawFilename = req.query.filename;
  const filename = String(Array.isArray(rawFilename) ? rawFilename[0] : (rawFilename || 'instagram_video_muted.mp4'));
  const isInline = req.query.inline === 'true';
  const isDownload = req.query.download === '1' || !isInline;

  if (!videoUrl) {
    return res.status(400).send('Missing video URL parameter');
  }

  if (videoUrl.includes('/api/stream?url=') || videoUrl.includes('/api/mute?url=')) {
    try {
      const parsed = new URL(videoUrl, `http://localhost:${PORT}`);
      videoUrl = parsed.searchParams.get('url') || videoUrl;
    } catch (e) {}
  }
  if (videoUrl.includes('%26') || videoUrl.includes('%3D')) {
    videoUrl = videoUrl.replace(/%26/g, '&').replace(/%3D/g, '=');
  }

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const disposition = isDownload ? 'attachment' : 'inline';

  const id = crypto.randomBytes(8).toString('hex');
  const tempDir = os.tmpdir();
  const tempVideo = path.join(tempDir, `mute_in_${id}.mp4`);
  const tempOutput = path.join(tempDir, `mute_out_${id}.mp4`);

  const cleanup = () => {
    try { fs.unlinkSync(tempVideo); } catch (e) {}
    try { fs.unlinkSync(tempOutput); } catch (e) {}
  };

  try {
    await downloadToTempFile(videoUrl, tempVideo);

    const ffmpegBin = ffmpegPath || 'ffmpeg';
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-i', tempVideo,
      '-map', '0:v:0',
      '-c:v', 'copy',
      '-an',
      '-movflags', '+faststart',
      tempOutput
    ];

    await execFileAsync(ffmpegBin, args, { timeout: 45000 });

    if (!fs.existsSync(tempOutput)) {
      throw new Error('FFmpeg failed to create muted video file');
    }

    const stat = fs.statSync(tempOutput);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type, Accept-Ranges');

    const readStream = fs.createReadStream(tempOutput);
    readStream.pipe(res);

    readStream.on('close', cleanup);
    readStream.on('error', cleanup);
    res.on('finish', cleanup);
    res.on('close', cleanup);
  } catch (err) {
    cleanup();
    if (!res.headersSent) {
      res.redirect(`/api/stream?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}`);
    }
  }
});

// 4. API: Dedicated High-Quality 320kbps MP3 Audio Transcoder Route
app.get('/api/audio', (req, res) => {
  proxyThroughBridge(req, res, () => {
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

    if (audioUrl.startsWith('/api/stream') || audioUrl.startsWith('/api/audio')) {
      try {
        const parsed = new URL(audioUrl, `http://localhost:${PORT}`);
        audioUrl = parsed.searchParams.get('url') || audioUrl;
      } catch (e) {}
    }

    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    const disposition = (isInline && !isDownload) ? 'inline' : 'attachment';

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
      let hasSentData = false;

      proc.stdout.on('data', (chunk) => {
        if (!hasSentData) {
          hasSentData = true;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type, Accept-Ranges');
        }
        res.write(chunk);
      });

      proc.stdout.on('end', () => {
        if (hasSentData) {
          res.end();
        } else if (!res.headersSent) {
          res.redirect(`/api/stream?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}&inline=${isInline}&download=${isDownload ? 1 : 0}`);
        }
      });

      proc.on('error', (err) => {
        console.warn('FFmpeg audio transcode failed, falling back to raw stream:', err.message);
        if (!hasSentData && !res.headersSent) {
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
});

// 5. API: Media Stream & Proxy Route
app.get('/api/stream', (req, res) => {
  proxyThroughBridge(req, res, () => {
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

    if (streamUrl.startsWith('/api/stream')) {
      try {
        const parsed = new URL(streamUrl, `http://localhost:${PORT}`);
        streamUrl = parsed.searchParams.get('url') || '';
        if (!streamUrl) return res.status(400).send('Invalid stream URL.');
      } catch (e) {
        return res.status(400).send('Invalid stream URL.');
      }
    }

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
            res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
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
});

// Single Page Application Fallback Middleware
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Built-in Auto Keep-Alive for Render Free Tier (pings every 8 minutes)
function startKeepAlive() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || 'https://reels-1-nvfo.onrender.com';
  const PING_INTERVAL = 8 * 60 * 1000; // 8 minutes

  setInterval(() => {
    try {
      const pingUrl = `${targetUrl.replace(/\/+$/, '')}/api/health`;
      const client = pingUrl.startsWith('https') ? https : http;
      
      const pingReq = client.get(pingUrl, { timeout: 10000 }, (resp) => {
        resp.resume();
        console.log(`[Keep-Alive] Self-ping status ${resp.statusCode} at ${new Date().toISOString()}`);
      });

      pingReq.on('error', (err) => {
        console.log(`[Keep-Alive] Ping notice: ${err.message}`);
      });

      pingReq.on('timeout', () => {
        pingReq.destroy();
      });
    } catch (e) {
      console.log(`[Keep-Alive] Error:`, e.message);
    }
  }, PING_INTERVAL);

  console.log(`[Keep-Alive] Background worker active for ${targetUrl}`);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ReelsVault Standalone Server running on http://localhost:${PORT}`);
  startKeepAlive();
});
