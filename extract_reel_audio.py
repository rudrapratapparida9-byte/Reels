"""
Standalone Instagram Audio & Video Extractor
Optimized for ultra-fast extraction with yt-dlp & DASH audio support.
"""

import sys
import os
import json
import re
import site
import xml.etree.ElementTree as ET
import urllib.request
import urllib.parse
import io

# Ensure site-packages and user packages on Linux/Render/Cloud hosts are in sys.path
try:
    if hasattr(site, 'getusersitepackages') and os.path.exists(site.getusersitepackages()):
        sys.path.append(site.getusersitepackages())
    if hasattr(site, 'getsitepackages'):
        for p in site.getsitepackages():
            if p not in sys.path:
                sys.path.append(p)
except Exception:
    pass

# Force UTF-8 standard output for Unicode / Emoji compatibility
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

L = None

def get_instaloader():
    global L
    if L is not None:
        return L if L is not False else None
    try:
        import instaloader
        inst = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_comments=False,
            save_metadata=False,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        )
        if hasattr(inst, 'context') and hasattr(inst.context, '_session'):
            inst.context._session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-IG-App-ID': '936619743392459',
                'Accept-Language': 'en-US,en;q=0.9'
            })
        L = inst
        return L
    except Exception:
        L = False
        return None

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
    """Extraction using yt-dlp to guarantee audio and video streams."""
    info = None

    sc = extract_shortcode(url_or_shortcode)
    if sc and sc.isdigit():
        target_url = f"https://www.instagram.com/reels/audio/{sc}/"
    elif sc:
        target_url = f"https://www.instagram.com/reel/{sc}/"
    elif url_or_shortcode.startswith('http'):
        target_url = url_or_shortcode
    else:
        target_url = f"https://www.instagram.com/reel/{url_or_shortcode}/"

    # 1. Try python module directly (fastest, no subprocess overhead)
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'noplaylist': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            'socket_timeout': 5,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'X-IG-App-ID': '936619743392459',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Site': 'same-origin'
            }
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
    except Exception:
        info = None

    # 2. Try standalone yt-dlp binary via subprocess if module didn't return
    if not info:
        import subprocess
        base_dir = os.path.dirname(os.path.abspath(__file__))
        binaries = [
            os.path.join(base_dir, 'yt-dlp'),
            'yt-dlp',
            './yt-dlp',
            'yt-dlp.exe'
        ]
        for b in binaries:
            if b.startswith('.') or os.path.isabs(b):
                if not os.path.exists(b):
                    continue
            try:
                cmd = [
                    b,
                    '-j',
                    '--no-warnings',
                    '--no-playlist',
                    '--no-check-certificates',
                    '--socket-timeout', '5',
                    '--add-header', 'X-IG-App-ID: 936619743392459',
                    '--add-header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    target_url
                ]
                out = subprocess.check_output(cmd, timeout=8, stderr=subprocess.DEVNULL)
                if out:
                    info = json.loads(out.decode('utf-8', errors='replace').strip())
                    if info:
                        break
            except Exception:
                continue

    if not info:
        return None
            
    formats = info.get('formats', [])
    audio_url = None
    h264_video_url = None
    generic_video_url = None
    progressive_url = None

    for f in formats:
        fid = str(f.get('format_id', '')).lower()
        vcodec = str(f.get('vcodec', '') or '').lower()
        acodec = str(f.get('acodec', '') or '').lower()
        f_url = str(f.get('url', ''))
        if not f_url:
            continue

        is_audio_only = fid.endswith('a') or 'audio' in fid or acodec.startswith('mp4a') or acodec.startswith('aac') or (acodec and acodec != 'none' and (vcodec == 'none' or not vcodec))
        is_h264 = vcodec.startswith('avc') or vcodec.startswith('h264') or fid in ['0', '1', '2']
        is_video = (vcodec and vcodec != 'none') or fid.endswith('v') or is_h264

        if is_audio_only:
            if not audio_url:
                audio_url = f_url
        elif vcodec and vcodec != 'none' and acodec and acodec != 'none':
            progressive_url = f_url
        elif is_h264:
            h264_video_url = f_url
        elif is_video and not generic_video_url:
            generic_video_url = f_url

    video_url = progressive_url or h264_video_url or generic_video_url or info.get('url')
    final_audio_url = audio_url or progressive_url or video_url
    video_only_url = h264_video_url or generic_video_url or progressive_url or video_url

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
        'videoWithAudioUrl': progressive_url or video_url,
        'videoOnlyUrl': video_only_url or video_url,
        'hasSeparateAudio': bool(h264_video_url and audio_url and not progressive_url),
        'thumbnailUrl': thumbnail,
        'images': [thumbnail] if thumbnail else [],
        'audioTitle': audio_title,
        'audioUrl': final_audio_url,
        'duration': duration_text
    }

def get_reel_audio_and_video(url_or_shortcode):
    """
    Extracts full video URL, thumbnail, and separate audio stream URL (with full sound).
    """
    # 1. Primary: yt-dlp extraction
    yt_data = extract_with_ytdlp(url_or_shortcode)
    if yt_data and yt_data.get('success') and (yt_data.get('videoUrl') or yt_data.get('audioUrl')):
        return yt_data

    shortcode = extract_shortcode(url_or_shortcode)
    if not shortcode:
        return yt_data or {'success': False, 'error': 'Could not find a valid shortcode in URL'}

    # 2. Secondary: Instaloader fallback
    loader = get_instaloader()
    if loader:
        try:
            import instaloader
            post = instaloader.Post.from_shortcode(loader.context, shortcode)
            raw = getattr(post, '_node', {}) or {}
            
            # Video URL from Instagram
            video_versions = raw.get('video_versions') or []
            video_url = None
            for vv in video_versions:
                v_u = vv.get('url')
                if v_u and ('xpv_progressive' in v_u or 'progressive_recipe=1' in v_u):
                    video_url = v_u
                    break
            if not video_url and video_versions:
                video_url = video_versions[0].get('url')
            if not video_url:
                video_url = post.video_url
            is_video = bool(post.is_video or video_url)

            # Extract Dedicated Audio Stream from DASH Manifest XML
            manifest = raw.get('video_dash_manifest') or ''
            audio_stream_url = None
            if manifest:
                try:
                    root = ET.fromstring(manifest)
                    for rep in root.iter('{urn:mpeg:dash:schema:mpd:2011}Representation'):
                        rep_id = str(rep.get('id', '')).lower()
                        mime = str(rep.get('mimeType', '')).lower()
                        if rep_id.endswith('a') or 'audio' in mime or 'audio' in rep_id:
                            base = rep.find('{urn:mpeg:dash:schema:mpd:2011}BaseURL')
                            if base is not None and base.text:
                                audio_stream_url = base.text.strip()
                                break
                except Exception:
                    pass

            final_audio_url = audio_stream_url or video_url
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

    return {'success': False, 'error': 'Failed to extract Instagram reel media and audio'}

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'https://www.instagram.com/reel/DdETKR9hOiG/?stkn=eWF1cnNocHg4eDI4'
    result = get_reel_audio_and_video(target)
    print(json.dumps(result, ensure_ascii=False))
