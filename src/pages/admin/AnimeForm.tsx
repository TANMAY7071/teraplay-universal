import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Sparkles, Film, ListVideo, Users, Settings, BookOpen, Sliders, Play, Trash2, Eye, ShieldAlert, Edit, Database, RefreshCw, Download, Flame, Globe, Sword, Gift, Flag, Layers } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Import manager components inline for localized Franchise CMS workspace
import SeasonsManager from "./SeasonsManager";
import { EpisodesCMSManager } from "./EpisodesCMSManager";
import CharactersManager from "./CharactersManager";
import CultivationManager from "./CultivationManager";
import FlamesManager from "./FlamesManager";
import LoreManager from "./LoreManager";
import { EntityCategoryManager } from "./EntityCategoryManager";
import RecommendationsManager from "./RecommendationsManager";
import LayoutBuilder from "./LayoutBuilder";

import { animeCatalog } from "@/data/anime";
import { parseVideoUrl } from "@/lib/videoParser";
import { findUniverseBySlug } from "@/data/universeData";
import { getAniListId } from "@/data/anilistDonghuaMap";
import { getAnimeSeriesDetails } from "@/data/animeDetails";
import { searchAniList, fetchAniListMetadata } from "@/services/syncService";
import { searchTmdb, getTmdbImages } from "@/services/tmdbAnime";
import { searchSimkl } from "@/services/simklAnime";
import { 
  searchAniListWithCascade, 
  searchTmdbWithCascade, 
  searchSimklWithCascade,
  resolveDonghuaSearchCandidates 
} from "@/services/donghuaAliasResolver";
import { MultiApiArtworkGallery, ArtworkCandidate } from "@/components/admin/MultiApiArtworkGallery";
import { getBrandingOverrides, saveBrandingOverrides } from "@/lib/overrides";

