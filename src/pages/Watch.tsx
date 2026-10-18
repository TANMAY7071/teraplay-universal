import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Settings, 
  ChevronRight, ChevronDown, CheckCircle2, MessageSquare, Calendar, 
  Sparkles, Clock, Compass, Users, Send, BookOpen, Download, AlertOctagon,
  MoreVertical, Check, Lock, Search, X, Share2, Link, Globe, ThumbsUp, ThumbsDown, MessageCircle, Pin, ShieldAlert,
  Flame, Smile, Laugh, Eye, AlertCircle, Plus, RefreshCw, Trash2, ArrowUp, Monitor, Minimize, Keyboard, Star, Building2, Film, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ContentCard from "@/components/ContentCard";
import { Anime } from "@/types/anime";
import { Universe, Installment } from "@/types/universe";
import { findAnimeById, findAnimeBySlug, getRelatedAnime, animeCatalog } from "@/data/anime";
import { getAnimeSeriesDetails, CharacterCodexItem } from "@/data/animeDetails";
import { findUniverseBySlug } from "@/data/universeData";
import { useQuery } from "@tanstack/react-query";
import { useEpisodeServersQuery, useEpisodeProgressQuery, useSaveProgressMutation, useCommentsQuery, usePostCommentMutation, useAnimeDetailQuery, useEpisodesQuery, useCharactersQuery } from "@/hooks/useAnimeQueries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import SEO from "@/components/SEO";
import { CustomVideoPlayer } from "@/components/video/CustomVideoPlayer";
import { CommentSection } from "@/components/watch/CommentSection";
import { CharactersWidget } from "@/components/watch/CharactersWidget";
import { TopDonghuaSidebar } from "@/components/watch/TopDonghuaSidebar";
import { recordWatchEvent, formatEpisodeReleaseDate } from "@/services/donghuaMetricsService";
import { defaultServers as defaultDemoFallbackServers } from "@/config/servers";
import { SeasonNavigator } from "@/components/universe/SeasonNavigator";
import { EpisodesPreview } from "@/components/universe/EpisodesPreview";
import NotFound from "./NotFound";
import { cn } from "@/lib/utils";
import watchBg from "@/assets/watch-bg.webp";
import { scrobbleSimkl, getHighResSimklImage, SIMKL_CLIENT_ID } from "@/services/simklAnime";
import { fetchTmdbSeasonDetails } from "@/services/metadata/externalApis";
import { getAniListId } from "@/data/anilistDonghuaMap";
import * as progressService from "@/services/progress";

const PlayerSkeleton = () => (
  <div className="w-full h-full bg-black/50 animate-pulse flex items-center justify-center rounded-3xl relative">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      <p className="text-white/50 text-sm font-medium tracking-wider">LOADING STREAM...</p>
    </div>
  </div>
);

const CULTIVATION_RANKS = [
  "Mortal",
  "Qi Gathering",
  "Foundation Establishment",
  "Core Formation",
  "Nascent Soul",
  "Spirit Severing",
  "Dao Ancestor"
];

interface CMSServer {
  id: string | number;
  name: string;
  url: string;
  type: "Embed" | "MP4" | "HLS" | "External Link" | "Download Only";
  priority: number;
  enabled: boolean;
  isDefault: boolean;
  autoFailover: boolean;
  regionLock: "All" | "India" | "US" | "Europe";
  status: "Online" | "Slow" | "Offline";
  description: string;
  healthUrl?: string;
  testLoading?: boolean;
  testResult?: {
    ok: boolean;
    status: number;
    embedLoaded: boolean;
    reachable: boolean;
  } | null;
}

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

