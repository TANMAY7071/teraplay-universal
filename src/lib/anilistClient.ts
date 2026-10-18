/**
 * AniList GraphQL Client
 * 
 * Executes GraphQL queries against graphql.anilist.co.
 * Features in-memory caching with TTL to respect AniList rate limits
 * (which is 90 requests per minute).
 */

const ANILIST_API_URL = "https://graphql.anilist.co";

// ─── In-Memory Cache ─────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
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

// ─── Client Implementation ───────────────────────────────

export async function anilistQuery<T>(
  query: string,
  variables?: Record<string, any>,
  options?: { cacheTtl?: number; signal?: AbortSignal }
): Promise<T> {
  const maxRetries = 4;
  let attempt = 0;

  // Create unique cache key
  const cacheKey = JSON.stringify({ query, variables });

  while (attempt < maxRetries) {
    attempt++;

    // Check rate limit status
    if (Date.now() < rateLimitedUntil) {
      const waitTime = rateLimitedUntil - Date.now();
      console.warn(`[AniListClient] Rate-limited locally. Sleeping for ${waitTime}ms before attempt ${attempt}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const cached = getCached<T>(cacheKey);
    if (cached !== null && attempt === 1) {
      return cached;
    }

    try {
      const response = await fetch(ANILIST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: options?.signal,
      });

      // Track rate limits
      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining && parseInt(remaining, 10) === 0) {
        const resetTime = response.headers.get("X-RateLimit-Reset");
        if (resetTime) {
          const waitSec = parseInt(resetTime, 10);
          rateLimitedUntil = Date.now() + waitSec * 1000;
          console.warn(`[AniListClient] Rate limit reached. Cool down for ${waitSec}s.`);
        }
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
        rateLimitedUntil = Date.now() + retryAfter * 1000;
        if (attempt < maxRetries) {
          console.warn(`[AniListClient] Rate limited (429). Retrying after ${retryAfter}s...`);
          continue;
        }
        throw new Error(`AniList API rate limited. Retry in ${retryAfter}s.`);
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`[AniListClient] Query failed (${response.status}):`, errText.slice(0, 200));
        throw new Error(`AniList API returned error ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error("[AniListClient] GraphQL Errors:", result.errors);
        throw new Error(result.errors[0]?.message || "GraphQL Query Error");
      }

      const data = result.data as T;
      
      // Cache successful queries
      setCache(cacheKey, data, options?.cacheTtl ?? DEFAULT_CACHE_TTL);

      return data;
    } catch (error: any) {
      if (attempt >= maxRetries) {
        throw error;
      }
      const backoff = attempt * 1000;
      console.warn(`[AniListClient] Query attempt ${attempt} failed: ${error.message}. Retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  throw new Error("AniList query failed after maximum retries");
}

/**
 * Clear the query cache
 */
export function clearAniListCache(): void {
  cache.clear();
}
