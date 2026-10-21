#!/usr/bin/env python3
"""
Download-throughput experiment.

Q1: Is the slow YouTube download a throttle on the user's connection, or a
    throttle on the CDN's per-connection stream?
    -> Download the SAME 1080p URL with 1, 2, 4, 8, 16 parallel Range requests.

Q2: Do some yt-dlp player clients hand out URLs that are NOT throttled?
    -> Re-resolve with different player_client sets, measure single-stream speed.

Q3: What is the user's actual line speed (control)?
    -> Cloudflare speed endpoint, not YouTube.
"""
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

MB = 1024 * 1024
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"


def http_get(url, headers=None, timeout=60, method="GET"):
    """Open a request. Caller owns closing the returned response."""
    req = urllib.request.Request(url, headers=headers or {"User-Agent": UA}, method=method)
    return urllib.request.urlopen(req, timeout=timeout)


def content_length(url):
    try:
        r = http_get(url, method="HEAD", timeout=20)
        length = int(r.headers.get("content-length") or 0)
        r.close()
        return length
    except Exception:
        return 0


def stream_bytes(url, headers=None, limit=None):
    """Download and return (bytes_read, seconds)."""
    t0 = time.time()
    total = 0
    r = http_get(url, headers)
    try:
        while True:
            chunk = r.read(262144)
            if not chunk:
                break
            total += len(chunk)
            if limit and total >= limit:
                break
    finally:
        r.close()
    return total, time.time() - t0


def parallel_ranges(url, parts, limit_per_part=None):
    """Download url with `parts` concurrent Range requests. Returns (bytes, seconds)."""
    total = content_length(url)
    if not total:
        return 0, 0.0
    chunk = total // parts
    t0 = time.time()

    def worker(i):
        start = i * chunk
        end = total - 1 if i == parts - 1 else (start + chunk - 1)
        headers = {"User-Agent": UA, "Range": f"bytes={start}-{end}"}
        got = 0
        r = http_get(url, headers)
        try:
            while True:
                c = r.read(262144)
                if not c:
                    break
                got += len(c)
                if limit_per_part and got >= limit_per_part:
                    break
        finally:
            r.close()
        return got

    with ThreadPoolExecutor(max_workers=parts) as ex:
        total_bytes = sum(ex.map(worker, range(parts)))
    return total_bytes, time.time() - t0


def human(n):
    return f"{n / MB:.1f} MB"


def main():
    results = {}

    # ---------- Q3: control - raw line speed ----------
    print("=" * 74)
    print("Q3  CONTROL: raw line speed (not YouTube)")
    print("=" * 74)
    control_urls = [
        "https://speed.cloudflare.com/__down?bytes=50000000",
        "https://proof.ovh.net/files/100Mb.dat",
    ]
    b = s = 0
    for cu in control_urls:
        try:
            b, s = stream_bytes(cu, limit=80 * MB)
            print(f"  source: {cu}")
            break
        except Exception as e:  # noqa: BLE001
            print(f"  (skip {cu.split('/')[2]}: {str(e)[:60]})")
    if b:
        print(f"  {human(b):>12}  {s:6.2f}s  {b / MB / s:6.2f} MB/s  (~{b * 8 / s / 1e6:.0f} Mbps)")
        results["raw_line"] = {"bytes": b, "seconds": s, "mbps": round(b / MB / s, 2)}

    # ---------- Q1: parallel range scaling on the 1080p googlevideo URL ----------
    resolved = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "resolved_formats.json"), encoding="utf-8"))
    fmt = {f["format_id"]: f for f in resolved["formats"]}
    video_1080 = fmt["137"]["url"]

    print()
    print("=" * 74)
    print("Q1  SAME 1080p URL, N parallel Range requests")
    print("=" * 74)
    scaling = []
    for parts in (1, 2, 4, 8, 16):
        try:
            b, s = parallel_ranges(video_1080, parts)
            mbps = b / MB / s
            print(f"  {parts:>2} connection(s): {human(b):>12}  {s:6.2f}s  {mbps:6.2f} MB/s  (~{b * 8 / s / 1e6:.0f} Mbps)")
            scaling.append({"parts": parts, "bytes": b, "seconds": s, "mbps": round(mbps, 2)})
        except Exception as e:  # noqa: BLE001
            print(f"  {parts:>2} connection(s): ERROR {str(e)[:60]}")
    results["range_scaling"] = scaling

    # ---------- Q2: player clients ----------
    print()
    print("=" * 74)
    print("Q2  yt-dlp player_client variants -> single-connection 1080p speed")
    print("=" * 74)
    import yt_dlp

    clients_to_try = [
        ("default (tv,web_embedded,default,android)", "tv,web_embedded,default,android"),
        ("tv", "tv"),
        ("ios", "ios"),
        ("web_safari", "web_safari"),
        ("mweb", "mweb"),
        ("android_vr", "android_vr"),
        ("web_creator", "web_creator"),
    ]

    client_results = []
    for label, clients in clients_to_try:
        opts = {
            "quiet": True,
            "no_warnings": True,
            "nocheckcertificate": True,
            "skip_download": True,
            "noplaylist": True,
            "extractor_args": {"youtube": {"player_client": [c.strip() for c in clients.split(",")]}},
            "http_headers": {"User-Agent": UA},
        }
        entry = {"client": label, "clients": clients}
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info("https://www.youtube.com/watch?v=dQw4w9WgXcQ", download=False)
            target = None
            for f in info.get("formats") or []:
                if f.get("format_id") in ("137", "248", "313") and f.get("vcodec") not in ("none", None):
                    target = f
                    break
            if not target:
                entry["result"] = "no 1080p format returned"
            else:
                b, s = stream_bytes(target["url"], limit=12 * MB)
                entry["mbps"] = round(b / MB / s, 2)
                entry["result"] = f"{b / MB / s:.2f} MB/s over {human(b)}"
                print(f"  {label:<42} {entry['mbps']:>6} MB/s   (fmt {target.get('format_id')})")
        except Exception as e:  # noqa: BLE001
            entry["result"] = f"ERROR {str(e)[:70]}"
            print(f"  {label:<42} {entry['result']}")
        client_results.append(entry)
    results["player_clients"] = client_results

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "speed_experiment.json"), "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2)
    print("\nwrote scripts/speed_experiment.json")


if __name__ == "__main__":
    main()
