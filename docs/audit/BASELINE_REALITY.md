# DonghuaStream — Baseline Reality

## Audit Metadata
Date: 2026-08-12
Repository state/commit: Local Audit (development branch copy 2)
Auditor: Antigravity AI Coding Assistant

---

## 1. Repository Structure

The DonghuaStream project structure consists of the following key directories:
*   `src/`: Main source files containing pages, components, hooks, type specifications, layout contexts, and external services.
*   `src/pages/`: Main route components (Home, Watch, Explore, Library, Calendar, Search, Profile, Community, Sports, ExperimentalAI, WikiApiExplorer).
*   `src/pages/admin/`: CMS pages for administration management (Dashboard, AnimeList, AnimeForm, EpisodeList, EpisodeForm, Seasons, Characters, Cultivation, SyncDashboard).
*   `src/components/`: Reusable layouts (`AppShell`, `PageWrapper`, `AdminLayout`), features (`Navbar`, `Footer`, `SearchOverlay`, `TrailerModal`, `AppearanceSelector`), and UI primitives (`src/components/ui/` shadcn-based components).
*   `src/services/`: Client-side query adapters and API providers (`anilistAnime.ts`, `sankaAnime.ts`, `omdbAnime.ts`, `simklAnime.ts`, `bangumiAnime.ts`, `traktAnime.ts`, `fandomAnime.ts`).
*   `src/hooks/`: Reactive hooks for data fetching (`useAnimeQueries.ts`), storage state caching (`useLocalStorage.ts`), and UI helpers.
*   `supabase/`: Supabase PostgreSQL schema triggers, migrations, and schema definitions (`supabase_schema.sql` at root).
*   `tests/`: Playwright visual and integration testing scripts.
*   `api/`: Edge functions and serverless endpoints designed for production CORS bypasses.

---

## 2. Verified Technology Stack

