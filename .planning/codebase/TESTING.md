---
last_mapped_commit: d8e50716fb3344f8157e4437310d57acc836258c
last_mapped_at: 2026-10-18
---
# Testing Patterns & Frameworks

**Analysis Date:** 2026-10-18

## Test Infrastructure

- **Unit & Integration Suite:** `tests/universal-dock.test.mjs` running on Node.js native test runner.
- **End-to-End Suite:** Playwright configured in `playwright.config.ts`.
- **Static Analysis & Typecheck:** TypeScript compiler via `npm run build` (`tsc -b && vite build`) and ESLint (`npm run lint`).

## Test Coverage & Verifications

The primary test suite in `tests/universal-dock.test.mjs` exercises 4 critical suites:

1. **YouTube Normalization & ID Extraction:**
   - Standard watch URLs (`youtube.com/watch?v=...`)
   - Short links (`youtu.be/...`)
   - YouTube Shorts (`youtube.com/shorts/...`)
   - Privacy-enhanced embeds (`youtube-nocookie.com/embed/...`)
   - Raw 11-character video IDs
   - Rejection of invalid links and bare domains

2. **TeraBox Mirror Normalization:**
   - Canonical domains (`terabox.com`, `1024tera.com`, `nephobox.com`, `freeterabox.com`, etc.)
   - Share ID extraction from query strings and path segments (`/s/1...`)

3. **Direct Video Stream Detection:**
   - Direct `.mp4` URLs with query parameters
   - Direct `.m3u8` HLS playlists

4. **Timestamp & SubRip (.SRT) Formatting:**
   - `hh:mm:ss` hour formatting for cues past 60 minutes
   - `hh:mm:ss,mmm` SubRip millisecond timestamps
   - Boundary clipping: ensuring cue durations do not overlap next cue start times
   - Clean double-newline block separators

## How to Run Tests

```bash

# Run unit & integration suite

node tests/universal-dock.test.mjs

# Run production build & typecheck

npm run build

# Run linting

npx eslint src/pages/Index.tsx src/App.tsx src/lib/urlNormalizer.ts src/components/ads/AdBannerSlot.tsx
```

---
*Codebase analysis: 2026-10-18*
