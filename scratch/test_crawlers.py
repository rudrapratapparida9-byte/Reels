import urllib.request
import re
import json

def test_crawlers(shortcode):
    user_agents = [
        ('facebookexternalhit', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'),
        ('Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'),
        ('Twitterbot', 'Twitterbot/1.0'),
        ('WhatsApp', 'WhatsApp/2.21.12.21 A')
    ]

    for name, ua in user_agents:
        try:
            req = urllib.request.Request(f'https://www.instagram.com/reel/{shortcode}/', headers={
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            })
            with urllib.request.urlopen(req, timeout=5) as res:
                html = res.read().decode('utf-8', errors='ignore')
                print(f"[{name}] status:", res.status, "HTML len:", len(html))
                og_video = re.search(r'<meta\s+(?:property|name)="og:video(?::secure_url)?"\s+content="([^"]+)"', html)
                og_image = re.search(r'<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"', html)
                if og_video:
                    print(f"[{name}] FOUND OG VIDEO:", og_video.group(1)[:90])
                if og_image:
                    print(f"[{name}] FOUND OG IMAGE:", og_image.group(1)[:90])
        except Exception as e:
            print(f"[{name}] err:", e)

test_crawlers('C8r8Xq9p1Yx')
