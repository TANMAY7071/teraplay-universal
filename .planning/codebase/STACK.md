---
last_mapped_commit: d8e50716fb3344f8157e4437310d57acc836258c
last_mapped_at: 2026-10-18
---
# Technology Stack

**Analysis Date:** 2026-10-18

## Languages

**Primary:**
- TypeScript 5.5.3 - Frontend application code in `src/` and serverless functions in `api/`
- JavaScript (ES Modules) - Configuration files (`vite.config.ts`, `eslint.config.js`) and test runner (`tests/universal-dock.test.mjs`)

**Secondary:**
- Python 3.14 - Local fallback media extractor (`scripts/extractor.py`) using `yt-dlp` in `.venv/`

## Runtime

**Environment:**
- Node.js >=22.0.0
- Python 3.14 (in `.venv/`)

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - Component-driven UI framework with hooks
- Vite 5.4.19 - Next-generation frontend bundler and dev server
- Tailwind CSS 3.4.11 - Utility-first styling with `@tailwindcss/typography` and `tailwindcss-animate`

**UI & Media Componentry:**
- Radix UI - Accessible unstyled primitives (dialogs, tooltips, accordions, dropdowns)
- Lucide React 0.441.0 - Modern icon system
- Hls.js 1.5.15 - In-browser HTTP Live Streaming (HLS) client
- React Helmet Async 2.0.5 - Canonical tags and JSON-LD schema management

**Data & State:**
- TanStack React Query 5.56.2 - Asynchronous query caching and data synchronization
- Supabase JS 2.45.4 - Client SDK for authentication and persistence

**Testing:**
- Node.js Native Test Runner - `tests/universal-dock.test.mjs`
- Playwright 1.57.0 - End-to-end browser automation suite (`playwright.config.ts`)

## Key Dependencies

**Critical:**
- `hls.js` (^1.5.15) - Direct client-side HLS video streaming in `CustomVideoPlayer.tsx`
- `@supabase/supabase-js` (^2.45.4) - Authentication and cloud session management in `src/integrations/supabase/`
- `react-router-dom` (^6.26.2) - Client-side single-page routing
- `lucide-react` (^0.441.0) - UI icon set across media tabs and navigation

**Infrastructure & Tooling:**
- `vite` (^5.4.19) - Development server and production bundling with custom rollup chunking
- `typescript` (^5.5.3) - Strict static type analysis
- `eslint` (^9.9.0) - Flat configuration linter

## Configuration

**Build & Bundler:**
- `vite.config.ts` - Configures path aliases (`@/*`), manual chunk splitting (`hls-vendor`, `supabase`, `core-vendor`, `ui-vendor`), and local development API middlewares.
- `tsconfig.json` & `tsconfig.app.json` - Strict TypeScript compilation settings.

**Styling:**
- `tailwind.config.ts` - Theme colors, animations, border radius tokens, and typography plugins.
- `postcss.config.js` - PostCSS runner with Tailwind and Autoprefixer.

---
*Codebase analysis: 2026-10-18*
