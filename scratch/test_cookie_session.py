import urllib.request
import urllib.parse
import json
import http.cookiejar

def test_ig_with_cookies(shortcode):
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    }

    # Step 1: Visit main page or reel page to obtain cookies
    try:
        req1 = urllib.request.Request(f'https://www.instagram.com/reel/{shortcode}/', headers=headers)
        with opener.open(req1, timeout=8) as res:
            html = res.read().decode('utf-8', errors='ignore')
            print("Step 1 OK, HTML len:", len(html))
            print("Cookies acquired:", [c.name for c in cj])
    except Exception as e:
        print("Step 1 err:", e)

    # Step 2: Query GraphQL query endpoint with cookies
    csrf = ""
    for c in cj:
        if c.name == 'csrftoken':
            csrf = c.value

    headers2 = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'X-IG-App-ID': '936619743392459',
        'X-ASBD-ID': '129477',
        'X-CSRFToken': csrf,
        'Referer': f'https://www.instagram.com/reel/{shortcode}/'
    }

    url2 = f"https://www.instagram.com/graphql/query/?doc_id=10015901848480474&variables=%7B%22shortcode%22%3A%22{shortcode}%22%7D"
    try:
        req2 = urllib.request.Request(url2, headers=headers2)
        with opener.open(req2, timeout=8) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("GQL with cookies status:", res.status)
            media = data.get('data', {}).get('xdt_shortcode_media', {})
            print("Video URL:", media.get('video_url'))
            print("Owner:", media.get('owner', {}).get('username'))
            print("Is video:", media.get('is_video'))
    except Exception as e:
        print("GQL with cookies err:", e)

test_ig_with_cookies('C8r8Xq9p1Yx')
