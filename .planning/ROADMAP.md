# Roadmap: TeraPlay Universal Media & Creator Dock

## Overview

A phased journey evolving a broken legacy streaming prototype into a high-performance, monetized Universal Media & Creator Dock that extracts 1,751+ platform streams, YouTube captions, multi-resolution thumbnails, plays TeraBox links in-browser, and earns revenue with $0 hosting budget.

## Phases

- [x] **Phase 1: Universal Creator Dock & Platform Normalization** - Auto-detect YouTube, TeraBox, and direct video links; build interactive 3-tab YouTube Studio (captions, thumbnails, embed) and custom HLS player.
- [x] **Phase 2: Monetization & Compliance Architecture** - Implement discrete ad slots for Monetag/Adsterra/AdSense and deploy legal pages (DMCA, Privacy, Terms, Disclaimer, Contact).
- [x] **Phase 3: Universal Engine Expansion & Microservice Architecture** - Expanded to all 1,751 yt-dlp extractors; fixed 1080p progressive audio+video downloads; dynamic thumbnails; honest WhatsApp E2EE handling; packaged FastAPI Docker microservice (`backend/`) for $0 Render/Railway deployment.
- [x] **Phase 4: Live Network Deployment & Publisher Verification** - Deployed frontend to Vercel (`https://teraplay-universal.vercel.app`), connected `PYTHON_RESOLVER_URL` to Render microservice (`https://teraplay-universal.onrender.com`), verified live edge caching and universal media extraction.

## Phase Details

### Phase 1: Universal Creator Dock & Platform Normalization
**Goal**: Build unified media resolver dock for YouTube, TeraBox, and direct video links.  
**Requirements**: YT-01, YT-02, YT-03, YT-04, YT-05, YT-07, TB-01, TB-02, TB-03  
**Success Criteria**:
1. User pastes YouTube link: UI immediately loads player and 4 thumbnail tiers.
2. User can search transcript cues, copy text, and download clean `.txt` and `.srt` files.
3. User pastes TeraBox link: in-browser player plays video without app installs.

### Phase 2: Monetization & Compliance Architecture
**Goal**: Prepare project for instant ad network approval and zero-cost revenue.  
**Requirements**: MON-01, MON-02, LEG-01, SEO-01  
**Success Criteria**:
1. Top, mid-content, and bottom ad banner slots mounted without layout shift.
2. Dynamic script runner (`createContextualFragment`) executes ad tags.
3. DMCA, Privacy, Terms, and Contact pages live with complete legal disclaimers.

### Phase 3: Universal Engine Expansion & Microservice Architecture
**Goal**: Unlock all 1,751 yt-dlp platforms, eliminate silent DASH downloads, and package $0 cloud microservice.  
**Requirements**: YT-06, PERF-01, TEST-01, UNIV-01, UNIV-02  
**Success Criteria**:
1. URL normalizer auto-detects 13 platform types (TikTok, Bilibili, Dailymotion, Snapchat, LinkedIn, Vimeo, Twitter/X) without manual chip clicks.
2. Honest WhatsApp E2EE error cards inform users to paste links shared inside chats.
3. Extractor selects progressive audio+video format (`bestVideo`) so 1080p/720p downloads are never silent.
4. FastAPI microservice packaged with Dockerfile, requirements, and Render blueprint in `backend/`.
5. `tests/universal-dock.test.mjs` passes 5/5 regression suites.

### Phase 4: Live Network Deployment & Publisher Verification
**Goal**: Deploy live on Vercel and activate live publisher ads.  
**Success Criteria**:
1. Production domain live with SSL on Vercel edge CDN.
2. Render microservice active with UptimeRobot health ping keeping it warm.
3. Monetag or Adsterra ad tag active and serving impressions.
