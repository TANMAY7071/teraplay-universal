# Requirements: TeraPlay Universal Media & Creator Dock

**Defined:** 2026-10-18  
**Core Value:** Instant zero-friction extraction and in-browser playback for YouTube and TeraBox media links without apps, paywalls, or server proxy costs.

## v1 Requirements

### YouTube Studio & Creator Tools

- [x] **YT-01**: Auto-detect standard, short, embed, nocookie, and raw YouTube video IDs.
- [x] **YT-02**: Fetch and display timestamped closed caption cues with search filtering.
- [x] **YT-03**: Export transcript cues to clean `.txt` file with toggleable timestamps.
- [x] **YT-04**: Export transcript cues to standardized SubRip `.srt` subtitle format with boundary clipping.
- [x] **YT-05**: Display 4 thumbnail resolutions (1080p, 720p, 480p, 180p) with 1-click client-side blob download.
- [x] **YT-06**: Automatic fallback from 1080p MaxRes to 720p HQ thumbnail when older video returns HTTP 404.
- [x] **YT-07**: Responsive embedded video player preview with 1-click HTML embed snippet copy.

### TeraBox & Direct Streaming

- [x] **TB-01**: Normalize 12+ TeraBox mirror domains (`1024tera`, `nephobox`, `freeterabox`, etc.) and extract share IDs.
- [x] **TB-02**: Stream `.m3u8` video directly in browser using bundled `hls.js` without requiring desktop/mobile client apps.
- [x] **TB-03**: Fast download MP4 trigger button and stream link clipboard copy.

### Monetization & Compliance

- [x] **MON-01**: Top, mid-content, and bottom ad banner slots mounted via `AdBannerSlot.tsx`.
- [x] **MON-02**: Contextual script injection support (`createContextualFragment`) for Monetag / Adsterra / Google AdSense.
- [x] **LEG-01**: DMCA, Privacy Policy, Terms of Service, Disclaimer, and Contact pages live for ad network approval.
- [x] **SEO-01**: Canonical routes for search intent (`/youtube-transcript-downloader`, `/youtube-thumbnail-downloader`, `/terabox-online-player`) with Schema.org JSON-LD.

### Performance & Quality

- [x] **PERF-01**: Initial page bundle under 150 kB (`index-Cr6v_tbg.js` = 149 kB; `hls-vendor` isolated).
- [x] **TEST-01**: Automated test suite passing 4/4 suites in `tests/universal-dock.test.mjs`.

## Traceability

| Requirement | Phase | Status |
| :--- | :--- | :--- |
| YT-01 to YT-07 | Phase 1: Creator Dock Core | Completed |
| TB-01 to TB-03 | Phase 1: Creator Dock Core | Completed |
| MON-01 to MON-02 | Phase 2: Monetization & Ad Network Setup | Completed |
| LEG-01 & SEO-01 | Phase 2: Monetization & Ad Network Setup | Completed |
| PERF-01 & TEST-01 | Phase 3: Hardening & Bundle Optimization | Completed |
