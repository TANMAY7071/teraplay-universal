import { useQuery } from "@tanstack/react-query";
import { resolveAnimeReleaseState, ReleaseState } from "@/services/release/releaseStateResolver";

/**
 * React hook to fetch canonical ReleaseState for a single Donghua series.
 */
export function useReleaseState(animeSlugOrId: string | number) {
  return useQuery<ReleaseState>({
    queryKey: ["canonical-release-state", String(animeSlugOrId)],
    queryFn: () => resolveAnimeReleaseState(animeSlugOrId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false
  });
}

/**
 * React hook to fetch ReleaseState for top Hero featured shows.
 */
export function useHomeHeroReleaseStates(heroSlugs: string[] = ["battle-through-the-heavens", "renegade-immortal", "the-great-ruler", "swallowed-star", "perfect-world"]) {
  return useQuery<ReleaseState[]>({
    queryKey: ["home-hero-release-states", heroSlugs.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        heroSlugs.map(slug => resolveAnimeReleaseState(slug))
      );
      return results;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });
}
