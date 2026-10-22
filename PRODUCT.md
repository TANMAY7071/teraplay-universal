# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary (user-confirmed):** Content creators who reuse media: they pull video clips, thumbnail images, and timestamped transcripts from source platforms (YouTube, TikTok, Bilibili, etc.) for their own content work.
- **Secondary:** Casual downloaders saving a video, audio track, or subtitle file from any supported platform.
- **Audience note (inferred, not confirmed):** TeraBox and WhatsApp first-class flows suggest a significant Southeast-Asian user base; product copy is currently English-first, with no strong regional encoding.

## Product Purpose

TeraPlay is a universal media resolver and creator dock. Paste any media URL, and the product detects the platform, then enables: progressive MP4 downloads (1080p→360p, never silent), high-bitrate MP3/M4A extraction, multi-resolution thumbnail downloads, searchable timestamped transcripts with `.srt`/`.txt` export, and in-browser streaming (YouTube/Vimeo embeds, HLS/direct MP4). Success means the user gets their file/asset quickly, on any of 1,751+ yt-dlp-enabled platforms, without installing anything.

## Positioning

One dock for every platform: yt-dlp's 1,751+ platform coverage behind a zero-click paste box, paired with bias-free generosity (thumbnails + transcripts treated as first-class outputs, not extras), delivered entirely in-browser at $0 operating cost. A neighboring product would not truthfully copy: universal platform breadth + no-install browser-only flow + zero-budget infrastructure.

## Operating Context

- Deployed split-edge: Vercel CDN frontend + Render.com free-tier Python (FastAPI + yt-dlp) microservice; UptimeRobot pings keep free backend awake.
- User does everything in the browser; no account required.
- Monetization context: discreet ad-network slots; ad-network approval requires a complete DMCA, Privacy, Terms, and Contact legal surface.
- Tool is used in situations where people share media via WhatsApp; product must surface honest guidance about WhatsApp E2EE (paste the original link) rather than pretending to fetch encrypted media.

## Capabilities and Constraints

- Zero-click auto-detection: paste URL, engine detects platform from 13+ URL families (`src/lib/urlNormalizer.ts`).
- Video: progressive (muxed audio+video) streams only for downloads. Zero-bandwidth invariant: downloads must never be silent, and no video piping through the proxy.
- Audio: 320/256/192/128 kbps MP3 + M4A + original master streams.
- Thumbnails: dynamic high-resolution extraction, multi-resolution tiers.
- Transcripts/subtitles: timestamped cues, clipboard copy, SubRip `.srt` (millisecond formatting) and `.txt` exports.
- Streaming: embedded player for YouTube/Vimeo, HLS/direct MP4.
- **Honest states invariant:** never fabricate or mock subtitles/data. Absent subtitles must surface an explicit notice.
- **$0-budget invariant:** no paid services; architecture must stay within free tiers (Vercel, Render, UptimeRobot).
- Server-side `api/` (Vercel serverless) + `backend/` (standalone FastAPI microservice) are allowed only for resolve/transcript/proxy of streams. Bandwidth policy still prefers client-first.

## Brand Commitments

- Name: **TeraPlay** ("TeraPlay Universal Media & Creator Dock").
- Voice: honest, direct, helpful; explicitly refuses fake/mock results. This refusal is a binding brand trait.
- Discreet, non-intrusive monetization is a product trait (ads must not degrade the tool experience).

## Evidence on Hand

- Automated regression suite: `tests/universal-dock.test.mjs` (URL normalization, TeraBox mirrors, direct streams, time formatting, SubRip generation).
- Deployment runbook: `DEPLOYMENT.md`; design rationale: `CODEBASE_DESIGN.md` (beginner + senior dual-audience).
- Cover-art/download verification screenshots in repo root (`terabox-*.png`, `verify_premium_*.png`).
- **Absence:** no user testimonials, case studies, benchmarks, documented user counts, or press. Future design/content work must not fabricate any of these.

## Product Principles

1. **Client-first execution**: do work in the browser; never proxy bandwidth that the client can carry.
2. **Honesty over spectacle**: if the data isn't there, say so; never fabricate results.
3. **Zero-cost engineering**: every architectural choice must fit free-tier hosting.
4. **Creator-bias-free generosity**: thumbnails and transcripts are first-class citizens, not afterthoughts.
5. **YAGNI/Ponytail**: no over-engineering; clean routing, typed props, minimal dependencies.
