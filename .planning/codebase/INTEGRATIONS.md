---
last_mapped_commit: d8e50716fb3344f8157e4437310d57acc836258c
last_mapped_at: 2026-10-18
---
# External Integrations

**Analysis Date:** 2026-10-18

## External APIs & Services

### 1. YouTube oEmbed & Caption Infrastructure

- **Endpoints:**
  - `https://www.youtube.com/oembed` - Unauthenticated title and author metadata resolution.
  - `https://www.youtube.com/api/timedtext` - Direct subtitle track extraction in JSON3/XML format (`scripts/extractor.py` and `api/transcript.ts`).
  - `https://img.youtube.com/vi/{id}/` - Public Google CDN for thumbnails (`maxresdefault`, `hqdefault`, `sddefault`, `mqdefault`) with CORS enabled for client-side blob downloads.
  - `https://www.youtube-nocookie.com/embed/{id}` - Privacy-enhanced player embedding.

### 2. TeraBox Mirror Gateways

- **Supported Domains:** `terabox.com`, `1024tera.com`, `nephobox.com`, `freeterabox.com`, `1024terabox.com`, `teraboxlink.com`, `mirrobox.com`, `momerybox.com`, `tibibox.com`, `4funbox.com`.
- **Extraction Mechanism:**
  - Upstream resolution via `api/resolve.ts`.
  - Fallback local extractor in `scripts/extractor.py` using `yt-dlp`.

### 3. Supabase Cloud (Backend as a Service)

- **Service:** Auth and PostgreSQL link caching.
- **Client Configuration:** `src/integrations/supabase/client.ts`.
- **Environment Keys:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **Features:** Anonymous session tracking, Google OAuth sign-in (`src/contexts/AuthContext.tsx`), and persistent link caching.

### 4. Monetization Networks

- **Networks:** Monetag / Adsterra / Google AdSense.
- **Component:** `src/components/ads/AdBannerSlot.tsx`.
- **Integration Mode:**
  - Top leaderboard slot (`ad-banner-top`).
  - Mid-content leaderboard slot (`ad-banner-mid`).
  - Bottom leaderboard slot (`ad-banner-bottom`).
  - Dynamic execution using DOM `createContextualFragment` supporting asynchronous ad tags.

## Webhooks & Serverless Edge Functions

- `/api/resolve.ts` - Resolves arbitrary video URLs into streaming `.m3u8` or direct `.mp4` payloads.
- `/api/transcript.ts` - Resolves video captions into timestamped cue arrays.
- `/api/stream-download.ts` - Stream proxy endpoint for downloading MP4 media files.

---
*Codebase analysis: 2026-10-18*
