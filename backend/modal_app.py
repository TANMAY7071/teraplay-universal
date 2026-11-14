"""
TeraPlay / LinkCastle Production Modal Microservice
Optimized for Modal.com ($30/month free recurring credit, 1 TiB egress, 2 GB RAM, no credit card).
Also portable to raw Uvicorn / Docker / Render environments.
"""

import os
import sys
import base64
import time
import asyncio
import tempfile
import shutil
import re
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, Query, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Ensure scripts directory is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

try:
    from scripts.extractor import extract_media_info
except ImportError:
    try:
        from extractor import extract_media_info
    except ImportError:
        extract_media_info = None

# --- Configuration & Guardrails ---
MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "4"))
SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT_JOBS)
PROXY_URL = os.environ.get("PROXY_URL", "").strip()
ENABLE_MUX = os.environ.get("ENABLE_MUX", "false").lower() in ("true", "1")
API_KEY = os.environ.get("API_KEY", "").strip()

# In-Memory TTL Cache (1000 items, 2-hour TTL)
RESOLVE_CACHE: Dict[str, tuple] = {}
CACHE_TTL = 7200  # seconds

def get_from_cache(key: str) -> Optional[Dict[str, Any]]:
    if key in RESOLVE_CACHE:
        data, expires_at = RESOLVE_CACHE[key]
        if time.time() < expires_at:
            return data
        else:
            del RESOLVE_CACHE[key]
    return None

def set_in_cache(key: str, data: Dict[str, Any]):
    now = time.time()
    if len(RESOLVE_CACHE) > 1000:
        expired = [k for k, (_, exp) in RESOLVE_CACHE.items() if now >= exp]
        for k in expired:
            del RESOLVE_CACHE[k]
        if len(RESOLVE_CACHE) > 1000:
            RESOLVE_CACHE.pop(next(iter(RESOLVE_CACHE)))
    RESOLVE_CACHE[key] = (data, now + CACHE_TTL)

def _get_cookie_file() -> Optional[str]:
    """Decode base64 cookies if provided via environment variable."""
    raw_b64 = os.environ.get("COOKIES_B64", "").strip()
    if not raw_b64:
        return None
    try:
        cookie_path = os.path.join(tempfile.gettempdir(), "cookies.txt")
        if not os.path.exists(cookie_path) or os.path.getsize(cookie_path) == 0:
            decoded = base64.b64decode(raw_b64).decode("utf-8", errors="ignore")
            with open(cookie_path, "w", encoding="utf-8") as fh:
                fh.write(decoded)
        return cookie_path
    except Exception as exc:
        print(f"[Cookies] Warning: Failed to decode COOKIES_B64: {exc}")
        return None

def is_terabox_url(url: str) -> bool:
    """Check if the target URL is a TeraBox or mirror cloud link."""
    domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url.lower())
    if not domain_match:
        return False
    host = domain_match.group(1)
    return any(k in host for k in ('terabox', '1024tera', 'teraboxapp', 'teraboxlink', 'mirrobox', 'nephobox', 'momerybox'))

