/**
 * Download-path benchmark.
 *
 * Compares three ways a user can get the same file:
 *   A. DIRECT   - browser -> googlevideo CDN (what the user *could* get)
 *   B. PROXY    - browser -> /api/stream-download -> CDN  (single-stream passthrough)
 *   C. PROXY+MUX- browser -> /api/stream-download -> CDN, ffmpeg re-mux (video+audio)
 *
 * B and C are what the app actually does today (see handleDownloadMp4 in
 * src/pages/Index.tsx, which always wraps the target in /api/stream-download).
 */
import http from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const bundlePath = path.join(root, '.tmp', 'stream-download.cjs');
const handler = require(bundlePath).default || require(bundlePath);

const PORT = 4399;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/api/stream-download') {
    res.writeHead(404).end('nope');
    return;
  }
  // Vercel gives the handler a decorated req/res. Recreate the two pieces the
  // handler actually touches: parsed query string + res.status()/res.json().
  req.query = Object.fromEntries(url.searchParams.entries());
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  handler(req, res).catch((err) => {
    console.error('handler error', err);
    if (!res.headersSent) res.writeHead(500);
    res.end(String(err?.message || err));
  });
});

const MB = 1024 * 1024;

/** Streams a URL to /dev/null and returns {bytes, seconds, mbPerSec} */
async function measure(label, target, headers = {}) {
  const t0 = performance.now();
  let bytes = 0;
  let firstByteMs = null;
  const res = await fetch(target, { headers, redirect: 'follow' });
  if (!res.ok && res.status !== 206) {
    return { label, error: `HTTP ${res.status}`, status: res.status };
  }
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstByteMs === null) firstByteMs = performance.now() - t0;
    bytes += value.length;
  }
  const seconds = (performance.now() - t0) / 1000;
  return {
    label,
    bytes,
    mb: +(bytes / MB).toFixed(2),
    seconds: +seconds.toFixed(2),
    mbPerSec: +((bytes / MB) / seconds).toFixed(2),
    ttfbMs: firstByteMs === null ? null : Math.round(firstByteMs),
  };
}

function fmt(r) {
  if (r.error) return `  ${r.label.padEnd(26)} ERROR ${r.error}`;
  return (
    `  ${r.label.padEnd(26)} ${String(r.mb).padStart(9)} MB  ${String(r.seconds).padStart(7)}s  ` +
    `${String(r.mbPerSec).padStart(7)} MB/s  ttfb=${r.ttfbMs}ms`
  );
}

/** Downloads the same URL with N parallel Range requests to show the achievable ceiling. */
async function measureParallel(label, target, parts) {
  const head = await fetch(target, { method: 'HEAD' });
  const total = Number(head.headers.get('content-length') || 0);
  if (!total) return { label, error: 'no content-length' };
  const chunk = Math.ceil(total / parts);
  const t0 = performance.now();
  let bytes = 0;
  await Promise.all(
    Array.from({ length: parts }, async (_, i) => {
      const start = i * chunk;
      const end = Math.min(total - 1, start + chunk - 1);
      const res = await fetch(target, { headers: { Range: `bytes=${start}-${end}` } });
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
      }
    })
  );
  const seconds = (performance.now() - t0) / 1000;
  return {
    label,
    bytes,
    mb: +(bytes / MB).toFixed(2),
    seconds: +seconds.toFixed(2),
    mbPerSec: +((bytes / MB) / seconds).toFixed(2),
    ttfbMs: null,
  };
}

const serverReady = new Promise((resolve) => server.listen(PORT, resolve));

async function main() {
  await serverReady;
  const resolved = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'resolved_formats.json'), 'utf8'));
  const byId = Object.fromEntries(resolved.formats.map((f) => [f.format_id, f]));

  // Format 137 = 1080p video-only + separate m4a audio -> app takes the ffmpeg mux path
  const videoOnly = byId['137'];
  const progressive = byId['18']; // 360p single-file -> app takes the passthrough path

  if (!videoOnly || !progressive) {
    console.error('Missing expected formats. Run dump_formats.py first.');
    process.exit(1);
  }

  console.log('\n=== DOWNLOAD PATH BENCHMARK ===');
  console.log(`file: ${resolved.title}\n`);

  const results = [];

  // A. Direct from CDN (progressive 360p so sizes are comparable)
  results.push(await measure('A. DIRECT CDN (360p)', progressive.url));

  // A2. Raw line bandwidth baseline, NOT YouTube (isolates the local ISP link)
  results.push(await measure('A2. RAW LINE baseline', 'https://speed.cloudflare.com/__down?bytes=52428800'));

  // B. App passthrough proxy (progressive 360p)
  results.push(
    await measure(
      'B. PROXY passthrough (360p)',
      `http://localhost:${PORT}/api/stream-download?url=${encodeURIComponent(progressive.url)}&filename=bench&ext=mp4`
    )
  );

  // C. App mux proxy (1080p video + audio -> ffmpeg)
  results.push(
    await measure(
      'C. PROXY ffmpeg-mux (1080p)',
      `http://localhost:${PORT}/api/stream-download?url=${encodeURIComponent(videoOnly.url)}&audio_url=${encodeURIComponent(videoOnly.audio_url)}&filename=bench&ext=mp4`
    )
  );

  // D. Direct from CDN for the same 1080p video (mux overhead reference)
  results.push(await measure('D. DIRECT CDN (1080p vid)', videoOnly.url));

  // E. Direct 1080p via a parallel-range download (what a "fast" client would do)
  results.push(await measureParallel('E. DIRECT 1080p (8 ranges)', videoOnly.url, 8));

  console.log('');
  results.forEach((r) => console.log(fmt(r)));

  fs.writeFileSync(path.join(root, 'scripts', 'bench_results.json'), JSON.stringify(results, null, 2));
  server.close();
  process.exit(0);
}

main();
