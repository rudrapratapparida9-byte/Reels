import urllib.request
import re
import json

shortcode = "DdDWdWUsVaK"
url = f"https://www.instagram.com/p/{shortcode}/embed/captioned/"
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
})
with urllib.request.urlopen(req, timeout=8) as resp:
    html = resp.read().decode('utf-8')

# Look for embedded json data
match = re.search(r'\\\"video_url\\\":\\\"([^\\\"]+)\\\"', html)
if match:
    v_url = match.group(1).replace('\\/', '/')
    print("Found video_url in escaped JSON:", v_url[:80])

match2 = re.search(r'\"video_url\":\"([^\"]+)\"', html)
if match2:
    v_url2 = match2.group(1).replace('\\/', '/')
    print("Found video_url2:", v_url2[:80])

# Look for mp4 links
mp4s = re.findall(r'https?://[^\s<>"\']+\.mp4[^\s<>"\']*', html)
print("MP4 count:", len(mp4s))
if mp4s:
    clean_mp4 = mp4s[0].replace('\\/', '/').replace('&amp;', '&').replace('\\u0026', '&')
    print("Clean MP4 link:", clean_mp4[:100])
