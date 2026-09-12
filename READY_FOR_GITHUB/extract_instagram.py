import sys
import json
import re
import socket
import urllib.request
import urllib.parse
import subprocess
import io

# Force UTF-8 standard output for Windows cp1252 compatibility
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

socket.setdefaulttimeout(4)
try:
    import instaloader
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
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

def id_to_shortcode(media_id):
    """Convert numeric Instagram media ID to shortcode string."""
    try:
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
        shortcode = ''
        media_id = int(media_id)
        while media_id > 0:
            media_id, remainder = divmod(media_id, 64)
            shortcode = alphabet[remainder] + shortcode
        return shortcode
    except Exception:
        return None

def shortcode_to_id(shortcode):
    """Convert Instagram shortcode string to numeric media ID."""
    try:
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
        media_id = 0
        for char in shortcode:
            media_id = media_id * 64 + alphabet.index(char)
        return str(media_id)
    except Exception:
        return None

def resolve_redirect_url(url):
    """Follow HTTP redirects to find final canonical URL for share links."""
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.geturl()
    except Exception:
        return url

def extract_instagram_url_from_text(text):
    """Extract first Instagram URL from a string that might contain extra text."""
    if not text:
        return ""
    # Look for http(s) link containing instagram.com or instagr.am or ig.me
    match = re.search(r'https?://[^\s<>"\']+', text)
    if match:
        return match.group(0)
    # If starting with instagram.com or www.
    match2 = re.search(r'(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)[^\s<>"\']+', text)
    if match2:
        return f"https://{match2.group(0)}"
    return text.strip()

def parse_link_info(raw_input):
    """
    Parse any Instagram URL into structured metadata:
    Returns: (clean_url, shortcode, media_type, username, audio_id)
    """
    url = extract_instagram_url_from_text(raw_input).strip()
    if not url:
        return None, None, None, None, None

    # Handle shortened share links like /share/ or ig.me by following redirects if needed
    if '/share/' in url.lower() or 'ig.me/' in url.lower():
        # First check if shortcode is directly in share link e.g. /share/reel/ABC123/ or /share/p/ABC123/
        direct_share = re.search(r'/share/(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)', url, re.IGNORECASE)
        if direct_share:
            sc = direct_share.group(1)
            tag = 'photo' if '/p/' in url.lower() else 'reel'
            canonical = f"https://www.instagram.com/{'p' if tag == 'photo' else 'reel'}/{sc}/"
            return canonical, sc, tag, None, None
        
        # Follow redirect
        resolved = resolve_redirect_url(url)
        if resolved and resolved != url:
            url = resolved

    # Clean query parameters for matching
    clean_no_query = url.split('?')[0].split('#')[0].rstrip('/')

    # 1. Match Audio Links (e.g. /reels/audio/1083984639912061/ or /audio/1083984639912061/)
    audio_match = re.search(r'(?:reels/audio|audio|music)/([0-9]+)', clean_no_query, re.IGNORECASE)
    if audio_match:
        audio_id = audio_match.group(1)
        return url, audio_id, 'audio', None, audio_id

    # 2. Match Story with Media ID (e.g. /stories/username/3452445892345678912/)
    story_id_match = re.search(r'stories/([^/?#]+)/([0-9]+)', clean_no_query, re.IGNORECASE)
    if story_id_match:
        username = story_id_match.group(1)
        media_id = story_id_match.group(2)
        shortcode = id_to_shortcode(media_id)
        return url, shortcode, 'story', username, None

    # 3. Match Highlight with Media ID (e.g. /stories/highlights/178945612345/)
    highlight_match = re.search(r'stories/highlights/([0-9]+)', clean_no_query, re.IGNORECASE)
    if highlight_match:
        media_id = highlight_match.group(1)
        shortcode = id_to_shortcode(media_id)
        return url, shortcode, 'story', 'instagram_highlight', None

    # 4. Match Story Username Only (e.g. /stories/username/)
    story_user_match = re.search(r'stories/([^/?#]+)', clean_no_query, re.IGNORECASE)
    if story_user_match:
        username = story_user_match.group(1)
        return url, username, 'story_user', username, None

    # 5. Match Standard Reel / Post / TV (reel, reels, p, tv)
    # Notice: explicitly avoid matching 'audio' as a shortcode!
    post_match = re.search(r'/(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)', clean_no_query, re.IGNORECASE)
    if post_match:
        sc = post_match.group(1)
        if sc.lower() != 'audio':
            tag = 'photo' if '/p/' in clean_no_query.lower() else 'reel'
            canonical = f"https://www.instagram.com/{'p' if tag == 'photo' else 'reel'}/{sc}/"
            return canonical, sc, tag, None, None

    # 6. Fallback shortcode match for links like /c/ABC123 or general shortcode
    generic_match = re.search(r'/([A-Za-z0-9_-]{9,15})(?:/|$)', clean_no_query)
    if generic_match:
        sc = generic_match.group(1)
        if sc.lower() not in ['stories', 'explore', 'reels', 'audio', 'direct', 'accounts']:
            canonical = f"https://www.instagram.com/reel/{sc}/"
            return canonical, sc, 'reel', None, None

    return url, None, 'reel', None, None

