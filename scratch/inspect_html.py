import urllib.request
import re
import json

def inspect_html(shortcode):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    }

    req = urllib.request.Request(f'https://www.instagram.com/reel/{shortcode}/', headers=headers)
    with urllib.request.urlopen(req, timeout=10) as res:
        html = res.read().decode('utf-8', errors='ignore')

    # Look for embedded JSON scripts (e.g. type="application/json" or polaris or _sharedData)
    print("Searching scripts...")
    json_scripts = re.findall(r'<script\s+type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL)
    print(f"Found {len(json_scripts)} application/json scripts")

    for idx, s in enumerate(json_scripts):
        if 'video_url' in s or 'playable_url' in s or 'shortcode_media' in s or 'xdt_shortcode_media' in s or 'media' in s:
            print(f"Script {idx} contains media keywords! Len: {len(s)}")
            # Search for URLs in script
            v_urls = re.findall(r'https:[^"\'<>]+\.mp4[^"\'<>]*', s)
            if v_urls:
                print(f"Found {len(v_urls)} MP4 URLs in script {idx}!")
                for v in v_urls[:3]:
                    clean_v = v.replace('\\u0026', '&').replace('\\/', '/').replace('\\', '')
                    print("Clean MP4:", clean_v[:100])

inspect_html('C8r8Xq9p1Yx')
