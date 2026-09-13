import urllib.request
import urllib.parse
import json
import time
import subprocess
import os
import io
import sys

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

FFMPEG_BIN = os.path.abspath('node_modules/ffmpeg-static/ffmpeg.exe')
LIVE_URL = 'https://reels-1-nvfo.onrender.com'

print("Polling live Render website until deployment is complete...")

def check_live(target_reel, name):
    api_url = f"{LIVE_URL}/api/instagram?url={urllib.parse.quote(target_reel)}"
    req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get('success'):
                video_url = data['data']['videoWithAudioUrl']
                print(f"[{name}] videoWithAudioUrl:", video_url[:90])
                if video_url.startswith('/api/merge'):
                    return True, video_url
                else:
                    return False, video_url
    except Exception as e:
        print(f"[{name}] Notice:", e)
        return False, None

# Test 2 is the key indicator: it will return /api/merge on the new deployment!
test2_url = "https://www.instagram.com/reel/DcSoKS7xQqB/?stkn=YXQzY3B4dWQwZ3Z1"

# Clear cache on live site first
try:
    with urllib.request.urlopen(f"{LIVE_URL}/api/clear-cache", timeout=10) as r:
        print("Live cache cleared.")
except:
    pass

for attempt in range(1, 40):
    # Clear cache before checking to avoid stale in-memory cache
    try:
        with urllib.request.urlopen(f"{LIVE_URL}/api/clear-cache", timeout=10) as r:
            pass
    except:
        pass
    print(f"\nAttempt {attempt} checking {LIVE_URL}...")
    is_merged, v_path = check_live(test2_url, "TEST 2")
    if is_merged:
        print("\n🎉 NEW DEPLOYMENT IS LIVE ON RENDER!")
        
        # Download and verify live TEST 2 file
        full_video_url = f"{LIVE_URL}{v_path}"
        print(f"Downloading live merged video from: {full_video_url[:100]}...")
        out_live_video = "scratch/verified_downloads/LIVE_TEST_2_video.mp4"
        req = urllib.request.Request(full_video_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as resp, open(out_live_video, 'wb') as f:
            f.write(resp.read())
        print(f"Downloaded live video size: {os.path.getsize(out_live_video)} bytes")
        
        probe = subprocess.run([FFMPEG_BIN, '-i', out_live_video], capture_output=True, text=True)
        has_v = False
        has_a = False
        for line in probe.stderr.split('\n'):
            if 'Stream #' in line:
                print("  ", line.strip())
                if 'Video:' in line: has_v = True
                if 'Audio:' in line: has_a = True
        print(f"--> Live Test 2 Video Stream: {has_v}, Audio Stream: {has_a}")
        break
    else:
        print("Still building/deploying on Render, waiting 15s...")
        time.sleep(15)
