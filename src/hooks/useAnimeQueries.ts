import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
// Unified provider: delegates to Supabase (default) or Trakt based on VITE_METADATA_PROVIDER
import * as animeService from "@/services/metadataProvider";
import * as episodesService from "@/services/metadataProvider";
import * as watchlistService from "@/services/watchlist";
import * as progressService from "@/services/progress";
import * as commentsService from "@/services/comments";


// 1. ANIME QUERY KEYS
export const animeKeys = {
  all: ["anime"] as const,
  lists: () => [...animeKeys.all, "list"] as const,
  list: (filters: any) => [...animeKeys.lists(), filters] as const,
  details: () => [...animeKeys.all, "detail"] as const,
  detail: (slug: string) => [...animeKeys.details(), slug] as const,
  related: (id: number) => [...animeKeys.all, "related", id] as const,
  characters: (id: number) => [...animeKeys.all, "characters", id] as const,
  realms: (id: number) => [...animeKeys.all, "realms", id] as const,
};

// 2. EPISODES QUERY KEYS
export const episodeKeys = {
  all: ["episodes"] as const,
  lists: (animeId: number) => [...episodeKeys.all, "list", animeId] as const,
  servers: (episodeId: number) => [...episodeKeys.all, "servers", episodeId] as const,
  subtitles: (episodeId: number) => [...episodeKeys.all, "subtitles", episodeId] as const,
};

// 3. USER DATA QUERY KEYS
export const userKeys = {
  watchlist: (userId?: string) => ["watchlist", userId || "guest"] as const,
  continueWatching: (userId?: string) => ["continue-watching", userId || "guest"] as const,
  episodeProgress: (animeId: number, userId?: string) => ["episode-progress", animeId, userId || "guest"] as const,
  comments: (episodeId: number) => ["comments", episodeId] as const,
};

// ==========================================
// ANIME QUERY HOOKS
// ==========================================

export function useAnimeCatalogQuery(filters?: {
  search?: string;
  genre?: string;
  status?: string;
  format?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: animeKeys.list(filters),
    queryFn: ({ signal }) => animeService.fetchAnimeCatalog(filters, signal),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useAnimeDetailQuery(slug: string) {
  return useQuery({
    queryKey: animeKeys.detail(slug),
    queryFn: ({ signal }) => animeService.fetchAnimeBySlug(slug, signal),
    enabled: !!slug,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });
}

export function useRelatedAnimeQuery(animeId: number, limit = 4) {
  return useQuery({
    queryKey: animeKeys.related(animeId),
    queryFn: ({ signal }) => animeService.fetchRelatedAnime(animeId, limit, signal),
    enabled: !!animeId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useCharactersQuery(animeId: number) {
  return useQuery({
    queryKey: animeKeys.characters(animeId),
    queryFn: ({ signal }) => animeService.fetchCharacters(animeId, signal),
    enabled: !!animeId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useCultivationRealmsQuery(animeId: number) {
  return useQuery({
    queryKey: animeKeys.realms(animeId),
    queryFn: ({ signal }) => animeService.fetchCultivationRealms(animeId, signal),
    enabled: !!animeId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ==========================================
// EPISODE QUERY HOOKS
// ==========================================

export function useEpisodesQuery(animeId: number) {
  return useQuery({
    queryKey: episodeKeys.lists(animeId),
    queryFn: () => episodesService.fetchEpisodes(animeId),
    enabled: !!animeId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });
}

export function useEpisodeServersQuery(episodeSlug: string, dbEpisodeId?: number) {
  return useQuery({
    queryKey: ["servers", episodeSlug, dbEpisodeId],
    queryFn: async () => {
      // 1. Try to fetch from Supabase local DB first if we have a valid DB episode ID
      if (dbEpisodeId && dbEpisodeId > 0) {
        try {
          const dbServers = await episodesService.fetchEpisodeServers(dbEpisodeId);
          if (dbServers && dbServers.length > 0 && !dbServers[0].video_url.includes("example.com")) {
            return dbServers;
          }
        } catch (err) {
          console.warn("Failed to fetch servers from DB, falling back to scraper:", err);
        }
      }

      // 2. Fallback: Fetch directly from the scraper API using the exact string slug
      if (!episodeSlug) return [];
      try {
        const res = await fetch(`https://www.sankavollerei.web.id/anime/donghua/episode/${episodeSlug}`);
        if (!res.ok) throw new Error(`Scraper returned status ${res.status}`);
        const data = await res.json();
        
        if (data && data.streaming && data.streaming.servers) {
          return data.streaming.servers.map((s: any, idx: number) => ({
            id: idx + 1,
            name: s.name, // Support both naming styles
            server_name: s.name,
            url: s.url,
            video_url: s.url,
            quality: "1080p",
            priority: idx + 1
          }));
        }
      } catch (err) {
        console.error("Scraper API fetch failed:", err);
      }

      // 3. Fallback to default demo servers if all else fails
      return [];
    },
    enabled: !!episodeSlug || !!dbEpisodeId,
  });
}

export function useEpisodeSubtitlesQuery(episodeId: number) {
  return useQuery({
    queryKey: episodeKeys.subtitles(episodeId),
    queryFn: () => episodesService.fetchEpisodeSubtitles(episodeId),
    enabled: !!episodeId,
  });
}

// ==========================================
// USER DATA & SYNC HOOKS
// ==========================================

export function useWatchlistQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: userKeys.watchlist(user?.id),
    queryFn: () => watchlistService.fetchWatchlist(user?.id),
  });
}

export function useAddToWatchlistMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (animeId: number) => watchlistService.addToWatchlist(animeId, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.watchlist(user?.id) });
    },
  });
}

export function useRemoveFromWatchlistMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (animeId: number) => watchlistService.removeFromWatchlist(animeId, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.watchlist(user?.id) });
    },
  });
}

