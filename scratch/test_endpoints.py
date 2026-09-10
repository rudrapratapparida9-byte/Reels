import urllib.request
import json
import re

shortcode = "DdDWdWUsVaK"

# 1. Test Instagram GraphQL query
def test_graphql():
    try:
        url = f"https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables=%7B%22shortcode%22%3A%22{shortcode}%22%7D"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-IG-App-ID': '936619743392459',
            'Accept': '*/*'
        })
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("GraphQL:", bool(data.get('data', {}).get('shortcode_media')))
            if data.get('data', {}).get('shortcode_media'):
                media = data['data']['shortcode_media']
                print("Video URL:", media.get('video_url')[:60] if media.get('video_url') else None)
    except Exception as e:
        print("GraphQL Error:", e)

# 2. Test Instagram embed caption
def test_embed():
    try:
        url = f"https://www.instagram.com/p/{shortcode}/embed/captioned/"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8')
            print("Embed HTML size:", len(html))
            match = re.search(r'\"video_url\":\s*\"([^\"]+)\"', html)
            if match:
                vurl = match.group(1).encode('utf-8').decode('unicode_escape')
                print("Embed video url:", vurl[:60])
            else:
                print("Embed video url: not found directly in regex")
    except Exception as e:
        print("Embed Error:", e)

test_graphql()
test_embed()
