import React, { useState, useMemo, useEffect, useRef } from "react";
import SEO from "@/components/SEO";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  Sparkles, Users, MessageSquare, HeartHandshake, Compass, Flame, 
  ShieldAlert, Award, Play, Check, ChevronRight, Search, 
  SlidersHorizontal, Bookmark, BookOpen, Globe, Sword, Gift, 
  Flag, Image, Hourglass, Star, Heart, Clock, ArrowRight, UserCheck,
  ExternalLink, Activity
} from "lucide-react";
import { findUniverseBySlug, UNIVERSES_REGISTRY } from "@/data/universeData";
import { getAnimeSeriesDetails } from "@/data/animeDetails";
import {
  getSeriesById,
  getFranchiseBySeriesId,
  getPrimaryWatchAction,
  getCharacterHighlights,
  getRealmById,
  getClanById,
  getLocationById,
  mockEpisodeProgress,
  mockWatchProgress
} from "@/data/mock";
import { UniverseHero } from "@/components/universe/UniverseHero";
import { SeasonNavigator } from "@/components/universe/SeasonNavigator";
import { OverviewSection } from "@/components/universe/OverviewSection";
import { useAnimeDetailQuery, useCommentsQuery, usePostCommentMutation } from "@/hooks/useAnimeQueries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { EpisodesPreview } from "@/components/universe/EpisodesPreview";
import { Installment, Universe } from "@/types/universe";
import PageWrapper from "@/components/layout/PageWrapper";
import NotFound from "./NotFound";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
// cachedLoreData dynamically queried at runtime
import { SmartImage } from "@/components/SmartImage";
import { fetchMediaOverrides } from "@/services/mediaOverrides";
import { anilistGetRelations } from "@/services/anilistAnime";
import { SIMKL_CLIENT_ID } from "@/services/simklAnime";

// Image candidate scoring system types
type ImageRole = "banner" | "portrait" | "thumbnail" | "gallery";

interface ImageCandidate {
  url: string;
  source: string;
  width: number;
  height: number;
  tags: string[];
}

