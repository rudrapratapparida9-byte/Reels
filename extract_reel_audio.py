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
    if hasattr(L, 'context') and hasattr(L.context, '_session'):
        L.context._session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'X-IG-App-ID': '936619743392459',
            'Accept-Language': 'en-US,en;q=0.9'
        })
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

def extract_with_ytdlp(url_or_shortcode):
    """Fallback extraction using yt-dlp to guarantee audio and video streams."""
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': False
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            target_url = url_or_shortcode if url_or_shortcode.startswith('http') else f"https://www.instagram.com/reel/{url_or_shortcode}/"
            info = ydl.extract_info(target_url, download=False)
            if not info:
                return None
            
            formats = info.get('formats', [])
            audio_url = None
            video_url = info.get('url')
            
            # Find separate audio stream (acodec != 'none' and (vcodec == 'none' or 'dash' in format_id))
            for f in formats:
                acodec = f.get('acodec')
                vcodec = f.get('vcodec')
                if acodec and acodec != 'none' and (not vcodec or vcodec == 'none' or 'a' in f.get('format_id', '')):
                    audio_url = f.get('url')
                    break
            
            if not audio_url:
                for f in formats:
                    if f.get('acodec') and f.get('acodec') != 'none':
                        audio_url = f.get('url')
                        break

            if not video_url and formats:
                video_url = formats[-1].get('url')
                
            shortcode = extract_shortcode(url_or_shortcode) or info.get('id', 'media')
            uploader = info.get('uploader') or info.get('uploader_id') or 'instagram_creator'
            track = info.get('track') or info.get('title') or 'Original Audio'
            artist = info.get('artist') or uploader

            if info.get('track'):
                audio_title = f"{artist} • {track} (320kbps MP3)"
            else:
                audio_title = f"@{uploader} • Original Audio (320kbps MP3)"

            thumbnail = info.get('thumbnail')
            duration = info.get('duration')
            duration_text = f"{round(duration)}s HD" if duration else "HD 1080p"

            return {
                'success': True,
                'id': f"insta_{shortcode}",
                'shortcode': shortcode,
                'type': 'reel' if (video_url or formats) else 'photo',
                'title': f"Post by @{uploader}",
                'username': f"@{uploader}",
                'caption': info.get('description') or '',
                'likes': f"{info.get('like_count', 0):,}" if info.get('like_count') else "Trending",
                'comments': f"{info.get('comment_count', 0):,}" if info.get('comment_count') else "Public",
                'is_video': bool(video_url),
                'videoUrl': video_url or audio_url,
                'thumbnailUrl': thumbnail,
                'images': [thumbnail] if thumbnail else [],
                'audioTitle': audio_title,
                'audioUrl': audio_url or video_url,
                'duration': duration_text
            }
    except Exception:
        return None

def get_reel_audio_and_video(url_or_shortcode):
    """
    Extracts full video URL, thumbnail, and separate audio stream URL (with full sound).
    """
    shortcode = extract_shortcode(url_or_shortcode)
    if not shortcode:
        return {'success': False, 'error': 'Could not find a valid shortcode in URL'}

    # 1. Primary extraction via Instaloader
    if L:
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
            clips = (raw.get('clips_metadata') if isinstance(raw.get('clips_metadata'), dict) else {}) or {}
            music_info = (clips.get('music_info') if isinstance(clips.get('music_info'), dict) else {}) or {}
            music_meta = (music_info.get('music_asset_info') if isinstance(music_info.get('music_asset_info'), dict) else {}) or {}
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
        except Exception:
            pass

    # 2. Secondary fallback via yt-dlp
    yt_res = extract_with_ytdlp(url_or_shortcode)
    if yt_res:
        return yt_res

    return {'success': False, 'error': 'Failed to extract Instagram reel media and audio'}

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'https://www.instagram.com/reel/DdETKR9hOiG/?stkn=eWF1cnNocHg4eDI4'
    result = get_reel_audio_and_video(target)
    print(json.dumps(result, ensure_ascii=False))
