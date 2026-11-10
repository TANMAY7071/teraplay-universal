---
title: TeraPlay Dual Resolver API
emoji: 🚀
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# TeraPlay High-Concurrency Dual-Engine Resolver API
Cobalt-style client-assisted media resolver microservice running on Hugging Face Spaces (2 vCPU, 16 GB RAM, $0).

### Endpoints:
- `GET /health`: Health and cache status
- `GET /resolve?url=<media_url>`: In-memory metadata resolution for YouTube, Instagram, TikTok, TeraBox
- `GET /stream-download`: Fallback stream proxy