export function useContinueWatchingQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: userKeys.continueWatching(user?.id),
    queryFn: () => progressService.fetchContinueWatching(user?.id),
  });
}

export function useRatingsQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ratings", user?.id || "guest"],
    queryFn: () => animeService.fetchUserRatings(user?.id),
  });
}

export function useSaveRatingMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { animeId: number; score: number }) =>
      animeService.saveUserRating(params.animeId, params.score, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ratings", user?.id || "guest"] });
    },
  });
}

export function useEpisodeProgressQuery(animeId: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: userKeys.episodeProgress(animeId, user?.id),
    queryFn: () => progressService.fetchEpisodeProgress(animeId, user?.id),
    enabled: !!animeId,
  });
}

export function useSaveProgressMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      animeId: number;
      episodeId: number;
      episodeNumber: number;
      currentTime: number;
      duration: number;
      completed: boolean;
      episodeImage?: string;
      seasonName?: string;
      installmentType?: string;
      episodeTitle?: string;
    }) =>
      progressService.saveWatchProgress({
        userId: user?.id,
        ...params,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.continueWatching(user?.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.episodeProgress(variables.animeId, user?.id) });
    },
  });
}

export function useDeleteProgressMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (animeId: number) => progressService.deleteWatchProgress(animeId, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.continueWatching(user?.id) });
      queryClient.invalidateQueries({ queryKey: ["completed-episodes-count", user?.id || "guest"] });
    },
  });
}

export function useCompletedEpisodesCountQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["completed-episodes-count", user?.id || "guest"],
    queryFn: () => progressService.fetchCompletedEpisodesCount(user?.id),
  });
}

// ==========================================
// COMMENTS QUERY HOOKS
// ==========================================

export function useCommentsQuery(episodeId: number) {
  return useQuery({
    queryKey: userKeys.comments(episodeId),
    queryFn: () => commentsService.fetchComments(episodeId),
    enabled: !!episodeId,
  });
}

export function usePostCommentMutation() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      episodeId: number;
      content: string;
      parentId?: number;
      isSpoiler?: boolean;
      isDanmaku?: boolean;
      timestampSeconds?: number;
      danmakuColor?: string;
      danmakuPosition?: string;
    }) => {
      if (!user || !profile) {
        throw new Error("You must be signed in to submit comments");
      }
      return commentsService.postComment({
        userId: user.id,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        cultivationRank: profile.cultivation_rank,
        ...params,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.comments(variables.episodeId) });
    },
  });
}

export function useScheduleQuery() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: () => animeService.fetchSchedule(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useTodayReleasesQuery() {
  return useQuery({
    queryKey: ["today-releases"],
    queryFn: () => animeService.fetchTodayReleases(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
