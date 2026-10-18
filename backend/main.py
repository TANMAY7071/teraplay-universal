#!/usr/bin/env python3
"""
TeraPlay Universal Media Resolver Microservice
Standalone FastAPI microservice running yt-dlp across all 1,751 platforms.
Deployable on Render, Railway, Fly.io, or any $0 container runtime.
"""

import os
import sys
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
        "version": "1.0.0"
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
