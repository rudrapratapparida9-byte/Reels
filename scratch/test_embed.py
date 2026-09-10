import urllib.request, re

def test():
    req = urllib.request.Request('https://www.instagram.com/reel/DdETKR9hOiG/embed/captioned/', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
    for m in re.finditer(r'video_url', html):
        idx = m.start()
        print("Slice around video_url:", html[idx-20:idx+400])

if __name__ == '__main__':
    test()
