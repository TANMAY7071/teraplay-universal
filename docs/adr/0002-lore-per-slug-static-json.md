# Serve lore as per-slug static JSON files, not a monolith or a database

Lore data (characters, locations, realms per series) shipped as one 20.7MB `cached-lore.json` that every lore-consuming page fetched whole, while pages only ever read a single series key. We split it into `public/data/lore/{slug}.json` (9 files, ~0.3–5.2MB each) plus a ~2.3KB `index.json` for directory views, and repointed all consumers (`Watch`, `AnimeDetail`, `UniverseLore`, `WikiApiExplorer`, `loreRegistryService`) at `/data/lore/${slug}.json`. Visitors now download only their series (~1.86MB for BTTH instead of 20.7MB).

## Considered Options

- **Move lore to Supabase tables** (deferred): the long-term destination if live CMS editing, cross-series search, or >15 series arrive — but with no upload pipeline and static read-only lore, it was migration cost without a consumer. The per-slug files double as future import batches.
- **Keep one file, Brotli + Web Worker** (rejected): fixes parse jank but every page still downloads/parses all 9 series; memory grows unboundedly. A dead end.

## Consequences

- `src/data/lore/scraper.js` writes per-slug output directly; the old monolith copies are deleted — do not reintroduce a combined file.
- `/data/lore/*` is unhashed, so `vercel.json` serves it `max-age=86400, stale-while-revalidate=604800` (not `immutable`) so scraper updates appear within a day.
- Two series (`soulland` 5.2MB, `swallowed-star` 4.2MB) remain large; if they show up in traces, split them by category before reaching for a Worker.
