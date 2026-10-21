# Project Learnings & Invariants: TeraPlay Universal

## 1. Decisions
- **Multi-Fragment Acceleration for YouTube**: Single TCP playback streams throttled by Google Video CDN to ~1-1.5 MB/s. Added `scripts/ytdl_worker.py` utilizing `yt-dlp` with `--concurrent-fragments 16` and bundled FFmpeg v7.1 (`-c:v copy -c:a aac`) to pull 1080p/4K audio+video at full connection line speed (~20+ MB/s).
- **Separation of Media Cache**: Stored all downloaded chunks and merged outputs in `tmp_media/`. Added `tmp_media/` to `.gitignore` to avoid binary bloat.
- **Client Route Normalization**: Maintained clean redirects for deprecated routes (`/watch/*`, `/anime/*`, `/admin/*` -> `/`).

## 2. Lessons Learned & Edge Cases
- **yt-dlp IPC Output Corruption**: yt-dlp prints progress bars using carriage returns (`\r`), which concatenates into the same line as JSON results on stdout. Fix: Pass `"noprogress": True` and encapsulate JSON in distinct delimiter tags (`__TERA_DATA__{...}__TERA_DATA__`) to avoid JSON parse failure in Node child processes.
- **Windows Path Separators in yt-dlp Format Specs**: Formatting strings like `137+140/137+bestaudio/best` must not be directly joined into file paths on Windows without sanitizing `/` to avoid creating nonexistent subdirectories.
- **PowerShell Quote Stripping**: Multi-line Python/Node code passed directly inside `run_command` strings in PowerShell loses internal quotes. Temporary script files (`.py`) ensure reliable execution.

## 3. Reusable Patterns
- **Local Dev Endpoint Interception**: Custom Vite middleware plugin inside `vite.config.ts` handles dynamic endpoints (`/api/stream-download`, `/api/resolve`) without needing external Node server during local development.
- **Dual-Phase Cache Delivery**: On cold download, worker downloads multi-fragment chunks to `tmp_media/`. Subsequent downloads immediately stream cached file at line speed (>100 MB/s).
