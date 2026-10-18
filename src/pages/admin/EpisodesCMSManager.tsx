import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Play, 
  Sparkles, 
  Edit, 
  Trash2, 
  Plus, 
  Check, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  Link as LinkIcon,
  RefreshCw,
  Film,
  Layers,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { findUniverseBySlug, UNIVERSES_REGISTRY } from "@/data/universeData";
import { fetchTmdbSeasonDetails, fetchTmdbEpisodeStillByMetadata, KNOWN_TMDB_IDS } from "@/services/metadata/externalApis";
import { fetchLiveTmdbSeasons, fetchLiveTmdbSeasonEpisodes } from "@/services/tmdbSeasonIngestion";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getBrandingOverrides, saveBrandingOverrides } from "@/lib/overrides";
import { getTmdbImages } from "@/services/tmdbAnime";
import { resolveAnimeId } from "@/services/anime";


interface EpisodeCMSEntry {
  id: string;
  seasonId: string;
  seasonTitle: string;
  relativeNumber: number;
  absoluteNumber: number;
  title: string;
  thumbnail: string;
  tmdbThumbnail?: string;
  simklThumbnail?: string;
  embedUrl: string;
  duration: string;
  airDate?: string;
  status: "Published" | "Draft";
  isMovie?: boolean;
}

interface EpisodesCMSManagerProps {
  animeSlug?: string;
}

