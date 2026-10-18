import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, MoreHorizontal, Globe, EyeOff, RefreshCw, Layers, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleAnimePublishStatus, syncAnimeMetadataById } from "@/services/syncService";
import SmartImportCard from "./SmartImportCard";
import { animeCatalog } from "@/data/anime";
import { getAniListId } from "@/data/anilistDonghuaMap";
import { findUniverseBySlug } from "@/data/universeData";

const AnimeList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "published" | "draft">("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-anime-list', page, searchTerm, visibilityFilter],
    queryFn: async () => {
      let query = supabase
        .from('anime')
        .select('id, title, original_title, slug, status, format, year, rating, poster_url, episode_count, anilist_id, locked_fields, last_sync_metadata, last_sync_episodes');

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("[AnimeList] Supabase query error:", error);
      }

      const dbItems = (data || []).map(anime => {
        const catalogMatch = animeCatalog.find(a => a.slug.toLowerCase() === anime.slug?.toLowerCase());
        const isGeneric = !anime.title || anime.title.includes("Oriental Martial Academy");
        const cleanTitle = isGeneric ? (catalogMatch?.title || anime.title) : anime.title;
        const cleanChinese = (isGeneric || !anime.original_title) ? (catalogMatch?.originalTitle || anime.original_title) : anime.original_title;
        const isDraft = anime.locked_fields?.visibility === 'draft' || anime.locked_fields?.is_published === false;

        return {
          ...anime,
          title: cleanTitle,
          english_title: cleanTitle,
          chinese_title: cleanChinese,
          original_title: cleanChinese,
          visibility: isDraft ? 'draft' : 'published',
          is_published: !isDraft
        };
      });

      const dbSlugs = new Set(dbItems.map(item => item.slug?.toLowerCase()).filter(Boolean));

      const catalogItems = animeCatalog.map(a => {
        const uni = findUniverseBySlug(a.slug);
        const totalEps = uni?.statistics?.totalEpisodes || a.episodes;
        const aniId = getAniListId(a.id) || getAniListId(a.slug) || undefined;

        return {
          id: a.id,
          title: a.title,
          english_title: a.title,
          chinese_title: a.originalTitle,
          slug: a.slug,
          status: a.status,
          format: "ONA",
          year: a.year,
          rating: a.rating,
          poster_url: a.image,
          episode_count: totalEps,
          anilist_id: aniId,
          visibility: 'published' as const,
          is_published: true
        };
      });

      const missingCatalog = catalogItems.filter(cat => !dbSlugs.has(cat.slug.toLowerCase()));
      let combined = [...dbItems, ...missingCatalog];

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        combined = combined.filter(a => 
          (a.title && a.title.toLowerCase().includes(lower)) ||
          (a.english_title && a.english_title.toLowerCase().includes(lower)) ||
          (a.chinese_title && a.chinese_title.toLowerCase().includes(lower))
        );
      }

      if (visibilityFilter === 'published') {
        combined = combined.filter(a => a.visibility === 'published');
      } else if (visibilityFilter === 'draft') {
        combined = combined.filter(a => a.visibility === 'draft');
      }

      const totalCount = combined.length;
      const paginated = combined.slice((page - 1) * itemsPerPage, page * itemsPerPage);

      return { anime: paginated, count: totalCount };
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('anime').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anime deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-anime-list'] });
    },
    onError: (error: any) => toast.error(error.message)
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, visibility, anime }: { id: number; visibility: 'draft' | 'published'; anime?: any }) => {
      return toggleAnimePublishStatus(id, visibility, anime);
    },
    onSuccess: (_, variables) => {
      toast.success(`Anime marked as ${variables.visibility.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['admin-anime-list'] });
      queryClient.invalidateQueries({ queryKey: ['anime'] });
    },
    onError: (error: any) => toast.error(error.message)
  });

  const syncMetadataMutation = useMutation({
    mutationFn: async (id: number) => {
      return syncAnimeMetadataById(id);
    },
    onSuccess: () => {
      toast.success("Metadata synced from AniList successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-anime-list'] });
      queryClient.invalidateQueries({ queryKey: ['anime'] });
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleToggleVisibility = (anime: any) => {
    const nextVisibility = (anime.visibility === 'draft' || !anime.is_published) ? 'published' : 'draft';
    publishMutation.mutate({ id: anime.id, visibility: nextVisibility, anime });
  };

  const handleDelete = (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const totalPages = data?.count ? Math.ceil(data.count / itemsPerPage) : 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left min-w-0 max-w-full">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#11111a] border border-white/5 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
              Franchise Registry Workspace
            </span>
            <span className="text-[10px] font-mono text-zinc-500">TOTAL: {data?.count || 0}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">Donghua Catalog</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Manage all Donghua titles, season counts, publication status, and content entries.</p>
        </div>
        <Button onClick={() => navigate('/admin/anime/new')} className="bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase rounded-xl shadow-lg shadow-primary/20 px-4 h-9 shrink-0">
          <Plus className="mr-1.5 h-4 w-4" /> Add Donghua
        </Button>
      </div>

      {/* Smart Import Banner */}
      <SmartImportCard onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-anime-list'] })} />

      {/* Master List Section */}
      <div className="bg-[#11111a] border border-white/5 rounded-2xl overflow-hidden flex flex-col min-w-0">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between gap-4 bg-[#0d0d14]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search master catalog by title or slug..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-black/40 border-white/10 text-white text-xs h-9 focus-visible:ring-primary focus-visible:border-primary/50"
            />
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs self-start sm:self-auto">
            <button
              onClick={() => { setVisibilityFilter("all"); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                visibilityFilter === "all" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              All ({data?.count || 0})
            </button>
            <button
              onClick={() => { setVisibilityFilter("published"); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                visibilityFilter === "published" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-zinc-400 hover:text-white"
              }`}
            >
              Published
            </button>
            <button
              onClick={() => { setVisibilityFilter("draft"); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                visibilityFilter === "draft" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400 hover:text-white"
              }`}
            >
              Drafts
            </button>
          </div>
        </div>

        {/* Mobile View: Cards Layout */}
        <div className="block md:hidden divide-y divide-white/5">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
              Loading master catalog...
            </div>
          ) : data?.anime?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No anime found in master registry matching your filter.
            </div>
          ) : (
            data?.anime?.map((anime) => {
              const isDraft = anime.visibility === 'draft' || anime.is_published === false;
              const mainTitle = anime.english_title || anime.title;
              const subTitle = anime.english_title && anime.english_title !== anime.title ? anime.title : null;
              return (
                <div key={anime.id} className="p-4 space-y-3 bg-[#11111a]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="h-14 w-10 rounded overflow-hidden bg-white/5 shrink-0">
                        {anime.poster_url ? (
                          <img src={anime.poster_url} alt={mainTitle} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[8px] text-muted-foreground">No img</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Link to={`/admin/anime/${anime.slug || anime.id}/edit`} className="font-bold text-white text-sm leading-tight hover:text-primary transition-colors block">
                          {mainTitle}
                        </Link>
                        {subTitle && <p className="text-xs text-zinc-400 italic">{subTitle}</p>}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>{anime.year || 'N/A'}</span>
                          <span>•</span>
                          <span>{anime.format || 'ONA'}</span>
                          {anime.anilist_id && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                              AniList #{anime.anilist_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-[#11111a] border-white/10 text-white">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/anime/${anime.slug || anime.id}/edit`} className="cursor-pointer flex items-center">
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/anime/${anime.slug || anime.id}`} target="_blank" className="cursor-pointer flex items-center text-zinc-300 hover:text-white">
                            <ExternalLink className="mr-2 h-4 w-4" /> View Live Page
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/episodes?animeId=${anime.slug || anime.id}`} className="cursor-pointer flex items-center">
                            <Layers className="mr-2 h-4 w-4" /> Manage Episodes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer flex items-center text-primary hover:text-primary"
                          onClick={() => syncMetadataMutation.mutate(anime.id)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Sync AniList Info
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem 
                          className="cursor-pointer text-red-500 hover:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                          onClick={() => handleDelete(anime.id, mainTitle)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <button
                      onClick={() => handleToggleVisibility(anime)}
                      disabled={publishMutation.isPending}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isDraft 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isDraft ? <><EyeOff className="w-3 h-3" /> Draft</> : <><Globe className="w-3 h-3" /> Published</>}
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {anime.episode_count || 0} eps
                      </span>
                      <span className="font-bold text-yellow-500">★ {anime.rating || '0.0'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left text-muted-foreground">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Visibility</th>
                <th className="px-6 py-4 font-medium">Episodes</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Rating</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex justify-center mb-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                    Loading master catalog...
                  </td>
                </tr>
              ) : data?.anime?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No anime found in master registry matching your filter.
                  </td>
                </tr>
              ) : (
                data?.anime?.map((anime) => {
                  const isDraft = anime.visibility === 'draft' || anime.is_published === false;
                  const mainTitle = anime.english_title || anime.title;
                  const subTitle = anime.english_title && anime.english_title !== anime.title ? anime.title : null;
                  return (
                    <tr key={anime.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-8 rounded overflow-hidden bg-white/5 shrink-0">
                            {anime.poster_url ? (
                              <img src={anime.poster_url} alt={mainTitle} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[8px] text-muted-foreground">No img</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                              <Link to={`/admin/anime/${anime.slug || anime.id}/edit`} className="hover:text-primary transition-colors">
                                {mainTitle}
                              </Link>
                            </div>
                            {subTitle && <div className="text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-xs">{subTitle}</div>}
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>{anime.year || 'N/A'} • {anime.format || 'ONA'}</span>
                              {anime.anilist_id && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[9px]">
                                  AniList #{anime.anilist_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleVisibility(anime)}
                          disabled={publishMutation.isPending}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                            isDraft 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isDraft ? (
                            <>
                              <EyeOff className="w-3 h-3" /> Draft
                            </>
                          ) : (
                            <>
                              <Globe className="w-3 h-3" /> Published
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {anime.episode_count || 0} eps
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          anime.status === 'Ongoing' ? 'bg-green-500/10 text-green-500' :
                          anime.status === 'Completed' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {anime.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap font-bold text-yellow-500">
                        ★ {anime.rating || '0.0'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-[#11111a] border-white/10 text-white">
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/anime/${anime.slug || anime.id}/edit`} className="cursor-pointer flex items-center">
                                <Edit className="mr-2 h-4 w-4" /> Edit Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/anime/${anime.slug || anime.id}`} target="_blank" className="cursor-pointer flex items-center text-zinc-300 hover:text-white">
                                <ExternalLink className="mr-2 h-4 w-4" /> View Live Page
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/episodes?animeId=${anime.slug || anime.id}`} className="cursor-pointer flex items-center">
                                <Layers className="mr-2 h-4 w-4" /> Manage Episodes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center text-primary hover:text-primary"
                              onClick={() => syncMetadataMutation.mutate(anime.id)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" /> Sync AniList Info
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center"
                              onClick={() => handleToggleVisibility(anime)}
                            >
                              {isDraft ? (
                                <>
                                  <Globe className="mr-2 h-4 w-4 text-emerald-400" />
                                  <span className="text-emerald-400 font-medium">Publish to Site</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4 text-amber-400" />
                                  <span className="text-amber-400">Revert to Draft</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              className="cursor-pointer text-red-500 hover:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                              onClick={() => handleDelete(anime.id, mainTitle)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, data?.count || 0)} of {data?.count} entries
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 border-white/10 bg-transparent hover:bg-white/5"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 border-white/10 bg-transparent hover:bg-white/5"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeList;
