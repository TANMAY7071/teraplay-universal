# DonghuaStream

A streaming site for donghua (Chinese animation) with series detail pages, episode watching, watchlists, and per-series universe/lore pages.

## Language

### Hero

**Hero**:
The full-width banner at the top of the home page; a carousel of featured series.
_Avoid_: banner, slider, showcase

**Hero variant**:
Exactly one of two mutually exclusive hero implementations — desktop or mobile — mounted per viewport. Both must never be in the DOM at once.
_Avoid_: responsive hero (ambiguous about which is rendered)

**Background trailer**:
Muted video that autoplays behind the active hero slide after a deliberate deferral. See ADR-0001.
_Avoid_: hero video, loop

**Trailer**:
A series' promotional video, opened on demand (modal/player), not embedded in the page flow.
_Avoid_: background trailer when meaning the on-demand one — say which you mean

### Series identity

**Slug**:
The canonical URL identifier for a series (e.g. `battle-through-the-heavens`). Used in routes and lore file names.
_Avoid_: id, key

**Fandom subdomain**:
The wiki community's subdomain for a series, resolved from a title by `resolveFandomSubdomain`. Usually equals the Slug but is a separate concept — never assume they match.
_Avoid_: wiki slug (collides with Slug)

### Lore

**Lore**:
Canonical series content — characters, locations, clans, realms, artifacts — shipped as read-only static data.
_Avoid_: wiki data (that's the external source, not our copy)

**Lore file**:
The per-series JSON at `public/data/lore/{slug}.json`. One series per file; never a combined dump. See ADR-0002.
_Avoid_: cached-lore.json (the retired monolith), lore cache

**Lore registry**:
The merged view of curated local lore + the lore file, served through `loreRegistryService`.
_Avoid_: lore service (too generic)
