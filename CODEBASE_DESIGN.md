# TeraPlay Universal: Codebase Design, Architecture & Evolution

> **Audience**: Written for both complete beginners (who want to understand what the site does and how it works in plain language) and senior software engineers / AI agents (who need deep technical specifications, invariants, and implementation details).

---

# PART 1: The Beginner's Guide (Plain English)

### 1. What is TeraPlay Universal?
Think of TeraPlay as a **Swiss Army Knife for internet video links**.
Normally on the internet:
- If you want a YouTube transcript or subtitle, you have to find one site.
- If you want a high-resolution 1080p YouTube thumbnail, you have to go to a second site.
- If a friend sends you a TeraBox video link, you are forced to download a bloated app just to watch it.
- If you want an Instagram slide or TikTok video, you have to find yet another sketchy website filled with spammy pop-up ads.

**TeraPlay Universal solves all of this with one single input box**:
1. You copy any video link from YouTube, TeraBox, Instagram, Facebook, TikTok, or direct MP4.
2. You paste it into TeraPlay.
3. **Instantly**, TeraPlay shows the video player directly in your browser, gives you 1-click download buttons in 1080p / 720p / MP3 audio, extracts full timestamped subtitles, and downloads high-res artwork.

### 2. How Does It Work Behind the Scenes? (The 4-Step Journey)

```
[ You paste a link ]
        │
        ▼
[ Step 1: Detect Link ] ───► Is it YouTube? TeraBox? Instagram? TikTok?
        │
        ▼
[ Step 2: Edge Resolver ] ──► Fast Python microservice looks up the real video stream
        │
        ▼
[ Step 3: Browser Magic ] ──► The video plays in your browser; files download directly
        │
        ▼
[ Step 4: Monetization ] ───► Clean, discreet banner ads earn revenue per visit
```

- **Step 1 (Auto-Detect)**: The moment you paste `https://youtu.be/...` or `https://1024tera.com/...`, the browser instantly identifies the platform without needing you to click any dropdowns.
- **Step 2 (Stream Resolution)**: A lightweight Python microservice powered by `yt-dlp` inspects the URL and finds the real underlying video formats, master audio tracks, and subtitles.
- **Step 3 (Client-First Download)**: When you click "Download 1080p", the file streams **directly from the host CDN into your browser**. Our server does not download the file first, which means running the website costs **$0 in server bandwidth**.
- **Step 4 (Ad Earnings)**: Discreet ad network slots (Monetag / Adsterra) display non-intrusive banners on the page, generating revenue without ruining the user experience.

---

# PART 2: The Senior Engineering Guide

### 1. System Topology & Zero-Cost Architecture

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (BROWSER)                     │
│  React 18 + Vite + Tailwind CSS + Lucide Icons + HLS.js │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────────┐
│    VERCEL EDGE API      │ │    RENDER MICROSERVICE      │
│  /api/resolve           │ │  FastAPI + yt-dlp + ffmpeg  │
│  /api/transcript        │ │  (1,751 platform extractors)│
│  /api/stream-download   │ │  Extracts streams, muxes    │
│  /api/transcribe        │ │  audio/video on the fly     │
└─────────────────────────┘ └─────────────────────────────┘
```

- **Zero-Bandwidth Invariant**: All high-bandwidth video streams and large thumbnail images are piped client-to-CDN. Server proxying is only used as a fallback for CORS-restricted hosts (e.g. Instagram CDN expiration tokens).
- **Honest States Invariant**: No fake, simulated, or hallucinated subtitle tracks. When a video has no closed captions, an explicit notification is displayed with an opt-in button to trigger AI transcription via Groq Whisper (`/api/transcribe`).
- **Apple HIG Cinema Aesthetic**: Dark mode palette uses deep navy canvas (`#060b18`), translucent elevated cards (`rgba(14, 25, 56, 0.65)`), soft yellow brand radiance (`#e4f222`), and high-contrast Ice Cyan metadata badges.

---

### 2. Deep Module Breakdown