const Watch = () => {
  const { id, slug, episodeNumber } = useParams();
  const navigate = useNavigate();
  const slugOrId = slug || id;
  const { user, profile } = useAuth();
  
  const { data: dbAnime, isLoading: isLoadingAnime } = useAnimeDetailQuery(slugOrId || "");

  const fallbackAnime: Anime | null = useMemo(() => {
    if (dbAnime) return dbAnime;
    if (!slugOrId) return null;

    const normalized = (slugOrId || "").toLowerCase().trim().replace(/[\s_]+/g, "-");
    const catalogFound = animeCatalog.find(a => 
      a.slug === normalized || 
      a.slug === slugOrId ||
      String(a.id) === slugOrId || 
      a.slug.toLowerCase().includes(normalized) || 
      normalized.includes(a.slug.toLowerCase())
    );

    const uni = findUniverseBySlug(normalized) || findUniverseBySlug(slugOrId);
    if (uni) {
      return {
        id: catalogFound?.id || (uni.id === "btth-universe" ? 1 : uni.id),
        slug: uni.slug,
        title: uni.title,
        image: uni.cover || catalogFound?.image || "",
        banner: uni.banner || uni.cover || catalogFound?.banner || "",
        rating: uni.statistics?.score || catalogFound?.rating || 9.0,
        episodes: uni.statistics?.totalEpisodes || catalogFound?.episodes || 157,
        year: 2024,
        genre: uni.genres?.[0] || catalogFound?.genre || "Cultivation",
        genres: uni.genres || catalogFound?.genres || [],
        status: "Ongoing",
        synopsis: uni.description || catalogFound?.synopsis || "",
        tags: uni.genres || catalogFound?.tags || [],
        isNew: false,
        featured: true,
      };
    }

    if (catalogFound) return catalogFound;

    return null;
  }, [dbAnime, slugOrId]);

  const anime = dbAnime || fallbackAnime;
  const routeEpisode = Number(String(episodeNumber ?? "1").replace(/\D/g, "") || "1");
  const [currentEpisode, setCurrentEpisode] = useState(Number.isFinite(routeEpisode) ? routeEpisode : 1);
  const [currentServer, setCurrentServer] = useState<string | number>(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: episodeProgress = {} } = useEpisodeProgressQuery(anime?.id ?? 0);
  const saveProgress = useSaveProgressMutation();
  const episodeId = (anime?.id ?? 0) * 1000 + currentEpisode;
  const { data: dbComments = [] } = useCommentsQuery(episodeId);
  const postCommentMutation = usePostCommentMutation();

  // Fetch actual episodes from DB
  const { data: dbEpisodes = [], isLoading: isLoadingEpisodes } = useEpisodesQuery(anime?.id ?? 0);
  // Fetch characters from DB
  const { data: dbCharacters = [] } = useCharactersQuery(anime?.id ?? 0);

  // Fetch live SIMKL details API data
  const { data: simklDetail } = useQuery({
    queryKey: ["simkl-detail-watch", anime?.anilist_id, anime?.slug, slugOrId],
    queryFn: async () => {
      const slugKey = (anime?.slug || slugOrId || "").toLowerCase();
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
        console.warn("Failed to fetch SIMKL details:", err);
      }
      return null;
    },
    enabled: !!(anime?.anilist_id || anime?.slug || slugOrId),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const [progress, setProgress] = useState(0);
  const [autoNext, setAutoNext] = useState(true);

  // Active selected installment (season)
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | number>("");

  // Popover Dropdown open/close states
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);

  // Modal States
  const [isDownloadSheetOpen, setIsDownloadSheetOpen] = useState(false);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Developer Mode (Admin Drawer Tool)
  const [devModeActive, setDevModeActive] = useState(false);
  const [isDiscussionLocked, setIsDiscussionLocked] = useState(false);
  const [knownIssueText, setKnownIssueText] = useState("Tencent server buffering. Mirror works. Fix in progress.");
  const [cmsDownloadEnabled, setCmsDownloadEnabled] = useState(true);

  // Dynamic Episode Stills & Metadata (TMDB / SIMKL / Verified local cache)
  const [simklThumbnails, setSimklThumbnails] = useState<Record<number, string>>({});
  const [tmdbThumbnails, setTmdbThumbnails] = useState<Record<number, string>>({});
  const [tmdbTitles, setTmdbTitles] = useState<Record<number, string>>({});
  const [simklEpisodes, setSimklEpisodes] = useState<{
    absoluteNumber: number;
    relativeNumber: number;
    title: string;
    thumbnail: string;
    duration: string;
    aired: boolean;
    date?: string;
  }[]>([]);

  // Repeatable dynamic servers list state
  const [cmsServers, setCmsServers] = useState<CMSServer[]>([]);

  // Countdown States
  const [countdown, setCountdown] = useState(5);
  const [showCountdown, setShowCountdown] = useState(false);

  // Floating Mini Navigator
  const [showMiniNav, setShowMiniNav] = useState(false);
  const saveProgressDebounced = useRef<any>(null);
  const activeEpisodeRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll sidebar list to currently watching episode
  useEffect(() => {
    if (activeEpisodeRef.current) {
      activeEpisodeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentEpisode, selectedInstallmentId]);

  // Simkl Playback Intelligence Scrobble Tracking
  const lastScrobbledProgress = useRef<number>(0);
  const lastScrobbledTime = useRef<number>(0);
  const scrobbleSessionActive = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    scrobbleSessionActive.current = false;
    lastScrobbledProgress.current = 0;
    lastScrobbledTime.current = 0;
    isPlayingRef.current = false;
    
    return () => {
      const token = localStorage.getItem("simkl_access_token");
      const aniListId = anime ? (getAniListId(anime.id) || anime.anilist_id) : null;
      if (token && aniListId && scrobbleSessionActive.current) {
        const currentProgress = lastScrobbledProgress.current;
        const action = currentProgress >= 90 ? "stop" : "pause";
        scrobbleSimkl(token, action === "stop" ? "stop" : "pause", aniListId, currentEpisode, currentProgress)
          .catch(err => console.warn("Failed to stop Simkl scrobble session on unmount:", err));
      }
    };
  }, [anime?.id, currentEpisode]);

  const handlePlayerPlay = () => {
    setIsPlaying(true);
    isPlayingRef.current = true;
    const token = localStorage.getItem("simkl_access_token");
    const aniListId = anime ? (getAniListId(anime.id) || anime.anilist_id) : null;
    
    if (token && aniListId && !scrobbleSessionActive.current) {
      scrobbleSessionActive.current = true;
      lastScrobbledTime.current = Date.now();
      
      scrobbleSimkl(token, "start", aniListId, currentEpisode, progress)
        .then(() => {
          lastScrobbledProgress.current = progress;
        })
        .catch(err => console.warn("Failed to start Simkl scrobble session:", err));
    }
  };

  const handlePlayerPause = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    const token = localStorage.getItem("simkl_access_token");
    const aniListId = anime ? (getAniListId(anime.id) || anime.anilist_id) : null;
    
    if (token && aniListId && scrobbleSessionActive.current) {
      scrobbleSimkl(token, "pause", aniListId, currentEpisode, progress)
        .then(() => {
          lastScrobbledProgress.current = progress;
        })
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("simkl_access_token");
    const aniListId = anime ? (getAniListId(anime.id) || anime.anilist_id) : null;
    
    if (!token || !aniListId || !scrobbleSessionActive.current || !isPlayingRef.current) return;
    
    const timeSinceLastScrobble = Date.now() - lastScrobbledTime.current;
    const progressDiff = Math.abs(progress - lastScrobbledProgress.current);
    
    if (timeSinceLastScrobble >= 30000 || progressDiff >= 5) {
      lastScrobbledTime.current = Date.now();
      lastScrobbledProgress.current = progress;
      
      scrobbleSimkl(token, "start", aniListId, currentEpisode, progress)
        .catch(err => console.warn("Failed to send Simkl scrobble check-in:", err));
    }
  }, [progress, anime?.id, currentEpisode]);

  // Desktop layout preferences
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const [activeSubtitle, setActiveSubtitle] = useState("English");



  const universe = useMemo<Universe | null>(() => {
    if (!anime) return null;
    const slugKey = (slugOrId || anime.slug || "").toLowerCase();
    const reg = findUniverseBySlug(slugKey) || findUniverseBySlug(anime.slug) || null;

    const base = reg || {
      id: anime.id,
      slug: anime.slug,
      title: anime.title,
      cover: anime.image,
      banner: anime.banner || anime.image,
      description: anime.synopsis,
      genres: anime.genres || [],
      studios: "Tencent / Motion Magic",
      statistics: {
        totalEpisodes: anime.episodes,
        totalInstallments: 1,
        viewsCount: "0",
        score: anime.rating
      },
      installments: [
        {
          id: anime.id,
          slug: anime.slug,
          title: anime.title,
          type: "Season" as const,
          seasonNumber: 1,
          installmentOrder: 1,
          status: (anime.status === "Completed" ? "Completed" : "Ongoing") as any,
          episodesCount: anime.episodes,
          poster: anime.image,
          banner: anime.image,
          description: anime.synopsis,
          donghuaApiSlug: anime.slug,
          characters: []
        }
      ]
    };

    const mergedInstallments = [...base.installments];

    if (mergedInstallments.length <= 1 && simklDetail?.relations) {
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
      installments: mergedInstallments
    };
  }, [anime, slugOrId, simklDetail]);

  // Synchronize active installment (season) selection intelligently
  useEffect(() => {
    if (!universe || universe.installments.length === 0) return;

    // 1. Try matching slugOrId with installment's slug, id, or donghuaApiSlug
    const matchedBySlug = universe.installments.find(
      inst => inst.slug === slugOrId || String(inst.id) === String(slugOrId) || inst.donghuaApiSlug === slugOrId
    );
    if (matchedBySlug) {
      setSelectedInstallmentId(matchedBySlug.id);
      return;
    }

    // 2. Try matching currentEpisode within installment episode ranges
    let accumulatedEpisodes = 0;
    for (const inst of universe.installments) {
      const count = inst.episodesCount || 52;
      const startEp = accumulatedEpisodes + 1;
      const endEp = accumulatedEpisodes + count;
      if (currentEpisode >= startEp && currentEpisode <= endEp) {
        setSelectedInstallmentId(inst.id);
        return;
      }
      accumulatedEpisodes += count;
    }

    // 3. Keep current selectedInstallmentId if it's already valid in universe
    const currentlySelectedValid = universe.installments.find(inst => inst.id === selectedInstallmentId);
    if (currentlySelectedValid) {
      return;
    }

    // 4. Default fallback to first installment
    if (universe.installments[0]) {
      setSelectedInstallmentId(universe.installments[0].id);
    }
  }, [universe, slugOrId, currentEpisode]);

  const activeInstallment = useMemo(() => {
    if (!universe) return null;
    return universe.installments.find((inst) => inst.id === selectedInstallmentId) || universe.installments[0];
  }, [universe, selectedInstallmentId]);

  const displayRating = useMemo(() => {
    if (simklDetail?.ratings?.simkl?.rating) {
      return Number(simklDetail.ratings.simkl.rating).toFixed(1);
    }
    if (anime?.rating) return Number(anime.rating).toFixed(1);
    return "9.1";
  }, [simklDetail, anime]);

  const displayVotes = useMemo(() => {
    if (simklDetail?.ratings?.simkl?.votes) {
      const v = simklDetail.ratings.simkl.votes;
      return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
    }
    return "125K";
  }, [simklDetail]);

  const displayStudio = useMemo(() => {
    if (simklDetail?.studios?.[0]?.name) return simklDetail.studios[0].name;
    if (universe?.studios) return universe.studios;
    if (anime?.studio) return anime.studio;
    return "Tencent / Motion Magic";
  }, [simklDetail, universe, anime]);

  const displaySynopsis = useMemo(() => {
    return activeInstallment?.description || simklDetail?.overview || anime?.synopsis || "";
  }, [activeInstallment, simklDetail, anime]);

  const displayStatus = useMemo(() => {
    return activeInstallment?.status || simklDetail?.status || anime?.status || "Completed";
  }, [activeInstallment, simklDetail, anime]);

  const displayEpisodesCount = useMemo(() => {
    return activeInstallment?.episodesCount || simklDetail?.total_episodes || anime?.episodes || 52;
  }, [activeInstallment, simklDetail, anime]);

  const displayYear = useMemo(() => {
    return activeInstallment?.year || simklDetail?.year || anime?.year || 2023;
  }, [activeInstallment, simklDetail, anime]);

  // Get real episode ID and exact scraper slug
  const activeDbEpisode = dbEpisodes?.find(ep => ep.episode_number === currentEpisode);
  const realEpisodeId = activeDbEpisode?.id || (anime?.id ?? 0) * 1000 + currentEpisode;
  const scraperEpisodeSlug = activeDbEpisode?.donghua_api_slug || "";

  const { data: serversData, isLoading: isLoadingServers } = useEpisodeServersQuery(scraperEpisodeSlug, realEpisodeId);

  // Initialize CMS Servers state. Demo streams are a dev-only convenience —
  // production must never show placeholder video to visitors.
  useEffect(() => {
    const rawServers = serversData?.length
      ? serversData
      : import.meta.env.DEV
        ? defaultDemoFallbackServers
        : [];
    setCmsServers(
      rawServers.map((s, idx) => ({
        id: s.id || String(idx + 1),
        name: (s as any).server_name || s.name || (idx === 0 ? "Tencent" : idx === 1 ? "Dailymotion" : "Rumble"),
        url: s.url || (s as any).video_url || "",
        type: (s.url || (s as any).video_url || "").includes(".m3u8") ? "HLS" : "Embed",
        priority: idx + 1,
        enabled: s.enabled !== false,
        isDefault: idx === 0,
        autoFailover: true,
        regionLock: "All",
        status: idx === 2 ? "Slow" : "Online",
        description: idx === 0 ? "Fast • Recommended" : idx === 1 ? "Stable • Global" : "Best Quality",
        healthUrl: "https://health.donghuastream.com/check"
      }))
    );
  }, [serversData]);

  // Filters to enabled only, sorted by Priority
  const activeServers = useMemo(() => {
    return cmsServers
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);
  }, [cmsServers]);

  const activeServerObj = useMemo(() => {
    const selected = activeServers.find((s) => s.id === currentServer);
    if (selected) return selected;
    const def = activeServers.find(s => s.isDefault);
    return def || activeServers[0] || null;
  }, [activeServers, currentServer]);

  // Sync current server ID
  useEffect(() => {
    if (activeServerObj && currentServer !== activeServerObj.id) {
      setCurrentServer(activeServerObj.id);
    }
  }, [activeServerObj, currentServer]);

  // =========================================================================
  // REPORT BROKEN SERVER / AUDIO — persists a real incident row into the
  // issue_reports table (see supabase_issue_reports.sql). Admins triage
  // these rows in /admin/requests.
  // =========================================================================
  const handleReportIssue = async (reason: string) => {
    if (!user) {
      toast.error("Sign in to report an issue");
      return;
    }
    try {
      const { error } = await supabase.from("issue_reports").insert({
        episode_id: episodeId,
        server_name: activeServerObj?.name || "Unknown Server",
        reason,
        user_id: user.id,
      });
      if (error) throw error;
      setIsReportSheetOpen(false);
      toast.success("Thank you for your report! Our team will investigate this server soon.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit report. Please try again.");
    }
  };

  // =========================================================================
  // AUTOMATIC FAILOVER SIMULATOR WATCHER
  // =========================================================================
  useEffect(() => {
    if (!activeServerObj) return;
    if (activeServerObj.status === "Offline") {
      const backup = activeServers.find(s => s.id !== activeServerObj.id && s.status !== "Offline");
      if (backup) {
        toast.error(`Switched to ${backup.name} because ${activeServerObj.name} is offline.`, {
          duration: 4000
        });
        setCurrentServer(backup.id);
      }
    }
  }, [activeServerObj, activeServers]);

  const isEmbed = activeServerObj?.url?.includes("dailymotion.com") || activeServerObj?.url?.includes("embed") || activeServerObj?.url?.includes(".html") || false;

  const isDownloadEnabled = cmsDownloadEnabled && activeDbEpisode?.download_enabled !== false;

  // Fetch high-res TMDB & SIMKL episode stills when active installment changes
  useEffect(() => {
    if (!activeInstallment) return;
    setSimklThumbnails({});
    setTmdbThumbnails({});

    async function loadEpisodeStills() {
      const slugKey = (activeInstallment.donghuaApiSlug || activeInstallment.slug || anime?.slug || "").toLowerCase();
      const explicitTmdbId = activeInstallment.tmdbId || (
        slugKey.includes("battle-through-the-heavens") || slugKey.includes("dou-po-cangqiong") ? 79481 :
        slugKey.includes("renegade-immortal") || slugKey.includes("xian-ni") ? 223911 :
        slugKey.includes("the-great-ruler") || slugKey.includes("da-zhu-zai") ? 226045 :
        slugKey.includes("swallowed-star") || slugKey.includes("tunshi-xingkong") ? 101172 :
        slugKey.includes("perfect-world") || slugKey.includes("wanmei-shijie") ? 124003 :
        slugKey.includes("soul-land") || slugKey.includes("douluo-dalu") ? 76572 :
        slugKey.includes("stellar-transformations") || slugKey.includes("xing-chen-bian") ? 83708 :
        slugKey.includes("martial-universe") || slugKey.includes("wu-dong-qiankun") ? 87007 :
        undefined
      );

      if (explicitTmdbId) {
        try {
          const installments = universe?.installments || [];
          const instIndex = installments.findIndex(i => i.id === activeInstallment.id);
          let startEp = 1;
          if (instIndex !== -1) {
            for (let i = 0; i < instIndex; i++) {
              startEp += installments[i].episodesCount || 0;
            }
          }

          const { stills: tmdbSStills = {}, titles: tmdbSTitles = {} } = await fetchTmdbSeasonDetails(
            explicitTmdbId,
            activeInstallment.seasonNumber || 1
          );

          // For long-running donghua, also fetch TMDB Season 1 where TMDB aggregates all continuous episodes
          const { stills: tmdbS1Stills = {}, titles: tmdbS1Titles = {} } = await fetchTmdbSeasonDetails(
            explicitTmdbId,
            1
          );

          const combinedStills: Record<number, string> = { ...tmdbSStills };
          const combinedTitles: Record<number, string> = { ...tmdbSTitles };

          Object.keys(tmdbS1Stills).forEach((epKey) => {
            const epNum = Number(epKey);
            combinedStills[epNum] = tmdbS1Stills[epNum];
            if (tmdbS1Titles[epNum]) combinedTitles[epNum] = tmdbS1Titles[epNum];
            if (epNum >= startEp && epNum < startEp + (activeInstallment.episodesCount || 200)) {
              const relNum = epNum - startEp + 1;
              combinedStills[relNum] = tmdbS1Stills[epNum];
              if (tmdbS1Titles[epNum]) combinedTitles[relNum] = tmdbS1Titles[epNum];
            }
          });

          if (Object.keys(combinedStills).length > 0) {
            setTmdbThumbnails(combinedStills);
          }
          if (Object.keys(combinedTitles).length > 0) {
            setTmdbTitles(combinedTitles);
          }
        } catch (err) {
          console.warn("[Watch] TMDB thumbnail fetch failed:", err);
        }
      }

      const explicitSimklId = activeInstallment.simklId || (
        slugKey.includes("the-great-ruler-season-2") ? 3019366 :
        slugKey.includes("the-great-ruler") || slugKey.includes("great-ruler") ? 2275626 :
        slugKey.includes("renegade-immortal") || slugKey.includes("xian-ni") ? 2275520 :
        slugKey.includes("swallowed-star") || slugKey.includes("tunshi-xingkong") ? 1492145 :
        slugKey.includes("perfect-world") || slugKey.includes("wanmei-shijie") ? 1623359 :
        slugKey.includes("battle-through-the-heavens") || slugKey.includes("dou-po-cangqiong") ? 1972214 :
        slugKey.includes("stellar-transformations") || slugKey.includes("xing-chen-bian") ? 1302779 :
        slugKey.includes("martial-universe") || slugKey.includes("wu-dong-qiankun") ? 1033695 :
        undefined
      );

      if (explicitSimklId) {
        try {
          const epUrl = `https://api.simkl.com/anime/episodes/${explicitSimklId}?extended=full&client_id=${SIMKL_CLIENT_ID}`;
          const res = await fetch(epUrl);
          if (res.ok) {
            const eps = await res.json();
            const map: Record<number, string> = {};
            const parsedList: {
              absoluteNumber: number;
              relativeNumber: number;
              title: string;
              thumbnail: string;
              duration: string;
              aired: boolean;
              date?: string;
            }[] = [];

            const installments = universe?.installments || [];
            const instIndex = installments.findIndex(i => i.id === activeInstallment.id);
            let startEp = 1;
            if (instIndex !== -1) {
              for (let i = 0; i < instIndex; i++) {
                startEp += installments[i].episodesCount || 0;
              }
            }

            if (Array.isArray(eps)) {
              eps.forEach((e: any) => {
                if (e.episode) {
                  let imgUrl = "";
                  if (e.img || e.image) {
                    imgUrl = getHighResSimklImage(e.img || e.image);
                    const epNum = Number(e.episode);
                    map[epNum] = imgUrl;
                    map[startEp + epNum - 1] = imgUrl;
                  }
                  parsedList.push({
                    absoluteNumber: startEp + Number(e.episode) - 1,
                    relativeNumber: Number(e.episode),
                    title: e.title || `Episode ${e.episode}`,
                    thumbnail: imgUrl,
                    duration: e.runtime ? `${e.runtime} min` : "24 min",
                    aired: e.aired !== false && (!e.date || new Date(e.date) <= new Date()),
                    date: e.date
                  });
                }
              });
              setSimklThumbnails(map);
              setSimklEpisodes(parsedList);
            }
          }
        } catch (err) {
          console.warn("[Watch] SIMKL thumbnail fetch failed:", err);
        }
      }
    }

    loadEpisodeStills();
  }, [activeInstallment, anime?.slug, universe]);

  const currentSubdomain = useMemo(() => {
    const slugStr = activeInstallment?.donghuaApiSlug || activeInstallment?.slug || anime?.slug || slugOrId || "";
    return getFandomSubdomain(slugStr) || "battle-through-the-heavens";
  }, [activeInstallment, anime?.slug, slugOrId]);

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
    staleTime: 1000 * 60 * 60 * 24,
  });
  const cachedLoreData = useMemo(() => cachedLore || {}, [cachedLore]);

  const seriesDetails = useMemo(() => {
    if (!anime) return null;
    return getAnimeSeriesDetails(anime.id, anime.title) || { episodesMetadata: [], charactersList: [] };
  }, [anime]);

  const charactersList = useMemo(() => {
    const slugStr = activeInstallment?.donghuaApiSlug || activeInstallment?.slug || anime?.slug || slugOrId || "";
    const slugKey = slugStr.toLowerCase();
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
            avatar: primaryImg || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop",
            role: alias,
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

    const fallbackDetails = getAnimeSeriesDetails(anime?.id || 0, anime?.title || "");
    return (fallbackDetails.characters || []).map(c => ({
      name: c.name,
      role: c.role || "CHARACTER",
      alias: c.role || "CHARACTER",
      avatar: c.avatar,
      image: c.avatar,
      detailSlug: c.name.replace(/ /g, "_")
    }));
  }, [activeInstallment, anime, slugOrId, cachedLoreData]);


  const completeEpisodesList = useMemo(() => {
    if (!anime || !activeInstallment) return [];

    // Calculate episode range for active installment
    const installments = universe?.installments || [];
    const installmentIndex = installments.findIndex(inst => inst.id === activeInstallment.id);
    let startEpisode = 1;
    if (installmentIndex !== -1) {
      for (let i = 0; i < installmentIndex; i++) {
        startEpisode += installments[i].episodesCount || 0;
      }
    }
    const endEpisode = startEpisode + (activeInstallment.episodesCount || 0) - 1;

    // Filter database episodes for this installment
    let filteredDbEpisodes = dbEpisodes
      ? dbEpisodes.filter(ep => 
          (ep.season_id !== null && ep.season_id !== undefined && ep.season_id === activeInstallment.id) || 
          (ep.episode_number >= startEpisode && ep.episode_number <= endEpisode)
        )
      : [];

    if (filteredDbEpisodes.length === 0 && dbEpisodes && dbEpisodes.length > 0) {
      filteredDbEpisodes = dbEpisodes;
    }

    // If episode-specific still is missing, fallback strictly to that season's poster
    const seasonPosterFallback = 
      (activeInstallment?.poster && activeInstallment.poster.trim() !== "" ? activeInstallment.poster : null) ||
      (activeInstallment?.banner && activeInstallment.banner.trim() !== "" ? activeInstallment.banner : null) ||
      anime.image ||
      anime.banner;

    if (filteredDbEpisodes.length > 0) {
      // Sort episodes descending (highest episode number first to match existing list order)
      const sortedDb = [...filteredDbEpisodes].sort((a, b) => b.episode_number - a.episode_number);
      const minEpNum = Math.min(...filteredDbEpisodes.map(e => e.episode_number));

      return sortedDb.map((ep) => {
        const relativeEpNum = ep.episode_number - minEpNum + 1;
        const meta = seriesDetails?.episodesMetadata?.find(m => m.episodeNumber === ep.episode_number);

        const verifiedThumb = 
          activeInstallment.verifiedEpisodeThumbnails?.[relativeEpNum] ||
          activeInstallment.verifiedEpisodeThumbnails?.[ep.episode_number];

        const tmdbThumb = tmdbThumbnails[ep.episode_number] || tmdbThumbnails[relativeEpNum];
        const simklThumb = simklThumbnails[ep.episode_number] || simklThumbnails[relativeEpNum];

        const isDbThumbShowArt = ep.thumbnail_url && (
          ep.thumbnail_url === anime.image || 
          ep.thumbnail_url === anime.banner ||
          ep.thumbnail_url === activeInstallment.poster || 
          ep.thumbnail_url === activeInstallment.banner ||
          ep.thumbnail_url.includes("poster") || 
          ep.thumbnail_url.includes("cover") ||
          ep.thumbnail_url.includes("banner") ||
          ep.thumbnail_url.includes("6eI62O2pqkvwqjhLGd7EOHIPjq7")
        );

        const validDbThumb = ep.thumbnail_url && !isDbThumbShowArt && ep.thumbnail_url.trim() !== "" ? ep.thumbnail_url : null;

        // Episode thumbnail if available, otherwise season poster
        const thumbnail = verifiedThumb || simklThumb || tmdbThumb || validDbThumb || meta?.thumbnail || seasonPosterFallback;

        const simklEp = simklEpisodes.find(e => e.relativeNumber === relativeEpNum || e.absoluteNumber === ep.episode_number);
        const tmdbTitle = tmdbTitles[ep.episode_number] || tmdbTitles[relativeEpNum];
        const simklTitle = simklEp?.title && !simklEp.title.toLowerCase().startsWith("episode ") ? simklEp.title : undefined;
        const verifiedTitle = activeInstallment.verifiedEpisodeTitles?.[relativeEpNum] || activeInstallment.verifiedEpisodeTitles?.[ep.episode_number];

        const title = verifiedTitle || ep.title || tmdbTitle || simklTitle || meta?.title || `Episode ${relativeEpNum}`;
        const rawDate = ep.air_date || (ep as any).created_at || simklEp?.date;
        const releasedAgo = formatEpisodeReleaseDate(rawDate, activeInstallment?.year || anime.year);

        return {
          episodeNumber: ep.episode_number,
          title,
          description: ep.description || meta?.description || `Our heroes continue their journey in episode ${relativeEpNum}.`,
          thumbnail,
          duration: ep.duration || simklEp?.duration || meta?.duration || "24 min",
          releasedAgo
        };
      });
    }

    // Fallback: Season episodes if DB table for this installment is empty
    const totalEps = activeInstallment.episodesCount || anime.episodes || 12;
    return Array.from({ length: totalEps }, (_, idx) => {
      const epNum = totalEps - idx;
      const relativeEpNum = epNum;
      const meta = seriesDetails?.episodesMetadata?.find(m => m.episodeNumber === epNum);

      const verifiedThumb = 
        activeInstallment.verifiedEpisodeThumbnails?.[relativeEpNum] ||
        activeInstallment.verifiedEpisodeThumbnails?.[epNum];

      const tmdbThumb = tmdbThumbnails[epNum] || tmdbThumbnails[relativeEpNum];
      const simklThumb = simklThumbnails[epNum] || simklThumbnails[relativeEpNum];

      // Episode thumbnail if available, otherwise season poster
      const thumbnail = verifiedThumb || simklThumb || tmdbThumb || meta?.thumbnail || seasonPosterFallback;

      const simklEp = simklEpisodes.find(e => e.relativeNumber === relativeEpNum || e.absoluteNumber === epNum);
      const tmdbTitle = tmdbTitles[epNum] || tmdbTitles[relativeEpNum];
      const simklTitle = simklEp?.title && !simklEp.title.toLowerCase().startsWith("episode ") ? simklEp.title : undefined;
      const verifiedTitle = activeInstallment.verifiedEpisodeTitles?.[relativeEpNum] || activeInstallment.verifiedEpisodeTitles?.[epNum];

      const title = verifiedTitle || tmdbTitle || simklTitle || meta?.title || `Episode ${epNum}`;
      const rawDate = simklEp?.date;
      const releasedAgo = formatEpisodeReleaseDate(rawDate, activeInstallment?.year || anime.year);

      return {
        episodeNumber: epNum,
        title,
        description: meta?.description ?? `Our heroes continue their journey in episode ${epNum}.`,
        thumbnail,
        duration: simklEp?.duration || meta?.duration || "24 min",
        releasedAgo
      };
    });
  }, [anime, activeInstallment, seriesDetails, dbEpisodes, universe, tmdbThumbnails, simklThumbnails, simklEpisodes, tmdbTitles, simklDetail]);

  const progressRef = useRef(progress);
  const currentEpisodeThumbnail = useMemo(() => {
    const verifiedThumb = activeDbEpisode?.thumbnail;
    const simklThumb = simklThumbnails[currentEpisode];
    const tmdbThumb = tmdbThumbnails[currentEpisode];
    const simklEpThumb = simklEpisodes.find(ep => ep.relativeNumber === currentEpisode || ep.absoluteNumber === currentEpisode)?.thumbnail;
    
    return verifiedThumb || simklThumb || tmdbThumb || simklEpThumb || activeInstallment?.banner || anime?.banner || anime?.image || "";
  }, [activeDbEpisode?.thumbnail, simklThumbnails, tmdbThumbnails, simklEpisodes, currentEpisode, activeInstallment?.banner, anime?.banner, anime?.image]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Handle updates for Continue Watching (Periodic during playback & on pause/unmount)
  useEffect(() => {
    if (!anime) return;

    const doSave = (currentProg: number) => {
      if (currentProg <= 0) return;
      const isCompleted = currentProg >= 95;
      const totalEps = activeInstallment?.episodesCount || anime.episodes || 52;
      
      let targetEp = currentEpisode;
      let targetTime = Math.max(10, Math.round((currentProg / 100) * 1440));
      let targetThumb = currentEpisodeThumbnail;
      
      if (isCompleted && currentEpisode < totalEps) {
        targetEp = currentEpisode + 1;
        targetTime = 0;
        targetThumb = simklThumbnails[targetEp] || tmdbThumbnails[targetEp] || currentEpisodeThumbnail;
      }

      saveProgress.mutate({
        animeId: anime.id,
        episodeId: (anime.id * 1000) + targetEp,
        episodeNumber: targetEp,
        currentTime: targetTime,
        duration: 1440,
        completed: isCompleted,
        episodeImage: targetThumb,
        seasonName: activeInstallment?.title || "Season 1",
        installmentType: activeInstallment?.type || "Season",
        episodeTitle: tmdbTitles[targetEp] || activeDbEpisode?.title,
      });
    };

    if (isPlaying) {
      // If at start, set 1% and save immediately so Continue Watching records S1 E1 instantly
      if (progressRef.current === 0) {
        setProgress(1);
        doSave(1);
      } else {
        doSave(progressRef.current);
      }

      // Periodically sync progress every 4 seconds during playback
      const timer = setInterval(() => {
        doSave(progressRef.current);
      }, 4000);

      return () => {
        clearInterval(timer);
        doSave(progressRef.current);
      };
    } else if (progressRef.current > 0) {
      // Immediately save on pause
      doSave(progressRef.current);
    }
  }, [isPlaying, anime, currentEpisode, realEpisodeId, currentEpisodeThumbnail, activeInstallment]);

  // Record watch session so Continue Watching always tracks current episode immediately
  useEffect(() => {
    if (!anime?.id || !currentEpisode) return;

    const existing = episodeProgress[currentEpisode];
    const initialTime = existing ? (existing.currentTime ?? existing.time ?? 15) : 15;
    const isCompleted = existing?.completed || false;

    saveProgress.mutate({
      animeId: anime.id,
      episodeId: realEpisodeId,
      episodeNumber: currentEpisode,
      currentTime: Math.max(15, initialTime),
      duration: 1440,
      completed: isCompleted,
      episodeImage: currentEpisodeThumbnail,
      seasonName: activeInstallment?.title || "Season 1",
      installmentType: activeInstallment?.type || "Season",
      episodeTitle: tmdbTitles[currentEpisode] || activeDbEpisode?.title,
    });
  }, [anime?.id, currentEpisode, realEpisodeId, currentEpisodeThumbnail, activeInstallment]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (anime && progressRef.current > 0) {
        const time = Math.max(10, Math.round((progressRef.current / 100) * 1440));
        progressService.saveWatchProgress({
          animeId: anime.id,
          episodeId: realEpisodeId,
          episodeNumber: currentEpisode,
          currentTime: time,
          duration: 1440,
          completed: progressRef.current >= 95,
          episodeImage: currentEpisodeThumbnail,
          seasonName: activeInstallment?.title || "Season 1",
          installmentType: activeInstallment?.type || "Season",
          episodeTitle: tmdbTitles[currentEpisode] || activeDbEpisode?.title,
        });
      }
    };
  }, [anime, currentEpisode, realEpisodeId, currentEpisodeThumbnail, activeInstallment]);

  // Load existing progress when episode changes
  useEffect(() => {
    if (!anime) return;
    const progressRecord = episodeProgress[currentEpisode];
    if (progressRecord) {
      const currentSeconds = progressRecord.currentTime ?? progressRecord.time ?? 0;
      const totalSeconds = progressRecord.duration ?? progressRecord.totalTime ?? 1;
      setProgress(Math.round((currentSeconds / totalSeconds) * 100));
    } else {
      setProgress(0);
    }
    setShowCountdown(false);
  }, [anime, currentEpisode, episodeProgress]);

  // Sync route episode
  useEffect(() => {
    if (!anime) return;
    const maxEp = anime.episodes > 0 ? anime.episodes : 9999;
    const nextEpisode = Math.min(Math.max(Number.isFinite(routeEpisode) ? routeEpisode : 1, 1), maxEp);
    setCurrentEpisode(nextEpisode);
  }, [anime, routeEpisode]);

  // Auto-run next episode countdown timer
  useEffect(() => {
    if (!showCountdown) {
      setCountdown(5);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowCountdown(false);
          selectEpisode(currentEpisode + 1);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showCountdown, currentEpisode]);

  // Scroll visibility for mini navigator
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setShowMiniNav(true);
      } else {
        setShowMiniNav(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Top 10 Donghua & character memoization (Called unconditionally before early returns)
  const top10Donghua = useMemo(() => animeCatalog.slice(0, 10), []);
  const customDetails = useMemo(() => getAnimeSeriesDetails(anime?.id || 0, anime?.title || ""), [anime]);

  useEffect(() => {
    if (anime?.id) {
      recordWatchEvent(anime.id, 60);
    }
  }, [anime?.id]);


  if (isLoadingAnime && !anime) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-primary" />
        <span className="text-xs font-black tracking-widest text-muted-foreground uppercase animate-pulse">
          Channelling Qi...
        </span>
      </div>
    );
  }

  if (!anime) {
    return <NotFound />;
  }

  const recommendedContent = getRelatedAnime(anime, 5);
  const animeEpisodeProgress = episodeProgress;

  const selectEpisode = (episode: number) => {
    const safeEpisode = Math.min(Math.max(episode, 1), anime.episodes);
    setCurrentEpisode(safeEpisode);
    setIsPlaying(true);
    setProgress(0);
    navigate(`/watch/${anime.slug}/episode-${safeEpisode}`, { replace: true });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Watch link copied to clipboard!");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Watching ${anime.title} Episode ${currentEpisode}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };



  // CMS Server methods
  const addCmsServer = () => {
    const newId = `custom_${Date.now()}`;
    const newServer: CMSServer = {
      id: newId,
      name: "VIP Server",
      url: "https://filemoon.sx/e/example",
      type: "Embed",
      priority: cmsServers.length + 1,
      enabled: true,
      isDefault: false,
      autoFailover: true,
      regionLock: "All",
      status: "Online",
      description: "Mirror Backup"
    };
    setCmsServers(prev => [...prev, newServer]);
    toast.success("Added new server mirror template!");
  };

  const updateCmsServer = (id: string | number, updates: Partial<CMSServer>) => {
    setCmsServers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteCmsServer = (id: string | number) => {
    setCmsServers(prev => prev.filter(s => s.id !== id));
    toast.success("Removed server mirror.");
  };

  const testServerConnection = (id: string | number) => {
    updateCmsServer(id, { testLoading: true, testResult: null });
    setTimeout(() => {
      updateCmsServer(id, {
        testLoading: false,
        testResult: {
          ok: true,
          status: 200,
          embedLoaded: true,
          reachable: true
        }
      });
      toast.success("Connection check successful! Status code: 200 OK");
    }, 1200);
  };

  const currentMinutes = Math.floor((progress / 100) * 24);
  const currentSeconds = Math.floor(((progress / 100) * 1440) % 60);
  const pad = (num: number) => String(num).padStart(2, '0');
  const formattedProgressTime = `${pad(currentMinutes)}:\u00A0${pad(currentSeconds)}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground transition-all duration-300">
      <SEO
        title={`Watching ${anime.title} Episode ${currentEpisode}`}
        description={`Stream episode ${currentEpisode} of ${anime.title} in HD quality with subtitles.`}
        image={anime.image}
        type="video.episode"
      />
      
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 animate-fade-in pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 10, 0.45), rgba(5, 6, 10, 0.9)), url(${watchBg})`,
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-background via-background/70 to-transparent z-0 pointer-events-none" />

      <div className="relative z-10">
        {/* Ambient Glow */}
        <div 
          className="absolute inset-x-0 top-0 h-[40rem] opacity-15 blur-[140px] pointer-events-none transition-all duration-700"
          style={{ 
            background: "radial-gradient(circle at 50% 30%, hsl(var(--primary)) 0%, transparent 65%)" 
          }}
        />

        {/* MAIN BODY CONTAINER */}
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 pt-16 sm:pt-20 pb-20 relative">
          
          {/* Back button container */}
          <div className="mb-2">
            <button 
              onClick={() => navigate(`/anime/${slugOrId}`)} 
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Details</span>
            </button>
          </div>

          {/* ═══════ VISUAL HIERARCHY HEADING SECTION ═══════ */}
          <div className="flex flex-col text-left border-b border-white/5 pb-3 mb-3">

            {/* ── MOBILE (< md): Compact layout ── */}
            <div className="block md:hidden">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-base font-black text-white leading-tight truncate">
                  {activeInstallment?.title || "Season 1"} • Episode {currentEpisode}
                </h1>
                <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                  Watching
                </span>
              </div>
              <div className="text-[10px] font-bold text-zinc-500 mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400">24 Min</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400">{activeServerObj?.name || "Tencent"}</span>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-black uppercase text-[8px]">Watching</span>
              </div>
            </div>

            {/* ── TABLET (md to lg): Medium hierarchy ── */}
            <div className="hidden md:block lg:hidden">
              <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase leading-none">
                {anime.title}
              </span>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <h1 className="text-lg font-black text-white leading-tight">
                  {activeInstallment?.title || "Season 1"} • Episode {currentEpisode}
                </h1>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full shrink-0 animate-pulse">
                  Watching
                </span>
              </div>
              <div className="text-[9.5px] font-bold text-zinc-400 mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">24 Min</span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">{activeServerObj?.name || "Tencent"}</span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">Chinese Audio</span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">English Subs</span>
              </div>
            </div>

            {/* ── DESKTOP (lg+): Full cinematic hierarchy ── */}
            <div className="hidden lg:block">
              {/* 1. Franchise breadcrumb — smallest */}
              <span className="text-[10px] font-black text-zinc-500 tracking-[0.22em] uppercase leading-none">
                {anime.title}
              </span>

              {/* 2. Season + Episode — hero text */}
              <div className="flex items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-white leading-tight">
                    {activeInstallment?.title || "Season 1"} • Episode {currentEpisode}
                  </h1>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full shrink-0 animate-pulse">
                    Watching
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">★ {anime.rating || "9.4"}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">👁 82k Views</span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">💬 {dbComments.length + 2} Replies</span>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 text-primary uppercase tracking-wider">Next: Sunday</span>
                </div>
              </div>

              {/* 3. Supporting metadata — tertiary */}
              <div className="text-[10px] font-bold text-zinc-400 mt-3 flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">24 Min</span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">{activeServerObj?.name || "Tencent"}</span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">Chinese Audio</span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">English Subs</span>
              </div>
            </div>
          </div>

          {/* Grid Layout: Optimized Player (72%) & Episode List (28%) columns */}
          <div className="grid grid-cols-1 lg:grid-cols-[72%_minmax(0,_1fr)] gap-6 lg:gap-8 items-start">
            
            {/* Player column */}
            <div className="space-y-4">
              
              {/* Embedded Player Box */}
              <Card className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl relative aspect-video">
                <CardContent className="p-0 w-full h-full relative">
                  {isLoadingServers ? (
                    <PlayerSkeleton />
                  ) : !activeServerObj ? (
                    <div className="w-full h-full bg-black/60 flex items-center justify-center rounded-3xl relative aspect-video text-center flex-col gap-2 p-6">
                      <AlertOctagon className="w-12 h-12 text-red-500" />
                      <h3 className="text-white font-black text-sm uppercase tracking-wider">No sources yet</h3>
                      <p className="text-xs text-zinc-400">Video servers for this episode haven't been added. Please check back soon.</p>
                    </div>
                  ) : (
                    <>
                      {isEmbed ? (
                        <iframe
                          src={activeServerObj.url}
                          allow="autoplay; fullscreen"
                          allowFullScreen
                          className="w-full h-full border-0 aspect-video"
                        />
                      ) : (
                        <CustomVideoPlayer
                          videoUrl={activeServerObj.url}
                          isYoutubeEmbed={
                            activeServerObj?.url?.includes("youtube.com") || 
                            activeServerObj?.url?.includes("youtu.be") || false
                          }
                          fallbackUrls={[]}
                          poster={anime.image}
                          onTimeUpdate={(currTime, dur) => {
                            setProgress(Math.round((currTime / dur) * 100));
                          }}
                          onEnded={() => {
                            setIsPlaying(false);
                            if (autoNext) {
                              setShowCountdown(true);
                            }
                          }}
                          onPlay={handlePlayerPlay}
                          onPause={handlePlayerPause}
                          dbComments={dbComments}
                          animeTitle={anime.title}
                          episodeNumber={currentEpisode}
                          initialTime={episodeProgress[currentEpisode]?.currentTime ?? episodeProgress[currentEpisode]?.time ?? 0}
                        />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 🎥 COMPACT UNIFIED ACTION BAR */}
              <div className="flex items-center justify-between py-3 px-4 text-left bg-[#0c0d12]/90 backdrop-blur-md border border-white/[0.08] rounded-2xl mb-4 shadow-xl relative z-20">
                <div className="flex items-center gap-3">
                  {/* Server Dropdown Selector */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all border bg-white/[0.03] border-white/[0.08] hover:border-primary/30 text-zinc-300 hover:text-white cursor-pointer shadow-sm active:scale-95 duration-200"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          activeServerObj?.status === "Online" ? "bg-green-400" : activeServerObj?.status === "Slow" ? "bg-yellow-400" : "bg-red-400"
                        )} />
                        {activeServerObj?.name || "Tencent"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    </button>

                    {isServerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[90] cursor-default" onClick={() => setIsServerDropdownOpen(false)} />
                        <div className="absolute left-0 mt-2 z-[100] bg-[#12141f] border border-white/20 rounded-xl py-2 w-[220px] shadow-[0_16px_48px_rgba(0,0,0,0.95)] max-h-[280px] overflow-y-auto scrollbar-none text-left animate-in fade-in slide-in-from-top-1 duration-150">
                          {activeServers.map((server) => {
                            const active = activeServerObj?.id === server.id;
                            return (
                              <button
                                key={server.id}
                                onClick={() => {
                                    setCurrentServer(server.id);
                                    setIsServerDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/5 flex items-center justify-between",
                                  active ? "text-primary" : "text-zinc-300"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    server.status === "Online" ? "bg-green-400" : server.status === "Slow" ? "bg-yellow-400" : "bg-red-400"
                                  )} />
                                  <span>
                                    {server.name}
                                    {server.status === "Offline" && <span className="text-[10px] text-zinc-500 ml-1 font-normal">(Offline)</span>}
                                  </span>
                                </div>
                                {active && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => setAutoNext(!autoNext)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.04] text-zinc-400 hover:text-white font-black text-[11px] transition-all cursor-pointer border border-transparent hover:border-white/[0.04] active:scale-95 duration-200"
                  >
                    {autoNext ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                        <span className="text-white">Auto Next</span>
                      </>
                    ) : (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 shrink-0" />
                        <span className="text-zinc-500">Auto Next</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-8.5 px-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.08] text-zinc-400 hover:text-white cursor-pointer active:scale-95 transition-all flex items-center justify-center"
                        aria-label="More Options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0c0d12]/95 border border-white/[0.08] text-white rounded-xl w-44 shadow-2xl z-[60] backdrop-blur-md">
                      <DropdownMenuItem onClick={handleShare} className="hover:bg-white/5 text-xs font-bold gap-2 cursor-pointer py-2">
                        <Share2 className="h-4 w-4 text-zinc-400" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsReportSheetOpen(true)} className="hover:bg-white/5 text-xs font-bold gap-2 text-red-400 cursor-pointer py-2">
                        <AlertOctagon className="h-4 w-4 text-red-400" /> Report
                      </DropdownMenuItem>
                      {profile?.subscription_tier === 'admin' && (
                        <DropdownMenuItem onClick={() => setDevModeActive(!devModeActive)} className="hover:bg-white/5 text-xs font-bold gap-2 cursor-pointer border-t border-white/5 mt-1 pt-1.5 py-2">
                          <Settings className="h-4 w-4 text-zinc-400" /> Dev Mode
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Overview Widget (Desktop Only - Perfectly Proportioned Layout) */}
              <div className="hidden lg:block bg-[#0c0d12]/60 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 lg:p-7 space-y-5 hover:border-primary/30 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-left">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100">OVERVIEW</h3>
                <hr className="border-white/[0.06]" />

                <div className="flex gap-6 items-start">
                  {/* Hero-styled Left Poster */}
                  <div className="w-44 xl:w-48 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-white/15 shadow-[0_10px_28px_rgba(0,0,0,0.45)] bg-[#0a0c14] relative group transition-all duration-500 hover:scale-102">
                    <img 
                      src={activeInstallment?.poster || anime.image} 
                      alt={activeInstallment?.title || anime.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider border border-white/10">
                      {activeInstallment?.type || anime.format || "SEASON"}
                    </div>
                  </div>

                  {/* Right Details Column */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Title & Rating Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xl xl:text-2xl font-black text-white leading-tight truncate">{anime.title}</h4>
                        <span className="text-[11px] text-primary font-black uppercase tracking-wider block mt-0.5">
                          {activeInstallment?.title || "SEASON 1"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-xl">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-black text-white">{displayRating}/10</span>
                        <span className="text-[10px] text-zinc-500 font-bold ml-0.5">| ({displayVotes})</span>
                      </div>
                    </div>

                    {/* Synopsis */}
                    <p className="text-xs xl:text-sm text-zinc-400 font-normal leading-relaxed line-clamp-3">
                      {displaySynopsis}
                    </p>

                    <hr className="border-white/[0.06]" />

                    {/* 6 Metadata Items with Circular Icons */}
                    <div className="grid grid-cols-3 gap-y-3.5 gap-x-5 py-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-zinc-500 font-bold block uppercase leading-none mb-1">Status</span>
                          <span className="text-xs text-white font-extrabold truncate block leading-none">{displayStatus}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <Film className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-zinc-500 font-bold block uppercase leading-none mb-1">Episodes</span>
                          <span className="text-xs text-white font-extrabold truncate block leading-none">{displayEpisodesCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-zinc-500 font-bold block uppercase leading-none mb-1">Duration</span>
                          <span className="text-xs text-white font-extrabold truncate block leading-none">24 min</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-zinc-500 font-bold block uppercase leading-none mb-1">Studio</span>
                          <span className="text-xs text-white font-extrabold truncate block leading-none">{displayStudio}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-zinc-500 font-bold block uppercase leading-none mb-1">Release</span>
                          <span className="text-xs text-white font-extrabold truncate block leading-none">{displayYear}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <Globe className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-zinc-500 font-bold block uppercase leading-none mb-1">Country</span>
                          <span className="text-xs text-white font-extrabold truncate block leading-none">China</span>
                        </div>
                      </div>
                    </div>

                    {/* Genre Pills */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(anime?.genres?.length ? anime.genres : simklDetail?.genres?.length ? simklDetail.genres : ["Action", "Adventure", "Cultivation", "Fantasy"]).slice(0, 6).map((genre: string) => (
                        <span key={genre} className="text-[11px] font-bold text-zinc-300 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1 rounded-full hover:border-primary/40 hover:text-white transition-all cursor-default">
                          {genre}
                        </span>
                      ))}
                    </div>

                    {/* View Details Link */}
                    <button
                      onClick={() => navigate(`/anime/${slugOrId}`)}
                      className="text-xs font-black text-primary hover:text-purple-300 uppercase tracking-wider flex items-center gap-1.5 pt-1 transition-colors cursor-pointer group"
                    >
                      <span>View Full Details</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>



              {/* 📺 MOBILE EPISODE ZONE (Rendered under player on narrow screens) */}
              <div className="block lg:hidden bg-[#0c0d12]/30 backdrop-blur-md border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col h-[480px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
                <div className="flex items-center justify-between pb-3 shrink-0 text-left border-b border-white/[0.06] mb-3.5 relative">
                  <div className="relative">
                    <button 
                      onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                      className="flex items-center gap-1.5 text-xs font-black text-white hover:text-primary transition-all cursor-pointer group"
                    >
                      <span>{activeInstallment?.title || "Season 1"}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
                    </button>

                    {isSeasonDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsSeasonDropdownOpen(false)} />
                        <div className="absolute left-0 mt-2 z-30 bg-[#0c0d12]/95 border border-white/[0.12] rounded-xl py-2 min-w-[220px] sm:min-w-[260px] shadow-2xl backdrop-blur-xl max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-primary/50 scrollbar-track-transparent text-left animate-in fade-in slide-in-from-top-1 duration-150">
                          {universe?.installments.map((inst) => {
                            const active = inst.id === selectedInstallmentId;
                            return (
                              <button
                                key={inst.id}
                                onClick={() => {
                                  setSelectedInstallmentId(inst.id);
                                  setIsSeasonDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3.5 py-2.5 text-xs font-bold transition-all flex items-center justify-between hover:bg-white/5",
                                  active ? "text-primary bg-primary/10" : "text-zinc-300"
                                )}
                              >
                                <span>{inst.title}</span>
                                {active && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <span className="text-[10px] font-black text-primary uppercase shrink-0 px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {completeEpisodesList.length} Episodes
                  </span>
                </div>

                <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain py-1 space-y-2.5 scrollbar-none text-left">
                  {completeEpisodesList.map((ep) => {
                    const progressRecord = animeEpisodeProgress[ep.episodeNumber];
                    const isCurrent = currentEpisode === ep.episodeNumber;
                    const isCompleted = progressRecord?.completed;

                    return (
                      <div
                        key={ep.episodeNumber}
                        ref={isCurrent ? activeEpisodeRef : null}
                        onClick={() => selectEpisode(ep.episodeNumber)}
                        className={cn(
                          "group cursor-pointer border rounded-2xl p-2.5 flex items-center justify-between gap-3 text-left transition-all duration-300 relative active:scale-98",
                          isCurrent 
                            ? "bg-white/[0.06] border-primary/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]" 
                            : "border-transparent bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative aspect-video w-20 rounded-xl overflow-hidden shrink-0 bg-black border border-white/[0.05]">
                            <img src={ep.thumbnail} alt={ep.title} className="h-full w-full object-cover transition-transform duration-550 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                              <Play className="h-3.5 w-3.5 text-white fill-white opacity-85" />
                            </div>
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <h4 className="text-xs font-black text-white truncate group-hover:text-primary transition-colors">{ep.title}</h4>
                            <p className="text-[10px] text-zinc-400 font-bold">{ep.duration} • {ep.releasedAgo}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrent ? (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase">Watching</Badge>
                          ) : isCompleted ? (
                            <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] font-black uppercase">Watched</Badge>
                          ) : (
                            <Badge className="bg-white/5 text-zinc-400 border border-white/10 text-[8px] font-black uppercase">Available</Badge>
                          )}
                          <MoreVertical className="w-4 h-4 text-zinc-500 hover:text-white transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 📱 MOBILE OVERVIEW SECTION (Phone Compact Hero Layout) */}
              {/* 📱 MOBILE OVERVIEW SECTION (Phone Version - Matched 1:1 with Desktop Structure) */}
              <div className="block lg:hidden bg-[#0c0d12]/60 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-left hover:border-primary/30 transition-all duration-300">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-2.5">
                  OVERVIEW
                </h3>

                {/* Poster + Header Info Row */}
                <div className="flex gap-3.5 items-start">
                  {/* Hero-styled Left Poster */}
                  <div className="w-24 sm:w-28 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-white/15 shadow-[0_10px_28px_rgba(0,0,0,0.45)] bg-[#0a0c14] relative group transition-all duration-500 hover:scale-102">
                    <img 
                      src={activeInstallment?.poster || anime.image} 
                      alt={activeInstallment?.title || anime.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider border border-white/10">
                      {activeInstallment?.type || anime.format || "SEASON"}
                    </div>
                  </div>

                  {/* Right Column Header Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <h4 className="text-base font-black text-white leading-snug line-clamp-2">
                      {anime.title}
                    </h4>

                    <span className="text-[10px] text-primary font-black uppercase tracking-wider block">
                      {activeInstallment?.title || "SEASON 1"}
                    </span>

                    <div className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 rounded-xl">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-black text-white">{anime.rating || "9.1"}/10</span>
                      <span className="text-[9px] text-zinc-500 font-bold">| (125K)</span>
                    </div>
                  </div>
                </div>

                {/* Synopsis */}
                <p className="text-xs text-zinc-400 font-normal leading-relaxed line-clamp-3">
                  {activeInstallment?.description || anime.synopsis}
                </p>

                <hr className="border-white/[0.06]" />

                {/* 6 Metadata Items with Circular Icons (Matching Desktop 1:1) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-3 py-0.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Status</span>
                      <span className="text-xs text-white font-extrabold truncate block leading-none">
                        {activeInstallment?.status || anime.status || "Completed"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Film className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Episodes</span>
                      <span className="text-xs text-white font-extrabold truncate block leading-none">
                        {activeInstallment?.episodesCount || anime.episodes || 12}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Duration</span>
                      <span className="text-xs text-white font-extrabold truncate block leading-none">24 min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Studio</span>
                      <span className="text-xs text-white font-extrabold truncate block leading-none">
                        {universe?.studios || "Shanghai Motion Magic / Tencent"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Release</span>
                      <span className="text-xs text-white font-extrabold truncate block leading-none">
                        {activeInstallment?.year || anime.year || "2017"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Country</span>
                      <span className="text-xs text-white font-extrabold truncate block leading-none">China</span>
                    </div>
                  </div>
                </div>

                {/* Genre Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(anime.genres || ["Action", "Adventure", "Cultivation", "Martial Arts"]).slice(0, 5).map((genre: string) => (
                    <span 
                      key={genre} 
                      className="text-[10px] font-bold text-zinc-300 bg-white/[0.03] border border-white/[0.08] px-3 py-1 rounded-full hover:border-primary/40 hover:text-white transition-all cursor-default"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                {/* View Full Details Link */}
                <button
                  onClick={() => navigate(`/anime/${slugOrId}`)}
                  className="text-xs font-black text-primary hover:text-purple-300 uppercase tracking-wider flex items-center gap-1.5 pt-1 transition-colors cursor-pointer group"
                >
                  <span>VIEW FULL DETAILS</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* 👥 MAIN CHARACTERS SECTION */}
              <div className="pt-2">
                <CharactersWidget characters={charactersList} seriesSlug={anime?.slug} />
              </div>

            </div>

            {/* RIGHT COLUMN: EPISODES SIDEBAR (Desktop Only - Sticky Layout - 28% width on desktop) */}
            {!isTheatreMode && (
              <div className="hidden lg:block sticky top-24 self-start space-y-5">
                <div className="rounded-3xl p-5 space-y-4 border border-white/[0.06] text-left bg-[#0c0d12]/30 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
                  
                  {/* Header Row */}
                  <div className="flex items-center justify-between pb-3 shrink-0 text-left border-b border-white/[0.06] mb-3 relative">
                    <div className="relative">
                      <button 
                        onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                        className="flex items-center gap-1.5 text-xs font-black text-white hover:text-primary transition-all cursor-pointer group"
                      >
                        <span>{activeInstallment?.title || "Season 1"}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
                      </button>

                      {isSeasonDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsSeasonDropdownOpen(false)} />
                          <div className="absolute left-0 mt-2 z-30 bg-[#0c0d12]/95 border border-white/[0.12] rounded-xl py-2 min-w-[220px] sm:min-w-[260px] shadow-2xl backdrop-blur-xl max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-primary/50 scrollbar-track-transparent text-left animate-in fade-in slide-in-from-top-1 duration-150">
                            {universe?.installments.map((inst) => {
                              const active = inst.id === selectedInstallmentId;
                              return (
                                <button
                                  key={inst.id}
                                  onClick={() => {
                                    setSelectedInstallmentId(inst.id);
                                    setIsSeasonDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-3.5 py-2.5 text-xs font-bold transition-all flex items-center justify-between hover:bg-white/5",
                                    active ? "text-primary bg-primary/10" : "text-zinc-300"
                                  )}
                                >
                                  <span>{inst.title}</span>
                                  {active && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <span className="text-[10px] font-black text-primary uppercase shrink-0 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                      {completeEpisodesList.length} Episodes
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-500 font-extrabold uppercase leading-none pb-1 flex flex-col gap-1 border-b border-white/[0.06] pb-2.5">
                    <span className="text-[8px] text-zinc-600 block uppercase tracking-wider">Currently Watching</span>
                    <span className="text-white font-black text-xs">Episode {currentEpisode}</span>
                  </div>

                  {/* Scrollable vertical list of episodes with smooth highlight transition */}
                  <div data-lenis-prevent className="space-y-2.5 max-h-[380px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
                    {completeEpisodesList.map((ep) => {
                      const isActive = currentEpisode === ep.episodeNumber;
                      const progressRecord = animeEpisodeProgress[ep.episodeNumber];
                      const progressPercent = progressRecord?.time && progressRecord?.totalTime 
                      ? Math.round((progressRecord.time / progressRecord.totalTime) * 100)
                      : 0;
                      const isCompleted = progressRecord?.completed || progressPercent >= 95;

                      return (
                      <div
                        key={ep.episodeNumber}
                        ref={isActive ? activeEpisodeRef : null}
                        onClick={() => selectEpisode(ep.episodeNumber)}
                        className={cn(
                          "flex gap-3 p-2 rounded-2xl border transition-all duration-300 cursor-pointer relative group active:scale-97",
                          isActive 
                            ? "bg-white/[0.06] border-primary/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                            : "border-transparent bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]"
                        )}
                      >
                        {/* Thumbnail Container */}
                        <div className="relative w-20 h-12 rounded-xl overflow-hidden border border-white/[0.06] flex-shrink-0 bg-black">
                          <img 
                            src={ep.thumbnail} 
                            alt={ep.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {isCompleted && !isActive && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-[#a855f7]" />
                            </div>
                          )}
                          {progressPercent > 0 && !isCompleted && (
                            <span 
                              className="absolute bottom-0 left-0 h-0.5 bg-primary"
                              style={{ width: progressPercent + "%" }}
                            />
                          )}
                        </div>

                        {/* Episode Metadata */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center text-left space-y-0.5">
                          <span className={cn("text-[9px] font-black uppercase tracking-wider", isActive ? "text-primary" : "text-zinc-500")}>
                            EP {ep.episodeNumber}
                          </span>
                          <h4 className="text-[11px] font-black text-white truncate group-hover:text-primary transition-colors leading-snug">
                            {ep.title}
                          </h4>
                          <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1.5 leading-none">
                            <span>{ep.duration}</span>
                            <span>•</span>
                            <span className="truncate max-w-[85px]">{ep.releasedAgo}</span>
                            <span>•</span>
                            {isActive ? (
                              <span className="text-primary font-black uppercase tracking-wider text-[8px]">Watching</span>
                            ) : isCompleted ? (
                              <span className="text-green-400 font-black uppercase tracking-wider text-[8px]">Watched</span>
                            ) : (
                              <span className="text-zinc-500 font-black uppercase tracking-wider text-[8px]">Available</span>
                            )}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* QUICK INFO CARD — Fills dead space below episode list */}
                <div className="rounded-3xl p-5 space-y-3.5 border border-white/[0.06] text-left bg-[#0c0d12]/30 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:border-primary/20 transition-all duration-300">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-white/[0.06] pb-2">Quick Info</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: "Rating", value: `★ ${displayRating}/10`, color: "text-yellow-400" },
                      { label: "Status", value: displayStatus, color: displayStatus === "Completed" ? "text-green-400" : "text-primary" },
                      { label: "Studio", value: displayStudio, color: "text-white" },
                      { label: "Episodes", value: String(displayEpisodesCount), color: "text-white" },
                      { label: "Duration", value: "24 min", color: "text-white" },
                      { label: "Release", value: String(displayYear), color: "text-white" },
                      { label: "Next", value: "Sunday", color: "text-primary" }
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-bold">{item.label}</span>
                        <span className={cn("font-black", item.color)}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Genre pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                    {(anime.genres || ["Action", "Fantasy", "Martial Arts"]).slice(0, 4).map((genre: string) => (
                      <span key={genre} className="text-[8px] font-black uppercase tracking-wider text-zinc-300 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full hover:border-primary/30 transition-colors">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* FOURTH ROW: COMMENTS DISCUSSION & TOP DONGHUA SIDEBAR GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-[72%_minmax(0,_1fr)] gap-6 lg:gap-8 items-start text-left">
            <div className="space-y-6">
              <CommentSection
                episodeId={episodeId}
                dbComments={dbComments}
                postCommentMutation={postCommentMutation}
                isDiscussionLocked={isDiscussionLocked}
                knownIssueText={knownIssueText}
              />
            </div>
            <div className="sticky top-24">
              <TopDonghuaSidebar
                currentDonghuaSlug={anime?.slug}
              />
            </div>
          </div>

          {/* Spacer for breathing room (80px spacing) */}
          <div className="my-20" />

          {/* Related catalog section - Polished & clean metadata */}
          <div className="space-y-6 pt-8 pb-10 border-t border-white/[0.08] text-left">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-sm sm:text-base font-black tracking-widest text-zinc-100 uppercase">RELATED DONGHUA</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5 lg:gap-7">
              {recommendedContent.map((item) => (
                <div 
                  key={item.id} 
                  className="group relative cursor-pointer text-left flex flex-col" 
                  onClick={() => navigate(`/watch/${item.slug}/episode-1`)}
                >
                  <div className="aspect-[2/3] w-full rounded-3xl overflow-hidden bg-[#0d0f17] border border-white/[0.08] relative shadow-md group-hover:-translate-y-1.5 group-hover:border-primary/40 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.14)] transition-all duration-300">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ease-out"
                    />

                    {/* Top Right Rating Badge - Matches Home Screen */}
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center space-x-1 rounded-full bg-black/75 px-2 py-0.5 backdrop-blur-md border border-white/10">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px] font-black text-white">{item.rating || "9.0"}</span>
                    </div>

                    {/* Play Circle Overlay on Hover - Matches Home Screen */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play className="h-4.5 w-4.5 fill-black text-black ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xs font-black text-zinc-200 truncate mt-2.5 group-hover:text-primary transition-colors px-0.5">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5 px-0.5 flex items-center gap-1.5">
                    <span>{item.genres?.[0] || "Cultivation"}</span>
                    {item.year && <span>• {item.year}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer margin spacer (100px spacing) */}
          <div className="mb-24" />
        </div>
      </div>

      {/* FLOATING MINI PLAYER - Original compact layout with fixed z-index stacking */}
      {showMiniNav && (
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] bg-[#0c0d12]/95 border border-white/10 rounded-2xl p-2.5 shadow-[0_12px_48px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer hover:bg-[#12141f]/80 select-none"
        >
          <div className="flex items-center gap-3">
            <img 
              src={anime.image} 
              alt={anime.title} 
              className="w-9 h-9 rounded-lg object-cover border border-white/10 flex-shrink-0"
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white truncate leading-none">{anime.title}</h4>
                <span className="text-[8px] text-zinc-500 font-black uppercase flex items-center gap-1 shrink-0">
                  <ArrowUp className="w-2 h-2" /> Player
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 mt-1 leading-none">
                <span>Episode {currentEpisode}</span>
                <span className="font-mono">{formattedProgressTime}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KEYBOARD SHORTCUTS MODAL */}
      {/* ========================================================================= */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0c0d12] border border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl text-left relative animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-primary" /> Keyboard Shortcuts
              </h3>
              <button 
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-400 font-bold">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span>Space</span>
                <span className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">Play / Pause</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span>Left / Right Arrows</span>
                <span className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">Seek 10 seconds</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span>N Key</span>
                <span className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">Next Episode</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span>F Key</span>
                <span className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">Fullscreen</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OVERLAY SHEET 3: DOWNLOAD SELECTOR BOTTOM SHEET */}
      {/* ========================================================================= */}
      {isDownloadSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#0c0d12] border-t border-white/10 rounded-t-3xl p-5 space-y-4 animate-slide-in-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)] text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider">Download Episode</h3>
                <h4 className="text-base font-black text-white">Select Quality Resolution</h4>
              </div>
              <button 
                onClick={() => setIsDownloadSheetOpen(false)}
                className="p-1 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {[
                { label: "480p", desc: "Standard Definition (SD) • ~120MB" },
                { label: "720p", desc: "High Definition (HD) • ~240MB" },
                { label: "1080p", desc: "Full HD (FHD) • ~480MB" },
                { label: "4K", desc: "Ultra HD (UHD) • ~1.2GB" }
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setIsDownloadSheetOpen(false);
                    toast.success(`Started download for ${opt.label} stream!`);
                  }}
                  className="p-4 bg-white/5 border border-white/10 hover:border-primary rounded-2xl text-left hover:bg-[#12141f]/40 transition-all cursor-pointer"
                >
                  <h4 className="text-sm font-black text-white">{opt.label}</h4>
                  <p className="text-[10px] text-zinc-400 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OVERLAY SHEET 4: REPORT OPTIONS BOTTOM SHEET */}
      {/* ========================================================================= */}
      {isReportSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#0c0d12] border-t border-white/10 rounded-t-3xl p-5 space-y-4 animate-slide-in-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)] text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider">Report Issue</h3>
                <h4 className="text-base font-black text-white">Help us fix playback issues</h4>
              </div>
              <button 
                onClick={() => setIsReportSheetOpen(false)}
                className="p-1 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                "Video not loading",
                "Wrong episode",
                "Audio issue",
                "Subtitle issue",
                "Server unavailable",
                "Other"
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReportIssue(reason)}
                  className="w-full p-3 bg-white/5 border border-white/10 hover:border-red-500/40 rounded-xl text-left hover:bg-[#12141f]/20 transition-all cursor-pointer font-bold text-xs text-zinc-300 hover:text-white"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* RESTORED FLOATING DEV MODE TRIGGER (ADMIN ONLY) */}
      {profile?.subscription_tier === 'admin' && (
        <div className="fixed bottom-32 right-4 sm:bottom-6 sm:right-6 z-40 animate-in fade-in zoom-in duration-200">
          <button
            onClick={() => setDevModeActive(!devModeActive)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-full text-[10px] sm:text-xs font-black shadow-2xl transition-all cursor-pointer border backdrop-blur-md",
              devModeActive 
                ? "bg-primary border-primary text-white" 
                : "bg-[#0c0d12]/90 border-white/15 text-zinc-300 hover:text-white hover:border-white/30"
            )}
          >
            <span>🛠 Dev Mode</span>
            <span className={cn("w-1.5 h-1.5 rounded-full", devModeActive ? "bg-white animate-pulse" : "bg-zinc-500")} />
          </button>
        </div>
      )}

      {/* DEVELOPER MODE PANEL */}
      {devModeActive && (
        <div className="fixed right-0 bottom-0 sm:bottom-auto sm:right-6 sm:top-24 z-50 w-full max-w-md sm:w-[380px] bg-[#0c0d12]/98 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.65)] sm:shadow-[0_0_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl text-left animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 flex flex-col max-h-[85vh] sm:max-h-[72vh] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-xs font-black text-primary uppercase tracking-widest leading-none">🛠 Developer Panel</h3>
              <span className="text-[10px] text-zinc-400 block mt-1 font-bold">Admin Console Mode</span>
            </div>
            <button 
              onClick={() => setDevModeActive(false)}
              className="p-1 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs flex-1">
            <div>
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-2">Live Analytics</span>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                <div className="flex justify-between font-bold">
                  <span className="text-zinc-400">Total Views:</span>
                  <span className="text-white">8,452</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-zinc-400">Success Rate:</span>
                  <span className="text-green-400">98.7%</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-zinc-400">Avg Load Time:</span>
                  <span className="text-white">1.8 s</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-wider">Streaming Servers ({cmsServers.length})</span>
                <button 
                  onClick={addCmsServer}
                  className="flex items-center gap-1 text-[9px] font-black text-primary hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Server
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {cmsServers.map((server) => (
                  <div key={server.id} className="p-3 bg-white/4 rounded-2xl border border-white/5 space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <select
                          value={server.status}
                          onChange={(e) => updateCmsServer(server.id, { status: e.target.value as any })}
                          className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white font-bold"
                        >
                          <option value="Online">🟢 Online</option>
                          <option value="Slow">🟡 Slow</option>
                          <option value="Offline">🔴 Offline</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={server.enabled}
                            onChange={(e) => updateCmsServer(server.id, { enabled: e.target.checked })}
                            className="rounded border-white/10 bg-black/40 accent-primary cursor-pointer w-3 h-3"
                          />
                          <span className="text-[8px] font-bold text-zinc-400">Enabled</span>
                        </label>
                        <button 
                          onClick={() => deleteCmsServer(server.id)}
                          className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Display Name</label>
                        <input 
                          type="text"
                          value={server.name}
                          onChange={(e) => updateCmsServer(server.id, { name: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Description</label>
                        <input 
                          type="text"
                          value={server.description}
                          onChange={(e) => updateCmsServer(server.id, { description: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Embed / Stream URL</label>
                      <input 
                        type="text"
                        value={server.url}
                        onChange={(e) => updateCmsServer(server.id, { url: e.target.value })}
                        placeholder="https://embed.example.com/video/..."
                        className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Provider Type</label>
                        <select
                          value={server.type}
                          onChange={(e) => updateCmsServer(server.id, { type: e.target.value as any })}
                          className="w-full bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white font-sans"
                        >
                          {["Embed", "MP4", "HLS", "External Link", "Download Only"].map(t => (
                            <option key={t} value={t} className="bg-[#0c0d12]">{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Priority</label>
                        <input 
                          type="number"
                          value={server.priority}
                          onChange={(e) => updateCmsServer(server.id, { priority: Number(e.target.value) })}
                          className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 pt-2">
                        <input 
                          type="checkbox"
                          checked={server.isDefault}
                          onChange={(e) => updateCmsServer(server.id, { isDefault: e.target.checked })}
                          className="rounded border-white/10 bg-black/40 accent-primary cursor-pointer w-3 h-3"
                        />
                        <span className="text-[8px] font-bold text-zinc-400">Default Server</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-2">
                        <input 
                          type="checkbox"
                          checked={server.autoFailover}
                          onChange={(e) => updateCmsServer(server.id, { autoFailover: e.target.checked })}
                          className="rounded border-white/10 bg-black/40 accent-primary cursor-pointer w-3 h-3"
                        />
                        <span className="text-[8px] font-bold text-zinc-400">Auto Failover</span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-2 mt-1 flex justify-between items-center">
                      <button
                        onClick={() => testServerConnection(server.id)}
                        disabled={server.testLoading}
                        className="text-[9px] font-black text-donghua-cyan hover:text-white flex items-center gap-1.5 bg-donghua-cyan/5 border border-donghua-cyan/20 px-2 py-0.5 rounded transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {server.testLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" /> Testing...
                          </>
                        ) : (
                          <>
                            Test Connection
                          </>
                        )}
                      </button>

                      {server.testResult && (
                        <div className="text-[8px] text-green-400 font-bold space-y-0.2 text-right">
                          <div>✓ Response: {server.testResult.status} OK</div>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-1.5">Known Issues Notice</span>
              <div className="space-y-2">
                <input 
                  type="text"
                  value={knownIssueText}
                  onChange={(e) => setKnownIssueText(e.target.value)}
                  placeholder="Buffering alert message or empty to disable"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-1">Moderator Controls</span>
              <button
                onClick={() => {
                  setIsDiscussionLocked(!isDiscussionLocked);
                  toast.success(isDiscussionLocked ? "Unlocked comments feed!" : "Locked comments feed!");
                }}
                className={cn(
                  "w-full py-2 px-3 rounded-xl border font-bold text-[10px] transition-all text-left flex items-center justify-between cursor-pointer",
                  isDiscussionLocked ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-zinc-300"
                )}
              >
                <span>{isDiscussionLocked ? "🔓 Unlock Discussion" : "🔒 Lock Discussion"}</span>
                {isDiscussionLocked && <Lock className="w-3.5 h-3.5" />}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Watch;