# --- Core FastAPI App ---
app = FastAPI(
    title="LinkCastle Universal Media Microservice",
    description="High-concurrency media resolver optimized for Modal 2GB RAM / 1 TiB egress",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    url: str = Field(..., description="Target media URL")
    quality: str = Field(default="best", description="Target quality (best, 1080p, 720p, audio)")
    include_formats: bool = Field(default=True, description="Whether to include full formats list")

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if API_KEY and request.url.path.startswith("/api/"):
        auth_header = request.headers.get("X-API-Key") or request.headers.get("Authorization", "").replace("Bearer ", "")
        if auth_header != API_KEY:
            return JSONResponse(status_code=401, content={"error": "Unauthorized: Invalid or missing API key"})
    return await call_next(request)

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """Non-blocking instant health probe."""
    return {
        "status": "ok",
        "service": "linkcastle-modal-microservice",
        "version": "3.0.0",
        "cached_entries": len(RESOLVE_CACHE),
        "has_ffmpeg": shutil.which("ffmpeg") is not None,
        "max_concurrent_jobs": MAX_CONCURRENT_JOBS
    }

def _sync_extract_social(url: str) -> Dict[str, Any]:
    """Execute synchronous yt-dlp metadata extraction without downloading media bytes."""
    if not yt_dlp:
        raise RuntimeError("yt-dlp is not installed")

    cookie_file = _get_cookie_file()
    is_yt = any(h in url.lower() for h in ('youtube.com', 'youtu.be'))

    # Prioritize mobile/TV clients to avoid YouTube datacenter bot challenges
    client_groups = [
        ['android', 'ios', 'tv'],
        ['android_vr', 'mweb'],
        ['web_embedded', 'default'],
    ] if is_yt else [None]

    info = None
    last_err: Optional[Exception] = None

    for clients in client_groups:
        ydl_opts: Dict[str, Any] = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': False,
            'noplaylist': True,
            'nocheckcertificate': True,
            'writesubtitles': False,
            'writeautomaticsub': False,
            'socket_timeout': 8,
            'retries': 2,
            'fragment_retries': 1,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }
        if clients:
            ydl_opts['extractor_args'] = {'youtube': {'player_client': clients}}
        if PROXY_URL:
            ydl_opts['proxy'] = PROXY_URL
        if cookie_file:
            ydl_opts['cookiefile'] = cookie_file

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info and info.get('formats'):
                    break
        except Exception as exc:
            last_err = exc

    if not info:
        raise last_err or ValueError("Could not extract media metadata")

    title = info.get('title') or 'Universal Video Stream'
    thumbnail = info.get('thumbnail') or ''
    duration = info.get('duration') or 0
    extractor_key = (info.get('extractor_key') or info.get('extractor') or '').lower()

    formats = info.get('formats', [])
    mapped_formats = []
    video_formats = []
    audio_formats = []

    for f in formats:
        url_stream = f.get('url')
        if not url_stream or not url_stream.startswith('http'):
            continue

        vcodec = f.get('vcodec') or 'none'
        acodec = f.get('acodec') or 'none'
        height = f.get('height') or 0
        fmt_id = str(f.get('format_id') or '').lower()
        ext = f.get('ext') or 'mp4'

        has_video = vcodec != 'none'
        has_audio = acodec != 'none'

        if not has_video and not has_audio:
            if ext in ('mp4', 'webm', 'mov', 'mkv'):
                has_video = True
                has_audio = True

        quality_label = f.get('format_note') or f"{height}p" if height else "Standard"

        fmt_entry = {
            "format_id": fmt_id,
            "quality": quality_label,
            "height": height,
            "ext": ext,
            "filesize": f.get('filesize') or f.get('filesize_approx') or 0,
            "url": url_stream,
            "has_audio": has_audio,
            "has_video": has_video,
            "is_progressive": has_video and has_audio
        }

        mapped_formats.append(fmt_entry)
        if has_video:
            video_formats.append(fmt_entry)
        if has_audio and not has_video:
            audio_formats.append(fmt_entry)

    # Sort video formats descending by resolution
    video_formats.sort(key=lambda x: x.get('height', 0), reverse=True)

    # Preferred direct progressive stream
    direct_progressive = next((f for f in video_formats if f.get('is_progressive')), None)
    stream_url = direct_progressive['url'] if direct_progressive else (video_formats[0]['url'] if video_formats else None)

    return {
        "success": True,
        "title": title,
        "thumbnail": thumbnail,
        "duration": duration,
        "source": extractor_key,
        "stream_url": stream_url,
        "download_url": stream_url,
        "formats": mapped_formats,
        "video_formats": video_formats,
        "audio_formats": audio_formats,
        "client_wasm_ready": True
    }

