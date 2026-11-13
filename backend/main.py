#!/usr/bin/env python3
"""
TeraPlay High-Concurrency Dual-Engine Resolver Microservice v2.1
Cobalt-matched feature set:
1. Subtitle Manifest Extraction (Multi-language VTT / SRT tracks)
2. Rich Audio Metadata & Album Art Extraction (ID3 metadata, Artist, Album, Cover)
3. SOCKS5 / HTTP Proxy Support for IP Ban Evasion
4. In-Memory TTL Cache (1-hour cache for instant 1ms lookups)
5. Anti-Bot Player Client Rotation ('mweb', 'android_vr', 'ios')
6. TeraBox + Universal Social Media Dual-Engine Routing
"""

import os
import base64
import sys
import re
import ssl
import time
import shutil
import asyncio
import subprocess
import urllib.request
from typing import Optional, Dict, Any, List

# Windows / Linux SSL CA certificate configuration
try:
    import certifi
    os.environ['SSL_CERT_FILE'] = certifi.where()
    os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
except Exception:
    pass

try:
    ssl._create_default_https_context = ssl._create_unverified_context
except Exception:
    pass

from fastapi import FastAPI, Query, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# Detect FFmpeg binary
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
    try:
        from extractor import extract_media_info
    except ImportError:
        extract_media_info = None

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

# In-Memory TTL Cache (1000 items, 1 hour TTL)
RESOLVE_CACHE: Dict[str, tuple] = {}
CACHE_TTL = 3600  # seconds

def get_from_cache(key: str) -> Optional[Dict[str, Any]]:
    if key in RESOLVE_CACHE:
        data, expires_at = RESOLVE_CACHE[key]
        if time.time() < expires_at:
            return data
        else:
            del RESOLVE_CACHE[key]
    return None

def set_in_cache(key: str, data: Dict[str, Any]):
    if len(RESOLVE_CACHE) > 1000:
        now = time.time()
        expired = [k for k, (_, exp) in RESOLVE_CACHE.items() if now >= exp]
        for k in expired:
            del RESOLVE_CACHE[k]
        if len(RESOLVE_CACHE) > 1000:
            RESOLVE_CACHE.pop(next(iter(RESOLVE_CACHE)))
    RESOLVE_CACHE[key] = (data, time.time() + CACHE_TTL)

app = FastAPI(
    title="TeraPlay Dual-Engine Resolver Service",
    description="High-performance media resolver API (Cobalt-matched features + TeraBox)",
    version="2.1.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

MAX_SERVER_MUX_JOBS = int(os.environ.get("MAX_SERVER_MUX_JOBS", 2))
MUX_SEMAPHORE = asyncio.Semaphore(MAX_SERVER_MUX_JOBS)
MAX_RESOLVE_CONCURRENCY = int(os.environ.get("MAX_RESOLVE_CONCURRENCY", 8))
RESOLVE_SEMAPHORE = asyncio.Semaphore(MAX_RESOLVE_CONCURRENCY)
PROXY_URL = os.environ.get("PROXY_URL", "").strip()

def is_terabox_url(url: str) -> bool:
    """Check if the target URL is a TeraBox or mirror cloud link."""
    domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url.lower())
    if not domain_match:
        return False
    host = domain_match.group(1)
    return any(k in host for k in ('terabox', '1024tera', 'teraboxapp', 'teraboxlink', 'mirrobox', 'nephobox', 'momerybox'))

def _get_cookie_file() -> Optional[str]:
    """Materialize YouTube Netscape cookies from env var if configured."""
    cookie_path = "/tmp/yt_cookies.txt"
    raw = os.environ.get("YOUTUBE_COOKIES", "").strip()
    b64 = os.environ.get("YOUTUBE_COOKIES_B64", "").strip()
    if b64 and not raw:
        try:
            raw = base64.b64decode(b64).decode("utf-8", errors="ignore").strip()
        except Exception:
            raw = ""
    if raw:
        with open(cookie_path, "w", encoding="utf-8") as fh:
            fh.write(raw)
        return cookie_path
    return None


