import urllib.request
import re
import json

def parse_html_media(shortcode):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    }

    req = urllib.request.Request(f'https://www.instagram.com/reel/{shortcode}/', headers=headers)
    with urllib.request.urlopen(req, timeout=10) as res:
        html = res.read().decode('utf-8', errors='ignore')

    # Also search meta tags (og:video, og:title, og:image)
    og_video = re.search(r'<meta\s+(?:property|name)="og:video(?::secure_url)?"\s+content="([^"]+)"', html)
    og_image = re.search(r'<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"', html)
    og_title = re.search(r'<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"', html)
    og_desc = re.search(r'<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"', html)

    print("OG Video:", og_video.group(1) if og_video else "Not in meta")
    print("OG Image:", og_image.group(1)[:80] if og_image else "Not in meta")
    print("OG Title:", og_title.group(1) if og_title else "Not in meta")
    print("OG Desc:", og_desc.group(1) if og_desc else "Not in meta")

    json_scripts = re.findall(r'<script\s+type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL)
    for idx, s in enumerate(json_scripts):
        try:
            data = json.loads(s)
            # Recursively find video_url, display_url, audio
            def find_media(obj):
                found = []
                if isinstance(obj, dict):
                    if 'video_url' in obj and obj['video_url']:
                        found.append(('video_url', obj['video_url'], obj.get('video_duration'), obj.get('dash_info')))
                    if 'video_versions' in obj and obj['video_versions']:
                        for v in obj['video_versions']:
                            found.append(('video_version', v.get('url'), None, None))
                    if 'display_url' in obj and obj['display_url']:
                        found.append(('display_url', obj['display_url'], None, None))
                    for k, v in obj.items():
                        found.extend(find_media(v))
                elif isinstance(obj, list):
                    for item in obj:
                        found.extend(find_media(item))
                return found

            media_items = find_media(data)
            if media_items:
                print(f"Script {idx} found {len(media_items)} media items:")
                for m in media_items[:5]:
                    print(" -", m[0], m[1][:90] if m[1] else "None")
        except Exception:
            pass

parse_html_media('C8r8Xq9p1Yx')
