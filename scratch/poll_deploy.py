import urllib.request
import json
import time

url = "https://reels-1-nvfo.onrender.com/api/debug-ytdlp?url=https://www.instagram.com/reel/DdDWdWUsVaK/"
ig_url = "https://reels-1-nvfo.onrender.com/api/instagram?url=https://www.instagram.com/reel/DdDWdWUsVaK/"

print("Polling Render deployment...")
for i in range(12):
    try:
        req = urllib.request.Request(ig_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = resp.read().decode('utf-8')
            parsed = json.loads(data)
            if parsed.get('success'):
                print("SUCCESS! /api/instagram is working on live server!")
                print("Extracted video URL:", parsed.get('data', {}).get('videoUrl', '')[:80])
                print("Audio title:", parsed.get('data', {}).get('audioTitle'))
                break
    except urllib.error.HTTPError as he:
        print(f"Attempt {i+1}: HTTP {he.code} (Build still deploying on Render...)")
    except Exception as e:
        print(f"Attempt {i+1}: {e}")
    time.sleep(12)