def resolve_social_fast(url: str) -> Dict[str, Any]:
    """Cobalt-matched metadata extractor with client rotation, cookies, subtitles, and proxy support."""
    if not yt_dlp:
        raise RuntimeError("yt-dlp is not installed")

    cookie_file = _get_cookie_file()
    is_yt = any(h in url.lower() for h in ('youtube.com', 'youtu.be'))
    client_groups = [
        ['default', 'android', 'web_embedded', 'tv'],
        ['android_vr', 'ios'],
    ] if is_yt else [None]

    info = None
    last_err: Optional[Exception] = None
    for clients in client_groups:
        ydl_opts: Dict[str, Any] = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'socket_timeout': 12,
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
        raise last_err or ValueError("No video information found")

    if True:
        formats = info.get('formats', [])
        progressive = []
        video_only = []
        hls_fallback = []
        audio_only = []

        for f in formats:
            url_stream = f.get('url')
            if not url_stream or not url_stream.startswith('http'):
                continue

            protocol = (f.get('protocol') or '').lower()
            is_hls = 'm3u8' in protocol or '.m3u8' in url_stream.lower()

            vcodec = f.get('vcodec') or 'none'
            acodec = f.get('acodec') or 'none'
            height = f.get('height') or 0
            fmt_id = str(f.get('format_id') or '').lower()
            ext = f.get('ext') or 'mp4'

            # Fix for Facebook, Twitter/X, and social direct MP4s where yt-dlp doesn't probe vcodec/acodec:
            if vcodec == 'none' and acodec == 'none':
                if ext in ('mp4', 'webm', 'mov', 'mkv') or fmt_id in ('sd', 'hd', 'progressive') or f.get('video_ext') != 'none':
                    vcodec = 'auto'
                    acodec = 'auto'

            if not height:
                if 'hd' in fmt_id or '1080' in fmt_id or '720' in fmt_id:
                    height = 720
                elif 'sd' in fmt_id or '360' in fmt_id:
                    height = 360

            quality_label = f"{height}p" if height else f.get('format_note') or 'video'

            fmt_entry = {
                'format_id': f.get('format_id'),
                'quality': quality_label,
                'height': height,
                'resolution': f.get('resolution') or quality_label,
                'ext': ext,
                'url': url_stream,
                'filesize': f.get('filesize') or f.get('filesize_approx'),
                'has_audio': acodec != 'none'
            }

            if is_hls:
                if vcodec != 'none':
                    hls_fallback.append(fmt_entry)
                continue

            if vcodec != 'none' and acodec != 'none':
                progressive.append(fmt_entry)
            elif vcodec != 'none' and acodec == 'none':
                video_only.append(fmt_entry)
            elif vcodec == 'none' and acodec != 'none':
                fmt_entry['bitrate'] = f.get('abr') or 0
                audio_only.append(fmt_entry)

        if not progressive and not video_only and hls_fallback:
            video_only = hls_fallback

        if not progressive and not video_only and formats:
            for f in formats:
                u = f.get('url')
                if u and u.startswith('http'):
                    progressive.append({
                        'format_id': f.get('format_id') or 'direct',
                        'quality': 'Standard Quality',
                        'height': 720,
                        'resolution': '720p',
                        'ext': f.get('ext') or 'mp4',
                        'url': u,
                        'filesize': f.get('filesize'),
                        'has_audio': True
                    })

        audio_only.sort(key=lambda a: (a.get('ext') == 'm4a', a.get('bitrate') or 0), reverse=True)
        best_audio_url = audio_only[0]['url'] if audio_only else None
        progressive.sort(key=lambda v: (v.get('height') or 0, v.get('ext') == 'mp4'), reverse=True)
        video_only.sort(key=lambda v: (v.get('height') or 0, v.get('ext') == 'mp4'), reverse=True)

        standard_formats = []
        for p in progressive:
            standard_formats.append({
                'format_id': p.get('format_id') or 'progressive',
                'quality': p['quality'],
                'resolution': p['resolution'],
                'ext': p['ext'],
                'url': p['url'],
                'has_audio': True,
                'can_mux': False
            })

        for v in video_only:
            standard_formats.append({
                'format_id': v.get('format_id') or 'video',
                'quality': v['quality'],
                'resolution': v['resolution'],
                'ext': v['ext'],
                'url': v['url'],
                'audio_url': best_audio_url,
                'has_audio': False,
                'can_mux': bool(best_audio_url)
            })

        # Cobalt Feature #1: Extract Subtitle Tracks (English, Spanish, etc.)
        extracted_subtitles: List[Dict[str, str]] = []
        all_subs = {**(info.get('subtitles') or {}), **(info.get('automatic_captions') or {})}
        for lang_code, sub_variants in all_subs.items():
            for sub in sub_variants:
                if sub.get('ext') in ('vtt', 'srt'):
                    extracted_subtitles.append({
                        'lang': lang_code,
                        'name': sub.get('name') or lang_code,
                        'url': sub.get('url'),
                        'ext': sub.get('ext')
                    })
                    break

        # Cobalt Feature #2: Rich Audio Metadata & Cover Art
        artist = info.get('artist') or info.get('creator') or info.get('uploader') or 'Unknown Artist'
        track_name = info.get('track') or info.get('title') or 'Unknown Track'
        album_name = info.get('album') or 'Single'
        thumbnail_url = info.get('thumbnail')

        main_url = progressive[0]['url'] if progressive else (video_only[0]['url'] if video_only else (audio_only[0]['url'] if audio_only else None))

        return {
            'success': True,
            'title': info.get('title') or 'Video Stream',
            'thumbnail': thumbnail_url,
            'duration': info.get('duration'),
            'uploader': info.get('uploader'),
            'source': info.get('extractor_key', 'universal').lower(),
            'artist': artist,
            'track': track_name,
            'album': album_name,
            'stream_url': main_url,
            'download_url': main_url,
            'fast_download_url': main_url,
            'm3u8_url': main_url,
            'formats': standard_formats,
            'video_formats': standard_formats,
            'audio_formats': audio_only,
            'subtitles': extracted_subtitles,
            'client_wasm_ready': True
        }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "teraplay-dual-engine-resolver",
        "version": "2.1.0",
        "has_ffmpeg": bool(FFMPEG_BIN),
        "proxy_enabled": bool(PROXY_URL),
        "cached_links": len(RESOLVE_CACHE)
    }