| Module | Location | Purpose | Key Guarantees |
|---|---|---|---|
| **URL Normalizer** | [`src/lib/urlNormalizer.ts`](src/lib/urlNormalizer.ts) | Parses and validates incoming media URLs | Handles 12+ TeraBox mirror domains, YouTube Shorts/Live/Embeds, Instagram reels, TikTok, Vimeo, and direct MP4/M3U8 streams. |
| **Universal Media Dock** | [`src/pages/Index.tsx`](src/pages/Index.tsx) | Primary application interface | Studio tabs (Downloads, Transcripts, Thumbnails, Player), mobile touch format cards, and split download dropdowns. |
| **In-Browser Video Player** | [`src/components/video/CustomVideoPlayer.tsx`](src/components/video/CustomVideoPlayer.tsx) | HTML5 & HLS playback engine | Direct `.m3u8` streaming for TeraBox links with automatic fallback to native video on iOS. |
| **Transcription Engine** | [`src/lib/transcription.ts`](src/lib/transcription.ts) & `api/transcribe.ts` | Speech-to-Text & Subtitles | Converts audio into timestamped cues and formats standard SubRip `.srt` files with boundary clipping. |
| **Monetization Engine** | [`src/components/ads/AdBannerSlot.tsx`](src/components/ads/AdBannerSlot.tsx) | Dynamic ad injection | Contextual HTML script injection for Monetag, Adsterra, and AdSense with automatic ad-blocker fallback state. |
| **Legal & Compliance** | `src/pages/Dmca.tsx`, `Privacy.tsx`, `Terms.tsx` | Ad network approval & SEO | Mandatory legal pages ensuring fast verification by major ad networks. |

---

# PART 3: The Complete Decision Log & Evolution

### Decision 1: Transition from Donghua Streaming to Universal Media Dock
- **Context**: The codebase was originally cloned from a custom-built Donghua (Chinese anime) streaming site featuring fandom scrapers, AniList/TMDB metadata synchronization, character wikis, cultivation ranks, and anime CMS admin panels.
- **The Pivot**: The user pivoted the platform into **TeraPlay Universal**, a $0-budget universal media dock where users paste any video link to stream and download it with ads.
- **Action**: Preserved the Donghua architecture in [`DONGHUA_LEGACY_WISDOM.md`](DONGHUA_LEGACY_WISDOM.md) and purged all dead anime CMS routes, obsolete fandom scrapers, and unused dependencies to make the repository lightweight, fast, and maintainable.

### Decision 2: Mobile Touch-First UI Overhaul
- **Context**: On screens `< 450px`, the 4-column downloads `<table>` pushed download buttons off-screen, studio navigation tabs crushed into each other, and redundant buttons cluttered the mobile view.
- **Action**:
  - Replaced the desktop table on mobile (`sm:hidden`) with native touch cards (`.tp-mobile-format-card`) featuring large tap targets.
  - Added `-webkit-overflow-scrolling: touch` and `scrollbar-none` to the top tab bar.
  - Pruned duplicate buttons (e.g. "Watch Online in Player" when the player is already right above).

### Decision 3: Thumbnails Quality Selector & Scene Stills Separation
- **Context**: Video links originally returned up to 46 thumbnail objects (mixing cover art tiers with storyboard timeline frames), creating 46 duplicate cards and a confusing "Download All (46)" button.
- **Action**:
  - Split the Thumbnails studio into two distinct sub-tabs:
    1. **`[ Official Video Cover ]`**: Single pristine hero card with an Image-4 split dropdown selector (`1080p Full HD`, `720p HD`, `480p SD`, `360p Medium`).
    2. **`[ Video Timeline Scenes ]`**: Dedicated gallery grid displaying extracted video stills with a sequential `Download All Scenes (N)` batch button and individual 1-click `Download JPG`.
  - Excluded official cover URLs from the timeline scenes grid to guarantee zero duplicate images.

### Decision 4: High-Contrast Metadata Badge Styling (Ice Cyan)
- **Context**: Badges previously used `text-[var(--tp-accent-ink)] bg-[var(--tp-accent)]/15`. Because `--tp-accent-ink` was defined as `#0c0e13` (pitch black), file sizes (`29.8 MB`, `18.2 MB`) were rendered as black text on a dark canvas (~1.2:1 contrast failure).
- **Action**: Upgraded all metadata badges across the downloads table, mobile cards, quick dropdown, and cover selectors to **Ice Cyan** (`text-sky-300 bg-sky-500/10 border border-sky-500/20`), achieving an >8:1 contrast ratio that is crisp, legible, and does not clash with the yellow download CTA.

### Decision 5: Non-Clipping Dropdown Popover & Stacking Fix
- **Context**: The quick download dropdown popover had a hardcoded `max-h-[360px]` and translucent background (`rgba(18, 32, 70, 0.85)`). On videos with 6+ resolutions, audio tracks were clipped at the bottom, and elements underneath bled through the menu.
- **Action**: Made dropdown popovers 100% opaque (`bg-white dark:bg-[#090f22]`), increased height constraint to `max-h-[min(520px,75vh)]`, added smooth scrollbar styling, and enforced `z-40` stacking.
