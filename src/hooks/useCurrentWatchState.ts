import { useMemo } from "react";
import { useContinueWatchingQuery } from "@/hooks/useAnimeQueries";
import { resolveCurrentWatchState, ResolvedWatchState } from "@/services/watchStateResolver";
import { Anime } from "@/types/anime";

/**
 * Custom React Hook: Canonical Current Watch State Resolver
 * Single Source of Truth for Season, Episode, CTA, and Mini Cards state across the app.
 */
export function useCurrentWatchState(
  anime?: Anime | { id: number | string; slug: string; title: string; image?: string; banner?: string; episodes?: number } | null,
  episodesData?: { episode_number: number; title?: string; thumbnail_url?: string }[]
): ResolvedWatchState | null {
  const { data: continueWatching = {} } = useContinueWatchingQuery();

  return useMemo(() => {
    if (!anime) return null;
    return resolveCurrentWatchState({
      anime,
      continueWatching,
      episodesData,
    });
  }, [anime, continueWatching, episodesData]);
}
