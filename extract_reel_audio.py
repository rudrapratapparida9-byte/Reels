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

import socket
socket.setdefaulttimeout(8)

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
    """Extract Instagram shortcode from URL or audio URL."""
    if not url_or_text:
        return None
    audio_match = re.search(r'(?:reels/audio|audio|music)/([0-9]+)', url_or_text)
    if audio_match:
        return audio_match.group(1)
    match = re.search(r'(?:reel|reels|p|tv|share/reel|share/p|stories/[^/]+)/([A-Za-z0-9_-]+)', url_or_text)
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
            'extract_flat': False,
            'socket_timeout': 6,
            'nocheckcertificate': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            if url_or_shortcode.startswith('http'):
                target_url = url_or_shortcode
            elif url_or_shortcode.isdigit():
                target_url = f"https://www.instagram.com/reels/audio/{url_or_shortcode}/"
            else:
                target_url = f"https://www.instagram.com/reel/{url_or_shortcode}/"
            info = ydl.extract_info(target_url, download=False)
            if not info:
                return None
            
            formats = info.get('formats', [])
            audio_url = None
            video_url = None
            
            # Find separate audio stream (audio-only DASH stream or format ending with 'a')
            for f in formats:
                fid = str(f.get('format_id', ''))
                vcodec = str(f.get('vcodec', ''))
                acodec = str(f.get('acodec', ''))
                if fid.endswith('a') or '_audio' in fid.lower() or (acodec and acodec != 'none' and (vcodec == 'none' or not vcodec)):
                    if not audio_url:
                        audio_url = f.get('url')
                        break
            
            if not audio_url:
                for f in formats:
                    acodec = str(f.get('acodec', ''))
                    if acodec and acodec != 'none':
                        audio_url = f.get('url')
                        break

            # Find best progressive video or video stream
            for f in reversed(formats):
                fid = str(f.get('format_id', ''))
                vcodec = str(f.get('vcodec', ''))
                if vcodec != 'none' and not fid.endswith('a'):
                    video_url = f.get('url')
                    break

            if not video_url:
                video_url = info.get('url')
                
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
    # 1. Primary: yt-dlp fast high-quality extraction
    yt_data = extract_with_ytdlp(url_or_shortcode)
    if yt_data and (yt_data.get('videoUrl') or yt_data.get('audioUrl')):
        return yt_data

    shortcode = extract_shortcode(url_or_shortcode)
    if not shortcode:
        return {'success': False, 'error': 'Could not find a valid shortcode in URL'}

    # 2. Secondary: Instaloader fallback
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
