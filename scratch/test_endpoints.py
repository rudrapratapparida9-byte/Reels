import urllib.request
import urllib.parse
import json
import re

shortcode = 'DcSoKS7xQqB'

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'X-IG-App-ID': '936619743392459',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': '*/*'
}

def test_embed():
    url = f"https://www.instagram.com/p/{shortcode}/embed/captioned/"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            html = r.read().decode('utf-8', errors='replace')
            print("Embed HTML length:", len(html))
            # Find video and audio in embed HTML
            for m in re.finditer(r'\"video_url\":\s*\"([^\"]+)\"', html):
                print("Embed video_url:", m.group(1).encode().decode('unicode_escape')[:100])
            for m in re.finditer(r'https://[^\s"\'<>]+\.mp4[^\s"\'<>]*', html):
                u = m.group(0).replace('\\/', '/').replace('&amp;', '&')
                print("Embed mp4 url:", u[:100])
    except Exception as e:
        print("Embed error:", e)

test_embed()
