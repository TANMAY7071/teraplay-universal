import urllib.request
import re

url = 'https://deshkementor.com/themes/y2mate-v2/assets/js/main.js?v=1785501757'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        js = r.read().decode('utf-8', errors='ignore')
        matches = re.findall(r'(/mates/[^\s"\'<>]+|/api/[^\s"\'<>]+|https?://[^\s"\'<>]+)', js)
        print('Endpoints in y2mate script:')
        for m in list(set(matches))[:20]:
            print(' ', m)
except Exception as e:
    print('Error:', e)
