# Coding Conventions

**Analysis Date:** 2026-10-18

## Language & Code Style

- **TypeScript Strictness:** Strict null checks, explicit interface contracts, zero `any` usage in core domain files.
- **Components:** Functional components using React 18 hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`).
- **Styling:** Tailwind utility classes; custom CSS rules isolated in component CSS files or scoped prefixes (`tp-`).
- **Icons:** Standardized on `lucide-react`.

## Naming Conventions

- **React Components:** PascalCase (e.g., `CustomVideoPlayer.tsx`, `AdBannerSlot.tsx`, `Index.tsx`).
- **Utilities & Domain Logic:** camelCase (e.g., `urlNormalizer.ts`, `formatTime`, `generateSrtContent`).
- **Types & Interfaces:** PascalCase (e.g., `TranscriptItem`, `ResolvedMedia`, `AdBannerSlotProps`).
- **Constants:** UPPER_SNAKE_CASE (e.g., `GUEST_MAX_PLAYS`, `FALLBACK_DEMO_TRANSCRIPT`).

## Error Handling & Reliability

- **Honest States:** Never inject mock data silently. If a YouTube video lacks closed captions, the system surfaces an explicit empty notice with an opt-in button to load demo cues.
- **Graceful Fallbacks:** If a 1080p `maxresdefault.jpg` YouTube thumbnail returns HTTP 404, the download handler falls back to 720p `hqdefault.jpg`.
- **CORS Protection:** Client-side downloads use `fetch() -> blob() -> URL.createObjectURL()` for CORS-enabled CDNs (`img.youtube.com`), with fallback to new-tab navigation.

## Linter Configuration

- Flat configuration in `eslint.config.js` with TypeScript ESLint and React hooks plugins.
- Verification command: `npx eslint src/pages/Index.tsx src/App.tsx src/lib/urlNormalizer.ts src/components/ads/AdBannerSlot.tsx`.

---
*Codebase analysis: 2026-10-18*