*   **Frontend Framework**: React 18.3.1 (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L57))
*   **Language**: TypeScript 5.5.3 (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L87))
*   **Build System**: Vite 5.4.1 with `@vitejs/plugin-react-swc` (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L78))
*   **CSS / Styling Framework**: Tailwind CSS 3.4.11 with custom HSL token variables (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L86) and [index.css](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/src/index.css#L10))
*   **Animation Engine**: Framer Motion 13.0.0, GSAP 3.15.0 with `@gsap/react`, and Lenis 1.3.26 for smooth scrolling (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L51-L54))
*   **Data Query & Caching**: TanStack React Query 5.56.2 (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L45))
*   **Backend & DB**: Supabase client (`@supabase/supabase-js ^2.110.0`) connected to a PostgreSQL database (proven by [supabase_schema.sql](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/supabase_schema.sql) and [supabase.ts](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/src/lib/supabase.ts))
*   **Routing**: React Router DOM 6.26.2 (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L63))
*   **Automated Testing**: Playwright 1.62.1 (proven by [package.json](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/package.json#L73))
*   **External Metadata Integration**: Multi-API client architecture aggregating Fandom, AniList, Simkl, Bangumi, Trakt, OMDb, and Sanka (proven by files in [src/services/](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/src/services/))

---

## 3. Dependencies

### Categorized Inventory

#### A. UI & Components Libraries (USED)
*   `@radix-ui/react-*` (Accordion, Alert Dialog, Aspect Ratio, Avatar, Checkbox, Collapsible, Context Menu, Dialog, Dropdown Menu, Hover Card, Label, Menubar, Navigation Menu, Popover, Progress, Radio Group, Scroll Area, Select, Separator, Slider, Slot, Switch, Tabs, Toast, Toggle, Toggle Group, Tooltip)
*   `embla-carousel-react`
*   `vaul`
*   `cmdk`
*   `lucide-react`

#### B. Animation & Motion (USED)
*   `framer-motion`
*   `gsap`
*   `@gsap/react`
*   `lenis`
*   `tailwindcss-animate`

#### C. Backend & Data Fetching (USED)
*   `@supabase/supabase-js`
*   `@tanstack/react-query`
*   `zod`
*   `react-hook-form`
*   `@hookform/resolvers`

#### D. Utilities & Helpers (USED)
*   `clsx`
*   `tailwind-merge`
*   `date-fns`
*   `react-helmet-async`
*   `react-day-picker`
*   `react-resizable-panels`
*   `input-otp`

#### E. Testing Tools (DevDependencies) (USED)
*   `@playwright/test`

#### F. Installed but UNUSED Dependencies
*   `recharts`: Chart component files exist in UI folder, but are not imported or rendered by page elements.
*   `@google/genai`: No imports exist in the `src/` application files.
*   `next-themes`: Only imported in `components/ui/sonner.tsx` for passive theme mapping, otherwise bypassed in favor of local `useTheme` hooks.

---

## 4. Routes

The routing structure in [App.tsx](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/src/App.tsx) defines the following active endpoints:

| Path | Component | Purpose | Major Child Components | Data Sources |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `Home` | Landing portal, slideshow, continue watching shelf | `HeroSection`, `ContentSection`, `Navbar` | Supabase / `animeCatalog` static |
| `/login` | `Login` | User authentication | `Card`, `Button`, `Input` | Supabase auth |
| `/register` | `Register` | Member profile signup | `Card`, `Button`, `Input` | Supabase auth |
| `/anime/:slug` | `AnimeDetail` | Show detailed metadata, episodes, characters grid | `TrailerModal`, `WatchlistButton`, `EpisodesPreview` | `useAnimeDetailQuery`, Fandom API |
| `/watch/:slug/:episodeNumber` | `Watch` | Video player, fallback mirrors, comments panels | `CustomVideoPlayer`, `CommentSection`, `CharactersWidget` | `useEpisodesQuery`, comments table |
| `/watchlater` / `/library` | `Library` | Watchlist, continue watching grid | `MediaCard`, `PageWrapper` | `useWatchlistQuery`, localStorage |
| `/calendar` | `Calendar` | Airing schedule slots | `Tabs`, `Card` | AniList schedule / Supabase |
| `/search` | `Search` | Text search, genre filters | `SearchAndFilter`, `MediaCard` | `animeCatalog` static / Supabase |
| `/profile` | `Profile` | Ranks tracker, levels, preferences | `AppearanceSelector`, `Card` | Supabase profiles |
| `/explore` / `/browse` | `Explore` | Main grid filter panel | `SearchAndFilter`, `MediaCard` | Supabase / static catalog |
| `/community` | `Community` | Social thread posts and discussions | `Card`, `Button` | Supabase threads |
| `/sports` | `Sports` | Multi-stream Live channels | `Card`, `Button` | Mock stream channels |
| `/experiment-ai` | `ExperimentalAI` | API consultancy mock playground | `TraktEvalPanel` | Local mock chat state |
| `/wiki-api-explorer` | `WikiApiExplorer` | Fandom Wiki crawler tool | `Card`, `Input`, `Tabs` | Fandom API |
| `/admin/*` | (CMS Subtree) | Management dashboards | `AdminLayout`, `Table`, `Dialog` | Supabase tables |

---

## 5. Component Architecture

*   **Layout Wrapper Hierarchy**: All public pages inherit `AppShell` -> `PageWrapper` which handles sidebar alignments, responsive layout containers, and consistent HSL gradients.
*   **UI Primitives**: Located in `src/components/ui/` (shadcn-based Radix wraps).
*   **Shared Content Widgets**: 
    *   `ContentCard.tsx`: Aspect ratio $2:3$ card used for Grid views.
    *   `MediaCard.tsx`: Horizontal layout list cards.
    *   `EpisodeNavigator.tsx` & `EpisodesPreview.tsx`: Handle lists of episodes and quick next/prev navigation.
*   **Duplication / Overlaps**:
    *   `ContentCard.tsx` and `MediaCard.tsx` share identical metadata mappings but construct competing UI shells.
    *   `CustomVideoPlayer.tsx` is implemented as a wrapper, but the legacy `Watch.tsx` contains duplicated setup.

---

## 6. Data Architecture & Data Flow

```
Supabase / REST APIs (AniList, Fandom, Sanka)
     ↓
services/ (adapters executing requests with abort signals)
     ↓
hooks/ (useAnimeQueries queries cache via TanStack Query)
     ↓
contexts/ (AuthContext sharing profiles, levels, XP)
     ↓
components/ (Vite layout rendering)
```

### Key Flows
*   **Authentication**: Authenticates via Supabase Client. If mock mode is enabled, redirects utilize `donghua-mock-session` to skip DB queries.
*   **Progress Synchronization**: Two-way client-side localStorage sync to `watch_progress` database table via progress hooks on episode playback.
*   **API Fallback Pipeline**: Detail requests execute DB lookup -> AniList GraphQL query -> Sanka API fallback.

---

## 7. API Inventory

1.  **AniList GraphQL (`https://graphql.anilist.co`)**: Fetches titles, airing schedules, studio names, cover images.
2.  **Sanka API (`/api/sanka/`)**: Fallback provider for video source links.
3.  **OMDb API (`/api/omdb/`)**: Year, ratings, and English title mapping.
4.  **Bangumi API (`/api/bangumi/`)**: Asian metadata and ratings fallbacks.
5.  **Simkl API (`/api/simkl/`)**: Genre definitions and watch counters.
6.  **Fandom API (`https://[subdomain].fandom.com/api.php`)**: Gathers character relationships and lore data.

---

## 8. UI / Design System Reality

Derived from [index.css](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/src/index.css):
*   **Visual Style**: Transparent borders (`border-white/10`), glassmorphic panels (`backdrop-blur-xl`), and dark slate canvases (`#030409`).
*   **Theme Gradients**:
    *   `--gradient-hero`: linear blend from Cosmic Purple to Spirit Cyan.
    *   `--gradient-card`: linear blend representing deep navy container backgrounds.
*   **Keyframes & Motion**:
    *   `kenburns`: Pan-and-zoom animation scaling images from `1` to `1.08`.
    *   `drift-spark`: Drifts sparkle div items upward to mimic glowing energy.

---

## 9. Responsive Behavior

*   **Desktop**: Horizontal nav menu, slide filmstrips in hero slider, multi-column cards.
*   **Tablet**: Screens adapt via Tailwind `@media (min-width: 768px)`. Paginators switch from filmstrips to dot-capsules.
*   **Mobile**: Bottom navigation bar pins to screen footer (`use-mobile.tsx` handles conditional drawer switches). Side menus hide inside a Radix drawer Sheet.

---

## 10. Animation System

*   **GSAP / ScrollTrigger**: Powers page headers, title split-text shifts, and scroll-bound animations.
*   **Framer Motion**: Standard Radix slide-out and layout animations.
*   **Lenis Scroll**: Handles viewport smooth-scrolling.

---

## 11. Testing & Quality Infrastructure

*   **Playwright config** ([playwright.config.ts](file:///c:/Users/ASUS/Desktop/my%20website/my-anime-website%20-%20Copy%20(2)/playwright.config.ts)): Target port: `5173`. Specifies browser configuration.
*   **TypeScript check**: `npx tsc --noEmit`.
*   **Linting checks**: `npm run lint`.

---

## 12. Feature Inventory

| Feature | Status | Implementation Location | Data Source | UI Status |
| :--- | :--- | :--- | :--- | :--- |
| **Home Portal** | Operational | `src/pages/Home.tsx` | Supabase / Static | Complete |
| **Search Panel** | Operational | `src/pages/Search.tsx` | `animeCatalog` / Supabase | Complete |
| **Airing Schedule**| Operational | `src/pages/Calendar.tsx` | AniList / Supabase | Complete |
| **Watch & Player** | Operational | `src/pages/Watch.tsx` | `episode_servers` / fallback | Complete |
| **Admin CMS** | Operational | `src/pages/admin/` | Supabase tables | Complete |
| **Sync Manager** | Operational | `src/pages/admin/SyncDashboard.tsx`| `sync_logs` / Services | Complete |
| **AI mock Chat** | Simulated | `src/pages/ExperimentalAI.tsx` | Local State Mocks | Complete |

---

## 13. Confirmed Bugs

1.  **Supabase 400 Bad Request Errors**: When logging in via mock/dev bypass credentials, queries for watchlist and watch progress trigger DB parse failures since `"mock-user-id-admin-cultivator"` is not a valid Postgres `UUID` type.
2.  **Duplicate Key Warning**: In `WikiApiExplorer.tsx` line 520 / 711, duplicate key markers (`soulland`) trigger React console error warnings during list iteration.

---

## 14. Technical Debt

*   **Oversized Pages**: `WikiApiExplorer.tsx` (191KB, 3882 lines) and `Watch.tsx` (74KB, 900+ lines) are oversized components that should be code-split.
*   **Tailwind Breaker**: `Tailwind.config.ts` omits the `sm` (640px) screen scale, meaning `@media` layouts behave unexpectedly when scaling down to small tablets.
*   **Hardcoded Fallbacks**: Literals inside `supabase.ts` commit default URL keys.

---

## 15. Intentional Product Decisions

*   **Horizontal Layout Rows**: Home shelves enforce horizontal swipe carousels on mobile viewports.
*   **Route Protection**: Streaming pages (`/watch`) require authenticating sessions (using mock elevations or actual Supabase logins).
*   **Progress-Merge Database Function**: Identity transition merges visitor sessions directly via the `merge_guest_to_permanent` RPC.

---

## 16. Locked / Protected Areas

*   **Supabase Schema (`supabase_schema.sql`)**: Modifying DB triggers or constraints without validation could break production sync profiles.
*   **AuthContext Core (`AuthContext.tsx`)**: Integrations handle guest session transitions; edits should be reviewed.

---

## 17. External Integrations

*   **Supabase Database & Auth Provider**: Project ID `wwgvezljjaceoiybhklh`.
*   **AniList GraphQL Endpoint**: Airing calendar details.
*   **Fandom Wiki php endpoints**: Character profiles crawler.

---

## 18. Unknowns

*   **Cron Job Sync Script**: It is unknown if Vercel scheduler executes the schedules syncing cron job successfully in live environments, or if database role key constraints restrict it.
*   **Gemini API Key usage**: The page `ExperimentalAI.tsx` does not import `@google/genai` to use Gemini API keys; it is unknown if there is a plan to connect real chats to a cloud-based serverless model.
