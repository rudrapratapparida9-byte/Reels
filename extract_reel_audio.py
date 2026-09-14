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

def safe_json_loads(out_str):
    if not out_str:
        return None
    s = str(out_str).strip()
    try:
        return json.loads(s)
    except Exception:
        pass
    start = s.find('{')
    end = s.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(s[start:end+1])
        except Exception:
            pass
    return None

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
    headers_dict = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'X-IG-App-ID': '936619743392459'
    }
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'noplaylist': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            'socket_timeout': 15,
            'http_headers': headers_dict,
            'extractor_args': {'instagram': {'app_id': ['936619743392459']}}
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
    except Exception:
        info = None

    # 2. Try standalone yt-dlp binary or python -m yt_dlp --impersonate chrome via subprocess
    if not info:
        import subprocess
        base_dir = os.path.dirname(os.path.abspath(__file__))
        ytdlp_local = os.path.join(base_dir, 'yt-dlp')
        target_bin = ytdlp_local if os.path.exists(ytdlp_local) else 'yt-dlp'
        
        bins_to_try = [
            [sys.executable or 'python3', '-m', 'yt_dlp', '--impersonate', 'chrome'],
            [sys.executable or 'python3', '-m', 'yt_dlp'],
            [target_bin, '--impersonate', 'chrome'],
            [target_bin]
        ]
        for prefix in bins_to_try:
            try:
                cmd = prefix + [
                    '-j',
                    '--no-warnings',
                    '--no-playlist',
                    '--no-check-certificates',
                    '--socket-timeout', '15',
                    '--extractor-args', 'instagram:app_id=936619743392459',
                    '--add-header', 'X-IG-App-ID: 936619743392459',
                    '--add-header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    '--add-header', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    '--add-header', 'Accept-Language: en-US,en;q=0.9',
                    '--add-header', 'Sec-Fetch-Site: none',
                    '--add-header', 'Sec-Fetch-Mode: navigate',
                    '--add-header', 'Sec-Fetch-Dest: document',
                    '--add-header', 'Sec-Fetch-User: ?1',
                    '--add-header', 'Upgrade-Insecure-Requests: 1',
                    target_url
                ]
                out = subprocess.check_output(cmd, timeout=20, stderr=subprocess.DEVNULL)
                if out:
                    info = safe_json_loads(out.decode('utf-8', errors='replace'))
                    if info:
                        break
            except Exception:
                continue

    if not info:
        return None
            
    formats = info.get('formats', [])
    audio_url = None
    h264_video_url = None
    dash_video_url = None
    generic_video_url = None
    progressive_url = None

    for f in formats:
        fid = str(f.get('format_id', '')).lower()
        vcodec = str(f.get('vcodec', '') or '').lower()
        acodec = str(f.get('acodec', '') or '').lower()
        f_url = str(f.get('url', ''))
        res_str = str(f.get('resolution', '') or '').lower()
        a_ext = str(f.get('audio_ext', '') or '').lower()
        if not f_url:
            continue

        is_audio_only = (
            fid.endswith('a') or 
            'audio' in fid or 
            res_str == 'audio only' or 
            a_ext in ('m4a', 'mp3', 'aac') or 
            (acodec and acodec not in ('none', 'undefined', ''))
        ) and (not vcodec or vcodec in ('none', 'undefined', ''))

        is_progressive = (vcodec and vcodec not in ('none', 'undefined', '') and acodec and acodec not in ('none', 'undefined', ''))
        is_h264 = vcodec.startswith('avc') or vcodec.startswith('h264') or 'xpv_progressive' in f_url
        is_dash_video = fid.endswith('v') or (vcodec and vcodec not in ('none', 'undefined', '') and (not acodec or acodec in ('none', 'undefined', '')))
        is_video = is_dash_video or is_h264 or is_progressive or (vcodec and vcodec not in ('none', 'undefined', '')) or (not fid.endswith('a') and 'audio' not in fid and acodec in ('none', 'undefined', ''))

        if is_audio_only:
            if not audio_url:
                audio_url = f_url
        elif is_progressive:
            if not progressive_url:
                progressive_url = f_url
        elif is_h264:
            if not h264_video_url:
                h264_video_url = f_url
        elif is_dash_video:
            if not dash_video_url:
                dash_video_url = f_url
        elif is_video and not generic_video_url:
            generic_video_url = f_url

    video_url = progressive_url or h264_video_url or generic_video_url or dash_video_url or info.get('url')
    final_audio_url = audio_url or (progressive_url if is_progressive else None) or video_url
    video_only_url = dash_video_url or h264_video_url or generic_video_url or progressive_url or video_url
    has_separate_audio = bool(audio_url and video_url and audio_url != video_url)

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
        'hasSeparateAudio': has_separate_audio,
        'thumbnailUrl': thumbnail,
        'images': [thumbnail] if thumbnail else [],
        'audioTitle': audio_title,
        'audioUrl': final_audio_url,
        'duration': duration_text
    }

