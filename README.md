# TeraPlay Universal Media & Creator Dock

A high-performance, $0-budget universal media resolver and creator toolkit supporting **1,751+ platforms** enabled by `yt-dlp` (YouTube, TeraBox, TikTok, Instagram, Facebook, Bilibili, Dailymotion, Snapchat, LinkedIn, Vimeo, Twitter/X, and more).

Provides in-browser video streaming, multi-tier thumbnail downloads, progressive MP4 downloads with audio, high-bitrate MP3/M4A audio extraction, SubRip `.srt` and `.txt` transcript exports, and monetization slots.

---

## ⚡ Key Capabilities

- **Zero-Click Auto-Detection**: Paste any URL directly into the dock. The engine automatically detects the platform without requiring chip selection.
- **Universal Downloads**:
  - **Video MP4**: 1080p, 720p, 480p, 360p (automatically selects progressive audio+video tracks so downloads are never silent).
  - **Audio MP3 & M4A**: 320 kbps (High Quality), 256 kbps, 192 kbps, 128 kbps, and original master audio streams.
  - **Multi-Resolution Thumbnails**: High-resolution cover images dynamically extracted for any platform.
  - **Transcripts & Subtitles**: Searchable timestamped cues, 1-click clipboard copy, and SubRip `.srt` or `.txt` downloads.
- **Embedded & Custom Streaming**: In-browser inline player supporting YouTube/Vimeo embeds and HLS/direct MP4 streams.
- **Honest WhatsApp Handling**: Explicitly surfaces guidance explaining WhatsApp's end-to-end encryption (E2EE) and instructs users to paste the original video links shared inside chats.
- **$0 Production Ready**: Split edge architecture (Vercel CDN frontend + Render.com free-tier Python microservice) with zero operating cost.

---

## 📂 Project Structure

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

## 🛠️ Quickstart

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

## 🚀 $0 Production Deployment

See [DEPLOYMENT.md](file:///c:/Users/ASUS/Desktop/my%20website/teraplay-universal/DEPLOYMENT.md) for full instructions:
1. **Backend**: Deploy `backend/` to Render.com ($0 free tier).
2. **Frontend**: Deploy repo to Vercel and add `PYTHON_RESOLVER_URL=https://<your-render-url>`.
3. **Keep Awake**: Ping `https://<your-render-url>/health` via free UptimeRobot every 5 minutes.
