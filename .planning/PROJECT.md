# TeraPlay Universal Media & Creator Dock

## What This Is

TeraPlay is a zero-budget, high-performance web platform that turns raw video links into creator-ready assets and seamless browser streaming. It extracts timestamped YouTube transcripts with 1-click SRT/TXT exports, downloads full-resolution 1080p thumbnails, and streams TeraBox cloud files directly in-browser without requiring mobile/desktop app installations.

## Core Value

Instant zero-friction extraction and in-browser playback for YouTube and TeraBox media links without apps, paywalls, or server proxy costs.

## Business Context

- **Customer**: Content creators, video editors, researchers, students, and viral video streamers across Tier 1 (US/EU) and global markets.
- **Revenue model**: Display monetization through Monetag / Adsterra / Google AdSense banners, vignettes, and direct links.
- **Success metric**: Page impressions, daily transcript/thumbnail exports, and ad CTR with zero server egress costs.

## Requirements

### Validated

- [x] **YouTube Studio Dock**: Extracts caption tracks with search filtering, timestamp toggle, 1-click clipboard copy, `.txt` and `.srt` file downloads.
- [x] **Thumbnail Studio**: Direct client-side blob download across 4 resolution tiers (1080p MaxRes, 720p HQ, 480p SD, 180p MQ) with HTTP 404 auto-fallback.
- [x] **TeraBox Web Streamer**: In-browser HLS streaming player supporting 12+ TeraBox mirror domains via bundled `hls.js`.
- [x] **Ad Monetization Integration**: Discrete top, mid, and bottom ad banner slots (`AdBannerSlot.tsx`) supporting dynamic script injection.
- [x] **Automated Test Suite**: Regression suite verifying link normalizers, mirror IDs, and SubRip SRT formatting (`tests/universal-dock.test.mjs`).
- [x] **Bundle Optimization**: Dead anime modules pruned; `hls-vendor` isolated to keep initial page script under 150 kB.

### Active

- [ ] Connect production Monetag / Adsterra publisher script tag or zone IDs into `AdBannerSlot.tsx`.
- [ ] Deploy repository to Vercel for zero-cost edge distribution.
- [ ] Configure optional Telegram traffic bot via `@BotFather`.

### Out of Scope

- Heavy server-side video muxing (`ffmpeg` merging on serverless functions) — too compute-heavy and triggers execution timeouts.
- Residential proxy scraping farms — too expensive for $0 budget constraint; public CDN endpoints and browser-based extraction used instead.

## Constraints

- **$0 Budget**: Runs purely on free serverless functions (Vercel) and client-side browser processing.
- **Zero App Required**: Viewers can play shared video files immediately without installing client apps.
