/**
 * Cloudflare Worker Gateway for LinkCastle / TeraPlay
 * 
 * Free-tier features (100,000 reqs/day free):
 * 1. Edge Caching via Cache API / KV (15ms instant responses for viral links)
 * 2. Automatic Failover: Primary (Modal) -> Secondary (Render)
 * 3. Hides backend URLs from scrapers
 * 4. Injects strict CORS headers for Web & Mobile clients
 */

// Default configuration (can be overridden by Cloudflare environment variables)
const DEFAULT_PRIMARY_URL = 'https://linkcastle-resolver-web.modal.run';
const DEFAULT_FALLBACK_URL = 'https://linkcastle.onrender.com';
const CACHE_TTL_SECONDS = 7200; // 2 hours

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const primaryOrigin = env.PRIMARY_RESOLVER_URL || DEFAULT_PRIMARY_URL;
    const fallbackOrigin = env.FALLBACK_RESOLVER_URL || DEFAULT_FALLBACK_URL;

    // 2. Pass-through for Health Check
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'cloudflare-edge-gateway' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 3. Edge Cache for /resolve and /api/extract GET requests
    const cache = caches.default;
    const isExtractEndpoint = url.pathname === '/resolve' || url.pathname === '/api/extract';
    const targetMediaUrl = url.searchParams.get('url');

    let cacheKey = null;
    if (request.method === 'GET' && isExtractEndpoint && targetMediaUrl) {
      cacheKey = new Request(url.toString(), request);
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const cloned = new Response(cachedResponse.body, cachedResponse);
        cloned.headers.set('X-Edge-Cache', 'HIT');
        cloned.headers.set('Access-Control-Allow-Origin', '*');
        return cloned;
      }
    }

    // 4. Dispatch Request with Automatic Failover
    async function forwardTo(baseOrigin) {
      const targetUrl = new URL(url.pathname + url.search, baseOrigin);
      const headers = new Headers(request.headers);
      headers.set('Host', new URL(baseOrigin).host);
      
      return fetch(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        signal: AbortSignal.timeout(18000), // 18s ceiling
      });
    }

    let response = null;
    let backendUsed = 'primary';

    try {
      // Try Primary (Modal)
      response = await forwardTo(primaryOrigin);
      if (!response.ok && response.status >= 500) {
        throw new Error(`Primary returned status ${response.status}`);
      }
    } catch (primaryErr) {
      console.warn('[Cloudflare Gateway] Primary backend failed, trying fallback:', primaryErr.message);
      backendUsed = 'fallback';
      try {
        // Failover to Secondary (Render)
        response = await forwardTo(fallbackOrigin);
      } catch (fallbackErr) {
        return new Response(JSON.stringify({
          success: false,
          error: 'All backend resolvers currently unreachable. Please retry shortly.'
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 5. Wrap Response and Inject Headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('X-Resolved-By', backendUsed);

    // Cache successful extractions at the Edge
    if (response.ok && cacheKey && request.method === 'GET') {
      responseHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
      const responseToCache = new Response(response.clone().body, {
        status: response.status,
        headers: responseHeaders
      });
      ctx.waitUntil(cache.put(cacheKey, responseToCache));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }
};
