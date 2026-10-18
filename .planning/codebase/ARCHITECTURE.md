# Architecture Overview

**Analysis Date:** 2026-10-18

## Architectural Pattern

The application is structured as a **Client-First Universal Media Dock** with a lightweight serverless edge layer:
1. **Zero-Cost Client Execution:** Tasks that can run purely in-browser (thumbnail preview & blob downloads, video embedding, client-side SubRip `.srt` and `.txt` generation) execute immediately in the browser without invoking backend compute.
2. **Progressive Async Hydration:** When a YouTube link is pasted, the UI immediately transitions to YouTube Studio mode, loads all 4 thumbnail tiers and the responsive embed player, while metadata and captions resolve in the background.
3. **Edge Serverless Resolution:** Upstream URL normalization and media extraction are delegated to serverless endpoints (`/api/resolve`, `/api/transcript`) or fallback python scripts.

## Core Layers

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   (React 18 + Tailwind CSS + Lucide Icons + Radix UI)   │
│       - src/pages/Index.tsx (Universal Creator Dock)   │
│       - src/components/video/CustomVideoPlayer.tsx     │
│       - src/components/ads/AdBannerSlot.tsx            │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Domain & Client Lib                 │
│       - src/lib/urlNormalizer.ts (Platform Detection)  │
│       - src/data/seoRoutes.ts (Metadata & Schema.org)  │
│       - src/contexts/AuthContext.tsx (User State)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Serverless API Layer                  │
│       - api/resolve.ts (Universal Media Resolver)      │
│       - api/transcript.ts (Caption Extraction)         │
│       - api/stream-download.ts (MP4 Proxy)             │
│       - scripts/extractor.py (yt-dlp Local Fallback)   │
└────────────────────────────────────────────────────────┘
```

## Key Abstractions

- `normalizeMediaUrl(url)`: Pure URL normalization engine in `src/lib/urlNormalizer.ts`. Detects YouTube (watch, embed, live, shorts, youtu.be, nocookie), TeraBox (12 mirror domains), Facebook, Instagram, and direct media files (`.mp4`, `.m3u8`).
- `CustomVideoPlayer`: Cross-browser video player in `src/components/video/CustomVideoPlayer.tsx` wrapping `hls.js` for direct in-browser HLS `.m3u8` streaming.
- `AdBannerSlot`: Pluggable ad container in `src/components/ads/AdBannerSlot.tsx` with dynamic contextual script execution for Monetag / Adsterra integration.
- `generateSrtContent` / `generateTxtContent`: Pure transformation functions producing compliant SubRip subtitle files and clean text transcripts with boundary-clipped timestamps.

## Entry Points

- `index.html`: Shell HTML with SEO meta tags, Google font preconnects, and JSON-LD WebApplication schema.
- `src/main.tsx`: React DOM mount point.
- `src/App.tsx`: Top-level route switch, React Query provider, Helmet provider, and canonical SEO landing pages.

---
*Codebase analysis: 2026-10-18*
