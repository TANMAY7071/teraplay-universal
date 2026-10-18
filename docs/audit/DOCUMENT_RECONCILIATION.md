# Document Reconciliation — DonghuaStream

This document performs a reconciliation of claims made in prior audits, design system specifications, task sheets, and roadmap proposals against the **actual repository state, source code, and configurations**.

---

## 1. Document Reconciliation Matrix

| Claim | Source Document | Current Evidence | Status | Action |
| :--- | :--- | :--- | :--- | :--- |
| "Supabase URL and anon key are hardcoded in `supabase.ts` L3-L4" | `implementation_plan.md` | `src/lib/supabase.ts` uses literal credentials fallback when env vars are missing. | **VERIFIED** | Keep fallbacks but ensure proper `.env` variables override them in production. |
| "Watch progress sync localStorage ↔ Supabase two-way sync is working" | `implementation_plan.md` | Implemented in `src/hooks/useAnimeQueries.ts` and `src/services/progress.ts`. | **VERIFIED** | Maintain. |
| "Sports/Donghua Live page is a standalone mock page without real backend" | `implementation_plan.md` | `src/pages/Sports.tsx` is a large file using mock streams and static lists. | **VERIFIED** | Maintain as mock/sandbox. |
| "Experimental AI page has Google Gemini `@google/genai` integration" | `implementation_plan.md` | `@google/genai` is not imported anywhere in `src/`. Page uses local mock chat state. | **CONTRADICTED** | Reconciled as purely simulated/mocked client-side chatbot. |
| "Three copies of Watch page exist in the route tree (Watch.tsx, Watch_backup.tsx, Watch_current.tsx)" | `implementation_plan.md` | Only `src/pages/Watch.tsx` remains; others have been deleted. | **STALE** | Resolved. |
| "Supabase schema file corruption on lines 364-401 (null bytes)" | `implementation_plan.md` | `supabase_schema.sql` is a clean, readable UTF-8 file with executable SQL. | **STALE** | Resolved. |
| "Navbar logout manually clears localStorage and does not call `signOut()`" | `implementation_plan.md` | `Navbar.tsx` now calls `signOut()` from the `useAuth()` context. | **STALE** | Resolved. |
| "`@playwright/test` is in dependencies instead of devDependencies" | `implementation_plan.md` | `@playwright/test` is correctly placed in `devDependencies` in `package.json`. | **STALE** | Resolved. |
| "`noImplicitAny` and `strictNullChecks` are disabled in compiler configuration" | `implementation_plan.md` | Verified `tsconfig.json` compilerOptions have both flags set to `false`. | **VERIFIED** | Keep until strict migration is requested. |
| "Tailwind screens configuration lacks `sm` breakpoint in `tailwind.config.ts`" | `implementation_plan.md` | `screens` starts at `md: 768px`. `sm` is missing despite `sm:` selectors in pages. | **VERIFIED** | Keep as is (or fix when layout styling updates are approved). |
| "`recharts` package is installed but unused outside UI charts helper" | `implementation_plan.md` | `recharts` is imported in `chart.tsx` but `chart.tsx` is never imported by page files. | **VERIFIED** | Keep in devDependencies/dependencies or remove if clean-up is requested. |
| "design-system/MASTER.md exists" | (Hypothetical Proposal) | No such file exists; design system was recorded in an IDE brain artifact. | **CONTRADICTED** | Visual specifications are now documented in `docs/audit/BASELINE_REALITY.md`. |
| "Watch.tsx split into sub-components" | `task.md` | `Watch.tsx` imports `CustomVideoPlayer`, `CommentSection`, and `CharactersWidget`. | **PARTIALLY VERIFIED** | Some sub-components were extracted, but `Watch.tsx` remains ~1500 lines. |
| "Add React error boundaries" | `task.md` | `ErrorBoundary` is imported and wraps `App` child routes in `src/App.tsx`. | **VERIFIED** | Resolved. |

---

## 2. Current Truth
*   **Active Frameworks**: A React 18 SPA built with Vite (SWC plugin) and styled with Tailwind CSS (v3).
*   **Database & CMS**: Complete Supabase PostgreSQL backend integration with Row Level Security (RLS) policies and user metadata-triggered profiles.
*   **Data Caching**: TanStack React Query handles query cache states with strict query key factory wrappers in `src/hooks/useAnimeQueries.ts`.
*   **Routing**: Clean route lists defined under `App.tsx` mapped to pages and nested administrative components inside `AdminLayout`.

---

## 3. Historical Truth
*   **Monolithic Watch Page**: The playback route was formerly an all-in-one monolith over 1,780 lines long containing video, comments, character details, and ratings code.
*   **Redundant Code Backups**: Duplicate backup page templates (`Watch_backup.tsx` and `Watch_current.tsx`) populated the page directories.
*   **Broken Logout Logic**: The navigation header formerly dropped client-side storage keys directly instead of executing server-side session invalidation.

---

## 4. Planned Future
*   **Fuzzy Trigram Searches**: The `pg_trgm` extension is enabled in the database script, hinting at a planned transition from client-side array filtering to true full-text search.
*   **Live Streams & Notifications**: Realtime pipelines for video broadcasts and notification alerts have database structures ready but lack client integrations.
*   **Offline/Downloads Storage**: UI menus for downloading files exist but do not link to concrete browser caching layers.

---

## 5. Contradictions
*   **Google GenAI Package**: The library `@google/genai` is listed in dependencies, but no files in `src/` import or invoke it; the chat UI is completely mocked using client-side react state.
*   **Mobile Screen Breakpoints**: Classes with `sm:` prefixes are written in templates, but because `sm` is omitted from `tailwind.config.ts` screens, Tailwind ignores those rules on small mobile viewports.

---

## 6. Dangerous Assumptions
*   **Mock Session Credentials**: The authentication hook assumes that mock logins using emails containing "admin" automatically elevate the user's client-side role to "admin" with level 99. If this bypass state is accidentally enabled in a production build, it creates a vector for client-side administration panel access (though actual writes remain blocked by database RLS controls).
*   **Static Data Fallbacks**: Static mock lists under `src/data/` share naming keys with active database columns. An AI agent might assume that editing files like `src/data/anime.ts` updates the streaming catalog, whereas the application queries Supabase tables first and only falls back to static files when DB rows are empty.
