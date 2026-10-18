/**
 * Sanka (Donghua & Donghub) API Services
 * 
 * Provides search, details, and episode mappings for Sanka Vollerei's public APIs.
 */

import type { Anime } from "@/types/anime";
import type { EpisodeMetadata } from "@/services/episodes";

const DONGHUA_API_BASE = "/api/sanka/donghua";
const DONGHUB_API_BASE = "/api/sanka/donghub";

// ─── Sanka Donghua API ───────────────────────────────────

export async function searchSankaDonghua(query: string, signal?: AbortSignal): Promise<Anime[]> {
  try {
    const res = await fetch(`${DONGHUA_API_BASE}/search/${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error(`Sanka Donghua search returned ${res.status}`);
    const json = await res.json();
    const items = json.data || [];
    return items.map((item: any) => ({
      id: Math.abs(hashCode(item.slug)),
      slug: item.slug,
      title: item.title,
      image: item.poster,
      rating: 0,
      episodes: 0,
      year: 0,
      genre: item.type || "Donghua",
      genres: [],
      status: item.status === "Ongoing" ? "Ongoing" : "Completed",
      synopsis: `Source: Sanka Donghua API. Sub: ${item.sub}.`,
      tags: [],
      isNew: false,
      featured: false,
    }));
  } catch (err) {
    console.error("[SankaDonghua] Search failed:", err);
    return [];
  }
}

export async function getSankaDonghuaDetail(slug: string, signal?: AbortSignal): Promise<any> {
  try {
    const res = await fetch(`${DONGHUA_API_BASE}/detail/${slug}`, { signal });
    if (!res.ok) throw new Error(`Sanka Donghua detail returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[SankaDonghua] GetDetail failed for slug ${slug}:`, err);
    return null;
  }
}

export async function getSankaDonghuaEpisodes(slug: string, signal?: AbortSignal): Promise<EpisodeMetadata[]> {
  try {
    const detail = await getSankaDonghuaDetail(slug, signal);
    if (!detail || !detail.episodes_list) return [];
    
    // API returns newest first, reverse it to ascending order
    const eps = detail.episodes_list.slice().reverse();
    const animeId = Math.abs(hashCode(slug));
    
    return eps.map((ep: any, index: number) => {
      const match = ep.slug?.match(/episode-(\d+)/) || ep.episode?.match(/\d+/);
      const epNum = match ? parseInt(match[1] || match[0], 10) : index + 1;
      return {
        id: animeId * 1000 + epNum,
        anime_id: animeId,
        episode_number: epNum,
        title: ep.episode || `Episode ${epNum}`,
        description: `Watch episode ${epNum} of this Donghua on Sanka.`,
        thumbnail_url: detail.poster || "",
        duration: detail.duration || "24 min",
        is_filler: false,
        donghua_api_slug: ep.slug,
      };
    });
  } catch (err) {
    console.error(`[SankaDonghua] GetEpisodes failed for slug ${slug}:`, err);
    return [];
  }
}

// ─── Sanka Donghub API ────────────────────────────────────

export async function searchSankaDonghub(query: string, signal?: AbortSignal): Promise<Anime[]> {
  try {
    const res = await fetch(`${DONGHUB_API_BASE}/search/${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error(`Sanka Donghub search returned ${res.status}`);
    const json = await res.json();
    const items = json.data || [];
    return items.map((item: any) => ({
      id: Math.abs(hashCode(item.slug)),
      slug: item.slug,
      title: item.title?.trim() || "Unknown Title",
      image: item.poster,
      rating: 0,
      episodes: 0,
      year: 0,
      genre: item.type || "ONA",
      genres: [],
      status: item.episode === "Ongoing" ? "Ongoing" : "Completed",
      synopsis: `Source: Sanka Donghub API. Sub: ${item.sub || "Sub"}.`,
      tags: [],
      isNew: false,
      featured: false,
    }));
  } catch (err) {
    console.error("[SankaDonghub] Search failed:", err);
    return [];
  }
}

// ─── Helper Functions ────────────────────────────────────

/**
 * Generate a simple hashcode from a string for mock IDs
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Generate field coverage report for Sanka Donghua API
 */
export function generateSankaDonghuaCoverage(raw: any): any[] {
  return [
    { field: "Title", traktValue: raw.title || "—", hasData: !!raw.title },
    { field: "Year", traktValue: raw.season || "—", hasData: !!raw.season },
    { field: "Overview", traktValue: raw.synopsis ? raw.synopsis.slice(0, 80) + "…" : "—", hasData: !!raw.synopsis },
    { field: "Genres", traktValue: (raw.genres || []).map((g: any) => g.name).join(", ") || "—", hasData: !!(raw.genres?.length) },
    { field: "Status", traktValue: raw.status || "—", hasData: !!raw.status },
    { field: "Rating", traktValue: raw.rating || "—", hasData: !!raw.rating },
    { field: "Runtime", traktValue: raw.duration || "—", hasData: !!raw.duration },
    { field: "Aired Episodes", traktValue: raw.episodes_count || "—", hasData: !!raw.episodes_count },
    { field: "Network", traktValue: raw.network || "—", hasData: !!raw.network },
    { field: "Country", traktValue: raw.country || "—", hasData: !!raw.country },
    { field: "Language", traktValue: "—", hasData: false, notes: "Sanka does not store audio language code metadata" },
    { field: "Certification", traktValue: "—", hasData: false, notes: "Age certifications not stored" },
    { field: "Trailer", traktValue: "—", hasData: false, notes: "No trailer links in Sanka Donghua" },
    { field: "Homepage", traktValue: raw.anichinUrl || "—", hasData: !!raw.anichinUrl },
    { field: "Poster Image", traktValue: raw.poster || "—", hasData: !!raw.poster },
    { field: "Fanart Image", traktValue: "—", hasData: false, notes: "Only poster images available" },
    { field: "IMDB ID", traktValue: "—", hasData: false },
    { field: "TMDB ID", traktValue: "—", hasData: false },
    { field: "TVDB ID", traktValue: "—", hasData: false },
    { field: "Original Title", traktValue: raw.alter_title || "—", hasData: !!raw.alter_title, notes: "Stores alternative aliases string" },
    { field: "Cultivation Realms", traktValue: "—", hasData: false },
    { field: "Tags", traktValue: "—", hasData: false }
  ];
}

/**
 * Generate field coverage report for Sanka Donghub API
 */
export function generateSankaDonghubCoverage(raw: any): any[] {
  return [
    { field: "Title", traktValue: raw.title || "—", hasData: !!raw.title },
    { field: "Year", traktValue: "—", hasData: false },
    { field: "Overview", traktValue: "—", hasData: false },
    { field: "Genres", traktValue: "—", hasData: false },
    { field: "Status", traktValue: raw.status || "—", hasData: !!raw.status },
    { field: "Rating", traktValue: "—", hasData: false },
    { field: "Runtime", traktValue: "—", hasData: false },
    { field: "Aired Episodes", traktValue: raw.episode || "—", hasData: !!raw.episode },
    { field: "Network", traktValue: "—", hasData: false },
    { field: "Country", traktValue: "—", hasData: false },
    { field: "Language", traktValue: "—", hasData: false },
    { field: "Certification", traktValue: "—", hasData: false },
    { field: "Trailer", traktValue: "—", hasData: false },
    { field: "Homepage", traktValue: raw.url || "—", hasData: !!raw.url },
    { field: "Poster Image", traktValue: raw.poster || "—", hasData: !!raw.poster },
    { field: "Fanart Image", traktValue: "—", hasData: false },
    { field: "IMDB ID", traktValue: "—", hasData: false },
    { field: "TMDB ID", traktValue: "—", hasData: false },
    { field: "TVDB ID", traktValue: "—", hasData: false },
    { field: "Original Title", traktValue: "—", hasData: false },
    { field: "Cultivation Realms", traktValue: "—", hasData: false },
    { field: "Tags", traktValue: "—", hasData: false }
  ];
}
