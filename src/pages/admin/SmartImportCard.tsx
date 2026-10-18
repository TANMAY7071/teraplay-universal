import React, { useState } from "react";
import { Search, Loader2, DownloadCloud, Sparkles, Film, Database, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { searchAniList, fetchAniListMetadata, smartImportAnime } from "@/services/syncService";
import { searchTmdb } from "@/services/tmdbAnime";
import { searchSimkl } from "@/services/simklAnime";
import { searchAniListWithCascade, searchTmdbWithCascade, searchSimklWithCascade } from "@/services/donghuaAliasResolver";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface Props {
  onImportSuccess?: () => void;
}

const SmartImportCard = ({ onImportSuccess }: Props) => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<"anilist" | "tmdb" | "simkl">("anilist");
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState<string | number | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    
    try {
      let matchedVia = "";
      let mappedResults: any[] = [];
      if (provider === "anilist") {
        if (/^\d+$/.test(query.trim())) {
          const detail = await fetchAniListMetadata(parseInt(query.trim()));
          if (detail) {
            mappedResults = [{
              id: detail.id,
              title: detail.title?.english || detail.title?.romaji || detail.title?.native || "AniList Entry",
              nativeTitle: detail.title?.native || "",
              poster: detail.coverImage?.extraLarge || detail.coverImage?.large || "",
              banner: detail.bannerImage || "",
              episodes: detail.episodes || 12,
              year: detail.seasonYear || new Date().getFullYear(),
              format: detail.format || "ONA",
              status: detail.status || "Ongoing",
              description: detail.description ? detail.description.replace(/<[^>]*>/g, '') : "",
              anilist_id: detail.id
            }];
          }
        } else {
          const { results: list, matchedAlias } = await searchAniListWithCascade(query);
          matchedVia = matchedAlias !== query ? matchedAlias : "";
          mappedResults = list.map((item: any) => ({
            id: item.id,
            title: item.title?.english || item.title?.romaji || item.title?.native || "AniList Entry",
            nativeTitle: item.title?.native || "",
            poster: item.coverImage?.extraLarge || item.coverImage?.large || "",
            banner: item.bannerImage || "",
            episodes: item.episodes || 12,
            year: item.seasonYear || new Date().getFullYear(),
            format: item.format || "ONA",
            status: item.status || "Ongoing",
            description: item.description ? item.description.replace(/<[^>]*>/g, '') : "",
            anilist_id: item.id,
            matchedVia
          }));
        }
      } else if (provider === "tmdb") {
        const { results: list, matchedAlias } = await searchTmdbWithCascade(query);
        matchedVia = matchedAlias !== query ? matchedAlias : "";
        mappedResults = list.map((item: any) => ({
          id: item.id,
          title: item.title || "TMDB Entry",
          nativeTitle: "",
          poster: item.image || "",
          banner: item.banner_url || item.image || "",
          episodes: item.episodes || 12,
          year: item.year || new Date().getFullYear(),
          format: item.formatLabel || "3D DONGHUA",
          isAnimation: item.isAnimation,
          status: item.status || "Ongoing",
          description: item.synopsis || "",
          matchedVia
        }));
      } else if (provider === "simkl") {
        const { results: list, matchedAlias } = await searchSimklWithCascade(query);
        matchedVia = matchedAlias !== query ? matchedAlias : "";
        mappedResults = list.map((item: any) => ({
          id: item.id,
          title: item.title || "Simkl Entry",
          nativeTitle: "",
          poster: item.image || "",
          banner: item.banner_url || item.image || "",
          episodes: item.episodes || 12,
          year: item.year || new Date().getFullYear(),
          format: "TV",
          status: item.status || "Ongoing",
          description: item.synopsis || "",
          matchedVia
        }));
      }

      setResults(mappedResults);

      if (mappedResults.length === 0) {
        toast.error(`No matches found on ${provider.toUpperCase()} for "${query}". Try another title or acronym.`);
      } else if (matchedVia) {
        toast.success(`Found ${mappedResults.length} results from ${provider.toUpperCase()} (matched via "${matchedVia}")!`);
      } else {
        toast.success(`Found ${mappedResults.length} metadata results from ${provider.toUpperCase()}!`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to search ${provider.toUpperCase()} API: ${error?.message || "Network error"}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (item: any) => {
    setIsImporting(item.id);
    toast.info(`Importing "${item.title}" from ${provider.toUpperCase()}...`);
    
    try {
      let targetSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      
      if (provider === "anilist" && item.anilist_id) {
        const record = await smartImportAnime(item.anilist_id);
        if (record?.slug) targetSlug = record.slug;
      } else {
        // Direct insertion for TMDB / Simkl items into Supabase
        const { data: record } = await supabase.from("anime").upsert({
          title: item.title,
          original_title: item.nativeTitle || item.title,
          slug: targetSlug,
          poster_url: item.poster,
          banner_url: item.banner,
          synopsis: item.description,
          episode_count: item.episodes,
          year: item.year,
          format: item.format,
          status: item.status,
          anilist_id: item.anilist_id || null,
          created_at: new Date().toISOString()
        }, { onConflict: "slug" }).select().single();
        if (record?.slug) targetSlug = record.slug;
      }

      toast.success(`"${item.title}" successfully registered! Opening workspace...`);
      if (onImportSuccess) onImportSuccess();
      navigate(`/admin/anime/${targetSlug}/edit`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Import failed");
    } finally {
      setIsImporting(null);
    }
  };

  return (
    <div className="bg-[#11111a] border border-white/5 rounded-2xl p-5 mb-6 space-y-4 text-left">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Smart Donghua API Importer
            </h2>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase">
              Multi-Source
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">Search AniList, TMDB, or Simkl API keys to import complete franchise metadata instantly.</p>
        </div>

        {/* Provider Tabs */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
          {[
            { id: "anilist", label: "AniList GraphQL", icon: Database },
            { id: "tmdb", label: "TMDB API", icon: Film },
            { id: "simkl", label: "Simkl API", icon: Sparkles },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id as any);
                  setResults([]);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                  provider === p.id 
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
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input 
            placeholder={`Search ${provider.toUpperCase()} by title (e.g. Battle Through The Heavens) or ID...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-black/40 border-white/10 text-white text-xs h-9 focus-visible:ring-primary focus-visible:border-primary/50"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isSearching || !query.trim()} 
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl gap-1.5 shadow-lg shadow-purple-900/20 h-9"
        >
          {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {isSearching ? "Searching..." : "Fetch Metadata"}
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-2 pt-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
          {results.map((anime) => (
            <div key={anime.id} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:border-primary/40 transition-all gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-16 w-12 rounded-lg bg-black/60 overflow-hidden shrink-0 border border-white/10">
                  {anime.poster ? (
                    <img 
                      src={anime.poster} 
                      alt={anime.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">No img</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-white truncate">
                      {anime.title}
                    </h4>
                    {anime.matchedVia && (
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                        via {anime.matchedVia}
                      </span>
                    )}
                  </div>
                  {anime.nativeTitle && <p className="text-[10px] text-zinc-400 truncate">{anime.nativeTitle}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                      anime.isAnimation === false || anime.format === 'LIVE-ACTION DRAMA'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-primary/20 text-primary border-primary/40'
                    }`}>
                      {anime.format || '3D DONGHUA'}
                    </span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">{anime.year || 'N/A'}</span>
                    <span className="text-[9px] font-mono text-zinc-400">{anime.episodes} EPS</span>
                  </div>
                </div>
              </div>

              <Button 
                size="sm" 
                disabled={isImporting !== null}
                onClick={() => handleImport(anime)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase rounded-lg gap-1.5 shrink-0"
              >
                {isImporting === anime.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
                {isImporting === anime.id ? "Importing..." : "Import Donghua"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {hasSearched && !isSearching && results.length === 0 && (
        <div className="p-3 text-center text-xs text-zinc-400 bg-black/40 rounded-xl border border-white/5">
          No entries found on {provider.toUpperCase()} for "{query}". Try another title or acronym (e.g. "TGR", "BTTH").
        </div>
      )}
    </div>
  );
};

export default SmartImportCard;

