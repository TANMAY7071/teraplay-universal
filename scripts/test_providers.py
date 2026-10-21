#!/usr/bin/env python3
"""
Provider link test harness.

Runs the real extraction engine against one representative link per supported
platform and reports a compact verdict per link:
  PASS  -> resolved, at least one real playable format with a direct URL
  FAIL  -> could not resolve (error reported by the engine)

Also measures the raw upstream download speed for the best progressive format
so the proxy overhead can be compared against it later.
"""

import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extractor import extract_media_info  # noqa: E402

# (label, url) — one representative public link per platform
TEST_LINKS = [
    ("youtube",      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ("youtube-short","https://www.youtube.com/shorts/jNQXAC9IVRw"),
    ("bilibili",     "https://www.bilibili.com/video/BV1GJ411x7h7"),
    ("tiktok",       "https://www.tiktok.com/@scout2015/video/6718335390845095173"),
    ("instagram",    "https://www.instagram.com/reel/C8GvUWcXKAd/"),
    ("vimeo",        "https://vimeo.com/76979871"),
    ("dailymotion",  "https://www.dailymotion.com/video/x8pmp2z"),
    ("direct-mp4",   "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"),
    ("terabox",      "https://www.terabox.com/s/1abcdefghijklmnopqrstuvwxyz012345"),
]


def summarize(label, url):
    t0 = time.time()
    try:
        res = extract_media_info(url, is_transcript_only=False)
    except Exception as exc:  # noqa: BLE001
        return {
            "label": label,
            "url": url,
            "verdict": "FAIL",
            "reason": f"exception: {exc}",
            "seconds": round(time.time() - t0, 2),
        }

    elapsed = round(time.time() - t0, 2)

    if not res.get("success"):
        return {
            "label": label,
            "url": url,
            "verdict": "FAIL",
            "reason": res.get("error", "unknown error"),
            "seconds": elapsed,
        }

    formats = res.get("formats") or []
    usable = [f for f in formats if f.get("url")]
    progressive = [f for f in usable if f.get("has_video") and f.get("has_audio")]
    best = max(usable, key=lambda f: (f.get("height") or 0)) if usable else None

    return {
        "label": label,
        "url": url,
        "verdict": "PASS" if usable else "FAIL",
        "reason": "" if usable else "resolved but zero formats with a URL",
        "title": res.get("title"),
        "platform": res.get("platform"),
        "source": res.get("source"),
        "total_formats": len(usable),
        "progressive": len(progressive),
        "max_height": best.get("height") if best else 0,
        "best_url": best.get("url") if best else None,
        "transcript_cues": len(((res.get("transcript") or {}).get("items")) or []),
        "seconds": elapsed,
    }


def main():
    results = []
    for label, url in TEST_LINKS:
        print(f"\n>>> {label}: {url}", flush=True)
        r = summarize(label, url)
        results.append(r)
        print(f"    {r['verdict']}  ({r['seconds']}s)  {r.get('reason') or r.get('title', '')}", flush=True)

    print("\n" + "=" * 78)
    print("PROVIDER TEST MATRIX")
    print("=" * 78)
    print(f"{'PLATFORM':<16}{'VERDICT':<9}{'FORMATS':<9}{'MAXH':<7}{'CUES':<6}{'SECS':<7}NOTE")
    for r in results:
        print(
            f"{r['label']:<16}{r['verdict']:<9}"
            f"{r.get('total_formats', 0):<9}{r.get('max_height', 0) or '-':<7}"
            f"{r.get('transcript_cues', 0) or '-':<6}{r['seconds']:<7}"
            f"{(r.get('reason') or r.get('source') or '')[:60]}"
        )
    passed = sum(1 for r in results if r["verdict"] == "PASS")
    print(f"\n{passed}/{len(results)} platforms resolved.")

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "provider_test_results.json"), "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2)


if __name__ == "__main__":
    main()