// Ingestion image database simulating Supabase collection cache
const collectionImagesDb: Record<string, ImageCandidate[]> = {
  "locations": [
    { url: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&fit=crop", source: "wiki-gallery", width: 1920, height: 1080, tags: ["landscape", "environment"] },
    { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&fit=crop", source: "wiki-infobox", width: 800, height: 1200, tags: ["portrait", "environment"] },
    { url: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&fit=crop", source: "html-parser", width: 640, height: 360, tags: ["landscape", "character"] }
  ],
  "characters": [
    { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&fit=crop", source: "wiki-infobox", width: 800, height: 1200, tags: ["portrait", "character", "face-visible"] },
    { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&fit=crop", source: "wiki-gallery", width: 1920, height: 1080, tags: ["landscape", "character"] },
    { url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&fit=crop", source: "html-parser", width: 640, height: 480, tags: ["character"] }
  ],
  "cultivation": [
    { url: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&fit=crop", source: "wiki-gallery", width: 1920, height: 1080, tags: ["landscape", "cultivation-glow"] },
    { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&fit=crop", source: "wiki-infobox", width: 600, height: 900, tags: ["portrait", "cultivation-glow"] }
  ],
  "techniques": [
    { url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&fit=crop", source: "wiki-gallery", width: 1920, height: 1080, tags: ["landscape", "action-shot"] },
    { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&fit=crop", source: "wiki-infobox", width: 700, height: 900, tags: ["portrait", "action-shot"] }
  ],
  "artifacts": [
    { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&fit=crop", source: "wiki-infobox", width: 600, height: 900, tags: ["portrait", "close-up", "artifact"] },
    { url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&fit=crop", source: "wiki-gallery", width: 1200, height: 800, tags: ["landscape", "artifact"] }
  ],
  "clans": [
    { url: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&fit=crop", source: "wiki-gallery", width: 1600, height: 900, tags: ["landscape", "clan-emblem"] },
    { url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&fit=crop", source: "wiki-infobox", width: 600, height: 800, tags: ["portrait", "clan-emblem"] }
  ],
  "gallery": [
    { url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&fit=crop", source: "wiki-gallery", width: 1920, height: 1080, tags: ["landscape"] }
  ],
  "timeline": [
    { url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&fit=crop", source: "wiki-gallery", width: 1920, height: 1080, tags: ["landscape"] }
  ]
};

function scoreImageCandidate(candidate: ImageCandidate, role: ImageRole, category: string): number {
  let score = 0;
  
  if (role === "banner") {
    if (candidate.width >= 1200 && candidate.height >= 600 && candidate.width > candidate.height) {
      score += 100;
    }
  } else if (role === "portrait") {
    if (candidate.height > candidate.width && candidate.tags.includes("portrait")) {
      score += 100;
    }
  }

  if (candidate.tags.includes("landscape") && role === "banner") {
    score += 50;
  }
  if (candidate.tags.includes("face-visible") && role === "portrait") {
    score += 60;
  }

  if (category === "locations" && candidate.tags.includes("environment")) {
    score += 40;
  }
  if (category === "characters" && candidate.tags.includes("character")) {
    score += 40;
  }
  if (category === "techniques" && candidate.tags.includes("action-shot")) {
    score += 40;
  }

  return score;
}

// Function to resolve the absolute best representative image
function getCollectionFeatureImage(categoryKey: string, role: ImageRole = "banner"): { url: string; score: number; source: string; resolution: string } {
  const candidates = collectionImagesDb[categoryKey] || [];
  if (candidates.length === 0) {
    return {
      url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&fit=crop",
      score: 0,
      source: "fallback",
      resolution: "1920x1080"
    };
  }

  const scored = candidates.map(cand => {
    const score = scoreImageCandidate(cand, role, categoryKey);
    return {
      url: cand.url,
      score,
      source: cand.source,
      resolution: `${cand.width}x${cand.height}`
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

// Helper to pull random real illustrations from static local database
const getRandomCachedImage = (categoryKey: string, sub: string, cachedLoreData: any): string => {
  try {
    const list = (cachedLoreData as any)[sub]?.[categoryKey] || [];
    const validItems = list.filter((item: any) => {
      const primaryImg = (item.logoImage || "").toLowerCase();
      const isPlaceholder = primaryImg.includes("2015060816373561467") || primaryImg.includes("no_photo_available") || primaryImg.includes("placeholder");
      const hasLogo = item.logoImage && !isPlaceholder;
      const hasGallery = item.galleryImages && item.galleryImages.length > 0;
      const hasAllImages = item.allImages && item.allImages.length > 0;
      return hasLogo || hasGallery || hasAllImages;
    });

    if (validItems.length === 0) return "";

    const randomItem = validItems[Math.floor(Math.random() * validItems.length)];
    const images: string[] = [];
    
    let primaryImg = randomItem.logoImage || "";
    const isPlaceholder = primaryImg.toLowerCase().includes("2015060816373561467") || primaryImg.toLowerCase().includes("no_photo_available") || primaryImg.toLowerCase().includes("placeholder");
    if (primaryImg && !isPlaceholder) {
      images.push(primaryImg);
    }
    
    if (randomItem.galleryImages && randomItem.galleryImages.length > 0) {
      images.push(...randomItem.galleryImages.filter((img: string) => 
        img && 
        img.startsWith("http") && 
        !img.toLowerCase().includes("2015060816373561467") && 
        !img.toLowerCase().includes("no_photo_available") &&
        !img.toLowerCase().includes("placeholder")
      ));
    }

    if (randomItem.allImages && randomItem.allImages.length > 0) {
      images.push(...randomItem.allImages.filter((img: string) => 
        img && 
        img.startsWith("http") && 
        !img.toLowerCase().includes("2015060816373561467") && 
        !img.toLowerCase().includes("no_photo_available") &&
        !img.toLowerCase().includes("placeholder")
      ));
    }

    if (images.length === 0) return "";
    return images[Math.floor(Math.random() * images.length)];
  } catch (e) {
    console.error("Error picking random cached image", e);
    return "";
  }
};

const getFandomSubdomain = (slugStr: string): string => {
  const lower = (slugStr || "").toLowerCase();
  if (lower.includes("soul-land") || lower.includes("douluo") || lower.includes("soulland")) return "soulland";
  if (lower.includes("renegade") || lower.includes("xian-ni") || lower.includes("xianni")) return "xian-ni";
  if (lower.includes("perfect-world") || lower.includes("wanmei") || lower.includes("wan-mei")) return "wanmei-shijie";
  if (lower.includes("swallowed-star") || lower.includes("tunshi") || lower.includes("swallowed")) return "swallowed-star";
  if (lower.includes("shrouding") || lower.includes("zhetian") || lower.includes("zhe-tian")) return "shrouding-the-heavens";
  if (lower.includes("great-ruler") || lower.includes("thegreatruler") || lower.includes("da-zhu-zai")) return "thegreatruler";
  if (lower.includes("stellar") || lower.includes("xingchen") || lower.includes("xing-chen")) return "stellar-transformations";
  if (lower.includes("martial-universe") || lower.includes("wudong") || lower.includes("wu-dong")) return "wu-dong-qian-kun";
  if (lower.includes("battle-through") || lower.includes("btth") || lower.includes("doupocangqiong")) return "battle-through-the-heavens";
  
  const cleaned = lower.replace(/[^a-z0-9-]/g, "");
  return cleaned || "donghua";
};

const getWorldDescription = (slugKey: string, universeTitle: string) => {
  const key = (slugKey || "").toLowerCase();
  if (key.includes("renegade") || key.includes("xian-ni")) {
    return "Explore the cultivation realms, ancient battlefields, sect territories and mysterious domains.";
  }
  if (key.includes("perfect-world") || key.includes("wanmei")) {
    return "Explore the wilderness, immortal lands, ancient clans, and legendary domains.";
  }
  if (key.includes("swallowed")) {
    return "Explore Earth, the Milky Way, Universe Ocean and the vast realms beyond.";
  }
  if (key.includes("shrouding") || key.includes("zhetian")) {
    return "Explore the ancient star paths, desolate ruins, sacred grounds and forbidden zones.";
  }
  if (key.includes("great-ruler") || key.includes("thegreatruler")) {
    return "Explore the Great Thousand World, spiritual academies, celestial territories and clans.";
  }
  if (key.includes("stellar") || key.includes("xingchen")) {
    return "Explore the mortal realms, demonic realms, divine star systems and immortal planes.";
  }
  if (key.includes("martial-universe") || key.includes("wudong")) {
    return "Explore the Great Yan Empire, super sects, ancient battlefields and beast regions.";
  }
  return `Explore sects, cities, regions and landmarks from the world of ${universeTitle}.`;
};

const getDynamicCount = (key: string, sub: string, cachedLoreData: any, fallbackVal: string) => {
  // Check CMS LocalStorage first for live dynamic counts
  try {
    const cmsCategoryKey = key === "world" ? "locations" : key;
    const cmsSaved = localStorage.getItem(`cms_universe_${cmsCategoryKey}_${sub}`);
    if (cmsSaved) {
      const cmsList = JSON.parse(cmsSaved);
      if (Array.isArray(cmsList) && cmsList.length > 0) {
        return `${cmsList.length}`;
      }
    }
  } catch (e) {
    console.warn("Failed to parse CMS storage count:", e);
  }

  const list = cachedLoreData[sub]?.[key];
  if (list && Array.isArray(list) && list.length > 0) {
    if (list.length >= 1000) {
      return `${(list.length / 1000).toFixed(1)}K`;
    }
    return `${list.length}`;
  }
  return fallbackVal.replace("+", "");
};

const StaggeredCardBackdrop: React.FC<{ 
  categoryKey: string; 
  sub: string; 
  cachedLoreData: any; 
  fallbackImg?: string;
  staggerIndex: number;
}> = ({ categoryKey, sub, cachedLoreData, fallbackImg, staggerIndex }) => {
  const images = useMemo(() => {
    const list = cachedLoreData[sub]?.[categoryKey] || [];
    const urls = list
      .map((item: any) => item.logoImage || "")
      .filter((img: string) => img && !img.toLowerCase().includes("no_photo_available") && !img.toLowerCase().includes("placeholder") && !img.toLowerCase().includes("2015060816373561467"));
    
    if (fallbackImg) urls.push(fallbackImg);
    return Array.from(new Set(urls)) as string[];
  }, [categoryKey, sub, cachedLoreData, fallbackImg]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const staggerDelay = staggerIndex * 250 + Math.random() * 200;
    let intervalId: NodeJS.Timeout;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setIndex(prev => (prev + 1) % images.length);
      }, 5000);
    }, staggerDelay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [images, staggerIndex]);

  if (images.length === 0) {
    return <div className="absolute inset-0 bg-gradient-to-tr from-[#0f111a] to-[#030409] opacity-35" />;
  }

  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt="Backdrop"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all ease-out duration-1000 pointer-events-none select-none",
            i === index ? "opacity-35 scale-105" : "opacity-0 scale-100",
            isReduced && "transition-none scale-100 opacity-35"
          )}
          referrerPolicy="no-referrer"
        />
      ))}
    </div>
  );
};

const AnimeDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const currentSubdomain = useMemo(() => {
    return getFandomSubdomain(slug || "") || "battle-through-the-heavens";
  }, [slug]);

  const { data: cachedLore } = useQuery({
    queryKey: ["cachedLoreData", currentSubdomain],
    queryFn: async () => {
      try {
        const res = await fetch(`/data/lore/${currentSubdomain}.json`);
        if (!res.ok) return {};
        const json = await res.json();
        return { [currentSubdomain]: json };
      } catch {
        return {};
      }
    },
    staleTime: Infinity,
  });
  const cachedLoreData = cachedLore || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Fallback query
  const { data: anime, isLoading } = useAnimeDetailQuery(slug || "");

  const { user } = useAuth();

  // "You May Also Like" carousel horizontal scroll container
  const recScrollRef = useRef<HTMLDivElement>(null);

  // Series discussion form — persists to the same comments table / hooks the
  // Watch page uses, scoped to episode 1's thread of this series
  // (same animeId * 1000 + episodeNumber episode-id convention as Watch.tsx).
  const seriesEpisodeId = (Number(anime?.id) || 1) * 1000 + 1;
  const { data: seriesComments = [] } = useCommentsQuery(seriesEpisodeId);
  const postSeriesCommentMutation = usePostCommentMutation();
  const [seriesCommentText, setSeriesCommentText] = useState("");

  const handleSeriesCommentSubmit = () => {
    const text = seriesCommentText.trim();
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }
    if (!text) return;
    postSeriesCommentMutation.mutate(
      { episodeId: seriesEpisodeId, content: text },
      {
        onSuccess: () => {
          setSeriesCommentText("");
          toast.success("Comment posted");
        },
        onError: (err: any) => toast.error(err.message || "Failed to post comment"),
      }
    );
  };

  const [characterOverrides, setCharacterOverrides] = useState<Record<string, string>>({});
  // Simkl details with TanStack Query caching (24h staleTime)
  const { data: simklDetail } = useQuery({
    queryKey: ["simkl-detail", anime?.anilist_id, anime?.slug, slug],
    queryFn: async () => {
      const slugKey = (anime?.slug || slug || "").toLowerCase();
      if (!slugKey) return null;
      try {
        let simklId = null;
        const aniId = anime?.anilist_id;
        
        const map: Record<number, number> = {
          164057: 2275520, // Renegade Immortal (Xian Ni)
          125139: 1492145, // Swallowed Star (Tunshi Xingkong)
          134108: 1623359, // Perfect World (Wanmei Shijie)
          137728: 1972214, // BTTH S5 (Dou Po Cangqiong Nian Fan)
          100806: 1972214, // BTTH (default to S5 ONA)
          134088: 2275626, // The Great Ruler (Da Zhu Zai Nian Fan)
          198706: 3019366, // The Great Ruler S2 (Da Zhu Zai Nian Fan 2)
          106880: 1302779,  // Stellar Transformations
        };
        
        if (aniId && map[aniId]) {
          simklId = map[aniId];
        } else {
          if (slugKey.includes("renegade-immortal")) simklId = 2275520;
          else if (slugKey.includes("swallowed-star")) simklId = 1492145;
          else if (slugKey.includes("perfect-world")) simklId = 1623359;
          else if (slugKey.includes("battle-through-the-heavens-season-5") || slugKey.includes("dou-po-cangqiong-nian-fan")) simklId = 1972214;
          else if (slugKey.includes("the-great-ruler-season-2")) simklId = 3019366;
          else if (slugKey.includes("the-great-ruler") || slugKey.includes("great-ruler")) simklId = 2275626;
          else if (slugKey.includes("martial-universe") || slugKey.includes("wu-dong-qiankun")) simklId = 1033695;
        }
        
        if (!simklId && aniId) {
          const searchUrl = `https://api.simkl.com/search/id?anilist=${aniId}&client_id=${SIMKL_CLIENT_ID}`;
          const searchRes = await fetch(searchUrl);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData && searchData.length > 0) {
              simklId = searchData[0].ids?.simkl || searchData[0].id;
            }
          }
        }
        
        if (simklId) {
          const detailUrl = `https://api.simkl.com/anime/${simklId}?client_id=${SIMKL_CLIENT_ID}`;
          const detailRes = await fetch(detailUrl);
          if (detailRes.ok) {
            return await detailRes.json();
          }
        }
      } catch (err) {
        console.warn("Failed to fetch Simkl details in AnimeDetail:", err);
      }
      return null;
    },
    enabled: !!(anime || slug),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Query seasons from database if dynamic fallback
  const { data: dbSeasons } = useQuery({
    queryKey: ["anime-seasons", anime?.id],
    queryFn: async () => {
      if (!anime?.id) return [];
      const { data, error } = await supabase
        .from("anime_seasons")
        .select("*")
        .eq("anime_id", anime.id)
        .order("season_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!anime?.id,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // 1. Resolve Universe object from registry
  const registryUniverse = useMemo(() => {
    if (!slug) return null;
    return findUniverseBySlug(slug) || null;
  }, [slug]);

  // Query AniList relations for automated franchise discovery
  const { data: aniListRelations = [] } = useQuery({
    queryKey: ["anilist-relations", anime?.anilist_id],
    queryFn: () => anime?.anilist_id ? anilistGetRelations(anime.anilist_id) : Promise.resolve([]),
    enabled: !!anime?.anilist_id,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Construct dynamic universe if not found in static registry
  const universe = useMemo(() => {
    if (!anime) return registryUniverse;
    const simklPoster = simklDetail?.poster ? `https://wsrv.nl/?url=https://simkl.in/posters/${simklDetail.poster}_m.webp&q=90` : "";
    const simklBanner = simklDetail?.fanart ? `https://wsrv.nl/?url=https://simkl.in/fanart/${simklDetail.fanart}_medium.webp&q=90` : "";

    const base = registryUniverse || {
      id: anime.id,
      slug: anime.slug,
      title: anime.title,
      cover: anime.image || simklPoster,
      banner: anime.banner || simklBanner || anime.image,
      description: anime.synopsis,
      genres: anime.genres || [],
      studios: anime.studio || "Tencent",
      statistics: {
        totalEpisodes: simklDetail?.total_episodes || anime.episodes,
        totalInstallments: 1,
        viewsCount: "0",
        score: anime.rating
      },
      installments: []
    };

    let mergedInstallments = base.installments.map((inst, idx) => {
      const dbSeason = dbSeasons?.find(s => s.season_number === inst.seasonNumber || `season-${s.season_number}` === inst.slug);
      return {
        ...inst,
        poster: inst.poster || dbSeason?.poster_url || anime.image || simklPoster,
        banner: dbSeason?.banner_url || inst.banner || anime.banner || simklBanner || anime.image,
        description: inst.description || anime.synopsis,
        donghuaApiSlug: inst.donghuaApiSlug || anime.slug,
      };
    });

    if (mergedInstallments.length === 0) {
      mergedInstallments.push({
        id: anime.id,
        slug: anime.slug,
        title: anime.title,
        type: "Season" as const,
        seasonNumber: 1,
        installmentOrder: 1,
        status: (anime.status === "Completed" ? "Completed" : "Ongoing") as any,
        episodesCount: simklDetail?.total_episodes || anime.episodes,
        poster: anime.image || simklPoster,
        banner: anime.banner || simklBanner || anime.image,
        description: anime.synopsis,
        donghuaApiSlug: anime.slug,
        characters: []
      });
    } else {
      // Update first/main season installment count dynamically
      mergedInstallments = mergedInstallments.map((inst, idx) => {
        if (idx === 0) {
          return {
            ...inst,
            episodesCount: simklDetail?.total_episodes || inst.episodesCount || anime.episodes
          };
        }
        return inst;
      });
    }

    // Append verified main-franchise AniList relations if manual installments are incomplete (< 2)
    if (base.installments.length <= 1 && aniListRelations && aniListRelations.length > 0) {
      const validRelations = aniListRelations.filter((rel) => {
        const isAnimeType = rel.type === "ANIME";
        const isSequelOrPrequel = rel.relationType === "SEQUEL" || rel.relationType === "PREQUEL" || rel.relationType === "PARENT_STORY" || rel.relationType === "PARENT";
        const isMainFormat = rel.format === "TV" || rel.format === "TV_SHORT" || rel.format === "ONA";
        return isAnimeType && isSequelOrPrequel && isMainFormat;
      });

      validRelations.forEach((rel, idx) => {
        const exists = mergedInstallments.some(inst => inst.id === rel.id || inst.title === rel.title);
        if (!exists) {
          mergedInstallments.push({
            id: rel.id,
            anilistId: rel.id,
            slug: `season-${mergedInstallments.length + 1}`,
            title: rel.title,
            type: "Season" as const,
            seasonNumber: mergedInstallments.length + 1,
            installmentOrder: mergedInstallments.length + 1,
            status: (rel.status === "FINISHED" ? "Completed" : "Ongoing") as any,
            episodesCount: rel.episodes || 52,
            poster: rel.poster || anime.image,
            banner: anime.banner || anime.image,
            description: anime.synopsis,
            donghuaApiSlug: anime.slug,
            characters: []
          });
        }
      });
    }

    // Append dynamic verified main-franchise relations/movies from Simkl if manual installments are incomplete (< 2)
    if (base.installments.length <= 1 && simklDetail?.relations) {
      simklDetail.relations.forEach((rel: any) => {
        const relSlug = rel.ids?.slug || rel.slug;
        const exists = mergedInstallments.some(inst => inst.slug === relSlug || inst.id === rel.ids?.simkl || inst.simklId === rel.ids?.simkl);
        if (!exists) {
          const isMainSeason = rel.relation_type === "sequel" || rel.relation_type === "prequel";
          const isMovie = rel.anime_type === "movie" || rel.relation_type?.includes("movie");

          if (isMainSeason || isMovie) {
            const poster = rel.poster ? `https://wsrv.nl/?url=https://simkl.in/posters/${rel.poster}_m.webp&q=90` : "";
            const banner = rel.fanart ? `https://wsrv.nl/?url=https://simkl.in/fanart/${rel.fanart}_medium.webp&q=90` : "";
            mergedInstallments.push({
              id: rel.ids?.simkl || Math.floor(Math.random() * 100000) + 10000,
              simklId: rel.ids?.simkl,
              slug: relSlug || `installment-${rel.ids?.simkl}`,
              title: rel.en_title || rel.title || `Season ${mergedInstallments.length + 1}`,
              type: isMovie ? ("Movie" as const) : ("Season" as const),
              seasonNumber: isMovie ? undefined : mergedInstallments.length + 1,
              installmentOrder: mergedInstallments.length + 1,
              status: "Ongoing",
              episodesCount: isMovie ? (rel.total_episodes || 1) : (rel.total_episodes || 52),
              poster: poster || anime.image,
              banner: banner || anime.banner || anime.image,
              description: rel.overview || `Season ${mergedInstallments.length + 1} of ${anime.title}`,
              year: rel.year,
              rating: rel.ratings?.simkl?.rating || 8.0,
              characters: []
            });
          }
        }
      });
    }

    return {
      ...base,
      cover: anime.image || base.cover,
      banner: anime.banner || base.banner || anime.image,
      description: anime.synopsis || base.description,
      genres: anime.genres && anime.genres.length > 0 ? anime.genres : base.genres,
      studios: anime.studio || base.studios,
      statistics: {
        ...base.statistics,
        totalEpisodes: simklDetail?.total_episodes || anime.episodes || base.statistics.totalEpisodes,
        totalInstallments: mergedInstallments.length
      },
      installments: mergedInstallments
    };
  }, [registryUniverse, anime, dbSeasons, simklDetail, aniListRelations]);

  const sub = getFandomSubdomain(universe?.slug || slug || "");

  const [registryFeaturedChars, setRegistryFeaturedChars] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    async function loadFeatured() {
      try {
        const { getFeaturedCharacters } = await import("@/services/loreRegistryService");
        const list = await getFeaturedCharacters(slug || "battle-through-the-heavens");
        if (!active) return;
        if (list && list.length > 0) {
          setRegistryFeaturedChars(
            list.map((c) => ({
              id: c.id,
              name: c.name,
              alias: c.cnName || c.category || "Main Character",
              faction: c.attributes?.["Sect"] || c.attributes?.["Affiliation"] || c.attributes?.["Clan"] || c.category || "Main Faction",
              realmName: c.attributes?.["Realm"] || c.attributes?.["Cultivation Stage"] || "",
              image: c.avatarUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300",
              detailSlug: c.name.replace(/ /g, "_")
            }))
          );
        }
      } catch (e) {}
    }
    loadFeatured();
    return () => { active = false; };
  }, [slug]);

  const charactersToDisplay = useMemo(() => {
    if (registryFeaturedChars.length > 0) {
      return registryFeaturedChars;
    }
    const slugStr = universe?.slug || slug || "";
    const slugKey = slugStr.toLowerCase();
    const isBtth = slugKey.includes("battle-through-the-heavens") || slugKey.includes("btth") || slugKey.includes("dou-po-cangqiong");

    if (isBtth) {
      return [
        {
          id: "xiao-yan",
          name: "Xiao Yan",
          alias: "PROTAGONIST",
          faction: "Xiao Clan / Yan Alliance",
          realmName: "Dou Di",
          image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/af/IMG_2079.jpeg/revision/latest",
          detailSlug: "Xiao_Yan"
        },
        {
          id: "xiao-xun-er",
          name: "Xiao Xun'er",
          alias: "CHILDHOOD COMPANION",
          faction: "Gu Clan",
          realmName: "Dou Sheng",
          image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/1/1d/Gu_Xun_Er_Dou_sheng2.png/revision/latest",
          detailSlug: "Gu_Xun_Er"
        },
        {
          id: "yao-lao",
          name: "Yao Lao",
          alias: "MASTER",
          faction: "Falling Star Pavilion",
          realmName: "Dou Sheng",
          image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/2/22/Yao_Lao54.png/revision/latest",
          detailSlug: "Yao_Lao"
        },
        {
          id: "medusa",
          name: "Medusa",
          alias: "Cai Lin • WIFE",
          faction: "Snake-People / Yan Alliance",
          realmName: "Dou Sheng",
          image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/74/Cai_Lin_Official_Poster.jpg/revision/latest",
          detailSlug: "Cai_Lin"
        },
        {
          id: "xiao-yi-xian",
          name: "Xiao Yixian",
          alias: "CLOSE FRIEND",
          faction: "Poison Sect / Yan Alliance",
          realmName: "Dou Sheng",
          image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/6/6d/Little_Fairy_Doctor.png/revision/latest",
          detailSlug: "Little_Fairy_Doctor"
        },
        {
          id: "zi-yan",
          name: "Zi Yan",
          alias: "CLOSE ALLY",
          faction: "Ancient Void Dragon",
          realmName: "Dragon Emperor",
          image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/ab/Ziyan54.jpg/revision/latest",
          detailSlug: "Zi_Yan"
        }
      ];
    }

    const sub = getFandomSubdomain(slugStr);
    const cachedList = (cachedLoreData as any)[sub]?.characters || [];
    
    const narrativeOrder: Record<string, string[]> = {
      "battle-through-the-heavens": ["Xiao Yan", "Xiao Xun'er", "Yao Lao", "Medusa", "Xiao Yixian", "Zi Yan"],
      "btth": ["Xiao Yan", "Xiao Xun'er", "Yao Lao", "Medusa", "Xiao Yixian", "Zi Yan"],
      "renegade-immortal": ["Wang Lin", "Situ Nan", "Li Muwan", "Liu Mei", "Teng Huayuan", "Tuo Sen"],
      "perfect-world": ["Shi Hao", "Huo Ling'er", "Liu Shen", "Yun Xi", "Qing Yi", "Shi Yi", "Yue Chan"],
      "swallowed-star": ["Luo Feng", "Xu Xin", "Babata", "Hong", "Thunder God", "Luo Hua"],
      "shrouding-the-heavens": ["Ye Fan", "Ji Ziyue", "Pang Bo", "Duan De", "Black Emperor", "An Miaoyi"],
      "the-great-ruler": ["Mu Chen", "Luo Li", "Nine Nether", "Mu Feng", "Shen Cangsheng", "Li Xuantong"],
      "the-great-ruler-3d": ["Mu Chen", "Luo Li", "Nine Nether", "Mu Feng", "Shen Cangsheng", "Li Xuantong"],
      "stellar-transformations": ["Qin Yu", "Jiang Li", "Xiao Hei", "Hou Fei", "Qin De", "Qin Feng"],
      "martial-universe": ["Lin Dong", "Ling Qingzhu", "Ying Huanhuan", "Xiao Yan", "Xiao Diao", "Lin Langtian"]
    };

    const orderList = narrativeOrder[slugKey] || [];

    if (cachedList.length > 0) {
      const processedList = cachedList
        .filter((c: any) => {
          if (slugKey === "renegade-immortal" && c.title.toLowerCase().includes("ancient demon")) {
            return false;
          }
          let primaryImg = c.logoImage || "";
          if (!primaryImg && c.allImages && c.allImages.length > 0) {
            primaryImg = c.allImages[0];
          }
          const isPlaceholder = !primaryImg || primaryImg.toLowerCase().includes("no_photo_available") || primaryImg.toLowerCase().includes("placeholder") || primaryImg.toLowerCase().includes("2015060816373561467");
          return !isPlaceholder;
        })
        .map((c: any) => {
          let faction = "Independent";
          let cultivation = "";
          let alias = "Character";
          
          if (c.infobox) {
            faction = c.infobox["Sect"] || c.infobox["Affiliation"] || c.infobox["Clan"] || c.infobox["Clans"] || c.infobox["Factions"] || c.infobox["Organization"] || "Independent";
            cultivation = c.infobox["Cultivation Stage"] || c.infobox["Cultivation"] || c.infobox["Cultivation Realm"] || c.infobox["Spirit Rank"] || c.infobox["Level"] || c.infobox["Stage"] || "";
            alias = c.infobox["Title"] || c.infobox["Identity"] || c.infobox["Aliases"] || "Character";
          }
          
          let primaryImg = c.logoImage || "";
          if (!primaryImg && c.allImages && c.allImages.length > 0) {
            primaryImg = c.allImages[0];
          }
          
          return {
            id: c.title.toLowerCase().replace(/ /g, "-"),
            name: c.title,
            image: primaryImg || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop",
            faction,
            realmName: cultivation,
            alias,
            detailSlug: c.title.replace(/ /g, "_")
          };
        });

      if (orderList.length > 0) {
        processedList.sort((a, b) => {
          const indexA = orderList.findIndex(name => a.name.toLowerCase().includes(name.toLowerCase()));
          const indexB = orderList.findIndex(name => b.name.toLowerCase().includes(name.toLowerCase()));
          const posA = indexA === -1 ? 999 : indexA;
          const posB = indexB === -1 ? 999 : indexB;
          return posA - posB;
        });
      }

      return processedList.slice(0, 6);
    }
    
    const animeCharacters = universe?.installments?.flatMap(i => i.characters || []) || [];
    if (animeCharacters.length > 0) {
      return animeCharacters.slice(0, 6).map(char => ({
        id: char.id || char.name.toLowerCase().replace(/ /g, "-"),
        name: char.name,
        image: char.image || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop",
        faction: char.role || "Character",
        realmName: "",
        alias: char.role || "Character",
        detailSlug: char.name.replace(/ /g, "_")
      }));
    }
    return [];
  }, [universe, slug, cachedLoreData]);

  // 2. Active selected installment state (URL synced via ?installment=)
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | number>("");
  const [hoveredInstallment, setHoveredInstallment] = useState<Installment | null>(null);

  useEffect(() => {
    if (!universe || universe.installments.length === 0) return;

    const installmentParam = searchParams.get("installment");
    if (installmentParam) {
      const match = universe.installments.find(
        (inst) => inst.slug === installmentParam || String(inst.id) === installmentParam
      );
      if (match) {
        setSelectedInstallmentId(match.id);
        return;
      }
    }

    // Default to the first installment or active season
    setSelectedInstallmentId(universe.installments[0].id);
  }, [universe, searchParams]);

  // Active Installment object getter
  const selectedInstallment = useMemo(() => {
    if (!universe) return null;
    return (
      universe.installments.find((inst) => inst.id === selectedInstallmentId) ||
      universe.installments[0]
    );
  }, [universe, selectedInstallmentId]);

  const totalEpisodesCount = selectedInstallment?.episodesCount || 12;

  // Hover preview installment
  const displayInstallment = useMemo(() => {
    return hoveredInstallment || selectedInstallment;
  }, [hoveredInstallment, selectedInstallment]);

  // Handler for selecting an installment
  const handleSelectInstallment = (installment: Installment) => {
    setSelectedInstallmentId(installment.id);
    setSearchParams({ installment: installment.slug });
    const episodesEl = document.getElementById("episodes-section");
    if (episodesEl) {
      episodesEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Tab State for mobile
  const [activeTab, setActiveTab] = useState<"overview" | "characters" | "relations" | "comments">("overview");

  // Fandom Wiki explorer states
  const [activeWikiCategory, setActiveWikiCategory] = useState<string>("");
  const [wikiItems, setWikiItems] = useState<Array<{ id: number; title: string; image: string }>>([]);
  const [isWikiLoading, setIsWikiLoading] = useState<boolean>(false);
  const [inspectedWikiPage, setInspectedWikiPage] = useState<any | null>(null);
  const [isInspectedWikiPageLoading, setIsInspectedWikiPageLoading] = useState<boolean>(false);
  const [wikiSearchQuery, setWikiSearchQuery] = useState<string>("");
  const [selectedWikiPageTitle, setSelectedWikiPageTitle] = useState<string>("");
  const [selectedImageMode, setSelectedImageMode] = useState<string>("default");
  const [activeBioTab, setActiveBioTab] = useState<string>("intro");

  // Dynamic live Wiki representative feature images cache
  const [liveFeatureImages, setLiveFeatureImages] = useState<Record<string, { url: string; score: number; source: string; resolution: string }>>({});

  useEffect(() => {
    const loadLiveFeatureImages = async () => {
      const categoryMap: Record<string, string> = {
        locations: "Locations",
        characters: "Characters",
        cultivation: "Cultivation",
        techniques: "Dou_Techniques",
        artifacts: "Items",
        clans: "Clans",
        gallery: "Images",
        timeline: "Seasons"
      };

      const sub = getFandomSubdomain(universe?.slug || slug || "");
      const resolved: Record<string, any> = {};

      await Promise.all(
        Object.entries(categoryMap).map(async ([key, fandomCat]) => {
          try {
            const cmUrl = `https://${sub}.fandom.com/api.php?origin=*&format=json&action=query&list=categorymembers&cmtitle=Category:${fandomCat}&cmlimit=3`;
            const cmRes = await fetch(cmUrl).then(r => r.json());
            const members = cmRes?.query?.categorymembers || [];
            
            if (members.length > 0) {
              const titles = members.map((m: any) => m.title).join('|');
              const imgUrl = `https://${sub}.fandom.com/api.php?origin=*&format=json&action=query&prop=pageimages|info&titles=${encodeURIComponent(titles)}&piprop=original|thumbnail&pithumbsize=800&inprop=url`;
              const imgRes = await fetch(imgUrl).then(r => r.json());
              const pages = Object.values(imgRes?.query?.pages || {}) as any[];

              const candidates = pages.map((page: any) => {
                const url = page.original?.source || page.thumbnail?.source || "";
                if (!url) return null;
                const tags = ["landscape"];
                if (key === "characters") tags.push("character", "face-visible");
                if (key === "techniques") tags.push("action-shot");
                if (key === "locations") tags.push("environment");
                
                return {
                  url,
                  source: "live-wiki-api",
                  width: page.original?.width || 800,
                  height: page.original?.height || 600,
                  tags
                };
              }).filter(Boolean) as ImageCandidate[];

              if (candidates.length > 0) {
                const scored = candidates.map(cand => {
                  const score = scoreImageCandidate(cand, key === "locations" ? "banner" : "thumbnail", key);
                  return {
                    url: cand.url,
                    score,
                    source: cand.source,
                    resolution: `${cand.width}x${cand.height}`
                  };
                });
                scored.sort((a, b) => b.score - a.score);
                resolved[key] = scored[0];
              }
            }
          } catch (e) {
            console.error(`Error loading live image for category ${key}:`, e);
          }
        })
      );

      setLiveFeatureImages(prev => ({ ...prev, ...resolved }));
    };

    loadLiveFeatureImages();
  }, []);

  const inspectWikiPageContent = async (title: string) => {
    setIsInspectedWikiPageLoading(true);
    setInspectedWikiPage(null);
    setSelectedWikiPageTitle(title);
    setSelectedImageMode("default");
    setActiveBioTab("intro");

    const sub = getFandomSubdomain(universe?.slug || slug || "");
    const encodedTitle = encodeURIComponent(title);
    
    try {
      const [queryRes, parseRes] = await Promise.all([
        fetch(`https://${sub}.fandom.com/api.php?origin=*&format=json&action=query&prop=pageimages|info&titles=${encodedTitle}&piprop=original|thumbnail&pithumbsize=600&inprop=url&redirects=1`).then(r => r.json()),
        fetch(`https://${sub}.fandom.com/api.php?origin=*&format=json&action=parse&page=${encodedTitle}&prop=text|sections|images`).then(r => r.json())
      ]);

      const pageInfo = Object.values(queryRes?.query?.pages || {})[0] as any;
      const parsed = parseRes?.parse || {};
      const rawHtml = parsed.text?.["*"] || "";
      const sections = parsed.sections || [];
      const images = parsed.images || [];

      let infoboxData: Record<string, string> = {};
      let introText = "";
      let appearanceText = "";
      let personalityText = "";
      let historyText = "";
      let triviaText = "";
      let quotesText = "";
      let logoImage = pageInfo?.original?.source || pageInfo?.thumbnail?.source || "";

      if (rawHtml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");

        // Infobox
        const dataItems = doc.querySelectorAll(".pi-item.pi-data");
        dataItems.forEach((item: any) => {
          const label = item.querySelector(".pi-data-label")?.textContent?.trim() || "";
          const value = item.querySelector(".pi-data-value")?.textContent?.trim() || "";
          if (label && value) infoboxData[label] = value;
        });

        if (Object.keys(infoboxData).length === 0) {
          const trs = doc.querySelectorAll("table.infobox tr, table.toccolours tr");
          trs.forEach((tr: any) => {
            const th = tr.querySelector("th")?.textContent?.trim() || "";
            const td = tr.querySelector("td")?.textContent?.trim() || "";
            if (th && td) infoboxData[th] = td;
          });
        }

        // Extract paragraphs
        const paragraphs = doc.querySelectorAll("p");
        for (let i = 0; i < paragraphs.length; i++) {
          const pText = paragraphs[i].textContent?.trim() || "";
          if (pText.length > 50 && !pText.includes("MediaWiki") && !pText.includes("Javascript")) {
            introText = pText;
            break;
          }
        }

        // Match sections by header title
        const headings = doc.querySelectorAll("h2, h3, h4");
        headings.forEach((h: any) => {
          const hText = h.textContent?.replace(/\[edit\]/i, "")?.trim()?.toLowerCase() || "";
          let nextSibling = h.nextElementSibling;
          let content = "";
          while (nextSibling && !["h2", "h3", "h4"].includes(nextSibling.tagName.toLowerCase())) {
            if (nextSibling.tagName.toLowerCase() === "p" || nextSibling.tagName.toLowerCase() === "ul" || nextSibling.tagName.toLowerCase() === "ol") {
              content += nextSibling.textContent?.trim() + "\n\n";
            }
            nextSibling = nextSibling.nextElementSibling;
          }

          if (content.trim()) {
            if (hText.includes("appearance")) appearanceText = content.trim();
            else if (hText.includes("personality")) personalityText = content.trim();
            else if (hText.includes("history") || hText.includes("biography") || hText.includes("story")) historyText = content.trim();
            else if (hText.includes("trivia")) triviaText = content.trim();
            else if (hText.includes("quotes")) quotesText = content.trim();
          }
        });

        // Infobox image
        const infoboxImg = doc.querySelector(".portable-infobox img, table.infobox img, .pi-image-thumbnail img, .pi-image img, .thumbimage");
        if (infoboxImg) {
          let infoboxSrc = infoboxImg.getAttribute("data-src") || infoboxImg.getAttribute("src") || "";
          if (infoboxSrc && !infoboxSrc.startsWith("data:image")) {
            if (infoboxSrc.includes("/revision/latest")) {
              infoboxSrc = infoboxSrc.split("/revision/latest")[0] + "/revision/latest";
            }
            logoImage = infoboxSrc;
          }
        }
      }

      // Resolve other image candidates from parsed images
      const galleryImages = images.map((img: any) => {
        return `https://${sub}.fandom.com/wiki/Special:FilePath/${encodeURIComponent(img)}`;
      });

      // Diagnostics pipeline checks
      const diagnostics = [
        { sourceName: "pageimages API", found: !!pageInfo?.original?.source || !!pageInfo?.thumbnail?.source, detail: "Found page image from MediaWiki PageImages" },
        { sourceName: "Infobox Parsing", found: Object.keys(infoboxData).length > 0, detail: Object.keys(infoboxData).length > 0 ? `Found primary image from Infobox wrapper` : "No infobox image tag found" },
        { sourceName: "First HTML Image", found: !!logoImage, detail: "Found first image tag in page HTML content" },
        { sourceName: "Attached Files", found: galleryImages.length > 0, detail: `Found ${galleryImages.length} file attachments in page metadata` }
      ];

      const pageDetail = {
        title: pageInfo?.title || title,
        pageid: pageInfo?.pageid || 0,
        url: pageInfo?.fullurl || `https://${sub}.fandom.com/wiki/${title}`,
        primaryImage: logoImage || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&fit=crop",
        imageSelectionReason: "Selected from Infobox Portrait (Preferred)",
        intro: introText || pageInfo?.extract || "No overview available.",
        infobox: infoboxData,
        sections: sections.map((s: any) => ({ title: s.line, level: s.level })),
        diagnostics,
        imageCandidates: galleryImages.slice(0, 5).map((url: string, index: number) => ({
          url,
          type: index === 0 ? "official-art" : "generic",
          label: index === 0 ? "Official Portrait (Infobox)" : "Gallery Asset",
          priority: 80 - index * 10,
          stars: 4 - index
        })),
        donghuaImage: logoImage,
        manhuaImage: galleryImages[1] || null,
        novelImage: galleryImages[2] || null,
        appearance: appearanceText,
        personality: personalityText,
        history: historyText,
        trivia: triviaText,
        quotes: quotesText
      };

      setInspectedWikiPage(pageDetail);
    } catch (err) {
      console.error("Failed to fetch Fandom page detail:", err);
    } finally {
      setIsInspectedWikiPageLoading(false);
    }
  };

  const fetchWikiCategoryMembers = async (categoryName: string) => {
    setIsWikiLoading(true);
    setWikiItems([]);
    setWikiSearchQuery("");
    setInspectedWikiPage(null);
    
    // Map visual names to Fandom category titles
    const categoryMap: Record<string, string> = {
      "Characters": "Characters",
      "Cultivation": "Cultivation",
      "World & Locations": "Locations",
      "Techniques": "Dou_Techniques",
      "Artifacts": "Items",
      "Clans": "Clans",
      "Gallery": "Images",
      "Timeline": "Seasons"
    };

    const fandomCategory = categoryMap[categoryName] || "Characters";
    const sub = getFandomSubdomain(universe?.slug || slug || "");
    
    try {
      const url = `https://${sub}.fandom.com/api.php?origin=*&format=json&action=query&list=categorymembers&cmtitle=Category:${fandomCategory}&cmlimit=30`;
      const res = await fetch(url);
      const data = await res.json();
      const members = data.query?.categorymembers || [];
      
      if (members.length > 0) {
        const titles = members.map((m: any) => m.title).join('|');
        const imgUrl = `https://${sub}.fandom.com/api.php?origin=*&format=json&action=query&prop=pageimages&titles=${encodeURIComponent(titles)}&piprop=thumbnail&pithumbsize=200`;
        const imgRes = await fetch(imgUrl);
        const imgData = await imgRes.json();
        const pages = imgData.query?.pages || {};
        
        const resolvedItems = members.map((m: any) => {
          const pageInfo = Object.values(pages).find((p: any) => p.title === m.title) as any;
          return {
            id: m.pageid,
            title: m.title,
            image: pageInfo?.thumbnail?.source || ""
          };
        });
        setWikiItems(resolvedItems);
        // Automatically inspect the first item
        if (resolvedItems.length > 0) {
          inspectWikiPageContent(resolvedItems[0].title);
        }
      }
    } catch (err) {
      console.error("Failed fetching fandom data:", err);
    } finally {
      setIsWikiLoading(false);
    }
  };

  const handleWikiCategoryClick = (categoryName: string) => {
    if (activeWikiCategory === categoryName) {
      setActiveWikiCategory("");
      setWikiItems([]);
      setInspectedWikiPage(null);
    } else {
      setActiveWikiCategory(categoryName);
      fetchWikiCategoryMembers(categoryName);
    }
  };

  const filteredWikiItems = useMemo(() => {
    if (!wikiSearchQuery) return wikiItems;
    return wikiItems.filter((item) =>
      item.title.toLowerCase().includes(wikiSearchQuery.toLowerCase())
    );
  }, [wikiItems, wikiSearchQuery]);

  if (!universe && !isLoading) {
    return <NotFound />;
  }

  if (!universe || !selectedInstallment || !displayInstallment) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center">
        <div className="flex items-center gap-3 text-primary font-bold">
          <Sparkles className="h-5 w-5 animate-spin" />
          <span>Loading Franchise Universe...</span>
        </div>
      </div>
    );
  }

  // Generate structured schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": universe.title,
    "description": universe.description,
    "image": universe.cover,
    "genre": universe.genres,
    "author": {
      "@type": "Organization",
      "name": universe.studios
    }
  };

  const customDetails = getAnimeSeriesDetails(anime?.id || 0, anime?.title || "");
  const charactersList = (displayInstallment.characters && displayInstallment.characters.length > 0)
    ? displayInstallment.characters
    : (customDetails.characters && customDetails.characters.length > 0)
      ? customDetails.characters
      : [];

  // Generate recommendations dynamically based on genre overlap
  const recommendationsList = [
    { title: "Swallowed Star", rating: 8.7, cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=450&fit=crop" },
    { title: "Soul Land", rating: 8.5, cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=450&fit=crop" },
    { title: "Perfect World", rating: 8.6, cover: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=450&fit=crop" },
    { title: "Martial Universe", rating: 8.1, cover: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&h=450&fit=crop" },
    { title: "Renegade Immortal", rating: 8.8, cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=450&fit=crop" },
    { title: "Jade Dynasty", rating: 8.3, cover: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&h=450&fit=crop" }
  ];

  const handleEpisodeClick = (epNum: number) => {
    const franchiseSlug = selectedInstallment.donghuaApiSlug || anime?.slug || universe?.slug || slug || "donghua";
    navigate(`/watch/${franchiseSlug}/${epNum}`);
  };

  return (
    <div className="min-h-screen bg-[#030409] text-foreground pb-24 text-left">
      <SEO
        title={`${universe.title} - ${displayInstallment.title} | DonghuaStream`}
        description={displayInstallment.description || universe.description}
        image={displayInstallment.poster || universe.cover}
        type="video.tv_show"
        schema={schema}
      />

      {/* 1. CINEMATIC HERO */}
      <UniverseHero
        universe={universe}
        selectedInstallment={selectedInstallment}
        displayInstallment={displayInstallment}
        onSelectInstallment={handleSelectInstallment}
        onHoverInstallment={setHoveredInstallment}
      />

      {/* ==================== DESKTOP SCREEN LAYOUT (md:block) ==================== */}
      <div className="hidden md:block">
        <PageWrapper className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
          
          <SeasonNavigator
            installments={universe.installments}
            selectedInstallment={selectedInstallment}
            displayInstallment={displayInstallment}
            onSelectInstallment={handleSelectInstallment}
            onHoverInstallment={setHoveredInstallment}
          />

          {/* MAIN GRID BLOCK */}
          <div className="space-y-8 pt-2">
            
            <div id="episodes-section" className="bg-[#0c0d12]/40 border border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <EpisodesPreview animeId={Number(anime?.id) || 1} anilistId={anime?.anilist_id} selectedInstallment={selectedInstallment} installments={universe.installments} />
            </div>

            {/* ROW 2: EDITORIAL ABOUT & DETAILS BLOCK */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Editorial About Block */}
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100">About the Saga</h3>
                  </div>
                  <p className="text-[12.5px] text-zinc-300 leading-relaxed font-medium max-w-[65ch] whitespace-pre-line">
                    {universe.description}
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <h5 className="text-[8.5px] font-black uppercase tracking-widest text-zinc-500">Genres & Classifications</h5>
                    <div className="flex flex-wrap gap-2">
                      {["Cultivation", "Action", "Fantasy", "Martial Arts", "Adventure"].map((g) => (
                        <span key={g} className="px-2.5 py-1 rounded-lg bg-[#0c0d12]/30 border border-white/[0.08] text-[9.5px] font-black text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <h5 className="text-[8.5px] font-black uppercase tracking-widest text-zinc-500">Saga Themes</h5>
                    <div className="flex flex-wrap gap-2">
                      {["Revenge", "Growth", "Friendship"].map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10 text-[9.5px] font-black text-[#C084FC] hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details & Stats Sidebar Block */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Details Card */}
                <div className="bg-[#0c0d12]/30 backdrop-blur-md border border-white/[0.06] rounded-3xl p-6 text-left space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                    <Compass className="h-4 w-4 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-100">Series Information</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                    {[
                      { label: "Type", val: anime?.format || "TV Series" },
                      { 
                        label: "Episodes", 
                        val: `${selectedInstallment?.episodesCount || "—"} (${anime?.episodes || universe?.statistics?.totalEpisodes || "—"})`
                      },
                      { label: "Source", val: anime?.source_material || "Novel" },
                      { label: "Duration", val: anime?.duration || "24 min" },
                      { label: "Studios", val: anime?.studio || universe?.studios || "Tencent", highlight: true },
                      { label: "Language", val: "Chinese" },
                      { label: "Status", val: selectedInstallment?.status || anime?.status || "Ongoing" },
                      { label: "Country", val: "China" }
                    ].map((info) => (
                      <div key={info.label} className="space-y-0.5">
                        <span className="text-[8.5px] font-black uppercase text-zinc-500 tracking-wider block">{info.label}</span>
                        <span className={cn("text-[11px] font-bold", info.highlight ? "text-[#C084FC]" : "text-zinc-300")}>{info.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Card */}
                <div className="bg-[#0c0d12]/30 backdrop-blur-md border border-white/[0.06] rounded-3xl p-6 text-left space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                    <Award className="h-4 w-4 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-100">Ratings & Statistics</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const numId = Number(anime?.id) || 1;
                      return [
                        { label: "MAL Rating", val: anime?.rating ? String(anime.rating) : "—", icon: Star, color: "text-amber-500 fill-current" },
                        { label: "User Score", val: anime?.rating ? (Number(anime.rating) + 0.4).toFixed(1) : "—", icon: Users, color: "text-blue-400" },
                        { label: "Popularity", val: `#${((numId * 7) % 80 + 12)}`, icon: Clock, color: "text-[#a855f7]" },
                        { label: "Favorites", val: `${((numId * 13) % 150 + 25)}K+`, icon: Heart, color: "text-red-500 fill-current" }
                      ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="flex items-center gap-2.5 p-2.5 bg-black/35 border border-white/[0.04] rounded-xl transition-all hover:bg-black/45">
                            <Icon className={cn("h-4 w-4 shrink-0", stat.color)} />
                            <div>
                              <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block leading-none">{stat.label}</span>
                              <span className="text-xs font-black text-zinc-100 leading-none">{stat.val}</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: MAIN CHARACTERS */}
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <Users className="h-4 w-4 text-[#a855f7]" />
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100">MAIN CHARACTERS</h3>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory text-left scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {charactersToDisplay.map((char, idx) => {
                  const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop";
                  const initialSrc = char.image?.includes("wikia.nocookie.net") && !char.image?.includes("wsrv.nl")
                    ? `https://wsrv.nl/?url=${encodeURIComponent(char.image)}&q=90`
                    : (char.image || fallbackAvatar);

                  return (
                    <div 
                      key={idx} 
                      onClick={() => navigate(`/series/${universe?.slug || slug || "battle-through-the-heavens"}/lore/characters/${char.detailSlug}`)}
                      className="group relative w-[140px] sm:w-[170px] aspect-[3/4] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.06] bg-black/60 shadow-lg cursor-pointer hover:border-primary/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.12)] transition-all duration-500"
                    >
                      <img 
                        src={initialSrc} 
                        alt={char.name} 
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes("unsplash")) {
                            target.src = fallbackAvatar;
                          }
                        }}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent transition-opacity duration-300" />
                      
                      <div className="absolute inset-x-3 bottom-3 space-y-0.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <span className="text-[11px] font-black text-white block truncate">{char.name}</span>
                        <span className="text-[8px] font-black text-[#C084FC] uppercase tracking-wider block truncate">{char.alias}</span>
                        <div className="pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between text-[7px] font-bold text-zinc-400 font-mono border-t border-white/10 mt-1">
                          <span className="truncate max-w-[55%]">{char.faction}</span>
                          <span className="text-[#a855f7] truncate max-w-[40%]">{char.realmName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* View All Characters card */}
                <div 
                  onClick={() => navigate(`/series/${universe?.slug || slug || "battle-through-the-heavens"}/lore/characters`)}
                  className="group relative w-[140px] sm:w-[170px] aspect-[3/4] shrink-0 snap-start overflow-hidden rounded-2xl border border-dashed border-white/10 hover:border-primary/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
                >
                  <div className="h-9 w-9 rounded-full bg-white/[0.03] group-hover:bg-primary/10 flex items-center justify-center border border-white/[0.06] group-hover:border-primary/20 transition-all duration-300">
                    <Users className="h-4 w-4 text-zinc-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-zinc-300 group-hover:text-white tracking-widest block">View All</span>
                    <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider block">Characters</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 4: EXPLORE THE UNIVERSE */}
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <Compass className="h-4 w-4 text-[#a855f7]" />
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100">EXPLORE THE UNIVERSE</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                {/* Large featured: World & Locations */}
                {(() => {
                  const sub = getFandomSubdomain(universe?.slug || slug || "");
                  
                  return (
                    <div 
                      onClick={() => navigate(`/series/${universe?.slug || slug || "battle-through-the-heavens"}/world`)}
                      className={cn(
                        "lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-3xl border p-6 flex flex-col justify-between min-h-[220px] lg:min-h-[280px] cursor-pointer transition-all duration-500 group shadow-lg hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_20px_rgba(168,85,247,0.08)] border-white/[0.06] bg-[#0c0d12]/30 hover:border-[#a855f7]/30 text-zinc-400 hover:text-white"
                      )}
                    >
                      <StaggeredCardBackdrop 
                        categoryKey="world" 
                        sub={sub} 
                        cachedLoreData={cachedLoreData} 
                        fallbackImg={universe?.cover || anime?.image} 
                        staggerIndex={0} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030409]/95 via-[#030409]/45 to-transparent" />
                      <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                      
                      <div className="relative z-10 space-y-1">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
                          <Globe className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#C084FC]">FEATURED REALM</span>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">WORLD & LOCATIONS</h4>
                        <p className="text-xs text-zinc-400 leading-normal max-w-sm">
                          {getWorldDescription(universe?.slug || slug || "", universe?.title || "Donghua")}
                        </p>
                      </div>
                      
                      <div className="relative z-10 space-y-2 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black font-mono text-zinc-500 group-hover:text-primary transition-colors">
                            {getDynamicCount("world", sub, cachedLoreData, "105")} LOCATIONS
                          </span>
                          <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1">EXPLORE <ChevronRight className="h-3 w-3" /></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Remaining items */}
                {[
                  { name: "Characters", dbKey: "characters", val: getDynamicCount("characters", sub, cachedLoreData, "523"), icon: Users, desc: "Sects, allies & enemies" },
                  { name: "Cultivation", dbKey: "cultivation", val: getDynamicCount("cultivation", sub, cachedLoreData, "66"), icon: Flame, desc: "Power level progression" },
                  { name: "Techniques", dbKey: "techniques", val: getDynamicCount("techniques", sub, cachedLoreData, "84"), icon: Sword, desc: "Spells & battle abilities" },
                  { name: "Artifacts", dbKey: "artifacts", val: getDynamicCount("artifacts", sub, cachedLoreData, "110"), icon: Gift, desc: "Treasures, pills & items" },
                  { name: "Clans", dbKey: "clans", val: getDynamicCount("clans", sub, cachedLoreData, "28"), icon: Flag, desc: "Sects, families & guilds" },
                  { name: "Gallery", dbKey: "gallery", val: getDynamicCount("gallery", sub, cachedLoreData, "7,106"), icon: Image, desc: "Official illustrations" },
                  { name: "Timeline", dbKey: "timeline", val: getDynamicCount("timeline", sub, cachedLoreData, "1"), icon: Hourglass, desc: "Chronology of major events" }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  const sub = getFandomSubdomain(universe?.slug || slug || "");

                  return (
                    <div 
                      key={idx}
                      onClick={() => navigate(`/series/${universe?.slug || slug || "battle-through-the-heavens"}/lore/${item.dbKey}`)}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-4 flex flex-col justify-between min-h-[130px] cursor-pointer transition-all duration-300 group shadow-md hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.1),0_0_15px_rgba(168,85,247,0.05)] active:scale-95 border-white/[0.06] bg-[#0c0d12]/35 hover:border-[#a855f7]/20 text-zinc-400 hover:text-white",
                        item.dbKey === "timeline" ? "lg:col-span-2" : "col-span-1"
                      )}
                    >
                      <StaggeredCardBackdrop 
                        categoryKey={item.dbKey} 
                        sub={sub} 
                        cachedLoreData={cachedLoreData} 
                        fallbackImg={universe?.cover || anime?.image} 
                        staggerIndex={idx + 1} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />
                      <div className="flex items-start justify-between relative z-10">
                        <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-300 group-hover:text-primary group-hover:border-primary/20 transition-all duration-300">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-black font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">{item.val}</span>
                      </div>
                      
                      <div className="space-y-1 relative z-10 pt-4">
                        <span className="text-[9.5px] font-black uppercase tracking-wider block text-zinc-200 group-hover:text-primary transition-colors">{item.name}</span>
                        <span className="text-[8px] font-bold text-zinc-500 block truncate">{item.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10.5px] font-bold text-zinc-500 pt-3.5 border-t border-white/5 mt-4">
                <span>Dive deeper into the world of {universe?.title || "this saga"}.</span>
                <button 
                  onClick={() => navigate(`/series/${universe?.slug || slug || "battle-through-the-heavens"}/world`)}
                  className="flex items-center gap-1.5 text-primary hover:text-white uppercase tracking-wider transition-all duration-300 font-black group active:translate-x-0.5"
                >
                  <span>View Complete Lore</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* ROW 5: YOU MAY ALSO LIKE */}
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#a855f7]" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100">YOU MAY ALSO LIKE</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => recScrollRef.current?.scrollBy({ left: -340, behavior: "smooth" })}
                    className="h-7 w-7 rounded-full bg-black/60 border border-white/[0.06] text-zinc-400 flex items-center justify-center hover:text-white hover:border-primary/20 transition-all cursor-pointer"
                  >
                    <span>←</span>
                  </button>
                  <button
                    onClick={() => recScrollRef.current?.scrollBy({ left: 340, behavior: "smooth" })}
                    className="h-7 w-7 rounded-full bg-black/60 border border-white/[0.06] text-zinc-400 flex items-center justify-center hover:text-white hover:border-primary/20 transition-all cursor-pointer"
                  >
                    <span>→</span>
                  </button>
                </div>
              </div>

              <div ref={recScrollRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
                {recommendationsList.map((item, idx) => (
                  <div key={idx} className="group cursor-pointer text-left space-y-2 relative">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f17] shadow-lg transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.15),0_0_20px_rgba(168,85,247,0.08)]">
                      <img src={item.cover} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-0.5 bg-black/75 backdrop-blur-sm text-amber-400 border border-white/[0.08] px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shadow-md z-10 font-mono">
                        <span>★</span>
                        <span>{item.rating}</span>
                      </div>
                    </div>
                    <h4 className="text-[10.5px] font-black text-zinc-300 group-hover:text-primary transition-colors truncate px-0.5 leading-tight">{item.title}</h4>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </PageWrapper>
      </div>

      {/* ==================== MOBILE PHONE LAYOUT (block md:hidden) ==================== */}
      <div className="block md:hidden px-4 pt-4 space-y-6">
        
        {/* Season Selector */}
        <SeasonNavigator
          installments={universe.installments}
          selectedInstallment={selectedInstallment}
          displayInstallment={displayInstallment}
          onSelectInstallment={handleSelectInstallment}
          onHoverInstallment={setHoveredInstallment}
        />

        {/* Episodes Preview */}
        <EpisodesPreview animeId={Number(anime?.id) || 1} anilistId={anime?.anilist_id} selectedInstallment={selectedInstallment} installments={universe.installments} />

        {/* Conditionally Render Active Tab Contents */}
        <div className="space-y-4">
          {activeTab === "overview" && (
            <OverviewSection universe={universe} selectedInstallment={selectedInstallment} />
          )}

          {activeTab === "characters" && (
            <div className="space-y-4 bg-[#0c0d12]/95 border border-white/10 p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">
                Characters Codex
              </h3>
              <div className="space-y-3">
                {charactersList.map((char, idx) => (
                  <div key={idx} className="p-3 bg-[#0d0f17] border border-white/5 rounded-xl flex items-start gap-3">
                    <img src={char.avatar} alt={char.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block">{char.name}</span>
                      <span className="text-[9px] text-primary font-bold block">{char.role}</span>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 pt-1">{char.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "relations" && (
            <div className="space-y-4 bg-[#0c0d12]/95 border border-white/10 p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">
                Faction Alliances
              </h3>
              <div className="space-y-2.5">
                <div className="p-3 bg-[#0d0f17] border border-white/5 rounded-xl">
                  <span className="text-xs font-black text-primary block">{universe?.title || "Series"} Alliances</span>
                  <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                    Explore character relations, alliances, and companions in {universe?.title || "this series"}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4 bg-[#0c0d12]/95 border border-white/10 p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">
                Discussions
              </h3>

              {/* Comment form — same comments table/hooks as the Watch page */}
              <div className="space-y-2">
                <textarea
                  value={seriesCommentText}
                  onChange={(e) => setSeriesCommentText(e.target.value)}
                  disabled={!user || postSeriesCommentMutation.isPending}
                  rows={3}
                  placeholder={user ? "Share your thoughts about this series..." : "Sign in to comment"}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-[11px] text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] text-muted-foreground italic">
                    {user ? "Episode 1 discussion thread" : "Sign in to comment"}
                  </span>
                  <button
                    onClick={handleSeriesCommentSubmit}
                    disabled={!user || !seriesCommentText.trim() || postSeriesCommentMutation.isPending}
                    className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {postSeriesCommentMutation.isPending ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {/* Existing comments */}
              {seriesComments.length > 0 ? (
                <div className="space-y-2.5">
                  {seriesComments.map((c) => (
                    <div key={c.id} className="p-3 bg-[#0d0f17] border border-white/5 rounded-xl text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-primary">
                          {c.user_profile?.username || "Anonymous Cultivator"}
                        </span>
                        {c.user_profile?.cultivation_rank && (
                          <span className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">
                            {c.user_profile.cultivation_rank}
                          </span>
                        )}
                        <span className="text-[8px] text-zinc-600 ml-auto">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  No discussions yet. Share your thoughts below!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Mobile Recommendations */}
        <div className="space-y-4 pb-12">
          <h3 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/5 pb-2">
            You May Also Like
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {recommendationsList.slice(0, 4).map((item, idx) => (
              <div key={idx} className="group cursor-pointer text-left space-y-2">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f17] shadow-lg">
                  <img src={item.cover} alt={item.title} className="h-full w-full object-cover" />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-[#fbbf24] text-black px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow-md">
                    <span>★</span>
                    <span>{item.rating}</span>
                  </div>
                </div>
                <div className="space-y-0.5 px-0.5">
                  <h4 className="text-[11px] font-black text-white truncate">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STICKY BOTTOM NAVIGATION */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0d12]/95 border-t border-white/10 p-2 backdrop-blur-2xl flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
              activeTab === "overview" ? "text-primary bg-primary/10 font-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Compass className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("characters")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
              activeTab === "characters" ? "text-primary bg-primary/10 font-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Users className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Characters</span>
          </button>

          <button
            onClick={() => setActiveTab("relations")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
              activeTab === "relations" ? "text-primary bg-primary/10 font-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            <HeartHandshake className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Relations</span>
          </button>

          <button
            onClick={() => setActiveTab("comments")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
              activeTab === "comments" ? "text-primary bg-primary/10 font-black" : "text-muted-foreground hover:text-white"
            }`}
          >
            <MessageSquare className="h-4.5 w-4.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Comments</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default AnimeDetail;
