# Roadmap: TeraPlay Universal Media & Creator Dock

## Overview

A phased journey evolving a broken legacy streaming prototype into a high-performance, monetized Universal Media & Creator Dock that extracts YouTube captions and 1080p thumbnails, plays TeraBox links in-browser, and earns revenue with $0 hosting budget.

## Phases

- [x] **Phase 1: Universal Creator Dock & Platform Normalization** - Auto-detect YouTube, TeraBox, and direct video links; build interactive 3-tab YouTube Studio (captions, thumbnails, embed) and custom HLS player.
- [x] **Phase 2: Monetization & Compliance Architecture** - Implement discrete ad slots for Monetag/Adsterra/AdSense and deploy legal pages (DMCA, Privacy, Terms, Disclaimer, Contact).
- [x] **Phase 3: Hardening, Bundle Optimization & Regression Suite** - Isolate `hls-vendor` chunk to keep initial script under 150 kB; implement automated test suite and eliminate fake/mock data substitution.
- [ ] **Phase 4: Live Network Deployment & Publisher Verification** - Deploy to Vercel edge CDN, paste Monetag/Adsterra ad tags, and set up Telegram distribution bot.

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

### Phase 3: Hardening, Bundle Optimization & Regression Suite
**Goal**: Eliminate bundle bloat, verify edge cases, and ensure production reliability.  
**Requirements**: YT-06, PERF-01, TEST-01  
**Success Criteria**:
1. Thumbnail 404 auto-fallback transitions MaxRes to HQ.
2. SubRip millisecond timestamps format with boundary clipping.
3. `index.js` bundle size reduced to 149 kB.
4. `tests/universal-dock.test.mjs` passes 4/4 suites.

### Phase 4: Live Network Deployment & Publisher Verification
**Goal**: Deploy live on Vercel and activate live publisher ads.  
**Success Criteria**:
1. Production domain live with SSL on Vercel edge CDN.
2. Monetag or Adsterra ad tag active and serving impressions.