def find_audio_deep(obj):
    if not obj or not isinstance(obj, (dict, list)):
        return None
    direct_keys = (
        'progressive_download_url',
        'fast_start_progressive_download_url',
        'audio_bytestream_url',
        'audio_src',
        'audio_url',
        'playable_url'
    )
    if isinstance(obj, dict):
        for k in direct_keys:
            val = obj.get(k)
            if val and isinstance(val, str) and val.startswith('http'):
                return val.replace('&amp;', '&')
        orig = obj.get('original_sound_info')
        if isinstance(orig, dict):
            for k in direct_keys:
                val = orig.get(k)
                if val and isinstance(val, str) and val.startswith('http'):
                    return val.replace('&amp;', '&')
        music = obj.get('music_info')
        if isinstance(music, dict):
            meta = music.get('music_asset_info') if isinstance(music.get('music_asset_info'), dict) else (music.get('music_consumption_info') if isinstance(music.get('music_consumption_info'), dict) else music)
            for k in direct_keys:
                val = meta.get(k)
                if val and isinstance(val, str) and val.startswith('http'):
                    return val.replace('&amp;', '&')
        music_meta = obj.get('music_metadata')
        if isinstance(music_meta, dict):
            meta = music_meta.get('music_info') or music_meta.get('original_sound_info') or music_meta
            if isinstance(meta, dict):
                for k in direct_keys:
                    val = meta.get(k)
                    if val and isinstance(val, str) and val.startswith('http'):
                        return val.replace('&amp;', '&')
        for v in obj.values():
            res = find_audio_deep(v)
            if res:
                return res
    elif isinstance(obj, list):
        for item in obj:
            res = find_audio_deep(item)
            if res:
                return res
    return None

def parse_dash_manifest_audio(manifest_str):
    if not manifest_str or not isinstance(manifest_str, str):
        return None
    
    # 1. ElementTree parsing
    root = None
    try:
        root = ET.fromstring(manifest_str)
    except Exception:
        try:
            escaped = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)', '&amp;', manifest_str)
            root = ET.fromstring(escaped)
        except Exception:
            root = None

    if root is not None:
        for elem in root.iter():
            tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            rep_id = str(elem.get('id', '')).lower()
            mime = str(elem.get('mimeType', '')).lower()
            content_type = str(elem.get('contentType', '')).lower()
            encoding = str(elem.get('FBEncodingTag', '')).lower()
            codecs = str(elem.get('codecs', '')).lower()

            is_audio = (
                mime.startswith('audio') or 
                content_type == 'audio' or 
                rep_id.endswith('a') or 
                'audio' in rep_id or 
                'audio' in encoding or 
                'mp4a' in codecs
            )

            if is_audio:
                for child in elem.iter():
                    c_tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                    if c_tag == 'BaseURL' and child.text and child.text.strip().startswith('http'):
                        return child.text.strip().replace('&amp;', '&')

    # 2. Regex fallback
    try:
        patterns = [
            r'<Representation[^>]*?(?:mimeType="audio[^"]*"|id="[^"]*?a"|codecs="mp4a[^"]*"|FBEncodingTag="[^"]*?audio[^"]*")[^>]*?>[\s\S]*?<BaseURL[^>]*>([\s\S]*?)<\/BaseURL>',
            r'<AdaptationSet[^>]*?(?:contentType="audio"|mimeType="audio[^"]*")[^>]*?>[\s\S]*?<BaseURL[^>]*>([\s\S]*?)<\/BaseURL>',
            r'<BaseURL[^>]*>([\s\S]*?(?:m78|audio|dashinit|heaac|mp4a)[\s\S]*?)<\/BaseURL>'
        ]
        for p in patterns:
            m = re.search(p, manifest_str, re.IGNORECASE)
            if m and m.group(1):
                url = m.group(1).strip().replace('&amp;', '&').replace('\n', '').replace('\r', '').replace(' ', '')
                if url.startswith('http'):
                    return url
    except Exception:
        pass
    return None

