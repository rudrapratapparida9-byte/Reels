import urllib.request
import urllib.parse
import json
import re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Referer': 'https://fastvideosave.net/',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest'
}

# Find API endpoint in FastVideoSave HTML
req = urllib.request.Request('https://fastvideosave.net/', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=8) as res:
    html = res.read().decode('utf-8')

# Search for ajax urls / forms
endpoints = re.findall(r'action="([^"]+)"', html) + re.findall(r'url:\s*["\']([^"\']+)["\']', html)
print('Found endpoints:', endpoints)
