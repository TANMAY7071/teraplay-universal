import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Video, 
  FileSpreadsheet, 
  CheckSquare, 
  Square,
  Eye,
  EyeOff,
  Sparkles,
  Link as LinkIcon,
  Layers,
  Film,
  Save,
  RefreshCw,
  Image as ImageIcon,
  Server
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { animeCatalog } from "@/data/anime";
import { findUniverseBySlug, UNIVERSES_REGISTRY } from "@/data/universeData";
import { fetchTmdbSeasonDetails } from "@/services/metadata/externalApis";

interface EpisodeCMSItem {
  id: string;
  animeId: number;
  animeSlug: string;
  animeTitle: string;
  posterUrl: string;
  seasonId: string;
  seasonTitle: string;
  episodeNumber: number;
  absoluteNumber?: number;
  title: string;
  thumbnail: string;
  tmdbThumbnail?: string;
  serverHlsUrl: string;
  serverMp4Url: string;
  serverEmbedUrl: string;
  duration: string;
  airDate: string;
  status: "Published" | "Draft";
}

export const EpisodeList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const animeIdParam = searchParams.get("animeId");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnimeFilter, setSelectedAnimeFilter] = useState(animeIdParam || "all");
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingEp, setEditingEp] = useState<EpisodeCMSItem | null>(null);
  const [isSyncingStills, setIsSyncingStills] = useState<boolean>(false);

  // Generate catalog fallback episodes for all 13 franchises
  const catalogEpisodes = useMemo(() => {
    const list: EpisodeCMSItem[] = [];

    animeCatalog.forEach((anime) => {
      const uni = findUniverseBySlug(anime.slug);
      const installments = uni?.installments || [
        { id: "s1", title: "Season 1", episodesCount: anime.episodes || 12, tmdbId: 79481, seasonNumber: 1 }
      ];

      installments.forEach((inst, idx) => {
        const epCount = inst.episodesCount || 12;
        for (let i = 1; i <= epCount; i++) {
          const absNum = (idx * 12) + i;
          list.push({
            id: `${anime.slug}-${inst.id}-ep-${i}`,
            animeId: Number(anime.id),
            animeSlug: anime.slug,
            animeTitle: anime.title,
            posterUrl: inst.poster || uni?.cover || anime.image,
            seasonId: String(inst.id),
            seasonTitle: inst.title,
            episodeNumber: i,
            absoluteNumber: absNum,
            title: inst.verifiedEpisodeTitles?.[i] || `Episode ${i}`,
            thumbnail: inst.verifiedEpisodeThumbnails?.[i] || inst.poster || anime.image,
            serverHlsUrl: "",
            serverMp4Url: "",
            serverEmbedUrl: "",
            duration: "24m",
            airDate: `2024-05-${String((i % 28) + 1).padStart(2, '0')}`,
            status: i > (epCount - 2) ? "Draft" : "Published"
          });
        }
      });
    });

    return list;
  }, []);

  const [localEpisodesMap, setLocalEpisodesMap] = useState<EpisodeCMSItem[]>(catalogEpisodes);
  const [sourceHealthFilter, setSourceHealthFilter] = useState("all");

  // Sync with real Supabase DB episodes table on mount
  useEffect(() => {
    const fetchDbEpisodes = async () => {
      try {
        const { data } = await supabase
          .from('episodes')
          .select('id, anime_id, episode_number, is_published, title, thumbnail_url, episode_servers(*)');
        if (data && data.length > 0) {
          const dbMap = new Map();
          data.forEach(ep => {
            dbMap.set(`${ep.anime_id}-${ep.episode_number}`, ep);
          });

          setLocalEpisodesMap(prev => {
            const updated = prev.map(ep => {
              const key = `${ep.animeId}-${ep.episodeNumber}`;
              const dbEp = dbMap.get(key);
              if (dbEp) {
                dbMap.delete(key);
                const servers: any[] = dbEp.episode_servers || [];
                const hls = servers.find(s => s.server_name === 'HLS Stream' || s.video_url?.endsWith('.m3u8'))?.video_url;
                const mp4 = servers.find(s => s.server_name === 'MP4 Stream' || s.video_url?.endsWith('.mp4'))?.video_url;
                const embed = servers.find(s => s.server_name === 'Embed Player' || (!s.video_url?.endsWith('.m3u8') && !s.video_url?.endsWith('.mp4')))?.video_url;

                return {
                  ...ep,
                  id: String(dbEp.id),
                  status: dbEp.is_published === false ? "Draft" : "Published",
                  title: dbEp.title || ep.title,
                  thumbnail: dbEp.thumbnail_url || ep.thumbnail,
                  serverHlsUrl: hls || ep.serverHlsUrl,
                  serverMp4Url: mp4 || ep.serverMp4Url,
                  serverEmbedUrl: embed || ep.serverEmbedUrl
                };
              }
              return ep;
            });

            const extraDbEps: EpisodeCMSItem[] = [];
            dbMap.forEach((dbEp) => {
              const animeObj = animeCatalog.find(a => Number(a.id) === Number(dbEp.anime_id)) || animeCatalog[0];
              const servers: any[] = dbEp.episode_servers || [];
              const hls = servers.find(s => s.server_name === 'HLS Stream' || s.video_url?.endsWith('.m3u8'))?.video_url;
              const mp4 = servers.find(s => s.server_name === 'MP4 Stream' || s.video_url?.endsWith('.mp4'))?.video_url;
              const embed = servers.find(s => s.server_name === 'Embed Player' || (!s.video_url?.endsWith('.m3u8') && !s.video_url?.endsWith('.mp4')))?.video_url;

              extraDbEps.push({
                id: String(dbEp.id),
                animeId: Number(dbEp.anime_id),
                animeSlug: animeObj.slug,
                animeTitle: animeObj.title,
                posterUrl: animeObj.image,
                seasonId: "s1",
                seasonTitle: "Season 1",
                episodeNumber: dbEp.episode_number,
                title: dbEp.title || `Episode ${dbEp.episode_number}`,
                thumbnail: dbEp.thumbnail_url || animeObj.image,
                serverHlsUrl: hls || "",
                serverMp4Url: mp4 || "",
                serverEmbedUrl: embed || "",
                duration: "24m",
                airDate: new Date().toISOString().slice(0, 10),
                status: dbEp.is_published === false ? "Draft" : "Published"
              });
            });

            return [...extraDbEps, ...updated];
          });
        }
      } catch (err) {
        console.warn("Could not fetch DB episodes:", err);
      }
    };
    fetchDbEpisodes();
  }, []);

  // Operational stats calculation
  const operationalStats = useMemo(() => {
    const totalCount = localEpisodesMap.length;
    const draftCount = localEpisodesMap.filter(e => e.status === "Draft").length;
    const missingStreamCount = localEpisodesMap.filter(e => !e.serverHlsUrl && !e.serverMp4Url && !e.serverEmbedUrl).length;
    const missingTmdbCount = localEpisodesMap.filter(e => !e.tmdbThumbnail).length;

    return {
      franchiseCount: animeCatalog.length,
      totalCount,
      draftCount,
      missingStreamCount,
      missingTmdbCount
    };
  }, [localEpisodesMap]);

  // Refined Filtered Episodes calculation
  const filteredEpisodes = useMemo(() => {
    return localEpisodesMap.filter((ep) => {
      if (selectedAnimeFilter !== "all" && String(ep.animeId) !== selectedAnimeFilter && ep.animeSlug !== selectedAnimeFilter) {
        return false;
      }
      if (selectedSeasonFilter !== "all" && !ep.seasonTitle.toLowerCase().includes(selectedSeasonFilter.toLowerCase())) {
        return false;
      }
      if (sourceHealthFilter === "missing-stream" && (ep.serverHlsUrl || ep.serverMp4Url || ep.serverEmbedUrl)) {
        return false;
      }
      if (sourceHealthFilter === "missing-tmdb" && ep.tmdbThumbnail) {
        return false;
      }
      if (sourceHealthFilter === "drafts" && ep.status !== "Draft") {
        return false;
      }
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesTitle = ep.title.toLowerCase().includes(query);
        const matchesEpNum = String(ep.episodeNumber) === query || String(ep.absoluteNumber) === query;
        const matchesAnime = ep.animeTitle.toLowerCase().includes(query);
        if (!matchesTitle && !matchesEpNum && !matchesAnime) return false;
      }
      return true;
    });
  }, [localEpisodesMap, selectedAnimeFilter, selectedSeasonFilter, sourceHealthFilter, searchTerm]);

  // Paginated Episodes
  const paginatedEpisodes = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredEpisodes.slice(start, start + itemsPerPage);
  }, [filteredEpisodes, page]);

  const totalPages = Math.ceil(filteredEpisodes.length / itemsPerPage) || 1;

  // Toggle Single Status (persisted to Supabase)
  const toggleStatus = async (id: string) => {
    const targetEp = localEpisodesMap.find(ep => ep.id === id);
    if (!targetEp) return;

    const nextStatus: "Published" | "Draft" = targetEp.status === "Published" ? "Draft" : "Published";
    const isPublished = nextStatus === "Published";

    setLocalEpisodesMap(prev => prev.map(ep => {
      if (ep.id === id) {
        return { ...ep, status: nextStatus };
      }
      return ep;
    }));

    toast.success(`Episode marked as ${nextStatus}`);

    try {
      if (/^\d+$/.test(id)) {
        await supabase.from('episodes').update({ is_published: isPublished }).eq('id', parseInt(id));
      } else if (targetEp.animeId && targetEp.episodeNumber) {
        await supabase.from('episodes').upsert({
          anime_id: targetEp.animeId,
          episode_number: targetEp.episodeNumber,
          title: targetEp.title,
          thumbnail_url: targetEp.thumbnail,
          is_published: isPublished
        }, { onConflict: 'anime_id,episode_number' });
      }
    } catch (err: any) {
      console.error("Failed to persist episode status:", err);
    }
  };

  // Bulk Status Update (persisted to Supabase)
  const handleBulkStatus = async (status: "Published" | "Draft") => {
    if (selectedIds.length === 0) return;
    const isPublished = status === "Published";
    const selectedEps = localEpisodesMap.filter(ep => selectedIds.includes(ep.id));

    setLocalEpisodesMap(prev => prev.map(ep => selectedIds.includes(ep.id) ? { ...ep, status } : ep));
    toast.success(`Set ${selectedIds.length} episodes to ${status}`);
    setSelectedIds([]);

    try {
      const dbUpdates = selectedEps.map(ep => ({
        anime_id: ep.animeId,
        episode_number: ep.episodeNumber,
        title: ep.title,
        thumbnail_url: ep.thumbnail,
        is_published: isPublished
      }));
      if (dbUpdates.length > 0) {
        await supabase.from('episodes').upsert(dbUpdates, { onConflict: 'anime_id,episode_number' });
      }
    } catch (err: any) {
      console.error("Failed bulk status update:", err);
    }
  };

  // Auto Sync TMDB Stills for selected anime filter
  const handleSyncTmdbStills = async () => {
    const targetSlug = selectedAnimeFilter === "all" ? "battle-through-the-heavens" : selectedAnimeFilter;
    const uni = findUniverseBySlug(targetSlug) || UNIVERSES_REGISTRY[0];
    
    setIsSyncingStills(true);
    toast.info(`Syncing TMDB episode stills for ${uni.title}...`);

    try {
      const fallbackId = uni.slug?.includes("demon") ? 227282 : 79481;
      const firstInst = uni.installments?.[0] || { tmdbId: fallbackId, seasonNumber: 1 };
      const targetTmdbId = firstInst.tmdbId || fallbackId;
      const { stills, titles } = await fetchTmdbSeasonDetails(targetTmdbId, firstInst.seasonNumber || 1);

      setLocalEpisodesMap(prev => prev.map(ep => {
        if (ep.animeSlug === uni.slug || String(ep.animeId) === String(uni.id)) {
          const fetchedStill = stills[ep.episodeNumber];
          const fetchedTitle = titles[ep.episodeNumber];
          return {
            ...ep,
            tmdbThumbnail: fetchedStill || ep.tmdbThumbnail,
            thumbnail: fetchedStill || ep.thumbnail,
            title: (fetchedTitle && !fetchedTitle.startsWith("Episode ")) ? fetchedTitle : ep.title
          };
        }
        return ep;
      }));

      toast.success("Successfully synced TMDB episode stills & titles!");
    } catch (err) {
      toast.error("Failed to sync TMDB stills.");
    } finally {
      setIsSyncingStills(false);
    }
  };

  // Save Episode Edit Modal & inline stream URL persistence
  const handleSaveEditingEp = async () => {
    if (!editingEp) return;

    setLocalEpisodesMap(prev => prev.map(ep => ep.id === editingEp.id ? editingEp : ep));
    toast.success(`Saved updates for Episode #${editingEp.episodeNumber}!`);

    const currentEp = editingEp;
    setEditingEp(null);

    const isPublished = currentEp.status === "Published";
    const hlsUrl = currentEp.serverHlsUrl?.trim();
    const mp4Url = currentEp.serverMp4Url?.trim();
    const embedUrl = currentEp.serverEmbedUrl?.trim();

    try {
      const isNumericId = /^\d+$/.test(currentEp.id);
      const episodePayload: any = {
        anime_id: currentEp.animeId,
        episode_number: currentEp.episodeNumber,
        title: currentEp.title,
        thumbnail_url: currentEp.thumbnail,
        is_published: isPublished,
      };

      if (isNumericId) {
        episodePayload.id = parseInt(currentEp.id, 10);
      }

      const { data: epData, error: epError } = await supabase
        .from('episodes')
        .upsert(episodePayload, { onConflict: 'anime_id,episode_number' })
        .select('id')
        .single();

      if (epError) {
        console.error("Failed to persist episode to database:", epError);
        return;
      }

      const episodeId = epData?.id;
      if (episodeId) {
        if (!isNumericId) {
          setLocalEpisodesMap(prev => prev.map(ep => ep.id === currentEp.id ? { ...ep, id: String(episodeId) } : ep));
        }

        // Delete existing server entries for this episode before re-inserting
        await supabase.from('episode_servers').delete().eq('episode_id', episodeId);

        const serversToInsert: { episode_id: number; server_name: string; video_url: string }[] = [];

        if (hlsUrl) {
          serversToInsert.push({
            episode_id: episodeId,
            server_name: 'HLS Stream',
            video_url: hlsUrl
          });
        }
        if (mp4Url) {
          serversToInsert.push({
            episode_id: episodeId,
            server_name: 'MP4 Stream',
            video_url: mp4Url
          });
        }
        if (embedUrl) {
          serversToInsert.push({
            episode_id: episodeId,
            server_name: 'Embed Player',
            video_url: embedUrl
          });
        }

        if (serversToInsert.length > 0) {
          const { error: srvError } = await supabase
            .from('episode_servers')
            .insert(serversToInsert);

          if (srvError) {
            console.error("Failed to insert episode_servers:", srvError);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to save episode and servers:", err);
    }
  };

  const handleAddEpisode = handleSaveEditingEp;

  return (
    <div className="space-y-6 text-left text-white animate-in fade-in duration-500">
      {/* EPISODE OPERATIONS HEADER & METRICS GRID */}
      <div className="bg-[#0e0f17] border border-white/10 p-6 rounded-3xl space-y-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-black uppercase tracking-wider px-2.5">
                Global Maintenance Hub
              </Badge>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Episode Operations</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Cross-franchise operational dashboard to monitor, repair, validate stream URLs, sync stills, and manage publication states.
            </p>
          </div>

          {/* QUICK ACTIONS ROW */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Button
              size="sm"
              onClick={handleSyncTmdbStills}
              disabled={isSyncingStills}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl gap-1.5 shadow-lg shadow-purple-900/20"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isSyncingStills ? "animate-spin" : ""}`} />
              {isSyncingStills ? "Syncing..." : "Sync TMDB / Simkl Stills"}
            </Button>

            <Button 
              size="sm"
              onClick={() => navigate('/admin/episodes/bulk')} 
              variant="outline"
              className="border-white/10 hover:bg-white/10 text-xs font-black uppercase rounded-xl text-white gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-400" /> Bulk Import
            </Button>

            <Button 
              size="sm"
              onClick={() => {
                const selectedAnimeObj = animeCatalog.find(
                  a => String(a.id) === selectedAnimeFilter || a.slug === selectedAnimeFilter
                ) || animeCatalog[0];
                const matchingEps = localEpisodesMap.filter(ep => ep.animeId === Number(selectedAnimeObj.id));
                const nextEpNum = matchingEps.length + 1;

                const newEp: EpisodeCMSItem = {
                  id: `custom-ep-${Date.now()}`,
                  animeId: Number(selectedAnimeObj.id),
                  animeSlug: selectedAnimeObj.slug,
                  animeTitle: selectedAnimeObj.title,
                  posterUrl: selectedAnimeObj.image || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&fit=crop",
                  seasonId: "s1",
                  seasonTitle: "Season 1",
                  episodeNumber: nextEpNum,
                  title: `Episode ${nextEpNum}`,
                  thumbnail: "",
                  serverHlsUrl: "",
                  serverMp4Url: "",
                  serverEmbedUrl: "",
                  duration: "24m",
                  airDate: new Date().toISOString().slice(0, 10),
                  status: "Draft"
                };
                setLocalEpisodesMap(prev => [newEp, ...prev]);
                setEditingEp(newEp);
              }} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase rounded-xl gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Episode
            </Button>
          </div>
        </div>

        {/* OPERATIONAL SUMMARY STAT PILLS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#141622] border border-white/5 p-3 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Franchises</span>
            <div className="text-lg font-black text-white mt-0.5">{operationalStats.franchiseCount} Franchises</div>
          </div>
          <div className="bg-[#141622] border border-white/5 p-3 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Episodes</span>
            <div className="text-lg font-black text-white mt-0.5">{operationalStats.totalCount} Installments</div>
          </div>
          <div className="bg-[#141622] border border-white/5 p-3 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Draft Status</span>
            <div className="text-lg font-black text-amber-300 mt-0.5">{operationalStats.draftCount} Drafts</div>
          </div>
          <div className="bg-[#141622] border border-white/5 p-3 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Missing Stream Source</span>
            <div className="text-lg font-black text-rose-300 mt-0.5">{operationalStats.missingStreamCount} Issues</div>
          </div>
        </div>

        {/* NEEDS ATTENTION ALERT STRIP */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-2">Needs Attention:</span>
          {operationalStats.missingStreamCount > 0 && (
            <button
              onClick={() => setSourceHealthFilter("missing-stream")}
              className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-rose-500/20 transition-all"
            >
              ⚠ {operationalStats.missingStreamCount} Missing Stream Links
            </button>
          )}
          {operationalStats.draftCount > 0 && (
            <button
              onClick={() => setSourceHealthFilter("drafts")}
              className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-amber-500/20 transition-all"
            >
              ⚠ {operationalStats.draftCount} Draft Episodes Unpublished
            </button>
          )}
          {operationalStats.missingTmdbCount > 0 && (
            <button
              onClick={() => setSourceHealthFilter("missing-tmdb")}
              className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-purple-500/20 transition-all"
            >
              ⚠ {operationalStats.missingTmdbCount} Missing TMDB Stills
            </button>
          )}
        </div>
      </div>

      {/* FILTER BAR WITH OPERATIONAL HEALTH CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#11111a] border border-white/5 rounded-2xl">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-muted-foreground">Franchise Filter</label>
          <select 
            value={selectedAnimeFilter}
            onChange={(e) => {
              setSelectedAnimeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Donghua Franchises ({animeCatalog.length})</option>
            {animeCatalog.map(anime => (
              <option key={anime.id} value={anime.slug}>
                {anime.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-muted-foreground">Source & Operational Health</label>
          <select 
            value={sourceHealthFilter}
            onChange={(e) => {
              setSourceHealthFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Episodes (Health Status)</option>
            <option value="missing-stream">⚠ Missing Video Stream Link</option>
            <option value="missing-tmdb">⚠ Missing TMDB Still</option>
            <option value="drafts">⚠ Draft / Hidden Episodes</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-muted-foreground">Filter by Season Arc</label>
          <Input
            type="text"
            placeholder="e.g. Season 1, Nian Fan..."
            className="h-10 bg-black/40 border-white/10 text-xs font-bold text-white placeholder:text-zinc-500 rounded-xl"
            value={selectedSeasonFilter === 'all' ? '' : selectedSeasonFilter}
            onChange={(e) => {
              setSelectedSeasonFilter(e.target.value || 'all');
              setPage(1);
            }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-muted-foreground">Search Title / #</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search title or number..."
              className="h-10 pl-9 bg-black/40 border-white/10 text-xs font-bold text-white placeholder:text-zinc-500 rounded-xl"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
          <div className="text-xs text-white font-black uppercase tracking-wider">
            {selectedIds.length} Episodes Selected
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleBulkStatus('Published')} 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-black uppercase border-white/10 hover:bg-white/5 text-white rounded-xl"
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-green-400" /> Publish Selected
            </Button>
            <Button 
              onClick={() => handleBulkStatus('Draft')} 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-black uppercase border-white/10 hover:bg-white/5 text-white rounded-xl"
            >
              <EyeOff className="h-3.5 w-3.5 mr-1 text-amber-400" /> Set to Draft
            </Button>
            <Button 
              onClick={() => {
                setLocalEpisodesMap(prev => prev.filter(ep => !selectedIds.includes(ep.id)));
                toast.success(`Deleted ${selectedIds.length} episodes`);
                setSelectedIds([]);
              }} 
              variant="destructive" 
              size="sm" 
              className="h-8 text-xs font-black uppercase rounded-xl"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* EPISODES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedEpisodes.map((ep) => {
          const isDraft = ep.status === "Draft";
          const isSelected = selectedIds.includes(ep.id);

          return (
            <Card 
              key={ep.id} 
              className={`bg-[#11111a] border-white/5 overflow-hidden group hover:border-primary/40 transition-all ${
                isDraft ? "opacity-80 border-dashed border-amber-500/30" : ""
              } ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
            >
              <div className="relative aspect-video bg-black/60 overflow-hidden">
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
                    <span className="text-[10px] font-bold">No Still</span>
                  </div>
                )}

                {/* SELECT CHECKBOX */}
                <button
                  onClick={() => {
                    setSelectedIds(prev => isSelected ? prev.filter(i => i !== ep.id) : [...prev, ep.id]);
                  }}
                  className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md p-1 rounded-lg border border-white/10 text-white"
                >
                  {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-zinc-400" />}
                </button>

                {/* NUMBER BADGES */}
                <div className="absolute top-2 left-9 flex items-center gap-1.5">
                  <Badge className="bg-black/80 backdrop-blur-md text-white border-white/10 text-[9px] font-black uppercase">
                    EP {ep.episodeNumber}
                  </Badge>
                  {ep.absoluteNumber && (
                    <Badge className="bg-purple-950/80 backdrop-blur-md text-purple-300 border-purple-500/20 text-[9px] font-black">
                      ABS #{ep.absoluteNumber}
                    </Badge>
                  )}
                </div>

                {/* STATUS BADGE */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={() => toggleStatus(ep.id)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border transition-all ${
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

              <CardContent className="p-3.5 space-y-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-primary truncate">{ep.animeTitle}</span>
                    <span className="text-[9px] text-zinc-500">• {ep.seasonTitle}</span>
                  </div>
                  <h4 className="text-xs font-black text-white line-clamp-1 group-hover:text-primary transition-colors mt-0.5">
                    {ep.title}
                  </h4>
                </div>

                {/* EMBBED SERVER PROVIDERS DISPLAY */}
                <div className="space-y-1.5">
                  <div className="bg-black/40 border border-white/5 rounded-lg p-2 text-[10px] text-zinc-300 font-mono truncate flex items-center gap-2">
                    <Server className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span className="text-[9px] font-bold text-cyan-400">Server 1 (HLS):</span>
                    <span className="truncate text-zinc-400">{ep.serverHlsUrl || "Not set"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[9px] font-bold text-zinc-500">
                    {ep.tmdbThumbnail ? "TMDB Still" : "Default Poster"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingEp(ep)}
                    className="h-7 text-[10px] font-black uppercase text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg gap-1 px-2"
                  >
                    <Edit className="h-3 w-3" /> Edit Links & Servers
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="border-white/10 text-xs font-bold"
          >
            Previous
          </Button>
          <span className="text-xs text-zinc-400 font-bold px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="border-white/10 text-xs font-bold"
          >
            Next
          </Button>
        </div>
      )}

      {/* MULTI-SERVER STREAM LINK EDIT MODAL */}
      {editingEp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11111a] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  Edit Stream Providers for Ep #{editingEp.episodeNumber}
                </h3>
                <p className="text-xs text-zinc-400">{editingEp.animeTitle} • {editingEp.seasonTitle}</p>
              </div>
              <button onClick={() => setEditingEp(null)} className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1">✕</button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Episode Title</label>
                <Input
                  value={editingEp.title}
                  onChange={(e) => setEditingEp({ ...editingEp, title: e.target.value })}
                  className="bg-black/30 border-white/10 text-xs font-bold text-white"
                />
              </div>

              {/* SERVER 1: PRIMARY HLS PLAYLIST */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-cyan-400 flex items-center gap-1.5">
                  <Server className="h-3 w-3" /> Server 1: Primary HLS Playlist (.m3u8)
                </label>
                <Input
                  value={editingEp.serverHlsUrl}
                  onChange={(e) => setEditingEp({ ...editingEp, serverHlsUrl: e.target.value })}
                  placeholder="https://stream.example.com/playlist.m3u8"
                  className="bg-black/30 border-white/10 text-xs font-mono text-cyan-300"
                />
              </div>

              {/* SERVER 2: DIRECT MP4 / BACKUP CDN */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1.5">
                  <Video className="h-3 w-3" /> Server 2: Direct MP4 / Fast CDN
                </label>
                <Input
                  value={editingEp.serverMp4Url}
                  onChange={(e) => setEditingEp({ ...editingEp, serverMp4Url: e.target.value })}
                  placeholder="https://cdn.example.com/episode.mp4"
                  className="bg-black/30 border-white/10 text-xs font-mono text-purple-300"
                />
              </div>

              {/* SERVER 3: IFRAME EMBED PLAYER */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" /> Server 3: iFrame Embed Player URL
                </label>
                <Input
                  value={editingEp.serverEmbedUrl}
                  onChange={(e) => setEditingEp({ ...editingEp, serverEmbedUrl: e.target.value })}
                  placeholder="https://player.example.com/embed/..."
                  className="bg-black/30 border-white/10 text-xs font-mono text-amber-300"
                />
              </div>

              {/* THUMBNAIL STILL OVERRIDE */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Episode Thumbnail Still URL (TMDB / Custom)</label>
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
              <Button size="sm" onClick={handleSaveEditingEp} className="bg-primary text-primary-foreground text-xs font-black uppercase gap-1.5 rounded-xl">
                <Save className="h-3.5 w-3.5" /> Save All Servers
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodeList;
