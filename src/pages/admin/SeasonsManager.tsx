import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Eye, Save, Sparkles, Image as ImageIcon, Search, Download, X, Film, Database, RefreshCw, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { findUniverseBySlug, UNIVERSES_REGISTRY } from "@/data/universeData";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { searchAniList, fetchAniListMetadata } from "@/services/syncService";
import { searchTmdb, getTmdbDetail, getTmdbImages } from "@/services/tmdbAnime";
import { searchSimkl, getSimklEpisodes } from "@/services/simklAnime";
import { searchTmdbWithCascade, searchAniListWithCascade } from "@/services/donghuaAliasResolver";
import { fetchLiveTmdbSeasons, persistSeasonsToSupabase } from "@/services/tmdbSeasonIngestion";
import { getBrandingOverrides, saveBrandingOverrides } from "@/lib/overrides";
import { cn } from "@/lib/utils";
import { fetchTmdbSeasonDetails, fetchTmdbShowDetail } from "@/services/metadata/externalApis";
import { resolveAnimeId } from "@/services/anime";


const KNOWN_TMDB_IDS: Record<string, number> = {
  "battle-through-the-heavens": 79481,
  "battle through the heavens": 79481,
  "the-demon-hunter": 227282,
  "the demon hunter": 227282,
  "demon hunter": 227282,
  "cang yuan tu": 227282,
  "cangyuantu": 227282,
  "renegade-immortal": 223911,
  "renegade immortal": 223911,
  "the-great-ruler": 226045,
  "the great ruler": 226045,
  "swallowed-star": 101172,
  "swallowed star": 101172,
  "perfect-world": 124003,
  "perfect world": 124003,
  "soul-land": 76572,
  "soul land": 76572,
  "throne-of-seal": 198083,
  "throne of seal": 198083,
  "against-the-gods": 234125,
  "against the gods": 234125,
  "shrouding-the-heavens": 225575,
  "shrouding the heavens": 225575,
  "jade-dynasty": 207399,
  "jade dynasty": 207399,
};

interface SeasonsManagerProps {
  animeSlug?: string;
}