def extract_via_instaloader(shortcode, forced_type=None, story_username=None):
    """Extract media using Instaloader (supports single posts, carousels, reels)."""
    if not shortcode or L is None:
        return {'success': False, 'error': 'Instaloader not available'}
    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        images = []
        if post.typename == 'GraphSidecar':
            for node in post.get_sidecar_nodes():
                if node.is_video and node.video_url:
                    images.append(node.video_url)
                elif node.display_url:
                    images.append(node.display_url)
        else:
            if post.url:
                images.append(post.url)

        is_video = bool(post.is_video)
        duration_text = f"{round(post.video_duration)}s HD" if post.video_duration else ("HD 1080p" if is_video else "HD Lossless")
        item_type = forced_type if forced_type else ('reel' if is_video else 'photo')
        owner = story_username or post.owner_username or 'instagram_creator'

        # Extract audio stream from DASH manifest XML if present (for licensed music / separate audio streams)
        raw = getattr(post, '_node', {}) or {}
        manifest = raw.get('video_dash_manifest') or ''
        extracted_audio_url = None
        if manifest:
            try:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(manifest)
                for period in root.findall('{urn:mpeg:dash:schema:mpd:2011}Period'):
                    for adapt in period.findall('{urn:mpeg:dash:schema:mpd:2011}AdaptationSet'):
                        mime = adapt.get('mimeType') or adapt.get('contentType') or ''
                        if 'audio' in mime.lower():
                            for rep in adapt.findall('{urn:mpeg:dash:schema:mpd:2011}Representation'):
                                base = rep.find('{urn:mpeg:dash:schema:mpd:2011}BaseURL')
                                if base is not None and base.text:
                                    extracted_audio_url = base.text.strip()
                                    break
            except Exception:
                pass

        # Music metadata title
        clips = (raw.get('clips_metadata') if isinstance(raw.get('clips_metadata'), dict) else {}) or {}
        music_info = (clips.get('music_info') if isinstance(clips.get('music_info'), dict) else {}) or {}
        music_meta = (music_info.get('music_asset_info') if isinstance(music_info.get('music_asset_info'), dict) else {}) or {}
        if music_meta and music_meta.get('title'):
            artist = music_meta.get('display_artist') or owner
            audio_title = f"{artist} • {music_meta.get('title')} (320kbps MP3)"
        else:
            audio_title = f"@{owner} • Original Audio (320kbps MP3)"

        audio_url_final = extracted_audio_url or (post.video_url if is_video else None)

        return {
            'success': True,
            'id': f"insta_{shortcode}",
            'shortcode': shortcode,
            'type': item_type,
            'title': f"{'Story' if item_type == 'story' else 'Post'} by @{owner}",
            'username': f"@{owner}",
            'caption': post.caption or '',
            'likes': f"{post.likes:,}" if post.likes else "Trending",
            'comments': f"{post.comments:,}" if post.comments else "Public",
            'is_video': is_video,
            'videoUrl': post.video_url if is_video else None,
            'thumbnailUrl': post.url,
            'images': images if images else [post.url],
            'audioTitle': audio_title,
            'audioUrl': audio_url_final,
            'duration': duration_text
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def extract_via_ytdlp(target_url, shortcode=None, forced_type=None, story_username=None):
    """Extract media using yt-dlp with direct module call and subprocess fallback."""
    if not target_url:
        return {'success': False, 'error': 'No target URL provided'}

    info = None

    # 1. In-process direct module (fastest)
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

    # 2. Subprocess fallback
    if not info:
        binaries = [
            ["python", "-m", "yt_dlp"],
            ["python3", "-m", "yt_dlp"],
            ["yt-dlp"]
        ]
        for bin_cmd in binaries:
            try:
                cmd = bin_cmd + ["-j", "--no-warnings", "--socket-timeout", "5", target_url]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=6)
                if res.returncode == 0 and res.stdout.strip():
                    info = json.loads(res.stdout)
                    if info:
                        break
            except Exception:
                continue

    if not info:
        return {'success': False, 'error': 'yt-dlp extraction did not return valid metadata'}

    # Username extraction
    username = story_username
    if not username:
        if info.get('channel'):
            username = f"@{info['channel'].replace('@', '')}"
        elif info.get('uploader'):
            username = f"@{info['uploader'].replace('@', '')}"
        elif info.get('uploader_id'):
            username = f"@{info['uploader_id'].replace('@', '')}"
        else:
            username = '@instagram_creator'

    formats = info.get('formats') or []
    audio_url = None
    progressive_url = None
    dash_video_url = None
    h264_video_url = None
    generic_video_url = None

    for f in formats:
        fid = str(f.get('format_id', '')).lower()
        vcodec = str(f.get('vcodec', '') or '').lower()
        acodec = str(f.get('acodec', '') or '').lower()
        f_url = str(f.get('url', ''))
        if not f_url:
            continue

        is_audio_only = (fid.endswith('a') or 'audio' in fid or (acodec and acodec != 'none')) and (not vcodec or vcodec == 'none')
        is_progressive = (
            (vcodec and vcodec != 'none' and acodec and acodec != 'none') or
            fid.isdigit() or
            'xpv_progressive' in f_url or
            'progressive_recipe=1' in f_url
        )
        is_h264 = vcodec.startswith('avc') or vcodec.startswith('h264')
        is_dash_video = fid.endswith('v') or (vcodec and vcodec != 'none' and (not acodec or acodec == 'none'))
        is_video_format = (vcodec and vcodec != 'none') or fid.endswith('v') or is_h264

        if is_audio_only:
            if not audio_url:
                audio_url = f_url
        elif is_progressive:
            if not progressive_url:
                progressive_url = f_url
        elif is_dash_video:
            if not dash_video_url:
                dash_video_url = f_url
        elif is_h264:
            if not h264_video_url:
                h264_video_url = f_url
        elif is_video_format and not generic_video_url:
            generic_video_url = f_url

    video_url = progressive_url or info.get('url') or h264_video_url or dash_video_url or generic_video_url
    final_audio_url = audio_url or progressive_url or video_url
    video_only_url = dash_video_url or h264_video_url or generic_video_url or progressive_url or video_url
    has_separate_audio = bool(not progressive_url and (dash_video_url or h264_video_url) and audio_url)

    is_video = bool(
        progressive_url or 
        dash_video_url or 
        info.get('ext') == 'mp4' or 
        (info.get('vcodec') and info.get('vcodec') != 'none') or 
        (info.get('url') and '.mp4' in info.get('url', ''))
    )
    item_type = forced_type if forced_type else ('reel' if is_video else 'photo')
    effective_sc = shortcode or info.get('id') or 'media'

    uploader = username or info.get('uploader') or 'instagram_creator'
    track = info.get('track') or info.get('title')
    artist = info.get('artist') or uploader

    if info.get('track'):
        audio_title = f"{artist} • {track} (320kbps MP3)"
    else:
        audio_title = f"{uploader} • Original Audio (320kbps MP3)"

    return {
        'success': True,
        'id': f"insta_{effective_sc}",
        'shortcode': effective_sc,
        'type': item_type,
        'title': info.get('title') or (f"{'Story' if item_type == 'story' else 'Post'} by {username}"),
        'username': username,
        'caption': info.get('description') or info.get('title') or '',
        'likes': f"{(info.get('like_count', 0) / 1000):.1f}K" if info.get('like_count') else "Trending",
        'comments': str(info.get('comment_count')) if info.get('comment_count') else "Public",
        'is_video': is_video,
        'videoUrl': video_url if is_video else None,
        'videoWithAudioUrl': progressive_url or video_url if is_video else None,
        'videoOnlyUrl': video_only_url if is_video else None,
        'hasSeparateAudio': has_separate_audio,
        'thumbnailUrl': info.get('thumbnail') or info.get('url'),
        'images': [info.get('thumbnail')] if info.get('thumbnail') else ([info.get('url')] if info.get('url') else []),
        'audioTitle': audio_title,
        'audioUrl': final_audio_url if is_video else None,
        'duration': f"{round(info.get('duration', 0))}s HD" if info.get('duration') else "HD 1080p"
    }

