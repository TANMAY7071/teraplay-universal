# DonghuaStream Current State

Current verified project state. Every claim traceable to `BASELINE_REALITY.md` or direct repository evidence. (Note: Repository state overrides all historical documents).

---

## Verified Stack

| Layer | Tech | Version | Evidence |
| :--- | :--- | :--- | :--- |
| Framework | React | 18.3.1 | `package.json` L57 |
| Language | TypeScript | 5.5.3 | `package.json` L87 |
| Build | Vite + SWC | 5.4.1 | `package.json` L89, `vite.config.ts` |
| Styling | Tailwind CSS | 3.4.11 | `package.json` L86 |
| UI Primitives | shadcn/ui (Radix) | various | `src/components/ui/` |
| State/Query | TanStack React Query | 5.56.2 | `package.json` L45 |
| Database | Supabase (PostgreSQL) | Client 2.110.0 | `package.json` L44, `supabase_schema.sql` |
| Auth | Supabase Auth | — | `src/contexts/AuthContext.tsx` |
| Routing | React Router DOM | 6.26.2 | `package.json` L63 |
| Animation | Framer Motion 13 + GSAP 3.15 | — | `package.json` L51-L52 |
| Scrolling | Lenis | 1.3.26 | `package.json` L54 |
| Testing | Playwright | 1.62.1 | `package.json` L73 (devDep) |

---

## Architecture

**SPA** — client-side rendered, no SSR/SSG. Routes guarded by `ProtectedRoute` (auth) and `AdminRoute` (admin tier). All public pages wrapped in `AppShell` → `PageWrapper`. Admin pages wrapped in `AdminLayout`.

---

## Routes

| Route | Component | Guard | Primary Data Source |
| :--- | :--- | :--- | :--- |
| `/` | Home | Public | Supabase / static fallback |
| `/login` | Login | Public | Supabase Auth |
| `/register` | Register | Public | Supabase Auth |
| `/anime/:slug` | AnimeDetail | Public | Supabase → Fandom fallback |
| `/watch/:slug/:episodeNumber` or `/watch/:id` | Watch | Protected | `episode_servers` table |
| `/watchlater` | Library (Redirect) | Protected | Supabase watchlist/progress |
| `/library` | Library | Protected | Supabase watchlist/progress |
| `/calendar` | Calendar | Public | AniList GraphQL |
| `/search` | Search | Public | Static array / Supabase |
| `/explore` or `/browse` | Explore | Public | Static array / Supabase |
| `/genre/:genre` | GenrePage | Public | Supabase |
| `/profile` | Profile | Protected | Supabase users |
| `/community` | Community | Public | Supabase |
| `/sports` | Sports | Public | Mock data only |
| `/experiment-ai` | ExperimentalAI | Public | Mock client state only |
| `/wiki-api-explorer` | WikiApiExplorer | Public | Fandom MediaWiki API |
| `/admin/*` | AdminLayout (21 sub-pages) | Admin | Supabase tables |

---

## Major Features

| Feature | Status | Location |
| :--- | :--- | :--- |
| Auth (email, Google, anonymous, guest→permanent merge) | Working | `AuthContext.tsx`, `supabase_schema.sql` |
| Watch progress sync (localStorage ↔ Supabase) | Working | `progress.ts`, `useAnimeQueries.ts` |
| Comments | Working | `comments.ts`, `CommentSection.tsx` |
| Watchlist (local + DB) | Working | `watchlist.ts` |
| Cultivation rank gamification | Working | `AuthContext.tsx`, profile page |
| Admin CMS (21 pages) | Working | `src/pages/admin/` |
| Multi-API metadata aggregation | Working | `src/services/` (7 providers) |
| Calendar/Schedule | Working | AniList airing schedule |
| ErrorBoundary | Working | Wraps routes in `App.tsx` |
| SEO meta tags | Present | `react-helmet-async` via `SEO.tsx` |

---

## Data Flow

```
Supabase / External APIs (AniList, Fandom, Sanka, etc.)
  ↓
src/services/  (fetch adapters with abort signals)
  ↓
src/hooks/useAnimeQueries.ts  (TanStack Query cache)
  ↓
src/contexts/AuthContext.tsx  (session, profile, ranks)
  ↓
Components (render)
```

Fallback chain: Supabase DB → AniList GraphQL → Sanka API → static `src/data/` arrays.

---

## API Sources

| API | Endpoint | Purpose |
| :--- | :--- | :--- |
| AniList | `https://graphql.anilist.co` | Airing schedules, covers, studios |
| Fandom | `https://[sub].fandom.com/api.php` | Characters, lore |
| Sanka | `/api/sanka/` (dev proxy) | Streaming mirrors fallback |
| OMDb | `/api/omdb/` (dev proxy) | Ratings, English titles |
| Simkl | `/api/simkl/` (dev proxy) | Genre data, watch counts |
| Bangumi | `/api/bangumi/` (dev proxy) | Asian metadata fallback |
| Trakt | via `traktAnime.ts` | Metadata enrichment |

Dev proxies in `vite.config.ts` — **do not work in production builds**.

---

## UI Architecture

- **Primitives**: `src/components/ui/` — shadcn/ui wrappers over Radix.
- **Layout**: `AppShell` (sidebar + footer + mobile drawer) → `PageWrapper` (content container).
- **Cards**: `ContentCard` (2:3 poster), `MediaCard` (horizontal list).
- **Video**: `CustomVideoPlayer.tsx` in `src/components/video/`.
- **Watch sub-components**: `CommentSection.tsx`, `CharactersWidget.tsx` in `src/components/watch/`.

