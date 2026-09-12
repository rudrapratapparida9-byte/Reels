// ReelsVault - 100% Reliable Universal Downloader for Mobile (iOS / Android), Mac, Windows & Linux

/**
 * Detect client platform capabilities
 */
export function getClientEnvironment() {
  if (typeof navigator === 'undefined') return { isIOS: false, isSafari: false, isMac: false, isAndroid: false };
  
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.platform || '');
  const isAndroid = /Android/.test(ua);
  
  return { isIOS, isSafari, isMac, isAndroid };
}

/**
 * Parse and normalize target stream URL for direct attachment downloading
 */
export function buildDownloadProxyUrl(mediaUrl, filename) {
  if (!mediaUrl) return '';

  const safeFilename = (filename || 'instagram_media.mp4').replace(/[/\\?%*:|"<>]/g, '_');

  // If already an /api/merge URL, preserve video + audio merging
  if (mediaUrl.includes('/api/merge')) {
    try {
      const parsed = new URL(mediaUrl, window.location.origin);
      parsed.searchParams.set('filename', safeFilename);
      parsed.searchParams.set('download', '1');
      parsed.searchParams.set('inline', 'false');
      return parsed.pathname + parsed.search;
    } catch (e) {
      return `${mediaUrl}&download=1&filename=${encodeURIComponent(safeFilename)}`;
    }
  }

  // If already an /api/audio URL, preserve 320kbps MP3 transcoding
  if (mediaUrl.includes('/api/audio')) {
    try {
      const parsed = new URL(mediaUrl, window.location.origin);
      parsed.searchParams.set('filename', safeFilename);
      parsed.searchParams.set('download', '1');
      parsed.searchParams.set('inline', 'false');
      return parsed.pathname + parsed.search;
    } catch (e) {
      return `${mediaUrl}&download=1&filename=${encodeURIComponent(safeFilename)}`;
    }
  }

  // If already an /api/mute URL, preserve muted video transcoding
  if (mediaUrl.includes('/api/mute')) {
    try {
      const parsed = new URL(mediaUrl, window.location.origin);
      parsed.searchParams.set('filename', safeFilename);
      parsed.searchParams.set('download', '1');
      parsed.searchParams.set('inline', 'false');
      return parsed.pathname + parsed.search;
    } catch (e) {
      return `${mediaUrl}&download=1&filename=${encodeURIComponent(safeFilename)}`;
    }
  }

  let rawUrl = mediaUrl;
  
  // If already an /api/stream proxy URL, parse its target URL
  if (mediaUrl.includes('/api/stream')) {
    try {
      const parsed = new URL(mediaUrl, window.location.origin);
      rawUrl = parsed.searchParams.get('url') || mediaUrl;
    } catch (e) {
      const match = mediaUrl.match(/[?&]url=([^&]+)/);
      if (match) {
        rawUrl = decodeURIComponent(match[1]);
      }
    }
  }

  // Return clean proxy URL with attachment & filename headers
  return `/api/stream?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(safeFilename)}&download=1`;
}

/**
 * Universal Downloader for Instagram Reels (MP4), Photos (JPG), Covers, and Audio (MP3)
 * Specially optimized for iOS Safari (iPhone/iPad), macOS Safari, Windows, Linux, and Android.
 */
export async function downloadMediaFile(mediaUrl, filename = 'instagram_media.mp4') {
  if (!mediaUrl) {
    throw new Error("No media URL provided for download.");
  }

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const proxyDownloadUrl = buildDownloadProxyUrl(mediaUrl, safeFilename);
  const { isIOS } = getClientEnvironment();

  // 1. iOS (iPhone / iPad) Safari Optimization:
  // Direct location navigation triggers iOS native "Do you want to download 'filename'?" system prompt
  if (isIOS) {
    window.location.href = proxyDownloadUrl;
    return true;
  }

  // 2. Desktop (Mac, Windows, Linux) and Android: Direct HTML5 Download Anchor
  try {
    const link = document.createElement('a');
    link.href = proxyDownloadUrl;
    link.setAttribute('download', safeFilename);
    link.setAttribute('target', '_self');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch (e) {}
    }, 1000);
    return true;
  } catch (e) {
    console.warn("Direct anchor download error, falling back to window navigation:", e);
  }

  // 3. Fallback: Window location navigation
  try {
    window.location.href = proxyDownloadUrl;
    return true;
  } catch (err) {
    window.open(proxyDownloadUrl, '_blank');
    return true;
  }
}
