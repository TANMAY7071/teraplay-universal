# AGENTS.md

## Project Overview
TeraPlay Universal Media & Creator Dock. A $0-budget web platform providing YouTube transcript/subtitle exports, 1080p thumbnail downloads, TeraBox in-browser streaming, and discreet ad network monetization slots.

## Development & Test Commands
- **Dev Server**: `npm run dev` (starts Vite dev server at `http://localhost:5173`)
- **Production Build**: `npm run build` (runs TypeScript compiler and Vite production build)
- **Automated Tests**: `node tests/universal-dock.test.mjs` (verifies YouTube URL normalization, TeraBox mirrors, direct streams, time formatting, and SubRip SRT generation)
- **Linter**: `npx eslint src/pages/Index.tsx src/App.tsx src/lib/urlNormalizer.ts src/components/ads/AdBannerSlot.tsx`

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