---

## Design Language

- **Canvas**: `#030409` dark background.
- **Cards**: `#0d111c` with `border-white/10`.
- **Primary**: Cosmic Purple `#C084FC` (`HSL 280 100% 70%`).
- **Accent**: Spirit Cyan `#06B6D4` (`HSL 191 100% 50%`).
- **Radius**: `--radius: 0.75rem` (12px).
- **Glow**: `box-shadow: 0 0 30px hsl(var(--primary) / 0.3)`.
- **Gradients**: Purple→Cyan accent, bottom-fade vignette on hero/cards.
- **Typography**: System sans-serif (`Inter`), aggressive weight hierarchy (Black → Bold → Medium).
- **Theme**: HSL CSS variables with light/dark definitions in `index.css`.

---

## Responsive Rules

| Breakpoint | Width | Behavior |
| :--- | :--- | :--- |
| Mobile | < 768px | Bottom tab bar, hamburger drawer, single-column |
| Tablet (md) | ≥ 768px | Adapted layouts, dot paginators |
| Desktop (lg) | ≥ 1024px | Horizontal nav, multi-column grids |
| Widescreen (xl) | ≥ 1440px | Max-width container |
| **sm (640px)** | **MISSING** | **Not defined in `tailwind.config.ts`** |

---

## Animation System

| Engine | Purpose | Evidence |
| :--- | :--- | :--- |
| GSAP + ScrollTrigger | Timeline scroll effects, SplitText | `gsap` + `@gsap/react` in deps |
| Framer Motion | Modal/drawer transitions, layout animations | `framer-motion` in deps |
| Lenis | Global smooth scroll | `lenis` in deps |
| CSS keyframes | `kenburns`, `drift-spark`, `glow-pulse`, `shimmer` | `index.css`, `tailwind.config.ts` |

---

## Testing

- **Playwright** configured at port `5173` via `playwright.config.ts`.
- **TypeScript check**: `npx tsc --noEmit`.
- **Lint**: `npm run lint` (ESLint 9).

---

## Confirmed Technical Debt

| Issue | Evidence |
| :--- | :--- |
| Missing `sm` breakpoint — all `sm:` classes are no-ops | `tailwind.config.ts` L14-19 |
| `noImplicitAny: false`, `strictNullChecks: false` | `tsconfig.json` L12, L17 |
| `WikiApiExplorer.tsx` is 3,882 lines / 191KB | `src/pages/WikiApiExplorer.tsx` |
| `Watch.tsx` is ~1,500 lines / 74KB (partially split) | `src/pages/Watch.tsx` |
| `@google/genai` installed but never imported | `package.json` L14, grep confirms 0 imports |
| `recharts` installed but `chart.tsx` never imported by any page | `package.json` L64, grep confirms 0 imports |
| Dev-only Vite proxies for Sanka/OMDb/Bangumi/Simkl | `vite.config.ts` — CORS in production |
| Global `* { transition }` rule on all DOM elements | `index.css` |

---

## Known Bugs

1. **Mock UUID parse failure**: `bypassLogin()` creates `"mock-user-id-admin-cultivator"` which is not a valid PostgreSQL UUID. Supabase returns 400 on watchlist/progress queries. Evidence: browser audit, `AuthContext.tsx` L301.
2. **Duplicate React keys**: `WikiApiExplorer.tsx` renders lists with non-unique keys. Evidence: browser console warnings, `skill-observations/log.md`.

---

## Locked Decisions

- **TanStack Query key factory** in `useAnimeQueries.ts` — all data fetching depends on it.
- **Guest→permanent merge RPC** (`merge_guest_to_permanent`) — identity transition logic.
- **RLS policies** in `supabase_schema.sql` — admin writes gated by `subscription_tier = 'admin'`.
- **Cultivation rank system** — XP/level/realm progression tied to auth context.

---

## Protected Areas

- **`supabase_schema.sql`** — production triggers, RLS, and table definitions.
- **`AuthContext.tsx`** — core auth flow including guest sessions and mock bypass.
- **`src/services/metadataProvider.ts`** — strategy pattern decoupling data sources from consumers.

---

## Current Limitations

- **No SSR/SSG** — SPA renders empty HTML for crawlers.
- **No `robots.txt` or `sitemap.xml`**.
- **CORS in production** — Vite dev proxies don't exist in built output.
- **Admin auth is client-side** — `AdminRoute` checks `subscription_tier` on the client. DB RLS provides real protection.
- **No image optimization** — no `loading="lazy"`, no srcset, no WebP.

---

## Current Unknowns

- Whether Vercel cron (`/api/sync-schedule`) authenticates correctly with Supabase service role key.
- Whether `@google/genai` dependency is intended for future use or should be removed.
- Whether the `pg_trgm` extension is actively used for fuzzy search or only enabled.

---

## Active Work

None. Project is in clean baseline state. No code modifications are in progress.

---

## Do Not Assume

| Assumption | Reality |
| :--- | :--- |
| Editing `src/data/anime.ts` updates the catalog | App queries Supabase first; static arrays are last-resort fallbacks |
| `bypassLogin()` works in production | Admin escalation is gated by `import.meta.env.DEV` |
| `ExperimentalAI` uses real AI | It is a fully mocked client-side chatbot with no API calls |
| `Sports` page streams live content | It renders mock channel cards with no backend |
| Old audit claims are current truth | Repository state overrides all historical documents |
| `sm:` Tailwind classes work | They are silently ignored — `sm` breakpoint is not defined |
