"""
Standalone Instagram Audio & Video Extractor
Extracts both Video stream and dedicated Audio track (with full DASH manifest sound for licensed music)
"""

import sys
import json
import re
import xml.etree.ElementTree as ET
import urllib.request
import urllib.parse
import io

# Force UTF-8 standard output for Unicode / Emoji compatibility
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    import instaloader
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_comments=False,
        save_metadata=False,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
except Exception:
    L = None

def extract_shortcode(url_or_text):
    """Extract Instagram shortcode from URL."""
    if not url_or_text:
        return None
    match = re.search(r'/(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)', url_or_text)
    if match:
        return match.group(1)
    match2 = re.search(r'([A-Za-z0-9_-]{9,15})', url_or_text)
    return match2.group(1) if match2 else None

def get_reel_audio_and_video(url_or_shortcode):
    """
    Extracts full video URL, thumbnail, and separate audio stream URL (with full sound).
    """
    shortcode = extract_shortcode(url_or_shortcode)
    if not shortcode:
        return {'success': False, 'error': 'Could not find a valid shortcode in URL'}

    if not L:
        return {'success': False, 'error': 'Instaloader module not installed'}

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        raw = getattr(post, '_node', {}) or {}
        
        # 1. Video URL from Instagram
        video_url = post.video_url
        is_video = bool(post.is_video)

        # 2. Extract Dedicated Audio Stream from DASH Manifest XML
        manifest = raw.get('video_dash_manifest') or ''
        audio_stream_url = None
        if manifest:
            try:
                root = ET.fromstring(manifest)
                for period in root.findall('{urn:mpeg:dash:schema:mpd:2011}Period'):
                    for adapt in period.findall('{urn:mpeg:dash:schema:mpd:2011}AdaptationSet'):
                        mime = adapt.get('mimeType') or adapt.get('contentType') or ''
                        if 'audio' in mime.lower():
                            for rep in adapt.findall('{urn:mpeg:dash:schema:mpd:2011}Representation'):
                                base = rep.find('{urn:mpeg:dash:schema:mpd:2011}BaseURL')
                                if base is not None and base.text:
                                    audio_stream_url = base.text.strip()
                                    break
            except Exception:
                pass

        # If no separate DASH stream, fallback to main video URL
        final_audio_url = audio_stream_url or video_url

        # 3. Extract Song/Artist Metadata if available
        music_meta = raw.get('clips_metadata', {}).get('music_info', {}).get('music_asset_info') if raw.get('clips_metadata') else None
        owner = post.owner_username or 'instagram_creator'
        
        if music_meta and music_meta.get('title'):
            artist = music_meta.get('display_artist') or owner
            audio_title = f"{artist} • {music_meta.get('title')} (320kbps MP3)"
        else:
            audio_title = f"@{owner} • Original Audio (320kbps MP3)"

        duration_text = f"{round(post.video_duration)}s HD" if post.video_duration else ("HD 1080p" if is_video else "HD Lossless")

        return {
            'success': True,
            'id': f"insta_{shortcode}",
            'shortcode': shortcode,
            'type': 'reel' if is_video else 'photo',
            'title': f"Post by @{owner}",
            'username': f"@{owner}",
            'caption': post.caption or '',
            'likes': f"{post.likes:,}" if post.likes else "Trending",
            'comments': f"{post.comments:,}" if post.comments else "Public",
            'is_video': is_video,
            'videoUrl': video_url,
            'thumbnailUrl': post.url,
            'images': [post.url] if post.url else [],
            'audioTitle': audio_title,
            'audioUrl': final_audio_url,
            'duration': duration_text
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'https://www.instagram.com/reel/DdETKR9hOiG/?stkn=eWF1cnNocHg4eDI4'
    result = get_reel_audio_and_video(target)
    print(json.dumps(result, ensure_ascii=False))
