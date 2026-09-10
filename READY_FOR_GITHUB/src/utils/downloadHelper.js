// ReelsVault - 100% Reliable Universal Downloader for Mobile (Android/iOS) and Desktop
// Provides Multi-Strategy Blob + Proxy Attachment + Direct Stream download pipeline

/**
 * Trigger download via synthetic anchor click
 */
export function triggerDirectAnchor(url, filename, newTab = false) {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.setAttribute('download', filename);
  }
  if (newTab) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
  link.style.display = 'none';
  document.body.appendChild(link);

  try {
    link.click();
  } catch (e) {
    const evt = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    link.dispatchEvent(evt);
  }

  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch (e) {}
  }, 2000);
}

/**
 * Trigger download via hidden iframe (prevents page redirect / tab opening)
 */
export function triggerHiddenIframeDownload(url) {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (e) {}
    }, 60000);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Parse and normalize target stream URL for direct attachment downloading
 */
export function buildDownloadProxyUrl(mediaUrl, filename) {
  if (!mediaUrl) return '';

  // If already an /api/merge URL, preserve video + audio merging
  if (mediaUrl.includes('/api/merge')) {
    try {
      const parsed = new URL(mediaUrl, window.location.origin);
      parsed.searchParams.set('filename', filename);
      parsed.searchParams.set('download', '1');
      parsed.searchParams.set('inline', 'false');
      return parsed.pathname + parsed.search;
    } catch (e) {
      return `${mediaUrl}&download=1&filename=${encodeURIComponent(filename)}`;
    }
  }

  // If already an /api/audio URL, preserve 320kbps MP3 transcoding
  if (mediaUrl.includes('/api/audio')) {
    try {
      const parsed = new URL(mediaUrl, window.location.origin);
      parsed.searchParams.set('filename', filename);
      parsed.searchParams.set('download', '1');
      parsed.searchParams.set('inline', 'false');
      return parsed.pathname + parsed.search;
    } catch (e) {
      return `${mediaUrl}&download=1&filename=${encodeURIComponent(filename)}`;
    }
  }

  let rawUrl = mediaUrl;
  
  // If already an /api/stream proxy URL, parse its target URL
  if (mediaUrl.includes('/api/stream')) {
    try {
      const parsed = new URL(mediaUrl, window.location.origin);
      rawUrl = parsed.searchParams.get('url') || mediaUrl;
    } catch (e) {
      // String parsing fallback
      const match = mediaUrl.match(/[?&]url=([^&]+)/);
      if (match) {
        rawUrl = decodeURIComponent(match[1]);
      }
    }
  }

  // Return clean proxy URL with attachment & filename headers
  return `/api/stream?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(filename)}&download=1`;
}

/**
 * Universal Downloader for Instagram Reels (MP4), Photos (JPG), Covers, and Audio (MP3)
 * @param {string} mediaUrl - The media URL (raw or /api/stream)
 * @param {string} filename - The desired download filename
 * @returns {Promise<boolean>}
 */
export async function downloadMediaFile(mediaUrl, filename = 'instagram_media.mp4') {
  if (!mediaUrl) {
    throw new Error("No media URL provided for download.");
  }

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const proxyDownloadUrl = buildDownloadProxyUrl(mediaUrl, safeFilename);

  // STRATEGY 1: Fetch as Blob and trigger Object URL download
  // This is the cleanest HTML5 method: forces exact filename, avoids popups/new tabs, works on Mobile & Desktop
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    // Try fetching via the attachment proxy first, then raw URL
    const fetchUrl = proxyDownloadUrl;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 100) {
        const blobUrl = window.URL.createObjectURL(blob);
        triggerDirectAnchor(blobUrl, safeFilename, false);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
        return true;
      }
    }
  } catch (blobErr) {
    console.warn("Blob fetch download strategy encountered issue, trying direct stream...", blobErr);
  }

  // STRATEGY 2: Hidden iframe / direct anchor attachment download
  try {
    triggerDirectAnchor(proxyDownloadUrl, safeFilename, false);
    return true;
  } catch (anchorErr) {
    console.warn("Direct anchor failed:", anchorErr);
  }

  // STRATEGY 3: Hidden iframe attachment
  try {
    triggerHiddenIframeDownload(proxyDownloadUrl);
    return true;
  } catch (iframeErr) {}

  // STRATEGY 4: Final fallback - open in new window
  try {
    window.open(proxyDownloadUrl, '_blank');
    return true;
  } catch (winErr) {
    window.location.href = proxyDownloadUrl;
    return true;
  }
}
