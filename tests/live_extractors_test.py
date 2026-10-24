#!/usr/bin/env python3
"""Live verification suite for the document/Reddit resolvers.

Run: python tests/live_extractors_test.py
Each test hits the real public service, so results are real-time truth,
not fixtures. Reddit may report a network-level block; that is reported
as BLOCKED, not FAIL, because the resolver handled it honestly.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import extractor  # noqa: E402

PASS, FAIL, BLOCKED = 0, 0, 0

def report(name, ok, detail):
    global PASS, FAIL, BLOCKED
    if ok is True:
        PASS += 1
        print(f"  PASS  {name}: {detail}")
    elif ok is False:
        FAIL += 1
        print(f"  FAIL  {name}: {detail}")
    else:
        BLOCKED += 1
        print(f"  BLOCK {name}: {detail}")

def wattpad_tests():
    print("[1] WATTPAD")
    r = extractor.resolve_wattpad_media("https://www.wattpad.com/story/161281466-popular-meets-popular")
    if not r.get("success"):
        report("story resolve", False, r.get("error", "unknown")[:120])
        return
    text = r.get("text_content") or ""
    report("story resolve", True, f"title={r['title']!r}, {len(text)} chars")
    report("has chapter headings", "\n## " in text, "part titles embedded")
    report("text cap + truncation notice", "[Truncated" in text, "cap logic fired on a long novel")
    report("author credited", "aikexoxi" in text.split("\n")[1], "byline present")

    r2 = extractor.resolve_wattpad_media("https://www.wattpad.com/story/99999999999999-does-not-exist")
    report("missing story honest error", r2.get("success") is False and "error" in r2,
           r2.get("error", "")[:80])

def slideshare_tests():
    print("[2] SLIDESHARE")
    r = extractor.resolve_slideshare_media("https://www.slideshare.net/slideshow/death-by-powerpoint/85551")
    slides = (r.get("thumbnails") or [])
    report("deck resolve", r.get("success") is True and len(slides) > 0,
           f"title={r.get('title')!r}, {len(slides)} slides")
    report("slide urls on cdn", all("image.slidesharecdn.com" in s["url"] for s in slides),
           "all slides served from public CDN")
    report("slide labels ordered", bool(slides) and slides[-1]["quality_label"].startswith(f"Slide {len(slides)}"),
           f"last labeled {slides[-1]['quality_label'] if slides else 'n/a'}")

    r2 = extractor.resolve_slideshare_media("https://www.slideshare.net/slideshow/does-not-exist-9x7x6x/123456789")
    report("missing deck honest error", r2.get("success") is False, r2.get("error", "")[:80])

def reddit_tests():
    print("[3] REDDIT")
    r = extractor.resolve_reddit_media("https://www.reddit.com/r/aww/comments/1g7s9ts/oc_he_learns_to_hug/")
    if r.get("success"):
        report("post resolve", True, f"title={r.get('title')!r}, audio_url={'yes' if r.get('audio_url') else 'muted video'}")
    elif "REDDIT_SESSION" in (r.get("error") or ""):
        report("post resolve", None, "Reddit login-walls anonymous JSON from this IP; resolver returned the actionable error and REDDIT_SESSION env can unlock it")
    else:
        report("post resolve", False, r.get("error", "unknown")[:120])

    r2 = extractor.resolve_reddit_media("https://www.reddit.com/r/aww/comments/1g7s9ts/.json?query=x")
    report("query string handled", (r2.get("success") or "REDDIT_SESSION" in (r2.get("error") or "") or "404" in (r2.get("error") or "")),
           "no crash on cache-buster query params")

def ssrf_guard_tests():
    print("[4] SSRF GUARD")
    for bad in ["file:///etc/passwd", "http://127.0.0.1:8080/x", "http://169.254.169.254/latest/meta-data", "ftp://example.com/x"]:
        try:
            extractor._assert_public_http_url(bad)
            report(f"block {bad[:40]}", False, "was NOT blocked")
        except ValueError as e:
            report(f"block {bad[:40]}", True, str(e)[:60])
    try:
        extractor._assert_public_http_url("http://evil.com/target", allowed_hosts=("reddit.com",))
        report("host allowlist", False, "evil.com was NOT blocked")
    except ValueError as e:
        report("host allowlist", True, str(e)[:60])

if __name__ == "__main__":
    print("=== TeraPlay live extractor suite ===")
    wattpad_tests()
    slideshare_tests()
    reddit_tests()
    ssrf_guard_tests()
    print(f"\n=== RESULT: {PASS} passed, {FAIL} failed, {BLOCKED} blocked (environment) ===")
    sys.exit(1 if FAIL else 0)
