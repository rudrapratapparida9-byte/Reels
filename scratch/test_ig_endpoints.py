import urllib.request
import json
import re

def test_instagram_endpoints(shortcode):
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Mode': 'cors',
        'X-IG-App-ID': '936619743392459',
        'X-ASBD-ID': '129477',
        'Referer': f'https://www.instagram.com/reel/{shortcode}/'
    }

    # 1. Instagram Web Info API
    url1 = f"https://www.instagram.com/api/v1/media/web_info/?shortcode={shortcode}"
    try:
        req = urllib.request.Request(url1, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("Web info API SUCCESS:", list(data.keys()))
            items = data.get('data', {}).get('items') or []
            if items:
                print("Found items! video_versions:", len(items[0].get('video_versions', [])))
                for v in items[0].get('video_versions', []):
                    print("Video URL:", v.get('url')[:80])
    except Exception as e:
        print("Web info API failed:", e)

    # 2. Instagram GraphQL doc_id query
    url2 = f"https://www.instagram.com/graphql/query/?doc_id=10015901848480474&variables=%7B%22shortcode%22%3A%22{shortcode}%22%7D"
    try:
        req = urllib.request.Request(url2, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("GQL query SUCCESS:", data.get('data', {}).get('xdt_shortcode_media', {}).get('video_url'))
    except Exception as e:
        print("GQL query failed:", e)

test_instagram_endpoints('C8r8Xq9p1Yx')
