/**
 * Shared outbound-request guards for the serverless handlers.
 *
 * These endpoints accept a user-supplied media URL and fetch it server-side.
 * Without these checks the handler is an open relay into the function's own
 * network: cloud metadata at 169.254.169.254, loopback services, and any
 * internal host reachable from the platform.
 *
 * Files prefixed with "_" are not routed by Vercel, so this module is never
 * exposed as an endpoint.
 */
import dns from 'dns';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

/** Hosts that may receive the TeraBox session cookie. */
const COOKIE_EXACT_HOSTS = new Set([
  'terabox.app',
  'www.terabox.app',
  'dm.terabox.app',
  'terabox.com',
  'www.terabox.com',
  '1024tera.com',
  'www.1024tera.com',
  'nephobox.com',
  'www.nephobox.com',
  'terasharefile.com',
  'terashare.com',
]);

const COOKIE_HOST_SUFFIXES = [
  '.terabox.app',
  '.terabox.com',
  '.1024tera.com',
  '.nephobox.com',
  '.terasharefile.com',
  '.terashare.com',
  '.teraboxcdn.com',
  '.baidupcs.com',
];

export const ALLOWED_EXTENSIONS = new Set([
  'mp4',
  'mp3',
  'm4a',
  'webm',
  'mkv',
  'jpg',
  'jpeg',
  'png',
  'webp',
]);

function normalizeHost(hostname: string): string {
  return hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, includes cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 and 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
  if (a >= 224) return true; // multicast and reserved
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const host = ip.toLowerCase().split('%')[0];
  if (host === '::' || host === '::1') return true;
  if (host.startsWith('::ffff:')) return isPrivateIPv4(host.slice('::ffff:'.length));
  if (host.startsWith('fe80')) return true; // link-local
  if (host.startsWith('fc') || host.startsWith('fd')) return true; // unique local
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new Error('Target host is not a public address.');
    }
    return;
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new Error('Target host could not be resolved.');
  }
  if (!addresses.length) {
    throw new Error('Target host could not be resolved.');
  }
  for (const entry of addresses) {
    const blocked = entry.family === 4 ? isPrivateIPv4(entry.address) : isPrivateIPv6(entry.address);
    if (blocked) {
      throw new Error('Target host resolves to a non-public address.');
    }
  }
}

/**
 * Parse and vet a user-supplied URL before the server fetches it.
 * Throws with a caller-safe message when the target is not a public http(s) URL.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL.');
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported.');
  }
  const host = normalizeHost(parsed.hostname);
  if (!host) {
    throw new Error('URL is missing a host.');
  }
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    throw new Error('Target host is not allowed.');
  }
  await assertPublicHost(host);
  return parsed;
}

/**
 * The TeraBox cookie is a live account session. Attach it only to hosts in
 * the TeraBox family, never to an arbitrary URL that merely claimed
 * `source=terabox`. Extend the list with TERABOX_COOKIE_HOSTS if the CDN
 * introduces a new host.
 */
export function isCookieAllowedHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (COOKIE_EXACT_HOSTS.has(host)) return true;
  const extra = (process.env.TERABOX_COOKIE_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const suffix of [...COOKIE_HOST_SUFFIXES, ...extra]) {
    if (host === suffix.replace(/^\./, '') || host.endsWith(suffix)) return true;
  }
  return false;
}

/** Clamp a caller-supplied file extension to the known media set. */
export function sanitizeExtension(raw: string | undefined): string {
  const value = (raw || '').toLowerCase().replace(/^\./, '');
  return ALLOWED_EXTENSIONS.has(value) ? value : '';
}
