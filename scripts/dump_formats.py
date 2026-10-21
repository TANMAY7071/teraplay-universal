#!/usr/bin/env python3
"""Dump resolved format URLs for benchmarking."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extractor import extract_media_info  # noqa: E402

url = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
res = extract_media_info(url, is_transcript_only=False)
out = {
    "success": res.get("success"),
    "title": res.get("title"),
    "platform": res.get("platform"),
    "formats": [
        {
            "format_id": f.get("format_id"),
            "height": f.get("height"),
            "ext": f.get("ext"),
            "has_audio": f.get("has_audio"),
            "has_video": f.get("has_video"),
            "filesize": f.get("filesize"),
            "url": f.get("url"),
            "audio_url": f.get("audio_url"),
        }
        for f in (res.get("formats") or [])
    ],
}
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resolved_formats.json")
with open(dest, "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=2)
print(f"success={out['success']} title={out['title']!r} formats={len(out['formats'])} -> {dest}")
for f in out["formats"]:
    print(f"  {f['format_id']:<18} h={f['height']:<6} {f['ext']:<5} a={f['has_audio']} v={f['has_video']} size={f['filesize']}")
