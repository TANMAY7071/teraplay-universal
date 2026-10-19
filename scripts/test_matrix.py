import json
import subprocess
import sys

test_urls = [
    # 1. YouTube 4K
    ("YouTube (4K Costa Rica)", "https://www.youtube.com/watch?v=LXb3EKWsInQ"),
    # 2. YouTube Standard with Transcripts
    ("YouTube (Rick Astley)", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    # 3. TikTok
    ("TikTok Video", "https://www.tiktok.com/@scout2015/video/6718335390845095173"),
    # 4. Instagram Reel
    ("Instagram Reel", "https://www.instagram.com/reel/C8qV7N3xW0_/"),
    # 5. Vimeo
    ("Vimeo", "https://vimeo.com/76979871"),
    # 6. Dailymotion
    ("Dailymotion", "https://www.dailymotion.com/video/x8o0g4i"),
    # 7. Twitter / X
    ("Twitter / X", "https://twitter.com/NASA/status/1803858022736183321"),
    # 8. Reddit Video
    ("Reddit Video", "https://www.reddit.com/r/NatureIsFuckingLit/comments/1dh05t1/giant_manta_ray/"),
    # 9. Bilibili
    ("Bilibili", "https://www.bilibili.com/video/BV1GJ411x7h7"),
    # 10. Direct MP4
    ("Direct MP4", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")
]

print("=" * 80)
print("TERAPLAY UNIVERSAL RESOLVER COMPREHENSIVE PLATFORM MATRIX TEST")
print("=" * 80)

for name, url in test_urls:
    print(f"\n[TESTING] {name}: {url}", flush=True)
    try:
        proc = subprocess.run(
            [sys.executable, "scripts/extractor.py", url],
            capture_output=True,
            text=True,
            timeout=25
        )
        if proc.returncode != 0:
            print(f"  [ERROR] Process error: {proc.stderr[:120]}")
            continue

        raw = proc.stdout.strip()
        first_b = raw.find('{')
        last_b = raw.rfind('}')
        if first_b == -1 or last_b == -1:
            print(f"  [FAIL] No JSON output: {raw[:120]}")
            continue

        data = json.loads(raw[first_b:last_b + 1])
        if not data.get("success"):
            print(f"  [FAIL] Extraction failed: {data.get('error')}")
            continue

        title = data.get("title", "No Title")[:45]
        platform = data.get("platform", "unknown")
        formats = data.get("formats", [])
        thumbs = data.get("thumbnails", [])
        transcript = data.get("transcript")

        max_height = 0
        has_audio = False
        has_4k = False
        has_1440p = False
        has_1080p = False

        for f in formats:
            h = f.get("height") or 0
            if h > max_height:
                max_height = h
            if h >= 2160:
                has_4k = True
            elif h >= 1440:
                has_1440p = True
            elif h >= 1080:
                has_1080p = True
            if f.get("is_audio_only"):
                has_audio = True

        cues_count = len(transcript.get("items", [])) if transcript else 0
        poster_count = len(thumbs)
        has_maxres_poster = any("1920" in str(t.get("resolution", "")) or (t.get("width") or 0) >= 1920 for t in thumbs)

        print(f"  [PASS] Title: {title}...", flush=True)
        print(f"         Platform: {platform}", flush=True)
        print(f"         Max Resolution: {max_height}p | 4K: {has_4k} | 2K (1440p): {has_1440p} | 1080p: {has_1080p}", flush=True)
        print(f"         Audio Formats (MP3/M4A): {has_audio}", flush=True)
        print(f"         Thumbnails / Posters: {poster_count} available (1080p MaxRes Poster: {has_maxres_poster})", flush=True)
        print(f"         Subtitles / Transcripts: {'YES (' + str(cues_count) + ' cues)' if cues_count else 'No native subtitles'}", flush=True)
    except subprocess.TimeoutExpired:
        print(f"  [TIMEOUT] Timeout after 25s", flush=True)
    except Exception as e:
        print(f"  [ERROR] Error: {str(e)[:120]}", flush=True)

print("\n" + "=" * 80)
print("TEST COMPLETED")
print("=" * 80)
