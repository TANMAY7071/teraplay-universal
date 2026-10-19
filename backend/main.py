#!/usr/bin/env python3
"""
TeraPlay Universal Media Resolver Microservice
Standalone FastAPI microservice running yt-dlp across all 1,751 platforms.
Deployable on Render, Railway, Fly.io, or any $0 container runtime.
"""

import os
import sys
import re
import shutil
import subprocess
import urllib.request
from fastapi import FastAPI, Query, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_BIN = shutil.which("ffmpeg")

# Add parent directory to path so scripts.extractor can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from scripts.extractor import extract_media_info
except ImportError:
    # If copied standalone into container root
    try:
        from extractor import extract_media_info
    except ImportError as e:
        raise RuntimeError(f"Could not import extractor module: {e}")

app = FastAPI(
    title="TeraPlay Universal Resolver Service",
    description="High-performance media resolver API for TeraPlay Universal Dock",
    version="1.0.0"
)

# Enable CORS for Vercel frontend or any client origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "teraplay-universal-resolver",
        "version": "1.0.0",
        "has_ffmpeg": bool(FFMPEG_BIN)
    }

@app.get("/resolve")
def resolve_endpoint(url: str = Query(..., description="Target media URL to resolve")):
    target = url.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Missing url query parameter")
    
    result = extract_media_info(target, is_transcript_only=False)
    return JSONResponse(content=result)

@app.get("/transcript")
def transcript_endpoint(url: str = Query(..., description="Target media URL or video ID")):
    target = url.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Missing url query parameter")
    
    result = extract_media_info(target, is_transcript_only=True)
    return JSONResponse(content=result)

@app.api_route("/stream-download", methods=["GET", "HEAD"])
def stream_download_endpoint(
    request: Request,
    url: str = Query(..., description="Target video URL"),
    audio_url: str = Query(None, description="Optional audio URL to mux with video"),
    filename: str = Query("video", description="Filename for download"),
    ext: str = Query("mp4", description="File extension")
):
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\. ]', '', filename).strip() or "video"
    if not clean_name.lower().endswith(f".{ext}"):
        clean_name = f"{clean_name}.{ext}"

    mime_types = {
        "mp4": "video/mp4",
        "webm": "video/webm",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png"
    }
    content_type = mime_types.get(ext.lower(), "video/mp4" if ext == "mp4" else "application/octet-stream")

    headers = {
        "Content-Disposition": f'attachment; filename="{clean_name}"',
        "Content-Type": content_type,
        "Accept-Ranges": "bytes"
    }

    if request.method == "HEAD":
        return Response(content=b"", media_type=content_type, headers=headers)

    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

    # If audio_url is provided and ffmpeg binary exists, stream remuxed MP4!
    if audio_url and FFMPEG_BIN:
        cmd = [
            FFMPEG_BIN,
            "-hide_banner",
            "-loglevel", "error",
            "-user_agent", user_agent,
            "-i", url,
            "-user_agent", user_agent,
            "-i", audio_url,
            "-c:v", "copy",
            "-c:a", "aac",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-f", "mp4",
            "pipe:1"
        ]
        # Use stderr=subprocess.DEVNULL to prevent child process pipe buffer deadlock
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

        first_chunk = proc.stdout.read(65536)
        if first_chunk:
            def iter_proc():
                try:
                    yield first_chunk
                    while True:
                        chunk = proc.stdout.read(65536)
                        if not chunk:
                            break
                        yield chunk
                finally:
                    proc.stdout.close()
                    if proc.poll() is None:
                        proc.terminate()

            return StreamingResponse(iter_proc(), media_type="video/mp4", headers=headers)
        else:
            proc.stdout.close()
            if proc.poll() is None:
                proc.terminate()

    # Fallback to single stream
    req = urllib.request.Request(url, headers={"User-Agent": user_agent})
    def iter_stream():
        with urllib.request.urlopen(req, timeout=15) as resp:
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(iter_stream(), media_type=headers["Content-Type"], headers=headers)

@app.api_route("/mux", methods=["GET", "HEAD"])
def mux_endpoint(
    request: Request,
    url: str = Query(..., description="Target video URL"),
    audio_url: str = Query(..., description="Target audio URL to mux"),
    filename: str = Query("video", description="Filename for download"),
    ext: str = Query("mp4", description="File extension")
):
    return stream_download_endpoint(request=request, url=url, audio_url=audio_url, filename=filename, ext=ext)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
