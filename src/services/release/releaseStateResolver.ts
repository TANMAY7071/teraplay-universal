import { animeCatalog } from "@/data/anime";
import { findUniverseBySlug, UNIVERSES_REGISTRY } from "@/data/universeData";
import { Installment } from "@/types/universe";
import { getProgress, UserWatchProgress } from "@/lib/progress";
import { supabase } from "@/lib/supabase";

export type EpisodePublicationState = 
  | "SCHEDULED"
  | "AWAITING_PUBLICATION"
  | "PUBLISHED"
  | "HIDDEN";

export interface EpisodeReleaseInfo {
  id: string;
  seasonId: string;
  seasonNumber: number;
  seasonTitle: string;
  relativeNumber: number;
  absoluteNumber: number;
  title: string;
  airedAt: string;
  thumbnail: string;
  embedUrl: string;
  publicationState: EpisodePublicationState;
}

export interface NextAiringInfo {
  seasonNumber: number;
  relativeNumber: number;
  absoluteNumber: number;
  title: string;
  airingAt: string;
  thumbnail?: string;
}

export type CurationTag = "NEW_EPISODE" | "UPCOMING" | "SEASON_PREMIERE" | "MAJOR_RELEASE" | "ADMIN_FEATURED";

export interface ReleaseState {
  animeId: number;
  animeSlug: string;
  title: string;
  chineseTitle?: string;
  synopsis: string;
  genres: string[];
  rating: number;
  
  // DonghuaStream Franchise Season Model
  currentSeason: {
    id: string;
    seasonNumber: number;
    title: string;
    slug: string;
    poster: string;
    banner?: string;
    totalEpisodes: number;
  };
  totalSeasons: number;
  seasonStatus: "AIRING" | "UPCOMING" | "COMPLETED" | "HIATUS";

  // 3 DISTINCT UNLINKED EPISODE CONCEPTS
  // 1. Latest Published Episode (Hero metadata)
  latestAiredEpisode: EpisodeReleaseInfo | null;
  // 2. Next Upcoming Scheduled Episode (Upcoming indicator)
  nextAiringEpisode: NextAiringInfo | null;
  // 3. User Progress (Primary CTA)
  userProgress: {
    installmentId: string | number;
    installmentTitle: string;
    episodeNumber: number;
    completed: boolean;
    updatedAt: number;
  } | null;

  latestPublicationState: "PUBLISHED" | "AWAITING_PUBLICATION" | "NONE";

  // 4-Stage Artwork Fallback: episode.thumbnail -> season.poster -> season.banner -> anime.poster
  artwork: {
    episodeThumbnail?: string;
    seasonPoster?: string;
    seasonBanner?: string;
    animePoster?: string;
    resolvedPoster: string;
    resolvedBanner: string;
  };

  hero: {
    featured: boolean;
    priority: number;
    badge?: string;
    curationTag: CurationTag;
  };

  heroTrailerUrl?: string;
  heroBadgeText: string;
  isUpcoming: boolean;
  isNewToday: boolean;

  adminOverride: {
    active: boolean;
    fields: string[];
  };
}

// Local storage key for manual admin release overrides
const ADMIN_OVERRIDE_KEY = "donghua_admin_release_overrides";

export interface AdminReleaseOverride {
  animeSlug: string;
  isOverrideEnabled: boolean;
  manualSeasonNumber?: number;
  manualLatestEpisodeNumber?: number;
  manualNextEpisodeNumber?: number;
  manualAirDate?: string;
  manualStatus?: "AIRING" | "UPCOMING" | "COMPLETED" | "HIATUS";
  manualHeroBadge?: string;
  manualPoster?: string;
  manualBanner?: string;
  manualFeatured?: boolean;
}

