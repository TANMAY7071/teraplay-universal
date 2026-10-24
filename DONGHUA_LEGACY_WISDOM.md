# Donghua Streaming Platform: Architectural Wisdom & Technical Archive

> **Note**: This document preserves the architectural designs, scraper engineering, metadata mapping, and video streaming logic originally built for the Donghua streaming website before TeraPlay Universal was streamlined into a dedicated Universal Media & Creator Dock. The user retains a separate full code backup of the Donghua admin and streaming platform.

---

## 1. Core Vision & Technical Feasibility
The original Donghua platform was an autonomous, custom-engineered anime/donghua streaming portal created without relying on costly commercial APIs. It was designed to solve three major challenges:
1. **Catalog & Metadata Ingestion**: Aggregating rich Chinese donghua titles, characters, cultivation systems, and episode stills from heterogeneous sources (Fandom Wikis, AniList GraphQL, Simkl, TMDB, Trakt).
2. **Video Streaming & Mirror Resolution**: Streaming Chinese animation without hosting multi-gigabyte video files directly, leveraging distributed video mirrors, HLS (.m3u8), and cloud players (TeraBox, MP4Upload, StreamTape, VidStreaming).
3. **Lore & Universe Deep Diving**: Building interactive world lore, character cultivation tiers, and clan relationships natively into the watching experience.

---

## 2. Scraping Without Commercial APIs

### 2.1 Unified Fandom Wiki Scraper (`wikiParser.mjs` & `scraper.mjs`)
- **Category-Driven Taxonomy**:
  Instead of fragile hardcoded selectors, the parser used MediaWiki category queries (`Locations`, `Characters`, `Cultivation`, `Dou_Techniques`, `Items`, `Clans`, `Images`, `Seasons`) to map encyclopedic data into structured JSON.
- **Normalized Category Map**:
  ```javascript
  const WIKI_CATEGORIES = {
    'battle-through-the-heavens': [
      { key: 'world', fandomCat: 'Locations' },
      { key: 'characters', fandomCat: 'Characters' },
      { key: 'cultivation', fandomCat: 'Cultivation' },
      { key: 'techniques', fandomCat: 'Dou_Techniques' },
      { key: 'artifacts', fandomCat: 'Items' },
      { key: 'clans', fandomCat: 'Clans' },
    ],
    'soulland': [
      { key: 'cultivation', fandomCat: 'Spirit_Rank' },
      { key: 'techniques', fandomCat: 'Spirit_Abilities' },
      { key: 'artifacts', fandomCat: 'Spirit_Bones' },
    ],
    // The Great Ruler, Renegade Immortal (Xian Ni), Perfect World, Swallowed Star
  };
  ```
- **Incremental Cache Merging**:
  Outputs were merged into `public/data/cached-lore.json` without overwriting existing manual enrichments.

### 2.2 Image Optimization via Zero-Config Image Proxies
- To avoid self-hosting image resizing servers, the system proxied all external images through `wsrv.nl`:
  ```typescript
  export function getHighResSimklImage(url: string | null | undefined): string {
    // Strips thumbnails (_m, _b, _t) and requests wide master JPG (_w.jpg)
    // Proxies through wsrv.nl CDN cache for high-speed edge delivery
  }
  ```

---

## 3. Metadata Ingestion & Provider Federation

### 3.1 Multi-Provider Hierarchy
The platform federated metadata across multiple providers with graceful fallbacks:
1. **AniList GraphQL (`anilistAnime.ts`)**: Primary source for high-res cover art, airing countdowns, romanized/Chinese titles, and studio credits. Filtered specifically for `countryOfOrigin: "CN"`.
2. **Simkl API (`simklAnime.ts`)**: Fast episode title resolution, episode duration, and high-definition backdrop stills.
3. **TMDB & Trakt (`tmdbAnime.ts`, `traktAnime.ts`)**: Season grouping, English synopses, and user ratings.
4. **Fandom Anime (`fandomAnime.ts`)**: In-depth character backstories, cultivation ranks, and technique lore.

### 3.2 Canonical Donghua Name Mapping (`anilistDonghuaMap.ts`)
- Solved the "alternate title" problem where Donghua are named differently across sites (e.g. *Doupo Cangqiong* vs. *Battle Through the Heavens* vs. *Fights Break Sphere*):
  - Standardized on English canonical slugs.
  - Maintained an alias mapping dictionary that mapped AniList IDs, TMDB show IDs, and Simkl IDs into a single unified record.

---

## 4. In-Browser Streaming Architecture

### 4.1 Hybrid Video Player Engine
- Built on top of `hls.js` with direct fallback to native HTML5 `<video>` for Safari / iOS.
- **Multi-Server Selector**:
  Allowed switching between direct `.m3u8` HLS streams, embedded iframe video mirrors, and raw MP4 links.
- **Autoplay & Volume State Retention**:
  Saved playback progress, volume levels, and mute status across page reloads via `localStorage`.

### 4.2 Subtitle & Caption Injection
- Provided client-side WebVTT subtitle track parsing and synchronization, allowing users to toggle external `.srt` or `.vtt` translation tracks on un-subtitled raw video streams.

---

## 5. What Was Transferred to TeraPlay Universal
Many of the hardest-won lessons from the Donghua platform became foundational pillars of TeraPlay Universal:
1. **Client-First Execution**: In-browser SubRip `.srt` conversion, client blob downloading, and direct CDN streaming.
2. **Multi-Source URL Parsing**: The URL normalization patterns used for mirror resolution evolved into `src/lib/urlNormalizer.ts`.
3. **Apple HIG Visual Aesthetics**: The dark mode design tokens, glassmorphism card elevation, and responsive mobile-first typography.
4. **HLS Video Engine**: `CustomVideoPlayer.tsx` was retained and enhanced to stream TeraBox m3u8 files directly in the browser without third-party app requirements.

---

## 6. Safe Pruning Rationale
Because TeraPlay Universal is focused strictly on user-driven URL media extraction (YouTube, TeraBox, TikTok, Instagram, Facebook), all anime-specific CMS pages, character cultivation databases, fandom scrapers, and admin panels are obsolete within this repository. 
The user retains their separate backup of the Donghua code, enabling this repository to become 100% clean, light, and hyper-optimized.

---

## 7. Pruned: Dynamic Sitemap Generator (`api/sitemap.js`)

Removed on 2026-10-22. What it did and why it went:

- It read the anime table from Supabase and emitted one `<url>` per `slug`, plus a fixed list of static paths.
- The `<url>` values it produced were `/anime/<slug>` entries. The router redirects `/anime/*` to `/`, so every one of those entries pointed at a redirect. Search engines would have followed them straight back to the homepage.
- Its static path list (`/explore`, `/calendar`, `/search`, `/community`) had no matching route. Those paths fell through to the 404 catch-all.
- It was never reachable in production. `vercel.json` rewrites `/((?!api/.*).*)` to `/index.html`, and `public/sitemap.xml` is copied into the build output, so the static file won at the filesystem stage and the function never ran.

What replaced it: `public/sitemap.xml` is now the single source of truth, listing all fifteen live routes (ten landing pages plus DMCA, Privacy, Terms, Disclaimer, and Contact). If the site ever gains real per-anime pages, reintroduce a generator at that point and add a matching `/sitemap.xml` rewrite, because a static file in `public/` always shadows an API route.

The Supabase connection details it depended on (`VITE_SUPABASE_URL` / `SUPABASE_ANON_KEY`, `SITE_URL`) are still used by the rest of the backend, so nothing else had to change.

