import urllib.request
import re
import json

def test_instagram(shortcode):
    embed_url = f"https://www.instagram.com/p/{shortcode}/embed/captioned/"
    req = urllib.request.Request(embed_url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            html = r.read().decode('utf-8')
            v_match = re.search(r'"video_url"\s*:\s*"([^"]+)"', html)
            t_match = re.search(r'"display_url"\s*:\s*"([^"]+)"', html)
            print(f"Instagram embed ({shortcode}): status={r.status}, video={bool(v_match)}, thumb={bool(t_match)}")
            if v_match:
                v_url = v_match.group(1).replace(r'\u0026', '&').replace('\\', '')
                print("  Sample video URL:", v_url[:80])
    except Exception as e:
        print(f"Instagram embed ({shortcode}) error:", e)

# Test with a public reel/post shortcode
test_instagram("C8qV7N3xW0_")
