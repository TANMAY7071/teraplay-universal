import { supabase } from "@/lib/supabase";
import { animeCatalog } from "@/data/anime";
import { getAnimeSeriesDetails } from "@/data/animeDetails";
import { memoryCache } from "@/lib/cache";

export interface EpisodeMetadata {
  id: number;
  anime_id: number;
  episode_number: number;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  air_date?: string;
  air_time?: string;
  simklId?: number | string;
  simkl_id?: number | string;
  is_filler: boolean;
  donghua_api_slug?: string;
  season_id?: string | number | null;
  download_enabled?: boolean;
}

export interface VideoServer {
  id: number;
  server_name: string;
  video_url: string;
  quality: string;
  priority: number;
}

export interface SubtitleTrack {
  id: number;
  language: string;
  language_code: string;
  subtitle_url: string;
  is_default: boolean;
}

export interface FullEpisodeDetails extends EpisodeMetadata {
  episode_servers?: VideoServer[];
  episode_subtitles?: SubtitleTrack[];
}

export async function fetchEpisodes(animeId: number): Promise<EpisodeMetadata[]> {
  const cacheKey = `episodes_${animeId}`;
  const cached = memoryCache.get<EpisodeMetadata[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("anime_id", animeId)
      .order("episode_number", { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      const result = data as EpisodeMetadata[];
      memoryCache.set(cacheKey, result, 300_000); // 5 minute TTL
      return result;
    }

    // Dynamic Fallback: If DB is empty, try fetching directly from Donghua API
    const { data: animeData } = await supabase.from('anime').select('donghua_api_slug').eq('id', animeId).maybeSingle();
    if (animeData?.donghua_api_slug) {
      const res = await fetch(`https://www.sankavollerei.web.id/anime/donghua/detail/${animeData.donghua_api_slug}`);
      if (res.ok) {
        const detailData = await res.json();
        if (detailData?.episodes_list?.length > 0) {
          const eps = detailData.episodes_list.slice().reverse();
          const result = eps.map((ep: any) => {
            const match = ep.slug?.match(/episode-(\d+)/) || ep.episode?.match(/\d+/);
            const epNum = match ? parseInt(match[1] || match[0], 10) : 1;
            return {
              id: animeId * 1000 + epNum,
              anime_id: animeId,
              episode_number: epNum,
              title: ep.episode || `Episode ${epNum}`,
              description: `Watch episode ${epNum} of this Donghua.`,
              thumbnail_url: "",
              duration: "24 min",
              is_filler: false,
              donghua_api_slug: ep.slug
            } as EpisodeMetadata;
          });
          memoryCache.set(cacheKey, result, 300_000);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn(`Supabase fetchEpisodes failed for ID ${animeId}, using local fallback:`, err);
  }

  // Local Mock Fallback
  const current = animeCatalog.find((item) => item.id === animeId);
  if (!current) return [];

  const details = getAnimeSeriesDetails(animeId, current.title);
  const fallbackResult = Array.from({ length: current.episodes }, (_, idx) => {
    const epNum = idx + 1;
    const meta = details.episodesMetadata.find((m) => m.episodeNumber === epNum);
    return {
      id: animeId * 1000 + epNum,
      anime_id: animeId,
      episode_number: epNum,
      title: meta?.title ?? `Episode ${epNum}: Cultivation Path ${epNum}`,
      description: meta?.description ?? `Xiao Yan deepens his cultivation realm, encountering unexpected forces in episode ${epNum}.`,
      thumbnail_url: meta?.thumbnail ?? current.image,
      duration: meta?.duration ?? "24 min",
      is_filler: false,
    };
  });
  memoryCache.set(cacheKey, fallbackResult, 300_000);
  return fallbackResult;
}

/**
 * Single-query relational join method (Eliminates N+1 database queries).
 * Fetches episode, video servers, and subtitles in ONE single network request.
 */
export async function fetchEpisodeWithFullDetails(animeId: number, episodeNumber: number): Promise<FullEpisodeDetails | null> {
  const cacheKey = `full_ep_${animeId}_${episodeNumber}`;
  const cached = memoryCache.get<FullEpisodeDetails>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("episodes")
      .select(`
        *,
        episode_servers(*),
        episode_subtitles(*)
      `)
      .eq("anime_id", animeId)
      .eq("episode_number", episodeNumber)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const result = data as unknown as FullEpisodeDetails;
      memoryCache.set(cacheKey, result, 300_000);
      return result;
    }
  } catch (err) {
    console.warn(`Relational join query failed for anime ${animeId} ep ${episodeNumber}:`, err);
  }
  return null;
}

export async function fetchEpisodeServers(episodeId: number): Promise<VideoServer[]> {
  const cacheKey = `servers_${episodeId}`;
  const cached = memoryCache.get<VideoServer[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("episode_servers")
      .select("*")
      .eq("episode_id", episodeId)
      .order("priority", { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      const result = data as VideoServer[];
      memoryCache.set(cacheKey, result, 300_000);
      return result;
    }
  } catch (err) {
    console.warn(`Supabase fetchEpisodeServers failed for ID ${episodeId}, using default servers:`, err);
  }

  // Fallback: Dailymotion mock video url
  const fallback = [
    {
      id: 1,
      server_name: "Server 1",
      video_url: "https://geo.dailymotion.com/player/xj8x3.html?video=kSGzjgHIPxsVQXDpWKy",
      quality: "1080p",
      priority: 1,
    },
    {
      id: 2,
      server_name: "Server 2",
      video_url: "https://example.com/video2.mp4",
      quality: "720p",
      priority: 2,
    },
    {
      id: 3,
      server_name: "Server 3",
      video_url: "https://example.com/video3.mp4",
      quality: "480p",
      priority: 3,
    },
  ];
  memoryCache.set(cacheKey, fallback, 300_000);
  return fallback;
}

export async function fetchEpisodeSubtitles(episodeId: number): Promise<SubtitleTrack[]> {
  const cacheKey = `subtitles_${episodeId}`;
  const cached = memoryCache.get<SubtitleTrack[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("episode_subtitles")
      .select("*")
      .eq("episode_id", episodeId);

    if (error) throw error;
    if (data && data.length > 0) {
      const result = data as SubtitleTrack[];
      memoryCache.set(cacheKey, result, 300_000);
      return result;
    }
  } catch (err) {
    console.warn(`Supabase fetchEpisodeSubtitles failed for ID ${episodeId}, using empty track:`, err);
  }

  const fallback: SubtitleTrack[] = [];
  memoryCache.set(cacheKey, fallback, 300_000);
  return fallback;
}

