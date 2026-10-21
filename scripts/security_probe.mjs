/**
 * Security probe for the TeraPlay media API.
 *
 * Mounts the REAL handlers (api/resolve.ts, api/stream-download.ts,
 * api/transcribe.ts) on a local port and exercises the trust boundaries:
 *
 *  1. SSRF  - can a caller make the server fetch an internal/private address?
 *  2. OPEN PROXY - can a caller use the server as a general-purpose relay?
 *  3. HEADER INJECTION - is the `ext` query param sanitised before it is
 *     interpolated into the Content-Disposition header?
 *  4. HEADER SIZING - can the caller force an unbounded response body?
 */
import http from 'http';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const PORT = 4400;

const handlers = {
  resolve: require('../.tmp/resolve.cjs').default,
  'stream-download': require('../.tmp/stream-download.cjs').default,
  transcribe: require('../.tmp/transcribe.cjs').default,
};

function decorate(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  req.query = Object.fromEntries(url.searchParams.entries());
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (o) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(o));
    return res;
  };
  return url;
}

const server = http.createServer((req, res) => {
  const url = decorate(req, res);
  const route = url.pathname.replace('/api/', '');
  const h = handlers[route];
  if (!h) return res.writeHead(404).end('no route');
  h(req, res).catch((e) => {
    if (!res.headersSent) res.writeHead(500);
    res.end(String(e?.message || e));
  });
});

/** A tiny internal-only service that should never be reachable from outside. */
const internal = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('INTERNAL-SECRET-DO-NOT-EXPOSE');
});
const INTERNAL_PORT = 4401;

const serverReady = new Promise((r) => server.listen(PORT, r));
const internalReady = new Promise((r) => internal.listen(INTERNAL_PORT, '127.0.0.1', r));

async function probe(label, route, query) {
  const qs = new URLSearchParams(query).toString();
  const url = `http://localhost:${PORT}/api/${route}?${qs}`;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const body = await res.text();
    const leaked = body.includes('INTERNAL-SECRET');
    console.log(
      `${leaked ? '!! LEAK ' : '   ok   '} ${label.padEnd(52)} HTTP ${res.status}  ${leaked ? 'INTERNAL CONTENT RETURNED' : body.slice(0, 90).replace(/\n/g, ' ')}`
    );
    return { label, status: res.status, leaked, body: body.slice(0, 300) };
  } catch (e) {
    console.log(`   ok   ${label.padEnd(52)} ERR ${e.message}`);
    return { label, error: e.message };
  }
}

async function main() {
  await Promise.all([serverReady, internalReady]);
  const internalUrl = `http://127.0.0.1:${INTERNAL_PORT}/secret`;
  console.log('\n=== SECURITY PROBE ===\n');

  console.log('[1] SSRF via /api/stream-download (server-side fetch of private IP)');
  await probe('stream-download -> 127.0.0.1 internal service', 'stream-download', {
    url: internalUrl,
    filename: 'x',
  });
  await probe('stream-download -> 169.254.169.254 metadata', 'stream-download', {
    url: 'http://169.254.169.254/latest/meta-data/',
    filename: 'x',
  });
  await probe('stream-download -> http://[::1] ipv6 loopback', 'stream-download', {
    url: 'http://[::1]:4401/secret',
    filename: 'x',
  });
  await probe('stream-download -> 0.0.0.0 wildcard', 'stream-download', {
    url: 'http://0.0.0.0:4401/secret',
    filename: 'x',
  });

  console.log('\n[2] SSRF via /api/transcribe (server-side fetch of private IP)');
  await probe('transcribe -> 127.0.0.1 internal service', 'transcribe', {
    url: internalUrl,
  });

  console.log('\n[3] SSRF via /api/resolve (server-side fetch through the extractor)');
  await probe('resolve -> 127.0.0.1 internal service', 'resolve', { url: internalUrl });

  console.log('\n[4] Open-proxy / non-http scheme handling');
  await probe('stream-download -> file:// scheme', 'stream-download', {
    url: 'file:///C:/Windows/win.ini',
    filename: 'x',
  });

  console.log('\n[5] Content-Disposition header injection via ext param');
  const inj = await fetch(
    `http://localhost:${PORT}/api/stream-download?url=${encodeURIComponent(internalUrl)}&filename=x&ext=${encodeURIComponent('../../evil')}`
  );
  console.log('   Content-Disposition:', JSON.stringify(inj.headers.get('content-disposition')));

  console.log('\n[6] CORS header exposure');
  const cors = await fetch(`http://localhost:${PORT}/api/resolve?url=https://example.com`);
  console.log('   Access-Control-Allow-Origin:', JSON.stringify(cors.headers.get('access-control-allow-origin')));
  const cors2 = await fetch(`http://localhost:${PORT}/api/stream-download?url=${encodeURIComponent(internalUrl)}`);
  console.log('   stream-download ACAO       :', JSON.stringify(cors2.headers.get('access-control-allow-origin')));

  server.close();
  internal.close();
  process.exit(0);
}

main();
