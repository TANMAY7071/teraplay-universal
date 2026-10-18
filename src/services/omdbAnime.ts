/**
 * OMDb API Service
 * 
 * Provides search, details, and coverage mapping from IMDb data using the OMDb API.
 */

import type { Anime } from "@/types/anime";

const OMDB_API_BASE = "/api/omdb";

export async function searchOmdb(query: string): Promise<Anime[]> {
  try {
    const res = await fetch(`${OMDB_API_BASE}?s=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`OMDb search returned status ${res.status}`);
    const json = await res.json();
    if (json.Response === "False") {
      console.warn("[OMDb] Search returned no results:", json.Error);
      return [];
    }
    const items = json.Search || [];
    return items.map((item: any) => ({
      id: Math.abs(hashCode(item.imdbID)),
      slug: item.imdbID,
      title: item.Title,
      image: item.Poster !== "N/A" ? item.Poster : "",
      rating: 0,
      episodes: 0,
      year: parseInt(item.Year) || 0,
      genre: item.Type || "Series",
      genres: [],
      status: "Completed",
      synopsis: `IMDb ID: ${item.imdbID}. Type: ${item.Type}.`,
      tags: [],
      isNew: false,
      featured: false,
    }));
  } catch (err) {
    console.error("[OMDb] Search failed:", err);
    return [];
  }
}

export async function getOmdbDetail(imdbId: string): Promise<any> {
  try {
    const res = await fetch(`${OMDB_API_BASE}?i=${imdbId}&plot=full`);
    if (!res.ok) throw new Error(`OMDb detail returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[OMDb] GetDetail failed for ID ${imdbId}:`, err);
    return null;
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export function generateOmdbCoverage(raw: any): any[] {
  return [
    { field: "Title", traktValue: raw.Title || "—", hasData: !!raw.Title && raw.Title !== "N/A" },
    { field: "Year", traktValue: raw.Year || "—", hasData: !!raw.Year && raw.Year !== "N/A" },
    { field: "Overview", traktValue: raw.Plot ? raw.Plot.slice(0, 100) + "…" : "—", hasData: !!raw.Plot && raw.Plot !== "N/A" },
    { field: "Genres", traktValue: raw.Genre || "—", hasData: !!raw.Genre && raw.Genre !== "N/A" },
    { field: "Status", traktValue: "—", hasData: false, notes: "OMDb/IMDb does not expose airing status easily" },
    { field: "Rating", traktValue: raw.imdbRating || "—", hasData: !!raw.imdbRating && raw.imdbRating !== "N/A" },
    { field: "Votes", traktValue: raw.imdbVotes || "—", hasData: !!raw.imdbVotes && raw.imdbVotes !== "N/A" },
    { field: "Runtime", traktValue: raw.Runtime || "—", hasData: !!raw.Runtime && raw.Runtime !== "N/A" },
    { field: "Aired Seasons", traktValue: raw.totalSeasons || "—", hasData: !!raw.totalSeasons && raw.totalSeasons !== "N/A" },
    { field: "Director", traktValue: raw.Director || "—", hasData: !!raw.Director && raw.Director !== "N/A" },
    { field: "Writer", traktValue: raw.Writer || "—", hasData: !!raw.Writer && raw.Writer !== "N/A" },
    { field: "Actors / Voice Cast", traktValue: raw.Actors || "—", hasData: !!raw.Actors && raw.Actors !== "N/A" },
    { field: "Language", traktValue: raw.Language || "—", hasData: !!raw.Language && raw.Language !== "N/A" },
    { field: "Country", traktValue: raw.Country || "—", hasData: !!raw.Country && raw.Country !== "N/A" },
    { field: "Awards", traktValue: raw.Awards || "—", hasData: !!raw.Awards && raw.Awards !== "N/A" },
    { field: "Poster Image", traktValue: raw.Poster || "—", hasData: !!raw.Poster && raw.Poster !== "N/A" },
    { field: "Fanart Image", traktValue: "—", hasData: false, notes: "OMDb does not supply fanart/backdrops" },
    { field: "IMDB ID", traktValue: raw.imdbID || "—", hasData: !!raw.imdbID && raw.imdbID !== "N/A" },
    { field: "TMDB ID", traktValue: "—", hasData: false },
    { field: "TVDB ID", traktValue: "—", hasData: false }
  ];
}