export const EpisodesCMSManager: React.FC<EpisodesCMSManagerProps> = ({ animeSlug }) => {
  const [selectedFranchise, setSelectedFranchise] = useState(animeSlug || "battle-through-the-heavens");

  useEffect(() => {
    if (animeSlug) {
      setSelectedFranchise(animeSlug);
    }
  }, [animeSlug]);

  const [dataSource, setDataSource] = useState<"local" | "api">("local");
  const [installments, setInstallments] = useState<any[]>([]);
  const [activeInstallmentId, setActiveInstallmentId] = useState<string>("");
  const [episodesMap, setEpisodesMap] = useState<Record<string, EpisodeCMSEntry[]>>({});
  const [isLoadingStills, setIsLoadingStills] = useState<boolean>(false);
  const [editingEp, setEditingEp] = useState<EpisodeCMSEntry | null>(null);
  const [selectedEpIds, setSelectedEpIds] = useState<Set<string>>(new Set());
  const [reloadTick, setReloadTick] = useState<number>(0);

  // Live event listener: Increment reloadTick to re-populate active installment whenever branding overrides or season updates saved in CMS
  useEffect(() => {
    const handleUpdate = () => {
      setReloadTick(t => t + 1);
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("branding_overrides_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("branding_overrides_updated", handleUpdate);
    };
  }, []);

  // Load franchise installments based on chosen dataSource ("local" vs "api")
  useEffect(() => {
    let isCancelled = false;

    const loadSeasons = async () => {
      if (dataSource === "api") {
        const { seasons: liveSeasons } = await fetchLiveTmdbSeasons(selectedFranchise);
        if (!isCancelled && liveSeasons && liveSeasons.length > 0) {
          setInstallments(liveSeasons);
          if (!activeInstallmentId || !liveSeasons.some(i => String(i.id) === activeInstallmentId)) {
            setActiveInstallmentId(String(liveSeasons[0].id));
          }
          return;
        }
      }

      // Check local website universe registry FIRST for exact 1:1 match with public site
      const slugKey = selectedFranchise.toLowerCase().trim();
      const uni = findUniverseBySlug(slugKey) || 
                  findUniverseBySlug(slugKey.replace(/[-_]+/g, " ")) || 
                  UNIVERSES_REGISTRY.find(u => u.slug === slugKey || u.slug.includes(slugKey) || slugKey.includes(u.slug));

      if (!isCancelled && uni && uni.installments && uni.installments.length > 0) {
        setInstallments(uni.installments);
        if (!activeInstallmentId || !uni.installments.some(i => String(i.id) === activeInstallmentId)) {
          setActiveInstallmentId(String(uni.installments[0].id));
        }
        return;
      }

      // Fallback to live TMDB API seasons if local site has no custom installments
      const { seasons: liveSeasons } = await fetchLiveTmdbSeasons(selectedFranchise);
      if (!isCancelled && liveSeasons && liveSeasons.length > 0) {
        setInstallments(liveSeasons);
        setActiveInstallmentId(String(liveSeasons[0].id));
        return;
      }

      // Fallback default
      if (!isCancelled) {
        const defaultInst = [
          { id: "season-1", title: "Season 1", episodesCount: 12, year: 2024, tmdbId: 79481, seasonNumber: 1 }
        ];
        setInstallments(defaultInst);
        setActiveInstallmentId("season-1");
      }
    };

    loadSeasons();

    return () => { isCancelled = true; };
  }, [selectedFranchise, dataSource]);

  // Generate / Load episodes for active installment
  useEffect(() => {
    if (!activeInstallmentId) return;

    const currentInst = installments.find(i => String(i.id) === activeInstallmentId);
    if (!currentInst) return;

    let cumulativeAbsCount = 0;
    for (const inst of installments) {
      if (String(inst.id) === activeInstallmentId) break;
      cumulativeAbsCount += (inst.episodesCount || 0);
    }

    const seasonSlug = currentInst.slug || currentInst.id || `season-${currentInst.seasonNumber || 1}`;

    const populateEpisodes = async () => {
      let liveEpisodes: any[] = [];
      let tmdbBackdrops: string[] = [];
      const tmdbSeasonNum = currentInst.tmdbSourceSeason !== undefined ? currentInst.tmdbSourceSeason : (currentInst.seasonNumber !== undefined ? currentInst.seasonNumber : 1);
      
      const targetTmdbId = currentInst.tmdbId || 
                           (currentInst as any).tmdbId || 
                           KNOWN_TMDB_IDS[selectedFranchise.toLowerCase()] || 
                           KNOWN_TMDB_IDS[selectedFranchise.toLowerCase().replace(/[-_]+/g, " ")] || 
                           KNOWN_TMDB_IDS[selectedFranchise.toLowerCase().replace(/\s+/g, "-")] || 
                           (selectedFranchise.toLowerCase().includes("demon") ? 227282 : 79481);

      if (targetTmdbId) {
        try {
          liveEpisodes = await fetchLiveTmdbSeasonEpisodes(targetTmdbId, tmdbSeasonNum);
          if (!liveEpisodes || liveEpisodes.length === 0) {
            liveEpisodes = await fetchLiveTmdbSeasonEpisodes(targetTmdbId, 1);
          }
          const { backdrops } = await getTmdbImages(targetTmdbId);
          if (backdrops && backdrops.length > 0) {
            tmdbBackdrops = backdrops.map(b => b.url || b.thumb);
          }
        } catch {
          // Fallback to local generator
        }
      }

      const epCount = currentInst.episodesCount || (liveEpisodes.length > 0 ? liveEpisodes.length : 12);
      const generatedEps: EpisodeCMSEntry[] = [];

      for (let i = 1; i <= epCount; i++) {
        const absNum = currentInst.startEpisode ? (currentInst.startEpisode + i - 1) : (cumulativeAbsCount + i);
        const liveEp = liveEpisodes.find(e => e.episodeNumber === absNum) || liveEpisodes.find(e => e.episodeNumber === i);
        
        // Dynamic Branding Overrides resolution (for instant live sync across CMS tabs)
        const override = getBrandingOverrides(selectedFranchise, activeInstallmentId);
        const verifiedThumb = override.verifiedEpisodeThumbnails?.[i] || 
                              override.verifiedEpisodeThumbnails?.[absNum] || 
                              currentInst.verifiedEpisodeThumbnails?.[i] || 
                              currentInst.verifiedEpisodeThumbnails?.[absNum];

        const verifiedTitle = override.verifiedEpisodeTitles?.[i] || 
                             override.verifiedEpisodeTitles?.[absNum] || 
                             currentInst.verifiedEpisodeTitles?.[i] || 
                             currentInst.verifiedEpisodeTitles?.[absNum];

        const activePoster = override.poster || currentInst.poster || "";
        const fallbackStill = tmdbBackdrops.length > 0 
          ? tmdbBackdrops[(i - 1) % tmdbBackdrops.length] 
          : (activePoster || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&fit=crop");

        const epTitle = verifiedTitle || (liveEp?.title && !liveEp.title.toLowerCase().startsWith("episode ") ? liveEp.title : `Episode ${i}`);
        const epThumb = verifiedThumb || (liveEp?.stillUrl ? liveEp.stillUrl : fallbackStill);

        generatedEps.push({
          id: `${activeInstallmentId}-ep-${i}`,
          seasonId: activeInstallmentId,
          seasonTitle: currentInst.title,
          relativeNumber: i,
          absoluteNumber: absNum,
          title: epTitle,
          thumbnail: epThumb,
          tmdbThumbnail: verifiedThumb || liveEp?.stillUrl || fallbackStill,
          embedUrl: `https://stream.donghuastream.org/embed/${selectedFranchise}/${seasonSlug}/ep-${i}.m3u8`,
          duration: "24m",
          airDate: liveEp?.airDate || currentInst.releaseDate || `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
          status: i > (epCount - 2) ? "Draft" : "Published",
          isMovie: currentInst.type === "Movie"
        });
      }

      setEpisodesMap(prev => ({
        ...prev,
        [activeInstallmentId]: generatedEps
      }));
    };

    populateEpisodes();
  }, [activeInstallmentId, installments, selectedFranchise, reloadTick]);

  // Current Season Episodes
  const currentEpisodes = episodesMap[activeInstallmentId] || [];

  const toggleSelectEp = (epId: string) => {
    setSelectedEpIds(prev => {
      const next = new Set(prev);
      if (next.has(epId)) next.delete(epId);
      else next.add(epId);
      return next;
    });
  };

  const toggleSelectAllEps = () => {
    if (selectedEpIds.size === currentEpisodes.length) {
      setSelectedEpIds(new Set());
    } else {
      setSelectedEpIds(new Set(currentEpisodes.map(e => e.id)));
    }
  };

  const bulkUpdateStatus = async (status: "Published" | "Draft") => {
    if (selectedEpIds.size === 0) return;
    const isPublished = status === "Published";
    const selectedEps = currentEpisodes.filter(e => selectedEpIds.has(e.id));

    setEpisodesMap(prev => {
      const list = prev[activeInstallmentId] || [];
      const updated = list.map(ep => selectedEpIds.has(ep.id) ? { ...ep, status } : ep);
      return { ...prev, [activeInstallmentId]: updated };
    });
    toast.success(`Updated ${selectedEpIds.size} episodes to ${status}!`);

    try {
      const animeId = await resolveAnimeId(selectedFranchise);

      if (animeId) {
        const dbUpdates = selectedEps.map(ep => ({
          anime_id: animeId,
          episode_number: ep.absoluteNumber || ep.relativeNumber,
          title: ep.title,
          thumbnail_url: ep.thumbnail,
          is_published: isPublished
        }));
        if (dbUpdates.length > 0) {
          const { error } = await supabase.from('episodes').upsert(dbUpdates, { onConflict: 'anime_id,episode_number' });
          if (error) {
            console.error("Failed persisting bulk episode status:", error);
            toast.error(`Database save failed: ${error.message}`);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed persisting bulk episode status:", err);
    }
  };

  // Toggle Published / Draft status (persisted to DB)
  const toggleEpStatus = async (epId: string) => {
    const targetEp = currentEpisodes.find(ep => ep.id === epId);
    if (!targetEp) return;

    const nextStatus: "Published" | "Draft" = targetEp.status === "Published" ? "Draft" : "Published";
    const isPublished = nextStatus === "Published";

    setEpisodesMap(prev => {
      const list = prev[activeInstallmentId] || [];
      const updated = list.map(ep => {
        if (ep.id === epId) {
          return { ...ep, status: nextStatus };
        }
        return ep;
      });
      return { ...prev, [activeInstallmentId]: updated };
    });

    toast.success(`Episode #${targetEp.relativeNumber} marked as ${nextStatus}`);

    try {
      if (/^\d+$/.test(epId)) {
        await supabase.from('episodes').update({ is_published: isPublished }).eq('id', parseInt(epId));
      } else if (targetEp.relativeNumber) {
        const animeId = await resolveAnimeId(selectedFranchise);

        if (animeId) {
          const targetEpNum = targetEp.absoluteNumber || targetEp.relativeNumber;
          const { error } = await supabase.from('episodes').upsert({
            anime_id: animeId,
            episode_number: targetEpNum,
            title: targetEp.title,
            thumbnail_url: targetEp.thumbnail,
            is_published: isPublished
          }, { onConflict: 'anime_id,episode_number' });

          if (error) {
            console.error("Failed persisting single episode status:", error);
            toast.error(`Database save failed: ${error.message}`);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed persisting single episode status:", err);
    }
  };

  // Auto-Fetch TMDB & Simkl Episode Stills & Titles
  const handleAutoFetchMetadata = async () => {
    const currentInst = installments.find(i => String(i.id) === activeInstallmentId);
    if (!currentInst) return;

    setIsLoadingStills(true);
    try {
      const lowerTitle = (currentInst.title || selectedFranchise || "").toLowerCase();
      const tmdbId = currentInst.tmdbId || (lowerTitle.includes("demon") ? 227282 : 79481);
      const seasonNum = currentInst.seasonNumber || 1;

      // Call external metadata API & backdrops
      const { stills, titles } = await fetchTmdbSeasonDetails(tmdbId, seasonNum);
      const { stills: s1Stills } = await fetchTmdbSeasonDetails(tmdbId, 1);
      const { backdrops } = await getTmdbImages(tmdbId);

      setEpisodesMap(prev => {
        const list = prev[activeInstallmentId] || [];
        const updated = list.map(ep => {
          const epNum = ep.relativeNumber;
          const absNum = ep.absoluteNumber;
          const fetchedStill = stills[epNum] || s1Stills[absNum] || s1Stills[epNum] || (backdrops.length > 0 ? backdrops[(epNum - 1) % backdrops.length].thumb : "");
          const fetchedTitle = titles[epNum] || titles[absNum];

          return {
            ...ep,
            tmdbThumbnail: fetchedStill || ep.tmdbThumbnail,
            thumbnail: fetchedStill || ep.thumbnail,
            title: (fetchedTitle && !fetchedTitle.startsWith("Episode ")) ? fetchedTitle : ep.title
          };
        });

        // Persist verified episode stills to branding overrides
        const mappedStillsObj: Record<number, string> = {};
        updated.forEach(e => {
          const targetNum = e.absoluteNumber || e.relativeNumber;
          if (e.thumbnail) mappedStillsObj[targetNum] = e.thumbnail;
        });

        const currentOverride = getBrandingOverrides(selectedFranchise, activeInstallmentId);
        saveBrandingOverrides(selectedFranchise, activeInstallmentId, {
          ...currentOverride,
          verifiedEpisodeThumbnails: {
            ...(currentOverride.verifiedEpisodeThumbnails || {}),
            ...mappedStillsObj
          },
          verifiedEpisodeTitles: {
            ...(currentOverride.verifiedEpisodeTitles || {}),
            ...titles
          }
        });

        return { ...prev, [activeInstallmentId]: updated };
      });

      toast.success(`Successfully updated episode metadata from TMDB!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch TMDB episode metadata.");
    } finally {
      setIsLoadingStills(false);
    }
  };

  // Import selected (or all) live API episodes to Local Site Data
  const handleImportSelectedToLocal = async () => {
    const targetEps = selectedEpIds.size > 0 
      ? currentEpisodes.filter(e => selectedEpIds.has(e.id))
      : currentEpisodes;

    if (targetEps.length === 0) {
      toast.error("No episodes selected to import!");
      return;
    }

    const mappedStillsObj: Record<number, string> = {};
    const mappedTitlesObj: Record<number, string> = {};

    targetEps.forEach(ep => {
      const still = ep.thumbnail || ep.tmdbThumbnail;
      const epKey = ep.absoluteNumber || ep.relativeNumber;
      if (still) mappedStillsObj[epKey] = still;
      if (ep.title && !ep.title.toLowerCase().startsWith("episode ")) {
        mappedTitlesObj[epKey] = ep.title;
      }
    });

    const currentOverride = getBrandingOverrides(selectedFranchise, activeInstallmentId);
    saveBrandingOverrides(selectedFranchise, activeInstallmentId, {
      ...currentOverride,
      verifiedEpisodeThumbnails: {
        ...(currentOverride.verifiedEpisodeThumbnails || {}),
        ...mappedStillsObj
      },
      verifiedEpisodeTitles: {
        ...(currentOverride.verifiedEpisodeTitles || {}),
        ...mappedTitlesObj
      }
    });

    // Also persist to Supabase database if available
    try {
      const animeId = await resolveAnimeId(selectedFranchise);

      if (animeId) {
        const dbPayload = targetEps.map(ep => ({
          anime_id: animeId,
          episode_number: ep.absoluteNumber || ep.relativeNumber,
          title: ep.title,
          thumbnail_url: ep.thumbnail || ep.tmdbThumbnail,
          is_published: true
        }));
        const { error } = await supabase.from("episodes").upsert(dbPayload, { onConflict: "anime_id,episode_number" });
        if (error) {
          console.error("Database upsert failed:", error);
          toast.error(`Database import failed: ${error.message}`);
        }
      }
    } catch (e) {
      console.warn("Database upsert fallback:", e);
    }

    toast.success(`Imported ${targetEps.length} episodes to Local Site Data!`);
    setDataSource("local");
  };

  // Save changes to Supabase or local state
  const handleSaveEpisodeEdits = async () => {
    if (!editingEp) return;

    setEpisodesMap(prev => {
      const list = prev[activeInstallmentId] || [];
      const updated = list.map(ep => ep.id === editingEp.id ? editingEp : ep);
      return { ...prev, [activeInstallmentId]: updated };
    });

    const currentOverride = getBrandingOverrides(selectedFranchise, activeInstallmentId);
    const epKey = editingEp.absoluteNumber || editingEp.relativeNumber;
    saveBrandingOverrides(selectedFranchise, activeInstallmentId, {
      ...currentOverride,
      verifiedEpisodeThumbnails: {
        ...(currentOverride.verifiedEpisodeThumbnails || {}),
        [epKey]: editingEp.thumbnail
      },
      verifiedEpisodeTitles: {
        ...(currentOverride.verifiedEpisodeTitles || {}),
        [epKey]: editingEp.title
      }
    });

    try {
      const animeId = await resolveAnimeId(selectedFranchise);

      if (animeId) {
        const targetEpNum = editingEp.absoluteNumber || editingEp.relativeNumber;
        const { error } = await supabase.from("episodes").upsert({
          anime_id: animeId,
          episode_number: targetEpNum,
          title: editingEp.title,
          thumbnail_url: editingEp.thumbnail,
          created_at: new Date().toISOString()
        }, { onConflict: "anime_id,episode_number" });

        if (error) {
          console.error("Supabase episode save error:", error);
          toast.error(`Database save failed: ${error.message}`);
        } else {
          toast.success(`Saved Episode #${targetEpNum} to Database!`);
        }
      }
    } catch (e: any) {
      console.warn("Saved episode locally", e);
    }

    toast.success(`Saved Episode #${editingEp.relativeNumber} details!`);
    setEditingEp(null);
  };

  // Add new episode
  const handleAddNewEpisode = () => {
    const list = currentEpisodes;
    const nextNum = list.length + 1;
    const newEp: EpisodeCMSEntry = {
      id: `${activeInstallmentId}-ep-${nextNum}`,
      seasonId: activeInstallmentId,
      seasonTitle: installments.find(i => String(i.id) === activeInstallmentId)?.title || "Season",
      relativeNumber: nextNum,
      absoluteNumber: nextNum,
      title: `Episode ${nextNum}`,
      thumbnail: "",
      embedUrl: "",
      duration: "24m",
      status: "Draft"
    };

    setEpisodesMap(prev => ({
      ...prev,
      [activeInstallmentId]: [...list, newEp]
    }));
    setEditingEp(newEp);
  };

  const currentInst = installments.find(i => String(i.id) === activeInstallmentId);

  return (
    <div className="space-y-6 text-left text-white min-w-0 max-w-full">
      {/* CMS HEADER & SEASON SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#11111a] border border-white/5 p-4 rounded-2xl min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white truncate">Season Episodes CMS</h3>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase shrink-0">
              {currentEpisodes.length} Episodes
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classify episodes per season arc, embed stream players, select TMDB stills, and set Draft/Published visibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
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

          <Button
            size="sm"
            onClick={handleAutoFetchMetadata}
            disabled={isLoadingStills}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl gap-1.5 shadow-lg shadow-purple-900/20"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isLoadingStills ? "animate-spin" : ""}`} />
            {isLoadingStills ? "Fetching..." : "Fetch TMDB / Simkl Stills"}
          </Button>

          <Button
            size="sm"
            onClick={handleAddNewEpisode}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase rounded-xl gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Episode
          </Button>
        </div>
      </div>

      {/* SEASON / INSTALLMENT TAB PILLS */}
      <div role="tablist" aria-label="Season Installments" className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5 min-w-0 max-w-full">
        {installments.map((inst, idx) => {
          const instId = String(inst.id);
          const isActive = instId === activeInstallmentId;
          const count = episodesMap[instId]?.length || inst.episodesCount || 0;

          return (
            <button
              key={instId}
              role="tab"
              aria-selected={isActive}
              aria-label={`${inst.title} - ${count} episodes`}
              onClick={() => setActiveInstallmentId(instId)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0 ${
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-[#11111a] text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              {inst.type === "Movie" ? <Film className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
              <span>{inst.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-black/20 text-white" : "bg-white/5 text-zinc-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* BULK ACTION CONTROL BAR */}
      <div className="flex items-center justify-between bg-[#11111a] border border-white/10 px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
            <input
              type="checkbox"
              checked={currentEpisodes.length > 0 && selectedEpIds.size === currentEpisodes.length}
              onChange={toggleSelectAllEps}
              className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500 bg-black/40"
            />
            <span>Select All ({selectedEpIds.size} / {currentEpisodes.length} Selected)</span>
          </label>
        </div>

        {selectedEpIds.size > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in flex-wrap">
            <Button
              size="sm"
              onClick={handleImportSelectedToLocal}
              className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold h-7 rounded-lg px-2.5 gap-1 shadow-lg shadow-purple-900/30"
            >
              <Sparkles className="h-3 w-3" />
              Import {selectedEpIds.size} to Local Site Data
            </Button>
            <Button
              size="sm"
              onClick={() => bulkUpdateStatus("Published")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-7 rounded-lg px-2.5"
            >
              Set Selected to Published ({selectedEpIds.size})
            </Button>
            <Button
              size="sm"
              onClick={() => bulkUpdateStatus("Draft")}
              className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold h-7 rounded-lg px-2.5"
            >
              Set Selected to Draft ({selectedEpIds.size})
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        {currentEpisodes.map((ep) => {
          const isDraft = ep.status === "Draft";
          const isChecked = selectedEpIds.has(ep.id);

          return (
            <Card key={ep.id} className={`bg-[#11111a] border-white/5 overflow-hidden group hover:border-primary/40 transition-all min-w-0 ${isDraft ? "opacity-80 border-dashed border-amber-500/30" : ""} ${isChecked ? "ring-2 ring-purple-500" : ""}`}>
              <div className="relative aspect-video bg-black/60 overflow-hidden">
                {/* OVERLAY BADGES */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelectEp(ep.id)}
                    className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500 bg-black/80 backdrop-blur cursor-pointer"
                  />
                  <Badge className="bg-black/80 backdrop-blur-md text-white border-white/10 text-[9px] font-black uppercase">
                    EP {ep.relativeNumber}
                  </Badge>
                  {ep.absoluteNumber && (
                    <Badge className="bg-purple-950/80 backdrop-blur-md text-purple-300 border-purple-500/20 text-[9px] font-black">
                      ABS #{ep.absoluteNumber}
                    </Badge>
                  )}
                </div>

                {ep.thumbnail ? (
                  <img
                    src={ep.thumbnail}
                    alt={ep.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                    <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                    <span className="text-[10px] font-bold">No Still Available</span>
                  </div>
                )}

                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={() => toggleEpStatus(ep.id)}
                    aria-label={`Toggle visibility status for Episode ${ep.relativeNumber}`}
                    title={isDraft ? "Draft - Hidden from Public Site (Click to Publish)" : "Published - Visible on Public Site (Click to Unpublish)"}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                      isDraft 
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/40" 
                        : "bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/40"
                    }`}
                  >
                    {isDraft ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                    {ep.status}
                  </button>
                </div>

                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-zinc-300 px-2 py-0.5 rounded text-[9px] font-bold">
                  {ep.duration}
                </div>
              </div>

              <CardContent className="p-3.5 space-y-2">
                <div>
                  <h4 className="text-xs font-black text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {ep.title}
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-2">
                    <span>Aired: {ep.airDate || "TBA"}</span>
                  </p>
                </div>

                <div className="space-y-1 bg-black/40 border border-white/10 rounded-xl p-2">
                  <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400">
                    <span className="flex items-center gap-1"><LinkIcon className="h-3 w-3 text-primary shrink-0" /> Stream / Embed Link</span>
                    {ep.embedUrl && <span className="text-emerald-400">✓ Set</span>}
                  </div>
                  <input
                    type="text"
                    value={ep.embedUrl}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setEpisodesMap(prev => {
                        const list = prev[activeInstallmentId] || [];
                        const updated = list.map(item => item.id === ep.id ? { ...item, embedUrl: newUrl } : item);
                        return { ...prev, [activeInstallmentId]: updated };
                      });
                    }}
                    placeholder="Paste .m3u8, YouTube, Dailymotion, Bilibili, or MP4 link..."
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-primary font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[9px] font-bold text-zinc-500">
                    {ep.tmdbThumbnail ? "TMDB Still Loaded" : "Default Poster"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingEp(ep)}
                      aria-label={`Edit links for Episode ${ep.relativeNumber}`}
                      className="h-7 text-[10px] font-black uppercase text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg gap-1 px-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Edit className="h-3 w-3" /> Edit Links
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* LOCAL SITE DATA SECTION DIRECTLY BELOW LIVE API DATA */}
      {dataSource === "api" && (
        <div className="mt-8 space-y-4 pt-6 border-t border-purple-500/30 bg-purple-950/20 p-5 rounded-2xl border border-purple-500/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h4 className="text-sm font-black uppercase text-purple-300 flex items-center gap-2">
                🌐 Local Site Curated Seasons & Stills Preview
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Your public site seasons & saved episode thumbnails. Importing selected Live API episodes above saves stills directly into these local season arcs.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setDataSource("local")}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl gap-1.5"
            >
              🌐 Switch to Local Site Data
            </Button>
          </div>

          {/* Local Season Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {installments.map((inst) => {
              const override = getBrandingOverrides(selectedFranchise, inst.id);
              const savedThumbCount = Object.keys(override.verifiedEpisodeThumbnails || (inst as any).verifiedEpisodeThumbnails || {}).length;
              
              return (
                <div
                  key={inst.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-black/50 border border-purple-500/30 text-white shrink-0"
                >
                  <Layers className="h-3.5 w-3.5 text-purple-400" />
                  <span>{inst.title}</span>
                  <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase">
                    {inst.episodesCount || 12} Eps ({savedThumbCount} Saved Stills)
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EDIT MODAL / DRAWER */}
      {editingEp && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-ep-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#11111a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 id="modal-ep-title" className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Edit className="h-4 w-4 text-primary" />
                  Edit Episode #{editingEp.relativeNumber} CMS Link & Stills
                </h3>
                <p className="text-xs text-zinc-400">{editingEp.seasonTitle}</p>
              </div>
              <button 
                onClick={() => setEditingEp(null)} 
                aria-label="Close edit modal"
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Episode Title</label>
                <Input
                  value={editingEp.title}
                  onChange={(e) => setEditingEp({ ...editingEp, title: e.target.value })}
                  className="bg-black/30 border-white/10 text-xs font-bold text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Embed Stream URL (.m3u8 / MP4 / iframe)</label>
                <Input
                  value={editingEp.embedUrl}
                  onChange={(e) => setEditingEp({ ...editingEp, embedUrl: e.target.value })}
                  placeholder="https://stream.example.com/playlist.m3u8"
                  className="bg-black/30 border-white/10 text-xs font-mono text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Episode Thumbnail URL (TMDB Still or Custom)</label>
                <Input
                  value={editingEp.thumbnail}
                  onChange={(e) => setEditingEp({ ...editingEp, thumbnail: e.target.value })}
                  placeholder="https://image.tmdb.org/t/p/w780/..."
                  className="bg-black/30 border-white/10 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Air Date</label>
                  <Input
                    value={editingEp.airDate || ""}
                    onChange={(e) => setEditingEp({ ...editingEp, airDate: e.target.value })}
                    className="bg-black/30 border-white/10 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Visibility Status</label>
                  <select
                    value={editingEp.status}
                    onChange={(e) => setEditingEp({ ...editingEp, status: e.target.value as "Published" | "Draft" })}
                    className="w-full bg-black/30 border border-white/10 rounded-md p-2 text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="Published">Published (Public)</option>
                    <option value="Draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button size="sm" variant="ghost" onClick={() => setEditingEp(null)} className="text-xs text-zinc-400">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEpisodeEdits} className="bg-primary text-primary-foreground text-xs font-black uppercase gap-1.5 rounded-xl">
                <Save className="h-3.5 w-3.5" /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
