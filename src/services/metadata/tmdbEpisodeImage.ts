const TMDB_BASE = typeof window !== "undefined" ? "/api/tmdb" : "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export async function getTmdbEpisodeThumbnail(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<string | null> {
  try {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY || "3f2ef4f5cbb848a645f9c556e7667833";
    const accessToken = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZjJlZjRmNWNiYjg0OGE2NDVmOWM1NTZlNzY2NzgzMyIsIm5iZiI6MTc4ODcxNjMyOC4wODA5OTk5LCJzdWIiOiI2YTlkYTUyODJlOWEwM2I4NTIwOWZkMjciLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.DmybD27XysM9bfF-N3Nmqpxa3UsF8yr8iu_s6Dcc_rs";

    if (!apiKey && !accessToken) {
      console.warn("[TMDB] Missing TMDB API credentials (VITE_TMDB_API_KEY or VITE_TMDB_READ_ACCESS_TOKEN)");
      return null;
    }

    const headers: Record<string, string> = {
      "Accept": "application/json"
    };

    let url = `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`;

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else if (apiKey) {
      url += `?api_key=${encodeURIComponent(apiKey)}`;
    }

    const response = await fetch(url, { headers });


    if (!response.ok) {
      console.warn(
        `[TMDB] Episode ${seasonNumber}x${episodeNumber} failed: ${response.status}`
      );
      return null;
    }

    const data = await response.json();

    if (!data?.still_path) {
      return null;
    }

    return `${TMDB_IMAGE_BASE}/w780${data.still_path}`;
  } catch (error) {
    console.error("[TMDB] Thumbnail lookup failed:", error);
    return null;
  }
}
