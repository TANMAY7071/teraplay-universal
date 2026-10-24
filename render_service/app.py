"""
TeraPlay remote resolver service (Render/Railway).

Exposes GET /resolve?url=<share-link> and returns the same JSON shape that
scripts/extractor.py prints. api/resolve.ts calls this first when
PYTHON_RESOLVER_URL is set, so TeraBox links resolve from this host's IP
instead of Vercel's datacenter IP.

Deploy:
  1. Push this repo to GitHub.
  2. Render: New Web Service -> repo -> root directory `render_service`.
  3. Build:   pip install -r requirements.txt
     Start:   gunicorn app:app --timeout 120
  4. Set Vercel env PYTHON_RESOLVER_URL=https://<service>.onrender.com
"""
import json
import sys
import os

from flask import Flask, request, jsonify

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

import extractor  # noqa: E402

app = Flask(__name__)


@app.get("/resolve")
def resolve():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"success": False, "error": "Missing url parameter"}), 400
    # Longest path is TeraBox (share page + share/list + gateway retry).
    result = extractor.extract_media_info(url)
    return app.response_class(
        json.dumps(result), mimetype="application/json"
    )


@app.get("/health")
def health():
    return jsonify({"ok": True, "yt_dlp": extractor.yt_dlp is not None})


if __name__ == "__main__":
    # Render routes to the container through its gateway; 0.0.0.0 is required
    # for their platform, the gateway is the network boundary.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