def generate_shortcode_candidates(sc):
    """Auto-heal font/OCR ambiguities like lowercase 'l' vs uppercase 'I' vs '1'."""
    if not sc:
        return []
    candidates = [sc]
    if 'l' in sc:
        candidates.append(sc.replace('l', 'I'))
        candidates.append(sc.replace('l', '1'))
    if 'I' in sc:
        candidates.append(sc.replace('I', 'l'))
        candidates.append(sc.replace('I', '1'))
    if '1' in sc:
        candidates.append(sc.replace('1', 'l'))
        candidates.append(sc.replace('1', 'I'))
    if 'O' in sc:
        candidates.append(sc.replace('O', '0'))
        candidates.append(sc.replace('O', 'o'))
    if '0' in sc:
        candidates.append(sc.replace('0', 'O'))
        candidates.append(sc.replace('0', 'o'))
    return list(dict.fromkeys(candidates))

def extract_instagram_data(raw_input):
    clean_url, shortcode, tag, story_username, audio_id = parse_link_info(raw_input)

    if not clean_url and not shortcode:
        return {
            'success': False,
            'error': 'Invalid Instagram link. Please paste a valid Reel, Post, Story, or Audio link.'
        }

    # CASE 1: Story with numeric story ID -> converted to shortcode
    if tag == 'story' and shortcode:
        res_story = extract_via_instaloader(shortcode, forced_type='story', story_username=story_username)
        if res_story.get('success'):
            return res_story
        
        # Fallback to yt-dlp on post URL of that story shortcode
        res_yt_story = extract_via_ytdlp(f"https://www.instagram.com/p/{shortcode}/", shortcode, forced_type='story', story_username=story_username)
        if res_yt_story.get('success'):
            return res_yt_story

    # CASE 2: Story username only (e.g. /stories/username/)
    if tag == 'story_user' and story_username:
        clean_user = story_username.replace('@', '')
        canonical_user_url = f"https://www.instagram.com/{clean_user}/"
        res_user = extract_via_ytdlp(canonical_user_url, clean_user, forced_type='story', story_username=clean_user)
        if res_user.get('success'):
            return res_user
        
        return {
            'success': False,
            'error': f'To download @{clean_user}\'s story, open Instagram, tap Share on that specific story and click "Copy Link".'
        }

    # CASE 3: Standard Post / Reel / Carousel / Audio (with candidate auto-healing)
    if shortcode:
        candidate_shortcodes = generate_shortcode_candidates(shortcode)
        for cand_sc in candidate_shortcodes:
            # 1. Primary: yt-dlp on reel or post canonical URL
            target_ep = 'reel' if tag != 'photo' else 'p'
            res_yt = extract_via_ytdlp(f"https://www.instagram.com/{target_ep}/{cand_sc}/", cand_sc, forced_type=tag)
            if res_yt.get('success'):
                return res_yt

            # 2. Secondary: yt-dlp on alternative endpoint
            alt_ep = 'p' if target_ep == 'reel' else 'reel'
            res_yt2 = extract_via_ytdlp(f"https://www.instagram.com/{alt_ep}/{cand_sc}/", cand_sc, forced_type=tag)
            if res_yt2.get('success'):
                return res_yt2

            # 3. Tertiary: Instaloader fallback
            res_instaloader = extract_via_instaloader(cand_sc, forced_type=tag)
            if res_instaloader.get('success'):
                return res_instaloader

    # CASE 4: Direct URL fallback with yt-dlp
    if clean_url:
        res_direct = extract_via_ytdlp(clean_url, shortcode or "media", forced_type=tag)
        if res_direct.get('success'):
            return res_direct

    return {
        'success': False,
        'error': 'Unable to parse Instagram link. Please ensure the link is a public Reel, Post, Story, or Audio.'
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No URL provided'}))
        return

    raw_input = sys.argv[1].strip()
    result = extract_instagram_data(raw_input)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
