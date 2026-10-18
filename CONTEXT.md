# TeraPlay Universal Media & Creator Dock

A lightweight, high-performance web application engineered for content creators and everyday video streamers. Built with React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, and serverless edge functions.

## Core Capabilities

### 1. YouTube Creator Studio
- **Transcript & Subtitle Studio**: Extracts timestamped cues from YouTube caption tracks via `api/transcript.ts` and `scripts/extractor.py`. Provides full search filtering, timestamp toggle, 1-click clipboard copy, `.txt` transcript download, and standardized SubRip `.srt` subtitle export with boundary clipping.
- **Full-Resolution Thumbnail Grabber**: Instant client-side blob download across 4 resolution tiers:
  - MaxRes Quality (1080p): `1920 × 1080` (`maxresdefault.jpg`) with automatic fallback to HQ on older video uploads.
  - High Quality (720p): `1280 × 720` (`hqdefault.jpg`).
  - Standard Quality (SD): `640 × 480` (`sddefault.jpg`).
  - Medium Quality (MQ): `320 × 180` (`mqdefault.jpg`).
- **Responsive Embed Player**: Privacy-enhanced player preview (`youtube-nocookie.com`) with 1-click HTML embed snippet copy.

### 2. TeraBox Web Streaming & MP4 Downloader
- **In-Browser Player**: Plays videos from 12+ TeraBox mirror domains (`1024tera.com`, `nephobox.com`, `freeterabox.com`, etc.) directly in the browser via bundled `hls.js` in `CustomVideoPlayer.tsx`, bypassing client app installs.
- **Fast MP4 Download**: Trigger direct MP4 downloads through edge streaming endpoints.

### 3. Monetization & Ad Network Integration
- **Placement**: Discrete ad slots (`AdBannerSlot.tsx`) mounted at top leaderboard, mid-content, and bottom positions.
- **Dynamic Execution**: Supports contextual HTML and script injection (`createContextualFragment`) for Monetag, Adsterra, and Google AdSense networks.

### 4. Legal Compliance & SEO Architecture
- **Compliance**: Dedicated legal pages (`/dmca`, `/privacy`, `/terms`, `/disclaimer`, `/contact`) to ensure instant ad network approval.
- **SEO Landing Routes**: Targeted canonical entry routes in `src/App.tsx` and `src/data/seoRoutes.ts` with structured Schema.org JSON-LD metadata.

## Architectural Invariants

- **Zero-Cost Operation**: Prioritize client-side computation (browser blob conversion, SubRip formatting, oEmbed metadata) to eliminate expensive server proxy bandwidth.
- **Honest States**: No mock or false data injection. Videos without captions display an explicit empty state with an opt-in demo cues loader.
- **Bundle Chunking**: Heavy libraries (e.g. `hls.js`) are isolated into dedicated vendor chunks (`hls-vendor`) via `vite.config.ts`, keeping the main index bundle under 150 kB.
