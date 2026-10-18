---
last_mapped_commit: d8e50716fb3344f8157e4437310d57acc836258c
last_mapped_at: 2026-10-18
---
# Directory Structure

**Analysis Date:** 2026-10-18

## Repository Layout

```
teraplay-universal/
├── api/                             # Serverless edge API endpoints
│   ├── resolve.ts                   # Universal media resolution endpoint
│   ├── stream-download.ts           # Media proxy download endpoint
│   └── transcript.ts                # YouTube transcript/caption endpoint
├── docs/                            # Architecture Decision Records (ADRs) & documentation
│   ├── adr/                         # Historical ADRs
│   └── agents/                      # Agent workflows & conventions
├── public/                          # Static web assets
├── scripts/                         # Build, optimization, and fallback extraction scripts
│   ├── extractor.py                 # Python yt-dlp & timedtext caption extractor
│   ├── optimize-images.mjs          # Asset optimizer
│   └── scraper.mjs                  # Legacy data scraper utilities
├── src/                             # Main frontend application source
│   ├── components/                  # UI components
│   │   ├── ads/                     # Monetization components (AdBannerSlot.tsx)
│   │   ├── layout/                  # Layout wrappers (SmoothScroll.tsx)
│   │   ├── ui/                      # Shadcn UI primitives (button, dialog, toaster, etc.)
│   │   └── video/                   # Player components (CustomVideoPlayer.tsx)
│   ├── contexts/                    # React Context providers (AuthContext.tsx)
│   ├── data/                        # Static metadata & SEO definitions (seoRoutes.ts)
│   ├── hooks/                       # Custom React hooks
│   ├── integrations/                # Third-party service clients (supabase)
│   ├── lib/                         # Utility functions & domain logic (urlNormalizer.ts, utils.ts)
│   ├── pages/                       # Page components (Index.tsx, Dmca.tsx, Privacy.tsx, etc.)
│   ├── App.tsx                      # Top-level application routing & providers
│   ├── index.css                    # Tailwind CSS directives
│   └── main.tsx                     # React application root entry point
├── tests/                           # Verification and automated test suites
│   └── universal-dock.test.mjs      # Test suite for URLs, mirrors, and SRT generation
├── .planning/                       # GSD Core planning, roadmaps, and codebase docs
│   └── codebase/                    # Structured codebase maps
├── index.html                       # HTML application template
├── package.json                     # Node.js dependencies & scripts
├── tailwind.config.ts               # Tailwind CSS theme configuration
└── vite.config.ts                   # Vite bundler, path aliases & chunk splitting
```

## Key File Locations

- `src/pages/Index.tsx`: Main Universal Media & Creator Dock page with YouTube Studio tabs (transcripts, thumbnails, player), TeraBox player, and monetization slots.
- `src/lib/urlNormalizer.ts`: URL parser detecting YouTube, TeraBox, Instagram, Facebook, and direct media URLs.
- `src/components/video/CustomVideoPlayer.tsx`: HLS video player engine for in-browser video playback.
- `src/components/ads/AdBannerSlot.tsx`: Ad slots for Monetag/Adsterra/AdSense.
- `tests/universal-dock.test.mjs`: Test runner verifying URL patterns, mirror IDs, and SubRip output.

---
*Codebase analysis: 2026-10-18*
