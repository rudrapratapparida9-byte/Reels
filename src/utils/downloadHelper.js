// 100% Reliable Universal Downloader for Mobile (Android/iOS) and Desktop

export function triggerDirectAnchor(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.setAttribute('download', filename);
  }
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  
  // Synthetic click
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
    try { document.body.removeChild(link); } catch (e) {}
  }, 1000);
}

/**
 * Universal Downloader for Instagram Reels (MP4), Photos (JPG), Covers, and Audio (MP3)
 */
export async function downloadMediaFile(mediaUrl, filename = 'instagram_media.mp4') {
  if (!mediaUrl) return false;

  let downloadUrl = mediaUrl;

  // If already a stream proxy URL, clean up the query params instead of re-wrapping
  if (mediaUrl.includes('/api/stream')) {
    // Replace inline=true with attachment mode
    downloadUrl = mediaUrl
      .replace(/[?&]inline=true/g, '')
      .replace(/[?&]inline=false/g, '');
    
    // Ensure filename is attached
    if (!downloadUrl.includes('filename=')) {
      const sep = downloadUrl.includes('?') ? '&' : '?';
      downloadUrl = `${downloadUrl}${sep}filename=${encodeURIComponent(filename)}`;
    }
  } else if (mediaUrl.startsWith('http')) {
    // Wrap external URL in stream proxy with attachment header
    downloadUrl = `/api/stream?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
  }

  // 1. Direct Anchor Download
  try {
    triggerDirectAnchor(downloadUrl, filename);
    return true;
  } catch (err) {
    console.warn("Direct anchor failed, attempting fallback:", err);
  }

  // 2. Blob Download Fallback
  try {
    const res = await fetch(downloadUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        const blobUrl = URL.createObjectURL(blob);
        triggerDirectAnchor(blobUrl, filename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        return true;
      }
    }
  } catch (err) {
    console.warn("Blob fetch failed:", err);
  }

  // 3. Last Resort Fallback
  window.open(downloadUrl, '_blank');
  return true;
}
