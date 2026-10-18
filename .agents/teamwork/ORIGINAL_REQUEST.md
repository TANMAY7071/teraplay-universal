# Original User Request

## Initial Request — 2026-10-18T19:46:08Z

This is a single self-contained fix; keep it small and focused.

Working directory: c:\Users\ASUS\Desktop\my website\teraplay-universal
Integrity mode: demo

## Requirements

### R1. Groq Whisper Transcription Endpoint (`api/transcribe.ts`)
- Implement a serverless endpoint accepting a media stream URL or audio stream.
- Extract or resample audio payload to 16kHz mono (or pass direct `.m4a`/`.mp3` stream buffer).
- Query Groq Whisper API endpoint (`https://api.groq.com/openai/v1/audio/transcriptions`) using model `whisper-large-v3-turbo` with `response_format: verbose_json` and `timestamp_granularities: ["segment"]`.
- Map response segments into standard `TranscriptData` structure (`{ language, count, items: [{ start, duration, text }] }`).
- Store optional API key via `GROQ_API_KEY` environment variable.

### R2. Universal Fallback & Honest States
- Platform subtitle detection: If YouTube or host platform provides native `.vtt`/`.srv3` subtitle tracks, serve native tracks directly with zero AI API overhead.
- When `GROQ_API_KEY` is not configured, expired, or rate-limited, surface an explicit informative notice on the UI (per AGENTS.md conventions) with 1-click fallback to demo cues.
- Maintain $0 budget: utilize Groq free tier (14,400 audio seconds/day = 240 minutes free daily).

### R3. Seamless Universal Dock UI Integration (`src/pages/Index.tsx`)
- Add a 1-click "Generate AI Transcript" or auto-fetch trigger in the "Transcript & Subtitles" tab when a video has no native subtitle tracks.
- Display transcript cues with timestamps, search filtering, and individual line copy.
- Support full transcript copy, `.TXT` file download, and SubRip `.SRT` export.

## Acceptance Criteria

### Verification & Performance
- [ ] Automated test in `tests/universal-dock.test.mjs` verifies Groq transcription JSON converts accurately to SubRip `.SRT` timestamp blocks
- [ ] Non-captioned Instagram video displays clear option to transcribe audio via Groq Whisper
- [ ] Transcribed cues render with search filter, line copy, and timestamp toggle in "Transcript & Subtitles" tab
- [ ] Exported `.SRT` format strictly complies with SubRip specs (`HH:MM:SS,mmm --> HH:MM:SS,mmm`)
- [ ] `npm run build` and `node tests/universal-dock.test.mjs` pass with 0 errors
- [ ] `npx eslint src/pages/Index.tsx src/App.tsx src/lib/urlNormalizer.ts` passes with 0 errors
