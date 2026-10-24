# AGENTS.md

## Project Overview
TeraPlay Universal Media & Creator Dock. A $0-budget web platform providing YouTube transcript/subtitle exports, 1080p thumbnail downloads, TeraBox in-browser streaming, and discreet ad network monetization slots.

## Development & Test Commands
- **Dev Server**: `npm run dev` (starts Vite dev server at `http://localhost:5173`)
- **Typecheck**: `npm run typecheck` (runs `tsc` over `src/` via `tsconfig.app.json` and over `api/` via `tsconfig.api.json`)
- **Production Build**: `npm run build` (runs the typecheck, then the Vite production build)
- **Automated Tests**: `npm test` (runs `node tests/universal-dock.test.mjs`, verifying YouTube URL normalization, TeraBox mirrors, direct streams, time formatting, and SubRip SRT generation)
- **Linter**: `npm run lint` (runs ESLint over the whole repo, skipping vendored and generated directories)
- **Full Gate**: `npm run verify` (lint, typecheck, build, then tests)

## Core Codebase Conventions
- **Client-First Execution**: Perform downloads and conversions in-browser whenever possible to avoid backend proxy bandwidth.
- **Honest States**: No fake or mock subtitle injection. When subtitles are absent, surface an explicit notice.
- **No Over-Engineering**: Adhere to YAGNI and Ponytail mode. Maintain clean routing, typed props, and minimal dependencies.
- **SEO & Legal Compliance**: Maintain DMCA, Privacy, Terms, and Contact pages for ad network approval.

## Architectural & Pruning Invariants
- **Wisdom Preservation First**: When pruning legacy features or migrating architecture, always extract domain scrapers, federation patterns, and fallback logic into dedicated archive files (`DONGHUA_LEGACY_WISDOM.md`) before deletion.
- **Dual-Audience Architecture Docs**: Maintain `CODEBASE_DESIGN.md` with beginner-friendly explanations and senior-level deep module invariants.
- **Zero-Bandwidth Video Selection**: Video downloads must prefer progressive muxed streams (audio + video combined) or client-side muxing to avoid proxy bandwidth costs.
- **Clean Route Redirects**: Replace bloated route catch-alls with compact canonical redirects (`/watch/*`, `/anime/*`, `/admin/*` -> `/`).

## Environment & Tooling Guardrails
- **PowerShell Command Guardrail**: On Windows PowerShell, avoid passing complex multi-line JS/Python code with inline quotes in `run_command` (PowerShell strips quotes and causes syntax errors). Write temporary script files (`.py` or `.mjs`) or use native file editing tools.

## Prose and Writing Rules

Applies to docs, comments, commit bodies, PR descriptions, and user-facing copy.

- No em dashes. Use commas, colons, parentheses, or a second sentence.
- Vary sentence length. Follow a long sentence with a short one. Fragments are fine.
- Cut AI vocabulary: delve, leverage, tapestry, testament, underscore, multifaceted, realm, seamless, robust, "it's worth noting", "in today's landscape", "navigate the landscape".
- No reflexive rule-of-three. No summary line closing every paragraph. No "In conclusion" wrap.
- State the fact, not its significance. Delete "this represents / underscores / highlights".
- Active voice with a named actor. No agentless passive.
- Take a defensible position on opinions. No both-sides mush.
- Concrete over abstract: numbers, file paths, real examples.
- No emoji in headings. No bold-first bullets in prose sections. Bold labels stay fine in reference lists, spec tables, decision logs, and form fields.

Domain terms stay. "Progressive muxed stream", "SubRip timestamp", and "yt-dlp extractor" are precise language. Business buzzwords and AI vocabulary are not.

### Which writing skill to use

| Need | Skill |
|---|---|
| Targeted edit that keeps the author's voice | `anti-slop` (repo-local) |
| Full rewrite of AI-sounding prose | `deslop` |
| Pattern audit, AI-tell score, in-place Markdown edit | `humanizer` |
| Rules while drafting new copy | `anti-ai-slop-writing` |

Pick one per pass. They disagree on structure and punctuation. `anti-slop` wins for edits because it protects voice, `deslop` wins when the user asks for a rewrite, `humanizer` wins when the user asks for a score or a report.

## Skills Policy

Skills are advisory. The conventions in this file win whenever a skill conflicts with them.

- Default to the `ponytail` skill on every coding task: smallest change that fully solves it, standard library before custom code, no speculative abstraction. The user can override by naming another approach.
- Name the skill you want. "use the code-reviewer skill on src/lib/urlNormalizer.ts" beats letting several match on their own, because overlapping skills disagree about file layout, naming, and error handling.
- This is a client-first Vite SPA. Do not add server frameworks, ORMs, queues, Docker, or Kubernetes unless the task asks for them.
- React here runs on React 18 with react-router 6. No Next.js, no App Router, no Server Components, no `use client`. The `react-expert` and `nextjs-developer` skills describe those patterns, so they do not apply.
- TypeScript runs with `strict: false` and `noImplicitAny: false`. `no-explicit-any` is a warning because the resolver parses untyped yt-dlp, Simkl, and Trakt payloads. Do not rewrite `any` into generic chains unless the task asks for it.
- `api/` is covered by `tsconfig.api.json`, so `npm run typecheck` reaches the Vercel functions.
- Run `npm run verify` before committing.
- If a diff touches more files than the task, the skill over-applied. Revert and retry with an explicit file list.
- Aggressive rewrites in these files break working behavior, so leave them alone unless the task names them: `src/components/video/CustomVideoPlayer.tsx`, `src/pages/Index.tsx`, `api/resolve.ts`, `api/stream-download.ts`.