@app.get("/resolve")
async def resolve_endpoint(url: str = Query(..., description="Target media URL to resolve")):
    target = url.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Missing url query parameter")

    cached = get_from_cache(target)
    if cached:
        return JSONResponse(content=cached)

    async with RESOLVE_SEMAPHORE:
        loop = asyncio.get_running_loop()
        try:
            if is_terabox_url(target):
                if not extract_media_info:
                    raise RuntimeError("TeraBox extractor module not available")
                result = await loop.run_in_executor(None, extract_media_info, target, False)
            else:
                result = await loop.run_in_executor(None, resolve_social_fast, target)

            if result and result.get("success", True):
                set_in_cache(target, result)

            return JSONResponse(content=result)

        except Exception as exc:
            try:
                if extract_media_info:
                    result = await loop.run_in_executor(None, extract_media_info, target, False)
                    if result and result.get("success", True):
                        set_in_cache(target, result)
                        return JSONResponse(content=result)
            except Exception:
                pass
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Resolution failed: {str(exc)}"}
            )


@app.get("/transcript")
def transcript_endpoint(url: str = Query(..., description="Target media URL or video ID")):
    target = url.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Missing url query parameter")
    if extract_media_info:
        result = extract_media_info(target, is_transcript_only=True)
        return JSONResponse(content=result)
    return JSONResponse(content={"success": False, "error": "Transcript service unavailable"})


@app.api_route("/stream-download", methods=["GET", "HEAD"])
async def stream_download_endpoint(
    request: Request,
    url: str = Query(..., description="Target video URL"),
    audio_url: str = Query(None, description="Optional audio URL to mux with video"),
    filename: str = Query("video", description="Filename for download"),
    ext: str = Query("mp4", description="File extension")
):
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\. ]', '', filename).strip() or "video"
    if not clean_name.lower().endswith(f".{ext}"):
        clean_name = f"{clean_name}.{ext}"

    content_type = "video/mp4" if ext == "mp4" else "application/octet-stream"
    headers = {
        "Content-Disposition": f'attachment; filename="{clean_name}"',
        "Content-Type": content_type,
        "Accept-Ranges": "bytes"
    }

    if request.method == "HEAD":
        return Response(content=b"", media_type=content_type, headers=headers)

    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    is_hls = '.m3u8' in url.lower() or '/manifest/hls/' in url.lower() or 'manifest.googlevideo.com' in url.lower()

    if (audio_url or is_hls) and FFMPEG_BIN:
        try:
            await asyncio.wait_for(MUX_SEMAPHORE.acquire(), timeout=15.0)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=429,
                detail="Server muxing queue is currently full. Use direct browser download."
            )

        cmd = [
            FFMPEG_BIN,
            "-hide_banner",
            "-loglevel", "error",
            "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
            "-user_agent", user_agent,
            "-i", url,
        ]
        if audio_url:
            cmd.extend([
                "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
                "-user_agent", user_agent,
                "-i", audio_url
            ])
        cmd.extend([
            "-c:v", "copy",
            "-c:a", "aac",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-f", "mp4",
            "pipe:1"
        ])
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        first_chunk = proc.stdout.read(65536)

        def iter_proc():
            try:
                if first_chunk:
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
                MUX_SEMAPHORE.release()

        return StreamingResponse(iter_proc(), media_type="video/mp4", headers=headers)

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
async def mux_endpoint(
    request: Request,
    url: str = Query(..., description="Target video URL"),
    audio_url: str = Query(..., description="Target audio URL to mux"),
    filename: str = Query("video", description="Filename for download"),
    ext: str = Query("mp4", description="File extension")
):
    return await stream_download_endpoint(request=request, url=url, audio_url=audio_url, filename=filename, ext=ext)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
