import urllib.request
import urllib.parse
import json

shortcode = "DdDWdWUsVaK"
reel_url = f"https://www.instagram.com/reel/{shortcode}/"

# 1. Test Cobalt API
def test_cobalt():
    try:
        req = urllib.request.Request(
            'https://api.cobalt.tools',
            data=json.dumps({'url': reel_url}).encode('utf-8'),
            headers={'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Cobalt:", data.get('status'), data.get('url', '')[:60])
    except Exception as e:
        print("Cobalt error:", e)

# 2. Test FastDL / SnapInsta scraper
def test_snapinsta():
    try:
        url = "https://snapinsta.app/action.php"
        data = urllib.parse.urlencode({'url': reel_url, 'action': 'post'}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://snapinsta.app/'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            text = resp.read().decode('utf-8')
            print("SnapInsta response length:", len(text))
    except Exception as e:
        print("SnapInsta error:", e)

# 3. Test Instagram Mobile API endpoint with query parameters
def test_ig_mobile_api():
    try:
        url = f"https://i.instagram.com/api/v1/media/{shortcode}/info/"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; Xiaomi; 2201117TI; spes; qcom; en_US; 455097441)',
            'X-IG-App-ID': '936619743392459',
            'Accept': '*/*'
        })
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("IG Mobile API items:", len(data.get('items', [])))
    except Exception as e:
        print("IG Mobile API error:", e)

test_cobalt()
test_snapinsta()
test_ig_mobile_api()
