/**
 * Trakt API HTTP Client
 * 
 * Lightweight fetch wrapper that sends required Trakt headers,
 * handles rate limiting (429 + Retry-After), and provides
 * in-memory caching with TTL to minimize API hits.
 */

import { TRAKT_API_URL, TRAKT_API_VERSION, TRAKT_CLIENT_ID } from "@/config/trakt";

// ─── In-Memory Cache ─────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl = DEFAULT_CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ─── Rate Limit State ────────────────────────────────────

let rateLimitedUntil = 0;

// ─── Core Request Function ──────────────────────────────

async function traktFetch<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options?: {
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    accessToken?: string;
    cacheTtl?: number;
    signal?: AbortSignal;
  }
): Promise<T> {
  const maxRetries = 4;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    // Check rate limit
    if (Date.now() < rateLimitedUntil) {
      const waitTime = rateLimitedUntil - Date.now();
      console.warn(`[TraktClient] Rate-limited locally. Sleeping for ${waitTime}ms before attempt ${attempt}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Build URL with query params
    const url = new URL(path, TRAKT_API_URL);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const cacheKey = `${method}:${url.toString()}`;

    // Check cache for GET requests
    if (method === "GET" && attempt === 1) {
      const cached = getCached<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "trakt-api-key": TRAKT_CLIENT_ID,
      "trakt-api-version": TRAKT_API_VERSION,
    };

    if (options?.accessToken) {
      headers["Authorization"] = `Bearer ${options.accessToken}`;
    }

    // Make the request
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options?.signal,
    };

    if (options?.body && method !== "GET") {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url.toString(), fetchOptions);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "3", 10);
        rateLimitedUntil = Date.now() + retryAfter * 1000;
        console.warn(
          `[TraktClient] Rate limited (429) on attempt ${attempt}. Retry after ${retryAfter}s.`,
          response.headers.get("X-Ratelimit")
        );
        if (attempt < maxRetries) {
          continue; // loop and retry
        }
        throw new Error(`Trakt API rate limited. Retry in ${retryAfter}s.`);
      }

      // Handle other errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(
          `[TraktClient] ${method} ${path} → ${response.status}`,
          errorText.slice(0, 200)
        );
        throw new Error(`Trakt API error ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const data = (await response.json()) as T;

      // Cache GET responses
      if (method === "GET") {
        setCache(cacheKey, data, options?.cacheTtl ?? DEFAULT_CACHE_TTL);
      }

      return data;
    } catch (error: any) {
      if (attempt >= maxRetries) {
        throw error;
      }
      // If we got a network error or rate limit, wait and retry
      const backoff = attempt * 1000;
      console.warn(`[TraktClient] Fetch attempt ${attempt} failed: ${error.message}. Retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  throw new Error("Trakt API request failed after maximum retries");
}

// ─── Public API ──────────────────────────────────────────

/**
 * Make a GET request to the Trakt API.
 */
export function traktGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { accessToken?: string; cacheTtl?: number; signal?: AbortSignal }
): Promise<T> {
  return traktFetch<T>("GET", path, { params, ...options });
}

/**
 * Make a POST request to the Trakt API.
 */
export function traktPost<T>(
  path: string,
  body: unknown,
  options?: { accessToken?: string; signal?: AbortSignal }
): Promise<T> {
  return traktFetch<T>("POST", path, { body, ...options });
}

/**
 * Clear the in-memory cache (useful for dev testing).
 */
export function clearTraktCache(): void {
  cache.clear();
}

/**
 * Get current cache stats for debugging.
 */
export function getTraktCacheStats(): { entries: number; keys: string[] } {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
  };
}