@app.api_route("/resolve", methods=["GET", "POST"])
@app.api_route("/api/extract", methods=["GET", "POST"])
async def resolve_media(request: Request, url: Optional[str] = None):
    """
    Universal media resolver endpoint.
    Accepts URL via GET query parameter or POST JSON body.
    Zero-bandwidth invariant: returns direct stream URLs for browser-side consumption.
    """
    target_url = url
    if not target_url and request.method == "POST":
        try:
            body = await request.json()
            target_url = body.get("url")
        except Exception:
            pass

    if not target_url:
        raise HTTPException(status_code=400, detail="Missing url parameter")

    target_url = target_url.strip()

    # 1. In-Memory Cache Check
    cached = get_from_cache(target_url)
    if cached:
        return JSONResponse(content=cached)

    # 2. Concurrency Queue (Max wait 10s before 503)
    try:
        await asyncio.wait_for(SEMAPHORE.acquire(), timeout=10.0)
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=503,
            headers={"Retry-After": "5"},
            content={"success": False, "error": "Server busy under high load. Please retry in 5 seconds."}
        )

    try:
        loop = asyncio.get_running_loop()
        if is_terabox_url(target_url) and extract_media_info:
            result = await loop.run_in_executor(None, extract_media_info, target_url, False)
        else:
            result = await loop.run_in_executor(None, _sync_extract_social, target_url)

        if result and result.get("success", True):
            set_in_cache(target_url, result)

        return JSONResponse(content=result)

    except yt_dlp.utils.DownloadError as exc:
        err_msg = str(exc)
        if any(w in err_msg.lower() for w in ("bot", "sign in", "confirm", "rate limit")):
            return JSONResponse(status_code=429, content={"success": False, "error": "Upstream platform rate limited. Try another video or retry shortly."})
        return JSONResponse(status_code=422, content={"success": False, "error": f"Media unavailable: {err_msg}"})

    except Exception as exc:
        return JSONResponse(status_code=400, content={"success": False, "error": f"Extraction failed: {str(exc)}"})

    finally:
        SEMAPHORE.release()

@app.post("/api/mux")
async def server_side_mux(request: Request, video_url: str = Query(...), audio_url: str = Query(...), filename: str = Query("video")):
    """
    High-bandwidth server-side FFmpeg muxing endpoint (enabled on Modal where 1 TiB egress is free).
    Disabled on low-egress hosts by default.
    """
    if not ENABLE_MUX:
        raise HTTPException(status_code=403, detail="Server-side muxing is disabled on this tier. Use client-side WASM muxing.")

    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        raise HTTPException(status_code=500, detail="FFmpeg binary not available on server")

    tmp_out = os.path.join(tempfile.gettempdir(), f"mux_{int(time.time())}_{os.getpid()}.mp4")

    cmd = [
        ffmpeg_bin, "-y",
        "-i", video_url,
        "-i", audio_url,
        "-c", "copy",
        "-movflags", "+faststart",
        tmp_out
    ]

    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0 or not os.path.exists(tmp_out):
        if os.path.exists(tmp_out):
            os.remove(tmp_out)
        raise HTTPException(status_code=500, detail=f"FFmpeg muxing failed: {stderr.decode(errors='ignore')[-300:]}")

    def iterfile():
        try:
            with open(tmp_out, "rb") as fh:
                while chunk := fh.read(1024 * 1024):
                    yield chunk
        finally:
            if os.path.exists(tmp_out):
                try:
                    os.remove(tmp_out)
                except Exception:
                    pass

    safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename) + ".mp4"
    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'}
    )


# --- Modal Deployment Specification (Modal.com) ---
try:
    import modal

    # Define container image with FFmpeg, NodeJS, and Python packages
    modal_image = (
        modal.Image.debian_slim(python_version="3.11")
        .apt_install("ffmpeg", "nodejs", "ca-certificates")
        .pip_install(
            "fastapi[standard]>=0.110.0",
            "uvicorn[standard]>=0.28.0",
            "yt-dlp>=2025.01.01",
            "pydantic>=2.0.0",
            "requests>=2.31.0"
        )
        .add_local_dir(os.path.join(parent_dir, "scripts"), remote_path="/root/scripts")
    )

    modal_app = modal.App(name="linkcastle-resolver")

    # Expose FastAPI as ASGI web endpoint with 2GB RAM and 2 vCPUs
    @modal_app.function(
        image=modal_image,
        cpu=0.5,
        memory=1024,
        timeout=300,
        scaledown_window=60,
    )
    @modal.asgi_app()
    def web():
        return app

except ImportError:
    # Running outside of Modal CLI (e.g. local uvicorn or Render Docker container)
    pass
