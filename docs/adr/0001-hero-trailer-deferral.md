# Defer background hero trailers instead of shipping a local video file

The hero once autoplayed a self-hosted 17.4MB MP4 (`public/trailers/btth-trailer.mp4`), which competed with the LCP image for bandwidth on every first visit. We decided to delete the local file and use a YouTube embed iframe for the background trailer instead — but only mounted after a 4-second delay + `requestIdleCallback`, with `loading="lazy"` and `navigator.connection.saveData` / 2G detection, so the ~1.5MB of third-party player JS lands after the LCP/INP window and never loads for data-saver users.

## Considered Options

- **Keep the local MP4** (rejected): no-adaptive-bitrate, every desktop visit paid the full 17.4MB against the LCP budget and Vercel's 100GB egress cap.
- **Netflix-style self-hosted loop** (deferred, preferred long-term): a 5–10s muted WebP/MP4 loop < 1.5MB with `preload="none"` and post-LCP start. Not done yet because it requires clipping/compressing/source footage per featured show. Revisit when the next featured show gets a hero loop; `slide.trailerUrl` still exists in `hero-config.ts` for this.
- **YouTube embed, immediate mount** (rejected): third-party CPU cost during the critical loading window.

## Consequences

- `hero-config.ts` slide 1 uses `youtubeTrailerId`, not `trailerUrl` — the local-file field is intentionally dormant, not dead code.
- The 4-second/idle gating in `HeroDesktop.tsx` is deliberate; do not "optimize" it away.