export const AnimeForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [universeSubTab, setUniverseSubTab] = useState<"cultivation" | "flames" | "locations" | "techniques" | "artifacts" | "clans" | "lore">("cultivation");
  const [artworkCandidates, setArtworkCandidates] = useState<ArtworkCandidate[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    chineseTitle: "",
    japaneseTitle: "",
    englishTitle: "",
    romaji: "",
    slug: "",
    tagline: "",
    synopsis: "",
    longDescription: "",
    status: "Ongoing",
    type: "SERIES",
    format: "3D CG",
    country: "China",
    language: "Chinese (Mandarin)",
    studio: "Motion Magic",
    author: "",
    originalWork: "Web Novel",
    rating: "9.0",
    trendingScore: "950",
    year: new Date().getFullYear(),
    anilistId: "",
    tmdbId: "",
    bangumiId: "",
    malId: "",
    seoTitle: "",
    seoDescription: "",
    keywords: "",
    overrideTitle: true,
    overrideSynopsis: true,
    overrideStudio: false,
    overrideGenres: false,
    poster_url: "",
    banner_url: "",
    landscape_image_url: "",
    logo_url: "",
    logo_display_mode: "desktop_only" as "desktop_only" | "both" | "none",
    trailer_url: "",
    featured_badge_text: "",
    visibility: "published" as "draft" | "published",
  });

  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [wikiArticles, setWikiArticles] = useState<any[]>([]);

  // Dynamically load real data from Supabase or fallback catalog based on ID/slug
  React.useEffect(() => {
    if (!id) return;

    const loadAnimeData = async () => {
      // 1. Resolve canonical slug first from catalog or params
      const catalogMatch = animeCatalog.find(a => a.slug === id || String(a.id) === String(id));
      const targetSlug = catalogMatch?.slug || id;

      // 2. Fetch from Supabase DB: if catalogMatch exists, look up by canonical slug
      let dbAnime: any = null;
      if (targetSlug && !/^\d+$/.test(targetSlug)) {
        const { data } = await supabase.from('anime').select('*').eq('slug', targetSlug).maybeSingle();
        dbAnime = data;
      }
      if (!dbAnime && id && /^\d+$/.test(id) && !catalogMatch) {
        const { data } = await supabase.from('anime').select('*').eq('id', parseInt(id)).maybeSingle();
        dbAnime = data;
      }

      const universeMatch = findUniverseBySlug(targetSlug);
      const detailsMatch = catalogMatch ? getAnimeSeriesDetails(catalogMatch.id, catalogMatch.title) : null;

      const title = dbAnime?.title || catalogMatch?.title || universeMatch?.title || targetSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const chineseTitle = dbAnime?.chinese_title || catalogMatch?.originalTitle || universeMatch?.originalTitle || "";
      const synopsis = dbAnime?.synopsis || dbAnime?.description || catalogMatch?.synopsis || universeMatch?.description || "";
      const poster = dbAnime?.poster_url || catalogMatch?.image || universeMatch?.cover || "";
      const banner = dbAnime?.banner_url || universeMatch?.banner || catalogMatch?.image || "";
      const year = dbAnime?.year || catalogMatch?.year || 2024;
      const rating = dbAnime?.rating?.toString() || catalogMatch?.rating?.toString() || universeMatch?.statistics?.score?.toString() || "9.0";
      const status = dbAnime?.status || catalogMatch?.status || "Ongoing";
      const aniId = dbAnime?.anilist_id || (catalogMatch ? getAniListId(catalogMatch.id) : null) || getAniListId(targetSlug) || undefined;
      const studio = dbAnime?.studio || universeMatch?.studios || "Tencent / Motion Magic";
      const overrides = getBrandingOverrides(targetSlug, "default");
      const logoUrl = dbAnime?.logo_url || overrides.logo || "";
      const logoDisplayMode = (dbAnime?.logo_display_mode || overrides.logoDisplayMode || "desktop_only") as "desktop_only" | "both" | "none";

      setFormData(prev => ({
        ...prev,
        title,
        chineseTitle,
        englishTitle: title,
        slug: targetSlug,
        synopsis,
        longDescription: synopsis,
        status,
        year,
        rating,
        poster_url: poster,
        banner_url: banner,
        landscape_image_url: banner,
        logo_url: logoUrl,
        logo_display_mode: logoDisplayMode,
        anilistId: aniId ? String(aniId) : prev.anilistId,
        studio,
        seoTitle: `Watch ${title} All Seasons Online`,
        seoDescription: `Stream ${title} with English Subtitles.`
      }));
      if (universeMatch && universeMatch.installments && universeMatch.installments.length > 0) {
        const instSeasons = universeMatch.installments.map((inst, idx) => ({
          id: idx + 1,
          title: inst.title,
          year: inst.year || year,
          episodes: inst.episodesCount || 12,
          status: inst.status || "Published",
          arc: inst.type || "Season Arc",
          realm: ""
        }));
        setSeasons(instSeasons);
        setSelectedSeasonId(instSeasons[instSeasons.length - 1]?.id || 1);
      } else {
        setSeasons([{ id: 1, title: "Season 1", year, episodes: catalogMatch?.episodes || 12, status: "Published", arc: "Main Arc", realm: "" }]);
      }

      if (detailsMatch && detailsMatch.characters && detailsMatch.characters.length > 0) {
        setCharacters(detailsMatch.characters.map(c => ({
          name: c.name,
          cnName: "",
          role: c.role || "Main",
          cultivation: c.cultivation || "",
          actor: "",
          status: "Alive"
        })));
      } else {
        setCharacters([
          { name: "Main Protagonist", cnName: "", role: "Main", cultivation: "Peak Realm", actor: "", status: "Alive" }
        ]);
      }
    };

    loadAnimeData();
  }, [id]);

  const { isLoading: isFetching, refetch } = useQuery({
    queryKey: ['admin-anime', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const catalogMatch = animeCatalog.find(a => a.slug === id || String(a.id) === String(id));
        const targetSlug = catalogMatch?.slug || id;

        let query = supabase.from('anime').select('*');
        if (targetSlug && !/^\d+$/.test(targetSlug)) {
          query = query.eq('slug', targetSlug);
        } else if (/^\d+$/.test(id) && !catalogMatch) {
          query = query.eq('id', parseInt(id));
        } else {
          query = query.eq('slug', id);
        }

        const { data, error } = await query.maybeSingle();

        if (data) {
          setFormData(prev => {
            const isGeneric = !data.title || data.title.includes("Oriental Martial Academy");
            const cleanTitle = isGeneric ? (catalogMatch?.title || prev.title || "Battle Through the Heavens") : data.title;
            const cleanChinese = (isGeneric || !data.chinese_title) ? (catalogMatch?.originalTitle || prev.chineseTitle || "斗破苍穹") : data.chinese_title;
            const cleanSynopsis = (isGeneric || !data.synopsis) ? (catalogMatch?.synopsis || prev.synopsis) : data.synopsis;

            return {
              ...prev,
              title: cleanTitle,
              chineseTitle: cleanChinese,
              englishTitle: cleanTitle,
              slug: data.slug || prev.slug || targetSlug,
              synopsis: cleanSynopsis,
              longDescription: cleanSynopsis,
              poster_url: data.poster_url || catalogMatch?.image || prev.poster_url,
              banner_url: data.banner_url || prev.banner_url,
              landscape_image_url: data.landscape_image_url || data.banner_url || prev.landscape_image_url,
              logo_url: data.logo_url || prev.logo_url,
              trailer_url: data.trailer_url || (catalogMatch as any)?.trailerUrl || (catalogMatch as any)?.trailer_url || (catalogMatch as any)?.youtubeId || prev.trailer_url,
              featured_badge_text: data.featured_badge_text || prev.featured_badge_text,
              studio: data.studio || prev.studio,
              author: data.author || prev.author,
              country: data.country || prev.country,
              rating: data.rating?.toString() || prev.rating,
              year: data.year || prev.year,
              anilistId: data.anilist_id?.toString() || prev.anilistId,
              malId: data.mal_id?.toString() || prev.malId,
              tmdbId: data.tmdb_id?.toString() || prev.tmdbId,
              bangumiId: data.bangumi_id?.toString() || prev.bangumiId,
              visibility: data.visibility || (data.is_published === false ? 'draft' : 'published'),
            };
          });
        }
        return data;
      } catch (err) {
        console.warn("Failed querying DB anime form:", err);
        return null;
      }
    },
    enabled: isEditMode
  });

  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // Auto-harvest initial candidates on mount or form change
  React.useEffect(() => {
    if (formData.poster_url || formData.banner_url) {
      setArtworkCandidates(prev => {
        const existingUrls = new Set(prev.map(c => c.url));
        const initial: ArtworkCandidate[] = [];
        if (formData.poster_url && !existingUrls.has(formData.poster_url)) {
          initial.push({
            id: `catalog-poster-${Date.now()}`,
            url: formData.poster_url,
            thumbnailUrl: formData.poster_url,
            source: "Catalog",
            type: "poster",
            label: "Current Catalog Poster"
          });
        }
        if (formData.banner_url && !existingUrls.has(formData.banner_url)) {
          initial.push({
            id: `catalog-banner-${Date.now()}`,
            url: formData.banner_url,
            thumbnailUrl: formData.banner_url,
            source: "Catalog",
            type: "banner",
            label: "Current Catalog Banner"
          });
        }
        return [...initial, ...prev];
      });
    }
  }, [formData.poster_url, formData.banner_url]);

  const handleFetchApiMetadata = async (provider: "anilist" | "tmdb" | "simkl" | "all") => {
    const query = formData.title.trim() || formData.slug || formData.anilistId || "Battle Through The Heavens";
    setIsFetchingMetadata(true);
    toast.info(`Smart cascade fetching for "${query}" from ${provider.toUpperCase()}...`);

    const harvested: ArtworkCandidate[] = [];

    try {
      if (provider === "anilist" || provider === "all") {
        let meta = null;
        let matched = "";
        if (formData.anilistId && /^\d+$/.test(formData.anilistId)) {
          meta = await fetchAniListMetadata(parseInt(formData.anilistId));
        } else {
          const { results: list, matchedAlias } = await searchAniListWithCascade(query);
          if (list && list.length > 0) {
            meta = list[0];
            matched = matchedAlias !== query ? matchedAlias : "";
          }
        }

        if (meta) {
          const title = meta.title?.english || meta.title?.romaji || meta.title?.native || formData.title;
          const chinese = meta.title?.native || formData.chineseTitle;
          const synopsis = meta.description ? meta.description.replace(/<[^>]*>/g, '') : formData.synopsis;

          if (meta.coverImage?.extraLarge || meta.coverImage?.large) {
            harvested.push({
              id: `anilist-poster-${meta.id}`,
              url: meta.coverImage.extraLarge || meta.coverImage.large,
              thumbnailUrl: meta.coverImage.large || meta.coverImage.extraLarge,
              source: "AniList",
              type: "poster",
              label: "AniList High-Res Cover"
            });
          }
          if (meta.bannerImage) {
            harvested.push({
              id: `anilist-banner-${meta.id}`,
              url: meta.bannerImage,
              thumbnailUrl: meta.bannerImage,
              source: "AniList",
              type: "banner",
              label: "AniList Hero Banner"
            });
          }

          setFormData(prev => ({
            ...prev,
            title: prev.title || title,
            chineseTitle: chinese || prev.chineseTitle,
            englishTitle: title || prev.englishTitle,
            synopsis: synopsis || prev.synopsis,
            longDescription: synopsis || prev.longDescription,
            poster_url: meta.coverImage?.extraLarge || meta.coverImage?.large || prev.poster_url,
            banner_url: meta.bannerImage || prev.banner_url,
            landscape_image_url: meta.bannerImage || prev.landscape_image_url,
            year: meta.seasonYear || prev.year,
            format: meta.format || prev.format,
            status: meta.status === 'FINISHED' ? 'Completed' : (meta.status === 'NOT_YET_RELEASED' ? 'Upcoming' : 'Ongoing'),
            rating: meta.averageScore ? (meta.averageScore / 10).toFixed(1) : prev.rating,
            studio: meta.studios?.nodes?.[0]?.name || prev.studio,
            anilistId: String(meta.id)
          }));
          toast.success(matched ? `AniList: Matched via alias "${matched}"!` : `AniList: Metadata & posters harvested!`);
        } else if (provider === "anilist") {
          toast.error("No matching results found on AniList.");
        }
      }

      if (provider === "tmdb" || provider === "all") {
        const { results: list, matchedAlias } = await searchTmdbWithCascade(query);
        if (list && list.length > 0) {
          const meta = list[0];
          if (meta.image) {
            harvested.push({
              id: `tmdb-poster-${meta.id}`,
              url: meta.image,
              thumbnailUrl: meta.image,
              source: "TMDB",
              type: "poster",
              label: "TMDB Main Poster"
            });
          }
          if (meta.banner_url) {
            harvested.push({
              id: `tmdb-banner-${meta.id}`,
              url: meta.banner_url,
              thumbnailUrl: meta.banner_url,
              source: "TMDB",
              type: "banner",
              label: "TMDB Main Backdrop"
            });
          }

          // Deep TMDB artwork gallery harvest
          const gallery = await getTmdbImages(meta.id);
          gallery.posters.forEach((p, idx) => {
            harvested.push({
              id: `tmdb-poster-gal-${meta.id}-${idx}`,
              url: p.url,
              thumbnailUrl: p.thumb,
              source: "TMDB",
              type: "poster",
              width: p.width,
              height: p.height,
              label: `TMDB Poster #${idx + 1}`,
              lang: p.lang
            });
          });
          gallery.backdrops.forEach((b, idx) => {
            harvested.push({
              id: `tmdb-backdrop-gal-${meta.id}-${idx}`,
              url: b.url,
              thumbnailUrl: b.thumb,
              source: "TMDB",
              type: "banner",
              width: b.width,
              height: b.height,
              label: `TMDB Backdrop #${idx + 1}`,
              lang: b.lang
            });
          });
          gallery.logos.forEach((l, idx) => {
            harvested.push({
              id: `tmdb-logo-gal-${meta.id}-${idx}`,
              url: l.url,
              thumbnailUrl: l.thumb,
              source: "TMDB",
              type: "logo",
              width: l.width,
              height: l.height,
              label: `TMDB Logo #${idx + 1}`,
              lang: l.lang
            });
          });

          setFormData(prev => ({
            ...prev,
            title: prev.title || meta.title,
            synopsis: prev.synopsis || meta.synopsis,
            poster_url: prev.poster_url || meta.image,
            banner_url: prev.banner_url || meta.banner_url,
            landscape_image_url: prev.landscape_image_url || meta.banner_url,
            logo_url: gallery.logos[0]?.url || prev.logo_url,
            year: meta.year || prev.year,
            tmdbId: String(meta.id)
          }));
          toast.success(matchedAlias !== query ? `TMDB: Matched via alias "${matchedAlias}"!` : `TMDB: ${gallery.posters.length + gallery.backdrops.length + gallery.logos.length} artwork files harvested!`);
        } else if (provider === "tmdb") {
          toast.error("No matching results found on TMDB.");
        }
      }

      if (provider === "simkl" || provider === "all") {
        const { results: list, matchedAlias } = await searchSimklWithCascade(query);
        if (list && list.length > 0) {
          const meta = list[0];
          if (meta.image) {
            harvested.push({
              id: `simkl-poster-${meta.id}`,
              url: meta.image,
              thumbnailUrl: meta.image,
              source: "Simkl",
              type: "poster",
              label: "Simkl Cover"
            });
          }
          if (meta.banner_url) {
            harvested.push({
              id: `simkl-banner-${meta.id}`,
              url: meta.banner_url,
              thumbnailUrl: meta.banner_url,
              source: "Simkl",
              type: "banner",
              label: "Simkl Fanart Backdrop"
            });
          }

          setFormData(prev => ({
            ...prev,
            title: prev.title || meta.title,
            synopsis: prev.synopsis || meta.synopsis,
            poster_url: prev.poster_url || meta.image,
            banner_url: prev.banner_url || meta.banner_url,
            year: prev.year || meta.year
          }));
          toast.success(matchedAlias !== query ? `Simkl: Matched via alias "${matchedAlias}"!` : `Simkl: Show artwork populated!`);
        } else if (provider === "simkl") {
          toast.error("No matching results found on Simkl.");
        }
      }

      if (harvested.length > 0) {
        setArtworkCandidates(prev => {
          const existing = new Set(prev.map(c => c.url));
          const fresh = harvested.filter(c => !existing.has(c.url));
          return [...fresh, ...prev];
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Fetch error: ${err.message || "Failed request"}`);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveWorkspace = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a Donghua Title before saving.");
      return;
    }

    try {
      const generatedSlug = formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const isPublished = formData.visibility === 'published';

      // Find existing record in DB by slug or numeric ID
      let existingRecord: any = null;
      if (generatedSlug) {
        const { data } = await supabase.from('anime').select('id, locked_fields').eq('slug', generatedSlug).maybeSingle();
        existingRecord = data;
      }
      if (!existingRecord && id && /^\d+$/.test(id)) {
        const catalogMatch = animeCatalog.find(a => String(a.id) === String(id));
        if (!catalogMatch) {
          const { data } = await supabase.from('anime').select('id, locked_fields').eq('id', parseInt(id)).maybeSingle();
          existingRecord = data;
        }
      }

      saveBrandingOverrides(generatedSlug, "default", {
        logo: formData.logo_url,
        logoDisplayMode: formData.logo_display_mode,
        poster: formData.poster_url,
        banner: formData.banner_url
      });

      const locked_fields = { ...(existingRecord?.locked_fields || {}), visibility: formData.visibility, is_published: isPublished, logo_display_mode: formData.logo_display_mode };

      const payload: any = {
        title: formData.title.trim(),
        original_title: formData.chineseTitle || formData.englishTitle || formData.title.trim(),
        slug: generatedSlug,
        synopsis: formData.synopsis,
        format: formData.format,
        status: formData.status,
        year: Number(formData.year) || new Date().getFullYear(),
        rating: parseFloat(formData.rating) || 0,
        studio: formData.studio,
        poster_url: formData.poster_url,
        banner_url: formData.banner_url,
        landscape_image_url: formData.landscape_image_url,
        logo_url: formData.logo_url,
        logo_display_mode: formData.logo_display_mode,
        trailer_url: formData.trailer_url,
        featured_badge_text: formData.featured_badge_text,
        locked_fields: locked_fields,
        anilist_id: formData.anilistId ? Number(formData.anilistId) : null,
        updated_at: new Date().toISOString()
      };

      // Also persist to branding overrides storage so live hero components update synchronously
      if (generatedSlug) {
        saveBrandingOverrides(generatedSlug, "default", {
          logo: formData.logo_url || undefined,
          logoDisplayMode: formData.logo_display_mode
        });
      }

      if (existingRecord?.id) {
        const { error } = await supabase.from('anime').update(payload).eq('id', existingRecord.id);
        if (error) throw error;
        toast.success(`Donghua updated successfully! Status is ${formData.visibility.toUpperCase()}`);
      } else {
        const { error } = await supabase.from('anime').insert([payload]);
        if (error) throw error;
        toast.success(`New Donghua created as ${formData.visibility.toUpperCase()}!`);
        navigate('/admin/anime');
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save anime");
    }
  };

  return (
    <div className="space-y-6 text-left text-white min-w-0 max-w-full">
      {/* 1. CINEMATIC HEADER WORKSPACE BAR */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/anime")} className="h-9 w-9 text-zinc-400 hover:text-white shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase text-primary tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full inline-block">
              Franchise Master Registry Workspace
            </span>
            <h1 className="text-xl font-bold tracking-tight mt-1 text-white truncate">
              {formData.title || "New Donghua Franchise"} CMS Settings
            </h1>
          </div>
        </div>

        <Button onClick={handleSaveWorkspace} className="bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 px-4 h-9 shrink-0">
          <Save className="h-4 w-4" /> Save Workspace
        </Button>
      </div>

      {/* 2. TABS NAV BAR */}
      <div className="flex border-b border-white/5 overflow-x-auto pb-px scrollbar-none max-w-full min-w-0">
        {[
          { id: "overview", label: "Overview", icon: BookOpen },
          { id: "media", label: "Media Assets", icon: Film },
          { id: "seasons", label: "Seasons", icon: ListVideo },
          { id: "episodes", label: "Episodes", icon: Play },
          { id: "characters", label: "Characters", icon: Users },
          { id: "universe", label: "Universe (Lore)", icon: Sparkles },
          { id: "recommendations", label: "Recommendations", icon: Sliders },
          { id: "sync", label: "Sync Engine", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-colors shrink-0 ${
                isActive ? "border-primary text-primary animate-pulse" : "border-transparent text-muted-foreground hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. CORE PANEL MANAGER CONTENT */}
      <div className="animate-in fade-in duration-300">
        
        {/* OVERVIEW PANEL */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* API AUTO-FETCH TOOLBAR */}
              <div className="bg-[#11111a] border border-primary/20 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">API Metadata Auto-Hydrate & Alias Engine</h4>
                      <p className="text-[10px] text-zinc-400">Cascades alternate titles & acronyms across AniList, TMDB, and Simkl APIs.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      disabled={isFetchingMetadata}
                      onClick={() => handleFetchApiMetadata("all")}
                      className="bg-primary text-black hover:bg-primary/90 text-[10px] font-black uppercase rounded-lg gap-1 h-8 shadow-sm shadow-primary/25"
                    >
                      <Sparkles className="h-3 w-3" /> Auto-Blend (All 3)
                    </Button>

                    <Button
                      size="sm"
                      disabled={isFetchingMetadata}
                      onClick={() => handleFetchApiMetadata("anilist")}
                      className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[10px] font-black uppercase rounded-lg gap-1 h-8"
                    >
                      <Database className="h-3 w-3" /> AniList
                    </Button>

                    <Button
                      size="sm"
                      disabled={isFetchingMetadata}
                      onClick={() => handleFetchApiMetadata("tmdb")}
                      className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase rounded-lg gap-1 h-8"
                    >
                      <Film className="h-3 w-3" /> TMDB
                    </Button>

                    <Button
                      size="sm"
                      disabled={isFetchingMetadata}
                      onClick={() => handleFetchApiMetadata("simkl")}
                      className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase rounded-lg gap-1 h-8"
                    >
                      <Sparkles className="h-3 w-3" /> Simkl
                    </Button>
                  </div>
                </div>

                {resolveDonghuaSearchCandidates(formData.title || formData.slug || "").length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Known Alternate Titles:</span>
                    {resolveDonghuaSearchCandidates(formData.title || formData.slug || "").slice(0, 5).map(alias => (
                      <Badge key={alias} variant="outline" className="bg-white/[0.03] text-zinc-300 border-white/10 text-[10px] font-normal py-0 px-2">
                        {alias}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* VISUAL MULTI-API ARTWORK STUDIO & PICKER */}
              <MultiApiArtworkGallery
                candidates={artworkCandidates}
                activePoster={formData.poster_url}
                activeBanner={formData.banner_url}
                activeLandscape={formData.landscape_image_url}
                activeLogo={formData.logo_url}
                onSelectPoster={(url) => setFormData(prev => ({ ...prev, poster_url: url }))}
                onSelectBanner={(url) => setFormData(prev => ({ ...prev, banner_url: url }))}
                onSelectLandscape={(url) => setFormData(prev => ({ ...prev, landscape_image_url: url }))}
                onSelectLogo={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                onAutoBlend={() => handleFetchApiMetadata("all")}
                isLoading={isFetchingMetadata}
              />

              {/* LOGO DISPLAY MODE PREFERENCE */}
              <Card className="bg-[#11111a] border-white/5 p-4 space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Title Logo Display Preference
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      Choose how title branding is displayed across Desktop & Mobile views for this Donghua.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo_display_mode: "both" }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        formData.logo_display_mode === "both" ? "bg-primary text-black font-black shadow" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Both Screens
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo_display_mode: "desktop_only" }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        formData.logo_display_mode === "desktop_only" ? "bg-primary text-black font-black shadow" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Desktop Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo_display_mode: "none" }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        formData.logo_display_mode === "none" ? "bg-primary text-black font-black shadow" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Text Title Only
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">Basic Metadata</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Publication Status:</span>
                    <select
                      name="visibility"
                      value={formData.visibility}
                      onChange={handleInputChange}
                      className="bg-black/40 border border-white/15 text-xs text-white rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value="published">Published (Live)</option>
                      <option value="draft">Draft (Admin Only)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Title</label>
                    <Input name="title" value={formData.title} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Chinese Title</label>
                    <Input name="chineseTitle" value={formData.chineseTitle} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Romaji</label>
                    <Input name="romaji" value={formData.romaji} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Japanese Title</label>
                    <Input name="japaneseTitle" value={formData.japaneseTitle} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Slug</label>
                    <Input name="slug" value={formData.slug} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Synopsis</label>
                  <Textarea name="synopsis" value={formData.synopsis} onChange={handleInputChange} className="bg-black/20 border-white/10 min-h-[80px]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-muted-foreground">Long Story Description</label>
                  <Textarea name="longDescription" value={formData.longDescription} onChange={handleInputChange} className="bg-black/20 border-white/10 min-h-[120px]" />
                </div>
              </Card>

              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">SEO Configuration</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">SEO Title</label>
                    <Input name="seoTitle" value={formData.seoTitle} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">SEO Description</label>
                    <Textarea name="seoDescription" value={formData.seoDescription} onChange={handleInputChange} className="bg-black/20 border-white/10 min-h-[60px]" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Release Details</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Studio</label>
                    <Input name="studio" value={formData.studio} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">Author</label>
                    <Input name="author" value={formData.author} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-muted-foreground">Status</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 text-xs text-white">
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-muted-foreground">Release Year</label>
                      <Input type="number" name="year" value={formData.year} onChange={handleInputChange} className="bg-black/20 border-white/10" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Release Control & Manual Overrides</h3>
                <p className="text-[10px] text-zinc-400">
                  Enable manual release state overrides to force hero badge, season number, or latest episode. Admin overrides strictly take precedence over API data.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-xl text-xs">
                    <span className="font-bold text-white">Enable Manual Override</span>
                    <input 
                      type="checkbox" 
                      checked={(formData as any).isReleaseOverrideEnabled || false} 
                      onChange={(e) => setFormData(prev => ({ ...prev, isReleaseOverrideEnabled: e.target.checked }))}
                      className="rounded accent-primary border-white/10" 
                    />
                  </div>

                  {(formData as any).isReleaseOverrideEnabled && (
                    <div className="space-y-2.5 pt-2 border-t border-white/5 animate-in fade-in">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-muted-foreground">Manual Hero Badge Text</label>
                        <Input 
                          placeholder="e.g. S5 • EP210 or NEW EPISODE TODAY" 
                          value={(formData as any).manualHeroBadge || ""} 
                          onChange={(e) => setFormData(prev => ({ ...prev, manualHeroBadge: e.target.value }))}
                          className="bg-black/20 border-white/10 text-xs text-white" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-muted-foreground">Manual Season #</label>
                          <Input 
                            type="number" 
                            placeholder="5" 
                            value={(formData as any).manualSeasonNumber || ""} 
                            onChange={(e) => setFormData(prev => ({ ...prev, manualSeasonNumber: Number(e.target.value) }))}
                            className="bg-black/20 border-white/10 text-xs text-white" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-muted-foreground">Latest Ep #</label>
                          <Input 
                            type="number" 
                            placeholder="210" 
                            value={(formData as any).manualLatestEpisodeNumber || ""} 
                            onChange={(e) => setFormData(prev => ({ ...prev, manualLatestEpisodeNumber: Number(e.target.value) }))}
                            className="bg-black/20 border-white/10 text-xs text-white" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* MEDIA ASSETS PANEL */}
        {activeTab === "media" && (
          <div className="space-y-6">
            <MultiApiArtworkGallery
              candidates={artworkCandidates}
              activePoster={formData.poster_url}
              activeBanner={formData.banner_url}
              activeLandscape={formData.landscape_image_url}
              activeLogo={formData.logo_url}
              onSelectPoster={(url) => setFormData(prev => ({ ...prev, poster_url: url }))}
              onSelectBanner={(url) => setFormData(prev => ({ ...prev, banner_url: url }))}
              onSelectLandscape={(url) => setFormData(prev => ({ ...prev, landscape_image_url: url }))}
              onSelectLogo={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
              onAutoBlend={() => handleFetchApiMetadata("all")}
              isLoading={isFetchingMetadata}
            />

            <Card className="bg-[#11111a] border-white/5 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Film className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Franchise Media Assets & Artwork Registry</h3>
            </div>

            {/* 1. FRANCHISE IDENTITY GROUP */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">1. Franchise Identity</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 bg-black/30 border border-white/5 p-3 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-white">Poster Image</label>
                  <Input name="poster_url" value={formData.poster_url} onChange={handleInputChange} className="bg-black/20 border-white/10 text-xs text-white" />
                  <p className="text-[9px] text-zinc-500 font-medium">Used for search results, grid cards, and franchise discovery.</p>
                </div>
                <div className="space-y-1 bg-black/30 border border-white/5 p-3 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-white">Logo PNG</label>
                  <Input name="logo_url" value={formData.logo_url} onChange={handleInputChange} className="bg-black/20 border-white/10 text-xs text-white" />
                  <p className="text-[9px] text-zinc-500 font-medium">Displayed over hero backdrop artwork where available.</p>
                </div>
                <div className="space-y-1 bg-black/30 border border-white/5 p-3 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-white">Logo Display Target Devices</label>
                  <select
                    name="logo_display_mode"
                    value={formData.logo_display_mode}
                    onChange={handleInputChange}
                    className="w-full h-9 bg-black/20 border border-white/10 rounded-md px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="desktop_only" className="bg-[#11111a] text-white">Desktop Only (Mobile Text Fallback)</option>
                    <option value="both" className="bg-[#11111a] text-white">Both Desktop & Mobile</option>
                    <option value="none" className="bg-[#11111a] text-white">Disabled (Text Title Only)</option>
                  </select>
                  <p className="text-[9px] text-zinc-500 font-medium">Controls calligraphic logo vs text title display per device.</p>
                </div>
              </div>
            </div>

            {/* 2. FRANCHISE VISUALS GROUP */}
            <div className="space-y-3 border-t border-white/5 pt-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">2. Franchise Visuals</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 bg-black/30 border border-white/5 p-3 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-white">Hero Background</label>
                  <Input name="banner_url" value={formData.banner_url} onChange={handleInputChange} className="bg-black/20 border-white/10 text-xs text-white" />
                  <p className="text-[9px] text-zinc-500 font-medium">Used as main backdrop on home hero & detail pages.</p>
                </div>
                <div className="space-y-1 bg-black/30 border border-white/5 p-3 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-white">Landscape Artwork</label>
                  <Input name="landscape_image_url" value={formData.landscape_image_url} onChange={handleInputChange} className="bg-black/20 border-white/10 text-xs text-white" />
                  <p className="text-[9px] text-zinc-500 font-medium">Used for wide catalog banners and desktop slides.</p>
                </div>
              </div>
            </div>

            {/* 3. VIDEO TRAILER GROUP */}
            <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">3. Video Trailer</h4>
                {formData.trailer_url && (() => {
                  const parsed = parseVideoUrl(formData.trailer_url);
                  return (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                      Detected: {parsed.provider}
                    </span>
                  );
                })()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 bg-black/30 border border-white/5 p-3 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-white">Hero Video Trailer URL (Universal: YT / Dailymotion / Bilibili / MP4)</label>
                  <Input
                    name="trailer_url"
                    value={formData.trailer_url}
                    onChange={handleInputChange}
                    placeholder="Paste YouTube, Dailymotion, Bilibili, Vimeo, or .mp4 link..."
                    className="bg-black/20 border-white/10 text-xs text-primary font-mono"
                  />
                  <p className="text-[9px] text-zinc-500 font-medium">
                    Supports YouTube (watch/shorts/embed), Dailymotion (video/dai.ly), Bilibili (BV/av), Vimeo, & direct MP4. Auto-converts to clean iframe embed.
                  </p>
                </div>
                <div className="space-y-1 bg-black/30 border border-white/5 p-3 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-white">Featured Hero Badge Text</label>
                  <Input
                    name="featured_badge_text"
                    value={formData.featured_badge_text}
                    onChange={handleInputChange}
                    placeholder="e.g. NEW EPISODE TODAY or S5 • EP210"
                    className="bg-black/20 border-white/10 text-xs text-white"
                  />
                  <p className="text-[9px] text-zinc-500 font-medium">Custom pill tag text shown on hero slide.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
        )}

        {/* SEASONS PANEL */}
        {activeTab === "seasons" && <SeasonsManager animeSlug={formData.slug} />}

        {/* EPISODES PANEL */}
        {activeTab === "episodes" && <EpisodesCMSManager animeSlug={formData.slug} />}

        {/* CHARACTERS PANEL */}
        {activeTab === "characters" && <CharactersManager animeSlug={formData.slug} animeTitle={formData.title} />}

        {/* UNIVERSE PANEL */}
        {activeTab === "universe" && (
          <div className="space-y-6">
            {/* SLEEK 7-CATEGORY CMS SUB-NAV TAB STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 border-b border-white/10 pb-5">
              {[
                { id: "cultivation", name: "Cultivation", dbKey: "cultivation", fallbackCount: "55", subText: "Scales & Realms", icon: Flame },
                { id: "flames", name: "Flames Codex", dbKey: "flames", fallbackCount: "23", subText: "Heavenly Flames", icon: Sparkles },
                { id: "locations", name: "Locations", dbKey: "locations", fallbackCount: "65", subText: "World & Sects", icon: Globe },
                { id: "techniques", name: "Techniques", dbKey: "techniques", fallbackCount: "221", subText: "Spells & Skills", icon: Sword },
                { id: "artifacts", name: "Artifacts", dbKey: "artifacts", fallbackCount: "107", subText: "Treasures & Pills", icon: Gift },
                { id: "clans", name: "Clans", dbKey: "clans", fallbackCount: "27", subText: "Factions & Guilds", icon: Flag },
                { id: "lore", name: "Lore Wiki", dbKey: "lore", fallbackCount: "5", subText: "Custom Articles", icon: BookOpen }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = universeSubTab === tab.id;
                const count = (() => {
                  try {
                    const saved = localStorage.getItem(`cms_universe_${tab.dbKey}_${formData.slug || "battle-through-the-heavens"}`);
                    if (saved) {
                      const list = JSON.parse(saved);
                      if (Array.isArray(list)) return `${list.length}`;
                    }
                  } catch (e) {}
                  return tab.fallbackCount;
                })();

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setUniverseSubTab(tab.id as any)}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between min-h-[90px] group relative overflow-hidden",
                      isActive
                        ? "bg-primary/15 border-primary shadow-lg shadow-primary/15 text-white"
                        : "bg-[#11111a] border-white/5 hover:border-white/20 text-zinc-400 hover:text-white"
                    )}
                  >
                    <div className="flex items-center justify-between w-full relative z-10">
                      <div className={cn(
                        "h-7 w-7 rounded-xl flex items-center justify-center border transition-colors",
                        isActive ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-zinc-400 group-hover:text-white"
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className={cn(
                        "text-[9.5px] font-black font-mono px-2 py-0.5 rounded-full border transition-colors",
                        isActive ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-zinc-400"
                      )}>
                        {count}
                      </span>
                    </div>

                    <div className="relative z-10 space-y-0.5 mt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider block truncate text-white">{tab.name}</h4>
                      <p className="text-[9px] font-medium text-zinc-400 block truncate">{tab.subText}</p>
                    </div>

                    {isActive && (
                      <div className="absolute top-0 right-0 h-12 w-12 bg-primary/20 blur-xl pointer-events-none rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Render Sub-Manager Component */}
            {universeSubTab === "cultivation" && <CultivationManager />}
            {universeSubTab === "flames" && <FlamesManager />}
            {universeSubTab === "locations" && (
              <EntityCategoryManager 
                categoryKey="locations" 
                title="World & Locations" 
                description="Manage sects, cities, regions and sacred grounds."
                icon={Globe}
                animeSlug={formData.slug}
              />
            )}
            {universeSubTab === "techniques" && (
              <EntityCategoryManager 
                categoryKey="techniques" 
                title="Techniques & Spells" 
                description="Manage battle skills, Qi methods, and movement arts."
                icon={Sword}
                animeSlug={formData.slug}
              />
            )}
            {universeSubTab === "artifacts" && (
              <EntityCategoryManager 
                categoryKey="artifacts" 
                title="Artifacts & Treasures" 
                description="Manage alchemical pills, magic weapons, and spatial rings."
                icon={Gift}
                animeSlug={formData.slug}
              />
            )}
            {universeSubTab === "clans" && (
              <EntityCategoryManager 
                categoryKey="clans" 
                title="Clans & Factions" 
                description="Manage ancient families, sects, and rogue guilds."
                icon={Flag}
                animeSlug={formData.slug}
              />
            )}
            {universeSubTab === "lore" && <LoreManager />}
          </div>
        )}

        {/* RECOMMENDATIONS PANEL */}
        {activeTab === "recommendations" && <RecommendationsManager />}

        {/* LAYOUT PANEL */}
        {activeTab === "layout" && <LayoutBuilder />}

        {/* SYNC PANEL */}
        {activeTab === "sync" && (
          <Card className="bg-[#11111a] border-white/5 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-red-400">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">Sync Status</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold">AniList API Integration</h4>
                  <p className="text-[10px] text-zinc-400">Syncs metadata, characters list, and releases.</p>
                </div>
                <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase">
                  Connected
                </Badge>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs font-black uppercase rounded-xl">
                  Force Sync Now
                </Button>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
};

export default AnimeForm;
