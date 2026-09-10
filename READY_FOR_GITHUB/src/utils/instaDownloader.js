// ReelsVault - Multi-Engine Real-World Instagram Media Extractor
// Integrates: Local Python yt-dlp + Instaloader Backend API + Direct Proxy Streaming

import { downloadMediaFile } from './downloadHelper';

/**
 * Extract clean URL and shortcode from any text or Instagram link
 */
export function extractInstagramInfo(rawInput) {
  if (!rawInput) return null;
  const input = rawInput.trim();

  // Extract first URL if user pasted message containing text + link
  const urlMatch = input.match(/https?:\/\/[^\s<>"']+/i) || input.match(/(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)[^\s<>"']+/i);
  let clean = urlMatch ? (urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`) : input;

  const withoutQuery = clean.split('?')[0].split('#')[0].replace(/\/+$/, '');

  // 1. Audio Link
  const audioMatch = withoutQuery.match(/(?:reels\/audio|audio|music)\/([0-9]+)/i);
  if (audioMatch) {
    return { type: 'audio', shortcode: audioMatch[1], cleanUrl: `https://www.instagram.com/reels/audio/${audioMatch[1]}/`, audioId: audioMatch[1] };
  }

  // 2. Stories with Media ID
  const storyMatch = withoutQuery.match(/stories\/([^/]+)\/([0-9]+)/i);
  if (storyMatch) {
    return { type: 'story', username: storyMatch[1], shortcode: storyMatch[2], cleanUrl: `https://www.instagram.com/stories/${storyMatch[1]}/${storyMatch[2]}/` };
  }

  // 3. Story Highlights
  const highlightMatch = withoutQuery.match(/stories\/highlights\/([0-9]+)/i);
  if (highlightMatch) {
    return { type: 'story', username: 'highlight', shortcode: highlightMatch[1], cleanUrl: `https://www.instagram.com/stories/highlights/${highlightMatch[1]}/` };
  }

  // 4. Story Username
  const storyUserMatch = withoutQuery.match(/stories\/([^/]+)/i);
  if (storyUserMatch) {
    return { type: 'story', username: storyUserMatch[1], shortcode: storyUserMatch[1], cleanUrl: `https://www.instagram.com/stories/${storyUserMatch[1]}/` };
  }

  // 5. Reels & Posts
  const postMatch = withoutQuery.match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (postMatch) {
    const isPhoto = withoutQuery.includes('/p/');
    return { 
      type: isPhoto ? 'photo' : 'reel', 
      shortcode: postMatch[1], 
      cleanUrl: `https://www.instagram.com/${isPhoto ? 'p' : 'reel'}/${postMatch[1]}/` 
    };
  }

  // 6. Share Links
  const shareMatch = withoutQuery.match(/\/share\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (shareMatch) {
    return { type: 'reel', shortcode: shareMatch[1], cleanUrl: `https://www.instagram.com/reel/${shareMatch[1]}/` };
  }

  return { type: 'reel', shortcode: 'media', cleanUrl: withoutQuery + '/' };
}

/**
 * PRIMARY ENGINE: Universal High-Speed Backend /api/instagram API
 */
async function fetchViaBackendApi(targetUrl) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      // 40 second timeout to accommodate cold starts on free hosts
      const timeoutId = setTimeout(() => controller.abort(), 40000);

      const res = await fetch(`/api/instagram?url=${encodeURIComponent(targetUrl)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      const result = await res.json().catch(() => null);

      if (res.ok && result && result.success && result.data) {
        return result.data;
      }

      if (result && result.error) {
        throw new Error(result.error);
      }

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (e) {
      lastError = e;
      if (e.name === 'AbortError') {
        lastError = new Error("The request timed out. Please check your internet connection and try again.");
      }
      // If error is a specific message from the server, throw immediately
      if (e.message && !e.message.includes('fetch') && !e.message.includes('Failed to fetch') && !e.message.includes('status')) {
        throw e;
      }
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
}

/**
 * Main Universal Fetcher
 */
export async function fetchInstagramMedia(inputUrl, activeCategory = 'reel') {
  if (!inputUrl || !inputUrl.trim()) {
    throw new Error("Please enter a valid Instagram URL.");
  }

  const info = extractInstagramInfo(inputUrl);
  const targetUrl = info ? info.cleanUrl : inputUrl.trim();

  try {
    const backendData = await fetchViaBackendApi(targetUrl);
    if (backendData) {
      return backendData;
    }
  } catch (backendError) {
    throw new Error(backendError.message || "Unable to extract Instagram media. Please make sure the account or post is public.");
  }

  throw new Error("Unable to extract Instagram media. Please ensure the post, reel, story, or audio is public and try again.");
}

export { downloadMediaFile };