export function getAdminOverride(animeSlug: string): AdminReleaseOverride | null {
  try {
    const raw = localStorage.getItem(ADMIN_OVERRIDE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, AdminReleaseOverride>;
    return map[animeSlug.toLowerCase()] || null;
  } catch (e) {
    return null;
  }
}

export function saveAdminOverride(override: AdminReleaseOverride): void {
  try {
    const raw = localStorage.getItem(ADMIN_OVERRIDE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[override.animeSlug.toLowerCase()] = override;
    localStorage.setItem(ADMIN_OVERRIDE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save admin release override", e);
  }
}

/**
 * CANONICAL RELEASE STATE RESOLVER
 * The single source of truth for DonghuaStream episode release state.
 */
export async function resolveAnimeReleaseState(animeSlugOrId: string | number): Promise<ReleaseState> {
  const queryStr = String(animeSlugOrId).toLowerCase();
  
  // 1. Resolve Catalog Entry
  const catalogMatch = animeCatalog.find(
    a => String(a.id) === queryStr || a.slug.toLowerCase() === queryStr
  ) || animeCatalog[0];

  const targetSlug = catalogMatch.slug;

  // 2. Resolve Universe & DonghuaStream Franchise Seasons
  const universeMatch = findUniverseBySlug(targetSlug) || UNIVERSES_REGISTRY.find(u => u.slug.includes(targetSlug));
  const installments: Installment[] = universeMatch?.installments || [
    {
      id: `${targetSlug}-s1`,
      slug: "season-1",
      title: "Season 1",
      type: "Season",
      seasonNumber: 1,
      installmentOrder: 1,
      status: "Completed",
      episodesCount: catalogMatch.episodes || 12,
      poster: catalogMatch.image,
      banner: universeMatch?.banner || catalogMatch.image,
      description: catalogMatch.synopsis
    }
  ];

  const now = new Date();
  const nowTime = now.getTime();

  // 3. Generate all episodes across installments with strict publication state determination
  const allEpisodes: EpisodeReleaseInfo[] = [];

  let absoluteCounter = 1;
  installments.forEach((inst) => {
    const epCount = inst.episodesCount || 12;
    const instSeasonNum = inst.seasonNumber || 1;
    const seasonSlug = inst.slug || inst.id || `season-${instSeasonNum}`;

    for (let i = 1; i <= epCount; i++) {
      // Air date determination
      const airDateStr = inst.releaseDate || `2024-01-${String((i % 28) + 1).padStart(2, '0')}`;
      const airTime = new Date(airDateStr).getTime();
      const isPastAirTime = airTime <= (nowTime + 86400000);

      // Draft / Publication gate
      const isDraftInDb = i > (epCount - 1) && inst.status === "Ongoing";

      let pubState: EpisodePublicationState = "PUBLISHED";
      if (!isPastAirTime) {
        pubState = "SCHEDULED";
      } else if (isDraftInDb) {
        pubState = "AWAITING_PUBLICATION"; // Reached air date, but not published by admin yet!
      }

      const verifiedThumb = inst.verifiedEpisodeThumbnails?.[i];
      const verifiedTitle = inst.verifiedEpisodeTitles?.[i];

      allEpisodes.push({
        id: `${inst.id}-ep-${i}`,
        seasonId: String(inst.id),
        seasonNumber: instSeasonNum,
        seasonTitle: inst.title,
        relativeNumber: i,
        absoluteNumber: absoluteCounter++,
        title: verifiedTitle || `Episode ${i}`,
        airedAt: airDateStr,
        thumbnail: verifiedThumb || inst.poster || catalogMatch.image,
        embedUrl: `https://stream.donghuastream.org/embed/${targetSlug}/${seasonSlug}/ep-${i}.m3u8`,
        publicationState: pubState
      });
    }
  });

  // 4. Resolve Latest Published Episode (ONLY PUBLISHED episodes count!)
  const publishedEpisodes = allEpisodes
    .filter(ep => ep.publicationState === "PUBLISHED")
    .sort((a, b) => b.absoluteNumber - a.absoluteNumber);

  const latestAired = publishedEpisodes[0] || null;

  // Resolve Next Airing Episode (SCHEDULED or AWAITING_PUBLICATION)
  const pendingEpisodes = allEpisodes
    .filter(ep => ep.publicationState === "SCHEDULED" || ep.publicationState === "AWAITING_PUBLICATION")
    .sort((a, b) => a.absoluteNumber - b.absoluteNumber);

  const nextRaw = pendingEpisodes[0] || null;
  const nextAiringEpisode: NextAiringInfo | null = nextRaw ? {
    seasonNumber: nextRaw.seasonNumber,
    relativeNumber: nextRaw.relativeNumber,
    absoluteNumber: nextRaw.absoluteNumber,
    title: nextRaw.title,
    airingAt: nextRaw.publicationState === "AWAITING_PUBLICATION" ? "Awaiting Admin Publication" : nextRaw.airedAt,
    thumbnail: nextRaw.thumbnail
  } : null;

  // 5. Active Season Resolution (Automatic Season Transition)
  // Current season is the season of the latest published episode, or current active installment
  let currentInst = installments.find(inst => latestAired && String(inst.id) === latestAired.seasonId) || installments[installments.length - 1] || installments[0];

  // Season completion check (e.g. S1 completed at EP52, no S2 published yet)
  const isCurrentSeasonCompleted = currentInst.status === "Completed" && (!nextAiringEpisode || nextAiringEpisode.seasonNumber > (currentInst.seasonNumber || 1));
  let seasonStatus: "AIRING" | "UPCOMING" | "COMPLETED" | "HIATUS" = isCurrentSeasonCompleted ? "COMPLETED" : (catalogMatch.status === "Ongoing" ? "AIRING" : "COMPLETED");

  // 6. User Progress Resolution (Completely independent concept!)
  const rawProgress = getProgress(targetSlug) || getProgress(catalogMatch.slug);
  const userProgress = rawProgress ? {
    installmentId: rawProgress.installmentId,
    installmentTitle: rawProgress.installmentTitle,
    episodeNumber: rawProgress.episodeNumber,
    completed: rawProgress.completed || false,
    updatedAt: rawProgress.updatedAt
  } : null;

  // 7. 4-Stage Artwork Fallback Chain
  const epThumb = latestAired?.thumbnail;
  const sPoster = currentInst.poster;
  const sBanner = currentInst.banner;
  const aPoster = catalogMatch.image;

  const resolvedPoster = epThumb || sPoster || sBanner || aPoster;
  const resolvedBanner = sBanner || epThumb || sPoster || aPoster;

  // 8. Admin Override Precedence
  const adminOverride = getAdminOverride(targetSlug);
  const isOverrideActive = Boolean(adminOverride && adminOverride.isOverrideEnabled);
  const activeFields: string[] = [];

  let finalSeasonNum = currentInst.seasonNumber || 1;
  let finalBadge = isCurrentSeasonCompleted 
    ? `SEASON ${finalSeasonNum} COMPLETE` 
    : `S${finalSeasonNum} • EP${latestAired?.relativeNumber || 1}`;
  let curationTag: CurationTag = "NEW_EPISODE";

  if (isOverrideActive && adminOverride) {
    if (adminOverride.manualSeasonNumber) {
      finalSeasonNum = adminOverride.manualSeasonNumber;
      activeFields.push("manualSeasonNumber");
    }
    if (adminOverride.manualHeroBadge) {
      finalBadge = adminOverride.manualHeroBadge;
      activeFields.push("manualHeroBadge");
    }
    if (adminOverride.manualStatus) {
      seasonStatus = adminOverride.manualStatus;
      activeFields.push("manualStatus");
    }
  } else if (latestAired && new Date(latestAired.airedAt).toDateString() === now.toDateString()) {
    finalBadge = "NEW EPISODE TODAY";
    curationTag = "NEW_EPISODE";
  } else if (currentInst.installmentOrder === 1 && (latestAired?.relativeNumber || 0) <= 3) {
    curationTag = "SEASON_PREMIERE";
  }

  const latestPubStatus: "PUBLISHED" | "AWAITING_PUBLICATION" | "NONE" = 
    latestAired ? "PUBLISHED" : (nextRaw?.publicationState === "AWAITING_PUBLICATION" ? "AWAITING_PUBLICATION" : "NONE");

  const numericId = typeof catalogMatch.id === "number" ? catalogMatch.id : parseInt(String(catalogMatch.id), 10) || 1;

  return {
    animeId: numericId,
    animeSlug: targetSlug,
    title: catalogMatch.title,
    chineseTitle: catalogMatch.originalTitle || universeMatch?.originalTitle,
    synopsis: catalogMatch.synopsis || universeMatch?.description || "",
    genres: catalogMatch.genres || universeMatch?.genres || ["Action", "Cultivation"],
    rating: typeof catalogMatch.rating === "number" ? catalogMatch.rating : 9.0,
    
    currentSeason: {
      id: String(currentInst.id),
      seasonNumber: finalSeasonNum,
      title: currentInst.title,
      slug: currentInst.slug || `season-${finalSeasonNum}`,
      poster: currentInst.poster || catalogMatch.image,
      banner: currentInst.banner,
      totalEpisodes: currentInst.episodesCount || 12
    },
    totalSeasons: installments.length,
    seasonStatus,

    latestAiredEpisode: latestAired,
    nextAiringEpisode,
    userProgress,
    latestPublicationState: latestPubStatus,

    artwork: {
      episodeThumbnail: epThumb,
      seasonPoster: sPoster,
      seasonBanner: sBanner,
      animePoster: aPoster,
      resolvedPoster,
      resolvedBanner
    },

    hero: {
      featured: adminOverride?.manualFeatured ?? true,
      priority: numericId,
      badge: finalBadge,
      curationTag
    },

    heroTrailerUrl: (catalogMatch as any).trailerUrl || (catalogMatch as any).trailer_url,
    heroBadgeText: finalBadge,
    isUpcoming: seasonStatus === "UPCOMING" || publishedEpisodes.length === 0,
    isNewToday: finalBadge === "NEW EPISODE TODAY",
    adminOverride: {
      active: isOverrideActive,
      fields: activeFields
    }
  };
}