def get_reel_audio_and_video(url_or_shortcode):
    """
    Extracts full video URL, thumbnail, and separate audio stream URL (with full sound).
    """
    shortcode = extract_shortcode(url_or_shortcode)
    
    # 1. Primary: yt-dlp extraction
    yt_data = extract_with_ytdlp(url_or_shortcode)
    if yt_data and yt_data.get('success') and yt_data.get('hasSeparateAudio'):
        return yt_data

    # 2. Secondary: Instaloader fallback / DASH manifest enricher
    loader = get_instaloader()
    if loader and shortcode:
        try:
            import instaloader
            post = instaloader.Post.from_shortcode(loader.context, shortcode)
            raw = getattr(post, '_node', {}) or {}
            
            # Video URL from Instagram
            video_versions = raw.get('video_versions') or []
            video_url = None
            progressive_url = None
            for vv in video_versions:
                v_u = vv.get('url')
                if v_u and ('xpv_progressive' in v_u or 'progressive_recipe=1' in v_u):
                    progressive_url = v_u
                    video_url = v_u
                    break
            if not video_url and video_versions:
                video_url = video_versions[0].get('url')
                progressive_url = video_url
            if not video_url:
                video_url = post.video_url
                progressive_url = video_url
            is_video = bool(post.is_video or video_url)

            # Extract Dedicated Audio Stream from DASH Manifest XML or Deep Metadata
            manifest = raw.get('video_dash_manifest') or raw.get('dash_manifest') or ''
            audio_stream_url = parse_dash_manifest_audio(manifest) if manifest else None

            if not audio_stream_url:
                audio_stream_url = find_audio_deep(raw)

            # If yt_data exists, enrich it with the separate audio stream from Instaloader manifest!
            if audio_stream_url and yt_data and yt_data.get('success'):
                yt_data['audioUrl'] = audio_stream_url
                yt_data['hasSeparateAudio'] = bool(yt_data.get('videoUrl') and audio_stream_url != yt_data.get('videoUrl'))
                return yt_data

            clips = (raw.get('clips_metadata') if isinstance(raw.get('clips_metadata'), dict) else {}) or {}
            orig_sound = (clips.get('original_sound_info') if isinstance(clips.get('original_sound_info'), dict) else {}) or {}
            music_info = (clips.get('music_info') if isinstance(clips.get('music_info'), dict) else {}) or {}
            music_meta = (music_info.get('music_asset_info') if isinstance(music_info.get('music_asset_info'), dict) else {}) or {}
            owner = post.owner_username or 'instagram_creator'
            
            final_audio_url = audio_stream_url or progressive_url or video_url
            has_sep_audio = bool(audio_stream_url and video_url and audio_stream_url != video_url)

            if music_meta and music_meta.get('title'):
                artist = music_meta.get('display_artist') or owner
                audio_title = f"{artist} • {music_meta.get('title')} (320kbps MP3)"
            elif orig_sound and orig_sound.get('original_audio_title'):
                audio_title = f"@{owner} • {orig_sound.get('original_audio_title')} (320kbps MP3)"
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
                'videoWithAudioUrl': progressive_url or video_url,
                'videoOnlyUrl': video_url,
                'hasSeparateAudio': has_sep_audio,
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
