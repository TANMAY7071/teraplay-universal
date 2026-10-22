# TeraPlay Universal Media & Creator Dock

A $0-budget universal media resolver and creator toolkit. Paste a link from YouTube, TeraBox, TikTok, Instagram, Facebook, Bilibili, Dailymotion, Snapchat, LinkedIn, Vimeo, Twitter/X, or any of the 1,751+ platforms `yt-dlp` supports.

Provides in-browser video streaming, multi-tier thumbnail downloads, progressive MP4 downloads with audio, high-bitrate MP3/M4A audio extraction, SubRip `.srt` and `.txt` transcript exports, and monetization slots.

---

## Key capabilities

- Zero-click auto-detection: paste any URL into the dock. The engine identifies the platform on its own, no chip selection.
- Universal downloads:
  - Video MP4: 1080p, 720p, 480p, 360p. Downloads pick progressive audio+video tracks, so a file is never silent.
  - Audio MP3 and M4A: 320 kbps (High Quality), 256 kbps, 192 kbps, 128 kbps, and original master audio streams.
  - Multi-resolution thumbnails: high-resolution cover images extracted for any platform.
  - Transcripts and subtitles: searchable timestamped cues, 1-click clipboard copy, SubRip `.srt` or `.txt` downloads.
- Embedded and custom streaming: in-browser inline player for YouTube/Vimeo embeds and HLS/direct MP4 streams.
- Honest WhatsApp handling: the dock surfaces guidance explaining WhatsApp's end-to-end encryption (E2EE) and tells users to paste the original link shared in chat.
- $0 production ready: split edge architecture (Vercel CDN frontend + Render.com free-tier Python microservice), zero operating cost.

---

## Project structure

```
teraplay-universal/
├── api/                        # Vercel serverless edge endpoints
│   ├── resolve.ts              # Universal media resolver gateway
│   ├── transcript.ts           # Transcript & subtitle parser
│   └── stream-download.ts      # Progressive stream proxy & bypass
├── backend/                    # Standalone Python microservice ($0 Render/Railway)
│   ├── main.py                 # FastAPI microservice
│   ├── requirements.txt        # fastapi, uvicorn, yt-dlp
│   ├── Dockerfile              # Container definition with ffmpeg
│   └── render.yaml             # Render.com 1-click blueprint
├── scripts/
│   └── extractor.py            # Local yt-dlp extraction engine
├── src/
│   ├── components/             # Reusable UI components & Ad banner slots
│   ├── lib/
│   │   ├── urlNormalizer.ts    # Regex normalizer for 13+ platform families
│   │   └── subtitleFormatter.ts# Millisecond SubRip SRT formatter
│   └── pages/
│       └── Index.tsx           # Universal Media Dock UI
├── tests/
│   └── universal-dock.test.mjs # Automated regression test suite
└── DEPLOYMENT.md               # $0 step-by-step production deployment guide
```

---

## Quickstart

### Prerequisites
- Node.js 18+ (tested on Node.js v22)
- Python 3.10+ with `yt-dlp` installed in `.venv`

### Local Development
```bash
# 1. Install frontend dependencies
npm install

# 2. Run automated test suite
node tests/universal-dock.test.mjs

# 3. Start development server
npm run dev
```

Visit `http://localhost:5173` to test the universal dock with any video link.

---

## $0 production deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions:
1. **Backend**: Deploy `backend/` to Render.com ($0 free tier).
2. **Frontend**: Deploy repo to Vercel and add `PYTHON_RESOLVER_URL=https://<your-render-url>`.
3. **Keep Awake**: Ping `https://<your-render-url>/health` via free UptimeRobot every 5 minutes.

---

## Architecture and legacy wisdom

- [CODEBASE_DESIGN.md](CODEBASE_DESIGN.md): Deep architectural guide in plain language for beginners and senior engineers alike. Details $0 bandwidth invariants, deep module boundaries, and design decisions.
- [DONGHUA_LEGACY_WISDOM.md](DONGHUA_LEGACY_WISDOM.md): Preserved techniques from the predecessor Donghua streaming platform (custom Fandom wiki scrapers, zero-config CDN image proxying, metadata federation across AniList/Simkl/TMDB/Trakt, and streaming fallback chains).
