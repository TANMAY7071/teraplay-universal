import urllib.request
import json

piped_instances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacydev.net',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.leptons.xyz',
    'https://api.piped.yt'
]

for p in piped_instances:
    try:
        url = f'{p}/streams/ZWmShF8Q_5A'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read().decode())
            print(f'Piped {p} SUCCESS: {data.get("title")}')
            streams = data.get('videoStreams', [])
            print('Streams count:', len(streams))
            for vs in streams:
                print(f'  - Quality: {vs.get("quality")} | {vs.get("height")}p | Format: {vs.get("format")} | VideoOnly: {vs.get("videoOnly")}')
            break
    except Exception as e:
        print(f'Piped {p} failed:', e)