export const SeasonsManager: React.FC<SeasonsManagerProps> = ({ animeSlug }) => {
  const [selectedFranchise, setSelectedFranchise] = useState(animeSlug || "battle-through-the-heavens");

  useEffect(() => {
    if (animeSlug) {
      setSelectedFranchise(animeSlug);
    }
  }, [animeSlug]);

  const [dataSource, setDataSource] = useState<"local" | "api">("local");
  const [installments, setInstallments] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState<any | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<string[]>([]);
  const [tickedEpisodes, setTickedEpisodes] = useState<Record<number, boolean>>({});
  const [harvestSourceSeason, setHarvestSourceSeason] = useState<string>("auto");

  const [startEpOffset, setStartEpOffset] = useState<number>(1);

  const openSeasonEditor = (season: any) => {
    const override = getBrandingOverrides(selectedFranchise, season.id);
    const mergedThumbnails = {
      ...(season.verifiedEpisodeThumbnails || {}),
      ...(override.verifiedEpisodeThumbnails || {})
    };
    const mergedTitles = {
      ...(season.verifiedEpisodeTitles || {}),
      ...(override.verifiedEpisodeTitles || {})
    };

    setActiveSeason({
      ...season,
      verifiedEpisodeThumbnails: Object.keys(mergedThumbnails).length > 0 ? mergedThumbnails : season.verifiedEpisodeThumbnails,
      verifiedEpisodeTitles: Object.keys(mergedTitles).length > 0 ? mergedTitles : season.verifiedEpisodeTitles
    });

    const initialTicks: Record<number, boolean> = {};
    const totalEps = season.episodes || 12;
    for (let i = 1; i <= totalEps; i++) {
      initialTicks[i] = true;
    }
    setTickedEpisodes(initialTicks);
  };

  // API Season Importer state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [apiProvider, setApiProvider] = useState<"anilist" | "tmdb" | "simkl" | "manual">("anilist");
  const [apiSearchQuery, setApiSearchQuery] = useState("");
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState<any[]>([]);
  const [selectedApiResult, setSelectedApiResult] = useState<any | null>(null);

  // Active Season API Artwork Picker state
  const [seasonArtworkCandidates, setSeasonArtworkCandidates] = useState<{ url: string; type: "poster" | "banner" | "logo"; source: string }[]>([]);
  const [isFetchingSeasonArtwork, setIsFetchingSeasonArtwork] = useState(false);

  const handleFetchSeasonArtwork = async () => {
    if (!activeSeason) return;
    setIsFetchingSeasonArtwork(true);
    toast.info(`Harvesting API posters & banners for "${activeSeason.title}"...`);

    try {
      const { seasons: liveSeasons, tmdbId } = await fetchLiveTmdbSeasons(selectedFranchise);
      const harvested: { url: string; type: "poster" | "banner" | "logo"; source: string }[] = [];

      const targetSeasonNum = activeSeason.seasonNumber || activeSeason.season_number;
      const matchedSeason = liveSeasons.find(s => 
        (targetSeasonNum && s.seasonNumber === targetSeasonNum) || 
        s.title.toLowerCase().includes(String(activeSeason.title).toLowerCase()) ||
        String(activeSeason.title).toLowerCase().includes(s.title.toLowerCase())
      );

      if (matchedSeason?.poster) {
        harvested.push({ url: matchedSeason.poster, type: "poster", source: "Official TMDB Season" });
      }
      if (matchedSeason?.banner) {
        harvested.push({ url: matchedSeason.banner, type: "banner", source: "Official TMDB Banner" });
      }

      if (tmdbId) {
        const { posters, backdrops, logos } = await getTmdbImages(tmdbId);
        posters.slice(0, 6).forEach(p => {
          if (!harvested.some(h => h.url === p.url)) {
            harvested.push({ url: p.url, type: "poster", source: "TMDB Gallery" });
          }
        });
        backdrops.slice(0, 4).forEach(b => {
          if (!harvested.some(h => h.url === b.url)) {
            harvested.push({ url: b.url, type: "banner", source: "TMDB Fanart" });
          }
        });
        (logos || []).slice(0, 4).forEach(l => {
          if (!harvested.some(h => h.url === l.url)) {
            harvested.push({ url: l.url, type: "logo", source: "TMDB Season Logo" });
          }
        });
      }

      setSeasonArtworkCandidates(harvested);
      if (harvested.length > 0) {
        toast.success(`Harvested ${harvested.length} artwork options for ${activeSeason.title}!`);
      } else {
        toast.error("No API images found. Paste custom URL below.");
      }
    } catch (err) {
      toast.error("Failed to fetch season artwork.");
    } finally {
      setIsFetchingSeasonArtwork(false);
    }
  };

  // Load installments based on chosen dataSource ("local" vs "api")
  useEffect(() => {
    let isCancelled = false;

    const loadSeasons = async () => {
      if (dataSource === "api") {
        const { seasons: liveSeasons } = await fetchLiveTmdbSeasons(selectedFranchise);
        if (!isCancelled && liveSeasons && liveSeasons.length > 0) {
          setInstallments(liveSeasons);
          return;
        }
      }

      // Default: Check local website universe registry for exact 1:1 match with public site
      const slugKey = selectedFranchise.toLowerCase().trim();
      const uni = findUniverseBySlug(slugKey) || 
                  findUniverseBySlug(slugKey.replace(/[-_]+/g, " ")) || 
                  UNIVERSES_REGISTRY.find(u => u.slug === slugKey || u.slug.includes(slugKey) || slugKey.includes(u.slug));

      if (!isCancelled && uni && uni.installments && uni.installments.length > 0) {
        const items = uni.installments.map((inst, idx) => {
          const isSpecial = inst.type === "Special" || inst.title?.toLowerCase().includes("special");
          const titleMatch = inst.title?.match(/Season\s*(\d+)/i);
          const sNum = (inst as any).seasonNumber !== undefined 
            ? (inst as any).seasonNumber 
            : (isSpecial ? 0 : (titleMatch ? parseInt(titleMatch[1]) : idx + 1));

          const override = getBrandingOverrides(selectedFranchise, inst.id);
          const mergedThumbnails = {
            ...((inst as any).verifiedEpisodeThumbnails || {}),
            ...(override.verifiedEpisodeThumbnails || {})
          };
          const mergedTitles = {
            ...((inst as any).verifiedEpisodeTitles || {}),
            ...(override.verifiedEpisodeTitles || {})
          };

          return {
            id: inst.id || `season-${idx + 1}`,
            seasonNumber: sNum,
            title: inst.title,
            year: inst.year || 2022,
            episodes: inst.episodesCount || 12,
            status: (inst as any).status === "Draft" ? "Draft" : "Published",
            tag: inst.type === "Special" ? "SPECIAL EVENT" : (idx === uni.installments.length - 1 ? "CURRENT MAIN STORY" : (idx === 0 ? "BEGINNING ARC" : "SEASON ARC")),
            poster: inst.poster || uni.cover,
            banner: inst.banner || uni.banner || inst.poster || uni.cover,
            description: inst.description || uni.description,
            rating: inst.rating || 8.5,
            simklId: (inst as any).simklId || (inst.id === "btth-s5" ? 1972214 : undefined),
            tmdbId: (inst as any).tmdbId || 
                    KNOWN_TMDB_IDS[selectedFranchise.toLowerCase()] || 
                    KNOWN_TMDB_IDS[selectedFranchise.toLowerCase().replace(/[-_]+/g, " ")] || 
                    KNOWN_TMDB_IDS[selectedFranchise.toLowerCase().replace(/\s+/g, "-")] || 
                    (selectedFranchise.toLowerCase().includes("demon") ? 227282 : 79481),
            verifiedEpisodeThumbnails: Object.keys(mergedThumbnails).length > 0 ? mergedThumbnails : undefined,
            verifiedEpisodeTitles: Object.keys(mergedTitles).length > 0 ? mergedTitles : undefined
          };
        });
        setInstallments(items);
        return;
      }

      // Fallback to live TMDB API seasons if local site has no installments
      const { seasons: liveSeasons } = await fetchLiveTmdbSeasons(selectedFranchise);
      if (!isCancelled && liveSeasons && liveSeasons.length > 0) {
        setInstallments(liveSeasons);
        persistSeasonsToSupabase(selectedFranchise, liveSeasons);
        return;
      }

      // Ultimate Fallback
      if (!isCancelled) {
        setInstallments([
          { id: "s1", title: "Season 1", year: 2024, episodes: 12, status: "Published", tag: "BEGINNING ARC", poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&fit=crop", banner: "", description: "" }
        ]);
      }
    };

    loadSeasons();

    return () => { isCancelled = true; };
  }, [selectedFranchise, dataSource]);

  const handleAutoSyncAllSeasons = async () => {
    setIsSyncingAll(true);
    toast.info(`Fetching live seasons and official posters from TMDB API for "${selectedFranchise}"...`);

    try {
      const { seasons: liveSeasons } = await fetchLiveTmdbSeasons(selectedFranchise);
      if (liveSeasons && liveSeasons.length > 0) {
        setInstallments(liveSeasons);
        await persistSeasonsToSupabase(selectedFranchise, liveSeasons);

        // Save branding overrides for every live season so site details page immediately renders live posters
        liveSeasons.forEach(s => {
          saveBrandingOverrides(selectedFranchise, s.id, {
            poster: s.poster || undefined,
            banner: s.banner || undefined
          });
        });

        toast.success(`Successfully loaded ${liveSeasons.length} live seasons with official posters from TMDB!`);
        return;
      }

      // Fallback
      const slugKey = selectedFranchise.toLowerCase().trim();
      const uni = findUniverseBySlug(slugKey) || findUniverseBySlug(slugKey.replace(/[-_]+/g, " "));
      if (uni && uni.installments && uni.installments.length > 0) {
        const items = uni.installments.map((inst, idx) => ({
          id: inst.id || `season-${idx + 1}`,
          title: inst.title,
          year: inst.year || 2022,
          episodes: inst.episodesCount || 12,
          status: "Published",
          tag: inst.type === "Special" ? "SPECIAL EVENT" : `SEASON ${idx + 1}`,
          poster: inst.poster || uni.cover,
          banner: inst.banner || uni.banner || inst.poster,
          description: inst.description || uni.description,
          rating: inst.rating || 8.5
        }));
        setInstallments(items);
        toast.success(`Loaded ${items.length} seasons from Universe Registry!`);
        return;
      }

      toast.warning("No seasons found on TMDB API or Registry.");
    } catch (err: any) {
      console.error(err);
      toast.error(`Auto-sync failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const toggleStatus = (id: string | number) => {
    setInstallments(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "Published" ? "Draft" : "Published" } : s));
    toast.success("Season visibility status updated!");
  };

  const handleActiveSeasonChange = (field: string, value: any) => {
    setActiveSeason((prev: any) => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  // API Search execution
  const handleApiSearch = async () => {
    if (!apiSearchQuery.trim()) {
      toast.error("Please enter a title or ID to search.");
      return;
    }

    setIsFetchingApi(true);
    setApiSearchResults([]);
    setSelectedApiResult(null);

    try {
      if (apiProvider === "anilist") {
        if (/^\d+$/.test(apiSearchQuery.trim())) {
          const detail = await fetchAniListMetadata(parseInt(apiSearchQuery.trim()));
          if (detail) {
            setApiSearchResults([{
              id: detail.id,
              title: detail.title?.english || detail.title?.romaji || detail.title?.native || "AniList Entry",
              poster: detail.coverImage?.extraLarge || detail.coverImage?.large || "",
              banner: detail.bannerImage || "",
              episodes: detail.episodes || 12,
              year: detail.seasonYear || new Date().getFullYear(),
              description: detail.description ? detail.description.replace(/<[^>]*>/g, '') : "",
              status: "Published",
              tag: "SEASON ARC"
            }]);
          }
        } else {
          const list = await searchAniList(apiSearchQuery);
          setApiSearchResults(list.map((item: any) => ({
            id: item.id,
            title: item.title?.english || item.title?.romaji || item.title?.native || "AniList Entry",
            poster: item.coverImage?.extraLarge || item.coverImage?.large || "",
            banner: item.bannerImage || "",
            episodes: item.episodes || 12,
            year: item.seasonYear || new Date().getFullYear(),
            description: item.description ? item.description.replace(/<[^>]*>/g, '') : "",
            status: "Published",
            tag: "SEASON ARC"
          })));
        }
      } else if (apiProvider === "tmdb") {
        const list = await searchTmdb(apiSearchQuery);
        setApiSearchResults(list.map((item: any) => ({
          id: item.id,
          title: item.title || "TMDB Entry",
          poster: item.image || "",
          banner: item.banner_url || item.image || "",
          episodes: item.episodes || 12,
          year: item.year || new Date().getFullYear(),
          description: item.synopsis || "",
          status: "Published",
          tag: "SEASON ARC"
        })));
      } else if (apiProvider === "simkl") {
        const list = await searchSimkl(apiSearchQuery);
        setApiSearchResults(list.map((item: any) => ({
          id: item.id,
          title: item.title || "Simkl Entry",
          poster: item.image || "",
          banner: item.banner_url || item.image || "",
          episodes: item.episodes || 12,
          year: item.year || new Date().getFullYear(),
          description: item.synopsis || "",
          status: "Published",
          tag: "SEASON ARC"
        })));
      }
      toast.success(`Found metadata results from ${apiProvider.toUpperCase()}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to fetch metadata from ${apiProvider.toUpperCase()}`);
    } finally {
      setIsFetchingApi(false);
    }
  };

  // Import fetched result into Season List
  const handleImportSelectedSeason = (seasonData: any) => {
    const seasonIndex = installments.length + 1;
    const importedSeason = {
      id: `imported-${apiProvider}-${seasonData.id || Date.now()}`,
      seasonNumber: seasonData.seasonNumber || seasonData.season_number || seasonIndex,
      title: seasonData.title || `Season ${seasonIndex}`,
      year: seasonData.year || new Date().getFullYear(),
      episodes: seasonData.episodes || 12,
      status: "Published",
      tag: seasonData.tag || "SEASON ARC",
      poster: seasonData.poster || "",
      banner: seasonData.banner || "",
      description: seasonData.description || ""
    };

    setInstallments([...installments, importedSeason]);
    setActiveSeason(importedSeason);
    setIsImportModalOpen(false);
    toast.success(`Successfully imported "${importedSeason.title}" from ${apiProvider.toUpperCase()}!`);
  };

  const handleSaveActiveSeason = async () => {
    if (!activeSeason) return;
    setInstallments(prev => prev.map(s => s.id === activeSeason.id ? activeSeason : s));

    try {
      const animeId = await resolveAnimeId(selectedFranchise);

      if (animeId) {
        const sIndex = installments.findIndex(s => s.id === activeSeason.id);
        const derivedSeasonNum = activeSeason.seasonNumber || activeSeason.season_number || (sIndex >= 0 ? sIndex + 1 : 1);
        
        const { error } = await supabase.from("anime_seasons").upsert({
          anime_id: animeId,
          season_number: derivedSeasonNum,
          title: activeSeason.title,
          poster_url: activeSeason.poster,
          banner_url: activeSeason.banner,
          updated_at: new Date().toISOString()
        }, { onConflict: "anime_id,season_number" });

        if (error) {
          console.error("Supabase season save error:", error);
          toast.error(`Database save failed: ${error.message}`);
        } else {
          toast.success("Saved season to database!");
        }
      }
    } catch (e: any) {
      console.warn("Saved season locally", e);
    }

    const filteredThumbnails: Record<number, string> = {};
    if (activeSeason.verifiedEpisodeThumbnails) {
      Object.entries(activeSeason.verifiedEpisodeThumbnails).forEach(([epStr, url]) => {
        const epNum = Number(epStr);
        if (tickedEpisodes[epNum] !== false && typeof url === "string" && url.trim() !== "") {
          filteredThumbnails[epNum] = url;
        }
      });
    }

    // Synchronize to branding overrides so live hero & details page update immediately
    saveBrandingOverrides(selectedFranchise, activeSeason.id, {
      poster: activeSeason.poster || undefined,
      banner: activeSeason.banner || undefined,
      logo: activeSeason.logo || undefined,
      logoDisplayMode: activeSeason.logoDisplayMode || "desktop_only",
      verifiedEpisodeThumbnails: Object.keys(filteredThumbnails).length > 0 ? filteredThumbnails : undefined,
      verifiedEpisodeTitles: activeSeason.verifiedEpisodeTitles || undefined
    });

    toast.success(`Saved updates for ${activeSeason.title}!`);
    setActiveSeason(null);
  };

  return (
    <div className="space-y-6 text-left text-white min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#11111a] border border-white/5 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase">
              Season Arcs Registry
            </Badge>
            <span className="text-[10px] font-mono text-zinc-500">{installments.length} INSTALLMENTS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">Seasons & Arcs CMS</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage posters, banners, episode counts, and status for every season arc in the franchise.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          {/* Data Source Selector Pill */}
          <div className="flex items-center bg-black/60 border border-white/10 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setDataSource("local")}
              className={cn(
                "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200",
                dataSource === "local"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              🌐 Local Site Data
            </button>
            <button
              type="button"
              onClick={() => setDataSource("api")}
              className={cn(
                "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200",
                dataSource === "api"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              ⚡ Live API Data
            </button>
          </div>

          {!animeSlug && (
            <select 
              value={selectedFranchise} 
              onChange={(e) => setSelectedFranchise(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
            >
              <option value="battle-through-the-heavens">Battle Through The Heavens (9 Installments)</option>
              <option value="renegade-immortal">Renegade Immortal</option>
              <option value="soul-land">Soul Land</option>
              <option value="perfect-world">Perfect World</option>
              <option value="swallowed-star">Swallowed Star</option>
              <option value="the-great-ruler">The Great Ruler</option>
            </select>
          )}
          <Button 
            size="sm" 
            disabled={isSyncingAll}
            onClick={handleAutoSyncAllSeasons}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 gap-1.5 text-xs font-black uppercase rounded-xl px-4 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? "animate-spin" : ""}`} /> Auto-Sync All Seasons
          </Button>
          <Button 
            size="sm" 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs font-black uppercase rounded-xl shadow-lg shadow-primary/20 px-4 h-9"
          >
            <Sparkles className="h-3.5 w-3.5" /> Add Season via API
          </Button>
        </div>
      </div>

      {/* API SEASON IMPORTER MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#11111a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Import Season via API Keys</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsImportModalOpen(false)} className="h-8 w-8 text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Provider Selector Tabs */}
            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 text-xs">
              {[
                { id: "anilist", label: "AniList GraphQL API", icon: Database },
                { id: "tmdb", label: "TMDB API v3", icon: Film },
                { id: "simkl", label: "Simkl API", icon: Sparkles },
                { id: "manual", label: "Manual Blank Season", icon: Plus },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setApiProvider(p.id as any);
                      setApiSearchResults([]);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                      apiProvider === p.id 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input Box */}
            {apiProvider !== "manual" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={apiSearchQuery}
                    onChange={(e) => setApiSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApiSearch()}
                    placeholder={`Search ${apiProvider.toUpperCase()} title or enter ${apiProvider.toUpperCase()} ID...`}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                  <Button
                    size="sm"
                    onClick={handleApiSearch}
                    disabled={isFetchingApi}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl gap-1.5"
                  >
                    <Search className={`h-3.5 w-3.5 ${isFetchingApi ? "animate-spin" : ""}`} />
                    {isFetchingApi ? "Fetching..." : "Fetch Metadata"}
                  </Button>
                </div>

                {/* API Search Results List */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {apiSearchResults.length === 0 && !isFetchingApi && (
                    <p className="text-xs text-zinc-500 text-center py-6">
                      Enter a title or ID above and click Fetch Metadata to preview season details.
                    </p>
                  )}

                  {apiSearchResults.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl hover:border-primary/40 transition-all gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-16 w-12 rounded-lg bg-black/60 overflow-hidden shrink-0 border border-white/10">
                          {res.poster ? (
                            <img src={res.poster} alt={res.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">No img</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{res.title}</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {res.episodes} Episodes • Released {res.year}
                          </p>
                          {res.description && (
                            <p className="text-[9.5px] text-zinc-500 line-clamp-1 mt-0.5">{res.description}</p>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleImportSelectedSeason(res)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase rounded-lg gap-1.5 shrink-0"
                      >
                        <Download className="h-3 w-3" /> Import Season
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3">
                <p className="text-xs text-zinc-300">
                  Create a custom blank season entry manually without connecting to external API keys.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    const newSeason = {
                      id: `manual-season-${Date.now()}`,
                      title: `New Season ${installments.length + 1}`,
                      year: new Date().getFullYear(),
                      episodes: 12,
                      status: "Published",
                      tag: "SEASON ARC",
                      poster: "",
                      banner: "",
                      description: ""
                    };
                    setInstallments([...installments, newSeason]);
                    setActiveSeason(newSeason);
                    setIsImportModalOpen(false);
                    toast.success("Created new manual season!");
                  }}
                  className="bg-primary text-primary-foreground text-xs font-black uppercase rounded-xl gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Blank Season
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeSeason ? (
        <Card className="bg-[#11111a] border-white/5 space-y-4">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/5 gap-3">
            <div className="space-y-1 text-left">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Franchise Seasons & Specials Classifier ({installments.length} Installments)
              </CardTitle>
              <p className="text-[11px] text-zinc-400 font-medium">
                Manage, reorder, and classify season installments. Select seasons with checkboxes to perform bulk actions.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (selectedSeasonIds.length === installments.length) {
                    setSelectedSeasonIds([]);
                  } else {
                    setSelectedSeasonIds(installments.map(s => String(s.id)));
                  }
                }}
                className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-zinc-300 hover:text-white hover:border-primary/40 transition-all"
              >
                {selectedSeasonIds.length === installments.length ? "Deselect All" : "Select All Seasons"}
              </button>
              <Badge className={dataSource === "local" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-black uppercase" : "bg-purple-500/10 text-purple-300 border-purple-500/20 text-[10px] font-black uppercase"}>
                {dataSource === "local" ? "🌐 Local Site Data Active" : "⚡ Live API Data"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* FLOATING / INLINE BULK ACTION TOOLBAR */}
            {selectedSeasonIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between p-3.5 bg-primary/10 border border-primary/30 rounded-2xl gap-3 animate-in fade-in shadow-xl">
                <div className="flex items-center gap-2 text-xs font-black text-white">
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  <span>{selectedSeasonIds.length} Seasons Selected</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => {
                      setInstallments(prev => prev.map(s => selectedSeasonIds.includes(String(s.id)) ? { ...s, status: "Published" } : s));
                      toast.success(`Published ${selectedSeasonIds.length} selected seasons!`);
                    }}
                    className="h-8 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3"
                  >
                    Publish Selected
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setInstallments(prev => prev.map(s => selectedSeasonIds.includes(String(s.id)) ? { ...s, status: "Draft" } : s));
                      toast.warning(`Drafted ${selectedSeasonIds.length} selected seasons.`);
                    }}
                    className="h-8 text-xs font-black bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl px-3"
                  >
                    Draft Selected
                  </Button>
                  {dataSource === "api" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const selectedItems = installments.filter(s => selectedSeasonIds.includes(String(s.id)));
                        selectedItems.forEach(matched => {
                          saveBrandingOverrides(selectedFranchise, matched.id, {
                            poster: matched.poster || undefined,
                            banner: matched.banner || undefined
                          });
                        });
                        toast.success(`Imported & Synced ${selectedItems.length} live API seasons to Local Site Data!`);
                        setDataSource("local");
                        setSelectedSeasonIds([]);
                      }}
                      className="h-8 text-xs font-black bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-3 shadow-lg shadow-purple-900/30"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Import Selected Seasons to Local Site
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* EXPANDED SEASON CARDS GRID (Grid layout with larger poster cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {installments.map((s) => {
                const isChecked = selectedSeasonIds.includes(String(s.id));
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "relative p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left group bg-[#090a10]",
                      isChecked
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                    )}
                  >
                    {/* Checkbox selector */}
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const sid = String(s.id);
                          setSelectedSeasonIds(prev =>
                            prev.includes(sid) ? prev.filter(i => i !== sid) : [...prev, sid]
                          );
                        }}
                        className="h-4 w-4 rounded border-white/20 accent-primary cursor-pointer shadow-md"
                      />
                    </div>

                    {/* Larger Poster Image */}
                    <div className="h-40 w-28 sm:h-44 sm:w-30 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 shadow-lg group-hover:border-primary/40 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-500 relative ml-6 sm:ml-0">
                      {s.poster ? (
                        <img src={s.poster} alt={s.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-zinc-500">No poster</div>
                      )}
                      {s.logo && (
                        <div className="absolute top-1.5 left-1.5 bg-black/85 border border-cyan-400/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-cyan-300 backdrop-blur-md shadow">
                          LOGO
                        </div>
                      )}
                    </div>

                    {/* Details content */}
                    <div className="flex-1 min-w-0 space-y-1.5 w-full">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3
                          className="text-base font-black text-white group-hover:text-primary transition-colors cursor-pointer truncate"
                          onClick={() => openSeasonEditor(s)}
                        >
                          {s.title}
                        </h3>
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 bg-primary/10 text-primary px-2 py-0.5 shrink-0">
                          {s.tag}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold flex-wrap">
                        <span>{s.episodes} Episodes</span>
                        <span>•</span>
                        <span>{s.year}</span>
                        <Badge className={s.status === "Published" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black" : "bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black"}>
                          {s.status}
                        </Badge>
                      </div>

                      {s.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {s.description}
                        </p>
                      )}

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSeasonEditor(s)}
                          className="h-8 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 gap-1.5 rounded-xl flex-1 sm:flex-none"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit Details
                        </Button>
                        {dataSource === "api" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              saveBrandingOverrides(selectedFranchise, s.id, {
                                poster: s.poster || undefined,
                                banner: s.banner || undefined
                              });
                              toast.success(`Synced ${s.title} to Local Data!`);
                              setDataSource("local");
                            }}
                            className="h-8 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1 rounded-xl"
                          >
                            <Download className="h-3.5 w-3.5" /> Sync
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleStatus(s.id)}
                          className="h-8 w-8 hover:bg-white/5 text-zinc-400"
                          title="Toggle visibility"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => setActiveSeason(null)} variant="outline" className="border-white/10 bg-white/5 text-white text-xs rounded-xl">
                ← Back to List
              </Button>
              <h2 className="text-lg font-black">{activeSeason.title} Editor</h2>
            </div>
            <Button size="sm" onClick={handleSaveActiveSeason} className="bg-primary text-white font-bold gap-1 text-xs rounded-xl">
              <Save className="h-3.5 w-3.5" /> Save Season Changes
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-4">
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Season Metadata</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Title</label>
                    <input 
                      type="text" 
                      value={activeSeason.title} 
                      onChange={(e) => handleActiveSeasonChange("title", e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Role Tag (e.g. SPECIAL EVENT / MAIN STORY)</label>
                    <input 
                      type="text" 
                      value={activeSeason.tag} 
                      onChange={(e) => handleActiveSeasonChange("tag", e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Episodes Count</label>
                    <input 
                      type="number" 
                      value={activeSeason.episodes} 
                      onChange={(e) => handleActiveSeasonChange("episodes", parseInt(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">TMDB Season # (0=Specials)</label>
                    <input 
                      type="number" 
                      value={activeSeason.seasonNumber !== undefined ? activeSeason.seasonNumber : (activeSeason.tag?.includes("SPECIAL") || activeSeason.title?.toLowerCase().includes("special") ? 0 : 1)} 
                      onChange={(e) => handleActiveSeasonChange("seasonNumber", parseInt(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Release Year</label>
                    <input 
                      type="number" 
                      value={activeSeason.year} 
                      onChange={(e) => handleActiveSeasonChange("year", parseInt(e.target.value) || 2024)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Publication Status</label>
                    <select
                      value={activeSeason.status}
                      onChange={(e) => handleActiveSeasonChange("status", e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Published">Published (Live)</option>
                      <option value="Draft">Draft (Admin Only)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-cyan-400 font-bold">TMDB Show ID</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 227282"
                      value={activeSeason.tmdbId || ""} 
                      onChange={(e) => handleActiveSeasonChange("tmdbId", parseInt(e.target.value) || undefined)}
                      className="w-full bg-black/40 border border-cyan-500/30 rounded-xl p-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-purple-400 font-bold">Simkl Show ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1972214"
                      value={activeSeason.simklId || ""} 
                      onChange={(e) => handleActiveSeasonChange("simklId", e.target.value)}
                      className="w-full bg-black/40 border border-purple-500/30 rounded-xl p-2.5 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-400" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Synopsis / Description</label>
                  <textarea 
                    rows={3} 
                    value={activeSeason.description || ""} 
                    onChange={(e) => handleActiveSeasonChange("description", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                  />
                </div>
              </Card>

              {/* SEASON EPISODE CLASSIFIER & SINGLE-CALL BULK STILL HARVESTER */}
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      Episode Classification & Stills Harvester ({activeSeason.episodes || 12} Episodes)
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Classify episodes for {activeSeason.title}, harvest TMDB stills, and tick to select which episode stills to apply.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* TMDB Show ID Override Badge */}
                    <div className="flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/30 rounded-xl px-2 py-1" title="Target TMDB Show ID used for episode still harvesting">
                      <span className="text-[9px] font-black uppercase text-cyan-400">TMDB ID:</span>
                      <input
                        type="number"
                        value={activeSeason.tmdbId || (selectedFranchise.toLowerCase().includes("demon") ? 227282 : 79481)}
                        onChange={(e) => handleActiveSeasonChange("tmdbId", parseInt(e.target.value) || undefined)}
                        className="w-14 bg-transparent text-[10px] font-mono font-bold text-cyan-300 focus:outline-none text-center"
                      />
                    </div>

                    {/* TMDB Target Season & Start Episode Dropdowns */}
                    <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl px-2.5 py-1">
                      <span className="text-[9px] font-black uppercase text-zinc-400">Harvest:</span>
                      <select
                        value={harvestSourceSeason}
                        onChange={(e) => setHarvestSourceSeason(e.target.value)}
                        className="bg-transparent text-[10px] font-bold text-primary focus:outline-none cursor-pointer"
                      >
                        <option value="auto" className="bg-[#11111a] text-white">Auto Detect (Season {activeSeason.seasonNumber !== undefined ? activeSeason.seasonNumber : (activeSeason.tag?.includes("SPECIAL") || activeSeason.title?.toLowerCase().includes("special") ? 0 : 1)})</option>
                        <option value="0" className="bg-[#11111a] text-white">TMDB Season 0 (Specials)</option>
                        <option value="1" className="bg-[#11111a] text-white">TMDB Season 1</option>
                        <option value="2" className="bg-[#11111a] text-white">TMDB Season 2</option>
                        <option value="3" className="bg-[#11111a] text-white">TMDB Season 3</option>
                        <option value="4" className="bg-[#11111a] text-white">TMDB Season 4</option>
                        <option value="5" className="bg-[#11111a] text-white">TMDB Season 5</option>
                        <option value="all" className="bg-[#11111a] text-white">All Seasons (Merge)</option>
                      </select>

                      <span className="text-[9px] font-black uppercase text-zinc-500 border-l border-white/10 pl-1.5">Start Ep #:</span>
                      <input
                        type="number"
                        min={1}
                        value={startEpOffset}
                        onChange={(e) => setStartEpOffset(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 bg-transparent text-[10px] font-bold text-cyan-300 focus:outline-none text-center"
                        title="TMDB Episode Start Offset (e.g. set to 6 for Three-Year Agreement in Season 0)"
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const totalEps = activeSeason.episodes || 12;
                        const allTicked = Array.from({ length: totalEps }).every((_, i) => tickedEpisodes[i + 1] !== false);
                        const nextState: Record<number, boolean> = {};
                        for (let i = 1; i <= totalEps; i++) {
                          nextState[i] = !allTicked;
                        }
                        setTickedEpisodes(nextState);
                      }}
                      className="border-white/10 hover:bg-white/5 text-[10px] font-black uppercase rounded-xl h-8 px-2.5"
                    >
                      {Array.from({ length: activeSeason.episodes || 12 }).every((_, i) => tickedEpisodes[i + 1] !== false) ? "Deselect All" : "Select All"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        let tmdbId = activeSeason.tmdbId || 
                                     KNOWN_TMDB_IDS[selectedFranchise.toLowerCase()] || 
                                     KNOWN_TMDB_IDS[selectedFranchise.toLowerCase().replace(/[-_]+/g, " ")] || 
                                     KNOWN_TMDB_IDS[selectedFranchise.toLowerCase().replace(/\s+/g, "-")];
                        
                        if (!tmdbId) {
                          const searchRes = await fetchTmdbShowDetail(selectedFranchise || activeSeason.title || "");
                          if (searchRes?.results?.[0]?.id) {
                            tmdbId = searchRes.results[0].id;
                          }
                        }
                        if (!tmdbId) {
                          const lowerFranchise = selectedFranchise.toLowerCase();
                          tmdbId = lowerFranchise.includes("demon") || lowerFranchise.includes("cang") ? 227282 : 79481;
                        }
                        let defaultSeasonNum = activeSeason.seasonNumber;
                        if (defaultSeasonNum === undefined || defaultSeasonNum === null) {
                          if (activeSeason.tag?.includes("SPECIAL") || activeSeason.title?.toLowerCase().includes("special")) {
                            defaultSeasonNum = 0;
                          } else {
                            const match = activeSeason.title?.match(/Season\s*(\d+)/i);
                            defaultSeasonNum = match ? parseInt(match[1]) : 1;
                          }
                        }

                        let targetStills: Record<number, string> = {};
                        let targetTitles: Record<number, string> = {};
                        let s1Stills: Record<number, string> = {};
                        let s1Titles: Record<number, string> = {};
                        let simklStills: Record<number, string> = {};

                        try {
                          const fetchNum = harvestSourceSeason === "auto" ? defaultSeasonNum : (harvestSourceSeason === "all" ? 5 : parseInt(harvestSourceSeason));
                          toast.info(`Fetching TMDB & Simkl stills for ${activeSeason.title}...`);

                          if (harvestSourceSeason === "all") {
                            for (const sNum of [0, 1, 2, 3, 4, 5]) {
                              const { stills, titles } = await fetchTmdbSeasonDetails(tmdbId, sNum);
                              targetStills = { ...targetStills, ...stills };
                              targetTitles = { ...targetTitles, ...titles };
                            }
                          } else {
                            const res = await fetchTmdbSeasonDetails(tmdbId, fetchNum);
                            targetStills = res.stills;
                            targetTitles = res.titles;
                          }

                          // Always fetch Season 1 continuous stills for global offset fallback
                          const s1Res = await fetchTmdbSeasonDetails(tmdbId, 1);
                          s1Stills = s1Res.stills;
                          s1Titles = s1Res.titles;

                          // Fetch Simkl high-res episode stills if Simkl ID exists
                          const targetSimklId = activeSeason.simklId || (activeSeason.id === "btth-s5" ? "1972214" : undefined);
                          if (targetSimklId) {
                            try {
                              const sEps = await getSimklEpisodes(String(targetSimklId));
                              if (Array.isArray(sEps)) {
                                sEps.forEach((se: any) => {
                                  const epN = Number(se.episode);
                                  const epImg = se.image || se.img;
                                  if (epN && epImg) {
                                    simklStills[epN] = epImg;
                                  }
                                });
                              }
                            } catch (e) {
                              console.warn("Simkl episodes fetch fallback:", e);
                            }
                          }

                          // Fetch TMDB HD Backdrops to use as dynamic 16:9 episode stills when TMDB has no still_path
                          const { backdrops } = await getTmdbImages(tmdbId);

                          const activeIdx = installments.findIndex(s => s.id === activeSeason.id);
                          let prevEpSum = 0;
                          if (activeIdx > 0) {
                            for (let p = 0; p < activeIdx; p++) {
                              prevEpSum += (installments[p].episodes || (installments[p] as any).episodesCount || 0);
                            }
                          }

                          const offset = startEpOffset > 1 ? startEpOffset : (prevEpSum > 0 ? prevEpSum + 1 : 1);
                          const totalEps = activeSeason.episodes || 12;

                          const mappedStills: Record<number, string> = {};
                          const mappedTitles: Record<number, string> = {};

                          const sortedRawKeys = Object.keys(targetStills).map(Number).sort((a, b) => a - b);

                          for (let i = 1; i <= totalEps; i++) {
                            const targetTmdbEp = i + offset - 1;

                            // 1. Direct target season still (e.g. S5 Ep i)
                            if (targetStills[targetTmdbEp]) {
                              mappedStills[i] = targetStills[targetTmdbEp];
                            }
                            // 2. Existing verified episode still from registry/overrides
                            else if (activeSeason.verifiedEpisodeThumbnails?.[i]) {
                              mappedStills[i] = activeSeason.verifiedEpisodeThumbnails[i];
                            }
                            // 3. Simkl High-Res Episode Still
                            else if (simklStills[i]) {
                              mappedStills[i] = simklStills[i];
                            }
                            // 4. Global TMDB S1 Offset Fallback (e.g. S5 Ep 163 -> S1 Ep 163+52 = 215)
                            else if (fetchNum === 5 && s1Stills[i + 52]) {
                              mappedStills[i] = s1Stills[i + 52];
                            } else if (s1Stills[targetTmdbEp]) {
                              mappedStills[i] = s1Stills[targetTmdbEp];
                            } else if (s1Stills[i]) {
                              mappedStills[i] = s1Stills[i];
                            } else {
                              const fallbackIdx = (i - 1) + (offset - 1);
                              if (sortedRawKeys[fallbackIdx] && targetStills[sortedRawKeys[fallbackIdx]]) {
                                mappedStills[i] = targetStills[sortedRawKeys[fallbackIdx]];
                              } else if (backdrops && backdrops.length > 0) {
                                mappedStills[i] = backdrops[(i - 1) % backdrops.length].thumb;
                              }
                            }

                            if (targetTitles[targetTmdbEp]) {
                              mappedTitles[i] = targetTitles[targetTmdbEp];
                            } else if (activeSeason.verifiedEpisodeTitles?.[i]) {
                              mappedTitles[i] = activeSeason.verifiedEpisodeTitles[i];
                            } else if (fetchNum === 5 && s1Titles[i + 52]) {
                              mappedTitles[i] = s1Titles[i + 52];
                            } else if (s1Titles[i]) {
                              mappedTitles[i] = s1Titles[i];
                            }
                          }

                          if (Object.keys(mappedStills).length > 0) {
                            // Atomic functional update to prevent React stale closure race conditions
                            setActiveSeason((prev: any) => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                episodes: totalEps,
                                verifiedEpisodeThumbnails: {
                                  ...(prev.verifiedEpisodeThumbnails || {}),
                                  ...mappedStills
                                },
                                verifiedEpisodeTitles: {
                                  ...(prev.verifiedEpisodeTitles || {}),
                                  ...mappedTitles
                                }
                              };
                            });

                            // Automatically tick all fetched episodes by default
                            const newTicked: Record<number, boolean> = {};
                            for (let epNum = 1; epNum <= totalEps; epNum++) {
                              newTicked[epNum] = true;
                            }
                            setTickedEpisodes(newTicked);

                            toast.success(`Harvested ${Object.keys(mappedStills).length} episode stills for ${activeSeason.title} (Total ${totalEps} episodes)!`);
                          } else {
                            toast.warning("No episode stills found for this season.");
                          }
                        } catch (err) {
                          toast.error("Could not fetch API stills.");
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase rounded-xl gap-1.5 h-8 px-3 shrink-0 shadow-lg shadow-purple-900/30"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> ⚡ Bulk Harvest Stills
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[540px] overflow-y-auto pr-1.5 p-1 scrollbar-thin">
                  {Array.from({ length: activeSeason.episodes || 12 }).map((_, i) => {
                    const epNum = i + 1;
                    const verifiedThumb = activeSeason.verifiedEpisodeThumbnails?.[epNum] || activeSeason.poster;
                    const isChecked = tickedEpisodes[epNum] !== false;

                    return (
                      <div key={i} className={cn(
                        "p-3 bg-black/60 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 group transition-all shadow-md",
                        isChecked ? "border-purple-500/50 bg-black/80 hover:border-purple-400" : "border-white/10 opacity-60 hover:opacity-100"
                      )}>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              setTickedEpisodes(prev => ({
                                ...prev,
                                [epNum]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500 bg-black cursor-pointer shrink-0" 
                          />
                          <Badge className={cn(
                            "text-[9px] font-black uppercase",
                            isChecked ? "bg-purple-950/80 text-purple-300 border border-purple-500/30" : "bg-zinc-800 text-zinc-400"
                          )}>
                            EP #{epNum}
                          </Badge>
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider sm:hidden",
                            isChecked ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                          )}>
                            {isChecked ? "Live" : "Off"}
                          </span>
                        </div>

                        {/* Widescreen 16:9 High-Res Episode Still Preview */}
                        <div className="w-full sm:w-32 h-20 rounded-xl overflow-hidden bg-black/90 border border-white/15 shrink-0 relative shadow-md group-hover:border-primary/50 transition-all">
                          {verifiedThumb ? (
                            <img src={verifiedThumb} alt={`EP ${epNum}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[9px] text-zinc-500 font-bold p-1 text-center">
                              <span>No still</span>
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                            EP {epNum}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5 w-full">
                          <div className="hidden sm:flex items-center justify-between gap-1">
                            <span className="font-black text-white text-xs truncate">
                              {activeSeason.verifiedEpisodeTitles?.[epNum] || `Episode ${epNum}`}
                            </span>
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase",
                              isChecked ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                            )}>
                              {isChecked ? "Live" : "Off"}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={activeSeason.verifiedEpisodeThumbnails?.[epNum] || ""}
                            onChange={(e) => {
                              const newThumb = e.target.value;
                              handleActiveSeasonChange("verifiedEpisodeThumbnails", {
                                ...(activeSeason.verifiedEpisodeThumbnails || {}),
                                [epNum]: newThumb
                              });
                              setTickedEpisodes(prev => ({ ...prev, [epNum]: true }));
                            }}
                            placeholder="Custom EP still URL..."
                            className="w-full bg-black/70 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-primary font-mono focus:outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="md:col-span-4 space-y-4">
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">Poster & Media Configuration</h3>
                  <Button
                    size="sm"
                    onClick={handleFetchSeasonArtwork}
                    disabled={isFetchingSeasonArtwork}
                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[10px] font-black uppercase rounded-lg gap-1.5 h-7 px-2 shrink-0"
                  >
                    <Sparkles className="w-3 h-3" /> Harvest API Artwork
                  </Button>
                </div>

                {/* HARVESTED SEASON ARTWORK CANDIDATES SELECTOR */}
                {seasonArtworkCandidates.length > 0 && (
                  <div className="p-3 bg-black/40 border border-primary/20 rounded-2xl space-y-2 animate-in fade-in">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                      Select Season Artwork from API ({seasonArtworkCandidates.length} options):
                    </span>
                    <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto scrollbar-thin">
                      {seasonArtworkCandidates.map((cand, idx) => (
                        <div
                          key={cand.url + idx}
                          className="group relative h-20 rounded-lg overflow-hidden border border-white/10 hover:border-primary transition-all cursor-pointer bg-black"
                        >
                          <img src={cand.url} alt={cand.source} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 p-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleActiveSeasonChange("poster", cand.url);
                                toast.success(`Set as Season Poster!`);
                              }}
                              className="w-full bg-emerald-500 text-black text-[8px] font-black uppercase rounded py-0.5"
                            >
                              + Poster
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleActiveSeasonChange("banner", cand.url);
                                toast.success(`Set as Season Banner!`);
                              }}
                              className="w-full bg-primary text-black text-[8px] font-black uppercase rounded py-0.5"
                            >
                              + Banner
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleActiveSeasonChange("logo", cand.url);
                                toast.success(`Set as Season Logo!`);
                              }}
                              className="w-full bg-cyan-400 text-black text-[8px] font-black uppercase rounded py-0.5"
                            >
                              + Logo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Season Poster Image URL</label>
                  <input 
                    type="text" 
                    value={activeSeason.poster || ""} 
                    onChange={(e) => handleActiveSeasonChange("poster", e.target.value)}
                    placeholder="https://..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                  />
                </div>

                {activeSeason.poster && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[9px] font-black uppercase text-primary block tracking-wider">Season Poster Preview</span>
                    <div className="h-44 w-28 rounded-xl overflow-hidden border border-white/15 bg-black shadow-lg">
                      <img src={activeSeason.poster} alt="Poster preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                )}

                <div className="space-y-1 pt-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Season Banner Image URL</label>
                  <input 
                    type="text" 
                    value={activeSeason.banner || ""} 
                    onChange={(e) => handleActiveSeasonChange("banner", e.target.value)}
                    placeholder="https://..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary" 
                  />
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Season Calligraphic Logo PNG URL</label>
                  <input 
                    type="text" 
                    value={activeSeason.logo || ""} 
                    onChange={(e) => handleActiveSeasonChange("logo", e.target.value)}
                    placeholder="https://..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400" 
                  />
                </div>

                {activeSeason.logo && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[9px] font-black uppercase text-cyan-400 block tracking-wider">Season Logo Preview</span>
                    <div className="h-16 w-full rounded-xl overflow-hidden border border-white/15 bg-black/80 p-2 flex items-center justify-center">
                      <img src={activeSeason.logo} alt="Logo preview" className="h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                )}

                {/* Season Logo Display Mode Preference */}
                <div className="pt-2 space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">
                    Season Logo Display Mode:
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => handleActiveSeasonChange("logoDisplayMode", "both")}
                      className={`px-1.5 py-1 rounded-lg text-[8.5px] font-bold uppercase transition-all ${
                        (activeSeason.logoDisplayMode || "desktop_only") === "both" ? "bg-primary text-black font-black" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Both Screens
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActiveSeasonChange("logoDisplayMode", "desktop_only")}
                      className={`px-1.5 py-1 rounded-lg text-[8.5px] font-bold uppercase transition-all ${
                        (activeSeason.logoDisplayMode || "desktop_only") === "desktop_only" ? "bg-primary text-black font-black" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Desktop Only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActiveSeasonChange("logoDisplayMode", "none")}
                      className={`px-1.5 py-1 rounded-lg text-[8.5px] font-bold uppercase transition-all ${
                        (activeSeason.logoDisplayMode || "desktop_only") === "none" ? "bg-primary text-black font-black" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Text Only
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonsManager;
