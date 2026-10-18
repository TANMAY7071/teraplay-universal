/**
 * Trakt Evaluation Panel
 * 
 * Developer-only panel for evaluating Trakt API coverage against
 * the current Supabase/local data. Accessible from the Experimental AI page.
 * 
 * Features:
 * - Search Trakt for any title
 * - View raw API responses
 * - Side-by-side field coverage comparison
 * - Toggle metadata provider at runtime
 * - Cache stats and management
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isTraktEnabled, hasTraktCredentials, TRAKT_CLIENT_ID } from "@/config/trakt";
import { traktSearchShows, traktGetShowRaw, traktGetSeasons } from "@/services/traktAnime";
import { anilistSearchShows, anilistGetShowRaw, anilistGetRelations, anilistGetAllEpisodes } from "@/services/anilistAnime";
import {
  searchSankaDonghua,
  getSankaDonghuaDetail,
  searchSankaDonghub,
  generateSankaDonghuaCoverage,
  generateSankaDonghubCoverage,
  getSankaDonghuaEpisodes
} from "@/services/sankaAnime";
import { generateCoverageReport, type TraktFieldCoverage } from "@/services/traktMapper";
import { generateAniListCoverageReport } from "@/services/anilistMapper";
import { clearTraktCache, getTraktCacheStats, traktGet } from "@/lib/traktClient";
import { clearAniListCache } from "@/lib/anilistClient";
import {
  searchOmdb,
  getOmdbDetail,
  generateOmdbCoverage
} from "@/services/omdbAnime";
import {
  searchBangumi,
  getBangumiDetail,
  generateBangumiCoverage
} from "@/services/bangumiAnime";
import {
  searchFandom,
  getFandomDetail,
  generateFandomCoverage,
  resolveFandomSubdomain
} from "@/services/fandomAnime";
import {
  searchSimkl,
  getSimklDetail,
  generateSimklCoverage,
  registerSimklLogListener,
  clearSimklDebugLogs,
  getSimklEpisodes
} from "@/services/simklAnime";
import {
  searchTmdb,
  getTmdbDetail,
  getTmdbSeasonDetail,
  generateTmdbCoverage,
  isTmdbConfigured
} from "@/services/tmdbAnime";
import * as defaultAnime from "@/services/anime";
import * as defaultEpisodes from "@/services/episodes";
import { animeCatalog } from "@/data/anime";
import { fetchAnimeCatalog, isAniListEnabled, isSankaDonghuaEnabled, isSankaDonghubEnabled, isOmdbEnabled, isBangumiEnabled, isFandomEnabled } from "@/services/metadataProvider";
import type { Anime } from "@/types/anime";
import type { TraktShow, TraktSeason, TraktEpisode } from "@/types/trakt";
import { cn } from "@/lib/utils";

// Helper to resolve Trakt image arrays to URLs
const resolveImage = (images: any, type: string = "poster"): string => {
  if (!images) return "";
  const urls = images[type];
  if (!urls || urls.length === 0) return "";
  const url = urls[0];
  if (url.startsWith("http")) return url;
  return `https://${url}`;
};

function generateDefaultCoverage(anime: any): any[] {
  return [
    { field: "Title", traktValue: anime.title || "—", hasData: !!anime.title },
    { field: "Year", traktValue: String(anime.year || "—"), hasData: !!anime.year },
    { field: "Overview", traktValue: anime.synopsis ? anime.synopsis.slice(0, 100) + "…" : "—", hasData: !!anime.synopsis },
    { field: "Genres", traktValue: (anime.genres || []).join(", ") || "—", hasData: !!(anime.genres?.length) },
    { field: "Status", traktValue: anime.status || "—", hasData: !!anime.status },
    { field: "Rating", traktValue: String(anime.rating || "—"), hasData: !!anime.rating },
    { field: "Episodes Count", traktValue: String(anime.episodes || "—"), hasData: !!anime.episodes },
    { field: "Poster Image", traktValue: anime.image || "—", hasData: !!anime.image },
    { field: "Banner Image", traktValue: anime.banner_url || anime.banner || "—", hasData: !!(anime.banner_url || anime.banner) },
    { field: "Type/Format", traktValue: anime.format || anime.type || "—", hasData: !!(anime.format || anime.type) },
    { field: "Network/Studio", traktValue: anime.studio || "—", hasData: !!anime.studio },
    { field: "Anilist ID", traktValue: String(anime.anilist_id || "—"), hasData: !!anime.anilist_id },
    { field: "Trakt Slug", traktValue: anime.trakt_slug || "—", hasData: !!anime.trakt_slug },
    { field: "Donghua API Slug", traktValue: anime.donghua_api_slug || "—", hasData: !!anime.donghua_api_slug },
  ];
}

function getSimklEpisodeImage(ep: any): string {
  const raw =
    ep?.img ??
    ep?.image ??
    ep?.thumbnail ??
    ep?.poster ??
    ep?.images?.thumbnail ??
    ep?.images?.poster ??
    "";

  if (!raw) return "";

  let cleanUrl = "";
  // Already a complete URL
  if (/^https?:\/\//i.test(raw)) {
    cleanUrl = raw;
  } else {
    // Normalize a possible filename
    const clean = String(raw)
      .replace(/\.(jpg|jpeg|png|webp)$/i, "")
      .replace(/_(w|c|m)$/i, "");
    cleanUrl = `https://simkl.in/episodes/${clean}_w.webp`;
  }

  // Use wsrv.nl to bypass SIMKL hotlinking blocks
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&q=90`;
}

export default function TraktEvalPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [selectedShow, setSelectedShow] = useState<TraktShow | null>(null);
  const [coverageReport, setCoverageReport] = useState<TraktFieldCoverage[]>([]);
  const [rawJson, setRawJson] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [providerOverride, setProviderOverride] = useState<string>(
    localStorage.getItem("donghua-metadata-provider") || "simkl"
  );
  const [fandomSubdomain, setFandomSubdomain] = useState<string>(
    localStorage.getItem("fandom-subdomain") || "soulland"
  );
  const [activeTab, setActiveTab] = useState<"search" | "coverage" | "seasons" | "raw" | "catalog">("search");
  
  // Seasons & Episodes Explorer State
  const [seasonsList, setSeasonsList] = useState<TraktSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, any[]>>({});
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  // Raw JSON Inspector States
  const [rawSearchJson, setRawSearchJson] = useState<string>("");
  const [rawDetailsJson, setRawDetailsJson] = useState<string>("");
  const [rawEpisodesJson, setRawEpisodesJson] = useState<string>("");
  const [rawImagesJson, setRawImagesJson] = useState<string>("");
  const [selectedRawType, setSelectedRawType] = useState<"search" | "details" | "episodes" | "images">("details");

  // Episode Debug Panel States
  const [showEpisodeDebug, setShowEpisodeDebug] = useState<boolean>(false);
  const [imageLoadStatus, setImageLoadStatus] = useState<Record<number, "loading" | "success" | "failed">>({});
  
  const [simklLogs, setSimklLogs] = useState<string[]>([]);
  useEffect(() => {
    if (providerOverride === "simkl") {
      return registerSimklLogListener((newLogs) => {
        setSimklLogs(newLogs);
      });
    }
  }, [providerOverride]);
  
  // Real Database Catalog Info
  const [dbCatalogCount, setDbCatalogCount] = useState<number>(0);
  const [fullCatalog, setFullCatalog] = useState<Anime[]>([]);

  const hasCredentials = hasTraktCredentials();
  const isActive = isTraktEnabled();

  // Helper to generate hashcode from a string
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  };

  const formatAiredAgo = (dateStr: string): string => {
    try {
      const diffTime = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return `Airing in ${Math.abs(diffDays)} days`;
      }
      if (diffDays === 0) return "Today";
      return `${diffDays} days ago`;
    } catch {
      return "";
    }
  };

  // ─── Search Handler ──────────────────────────────────
 
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    setSearchResults([]);
    setSelectedShow(null);
    setCoverageReport([]);
    setRawJson("");

    const provider = localStorage.getItem("donghua-metadata-provider") || "default";

    try {
      let results: Anime[] = [];
      if (provider === "anilist") {
        results = await anilistSearchShows(searchQuery, 10);
      } else if (provider === "sanka-donghua") {
        results = await searchSankaDonghua(searchQuery);
      } else if (provider === "sanka-donghub") {
        results = await searchSankaDonghub(searchQuery);
      } else if (provider === "omdb") {
        results = await searchOmdb(searchQuery);
      } else if (provider === "bangumi") {
        results = await searchBangumi(searchQuery);
      } else if (provider === "fandom") {
        const sub = localStorage.getItem("fandom-subdomain") || "soulland";
        results = await searchFandom(sub, searchQuery);
      } else if (provider === "simkl") {
        results = await searchSimkl(searchQuery);
      } else if (provider === "tmdb") {
        results = await searchTmdb(searchQuery);
      } else if (provider === "default") {
        results = await defaultAnime.fetchAnimeCatalog({ search: searchQuery, limit: 20 });
      } else {
        results = await traktSearchShows(searchQuery, 10);
      }
      setSearchResults(results);
      setRawSearchJson(JSON.stringify(results, null, 2));
      if (results.length === 0) {
        setError(`No results found for "${searchQuery}" on ${provider}.`);
      }
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);
 
  // ─── Show Detail + Coverage ──────────────────────────
 
  const inspectShow = useCallback(async (slug: string) => {
    setLoading(true);
    setError("");
    setSelectedSeason(null);
    setSeasonsList([]);
    setSeasonEpisodes({});

    const provider = localStorage.getItem("donghua-metadata-provider") || "default";
    const isAniList = provider === "anilist";
    const isSankaDonghua = provider === "sanka-donghua";
    const isSankaDonghub = provider === "sanka-donghub";

    try {
      if (isAniList) {
        const id = Number(slug);
        const raw = await anilistGetShowRaw(id);
        if (raw) {
          const mockShow: any = {
            ids: { slug: String(raw.id), trakt: raw.id } as any,
            title: raw.title.english || raw.title.userPreferred || "Unknown Title",
            year: raw.seasonYear || raw.startDate?.year || 0,
            overview: raw.description ? raw.description.replace(/<[^>]*>/g, "") : "",
            genres: raw.genres || [],
            status: raw.status === "FINISHED" ? "ended" : "returning series",
            rating: raw.averageScore ? raw.averageScore / 10 : 0,
            votes: raw.popularity || 0,
            network: (raw.studios?.nodes?.[0]?.name) || "AniList Studio",
            country: raw.countryOfOrigin || "CN",
            images: {
              poster: [raw.coverImage?.extraLarge || raw.coverImage?.large || ""],
              fanart: [raw.bannerImage || ""]
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateAniListCoverageReport(raw));
          setRawJson(JSON.stringify(raw, null, 2));

          const mainSeason = {
            number: 1,
            title: "Current Show",
            ids: { trakt: raw.id } as any,
            images: { poster: [raw.coverImage?.extraLarge || raw.coverImage?.large || ""] },
            episode_count: raw.episodes,
            rating: raw.averageScore ? raw.averageScore / 10 : undefined,
          };

          const relatedSeasons = (raw.relations?.edges || [])
            .filter((edge: any) => edge.node && edge.node.type === "ANIME")
            .map((edge: any, index: number) => {
              const node = edge.node;
              return {
                number: index + 2,
                title: `${edge.relationType}: ${node.title.english || node.title.userPreferred || "Unknown"}`,
                ids: { trakt: node.id } as any,
                images: { poster: [node.coverImage?.large || ""] },
                episode_count: node.episodes,
                rating: undefined,
              };
            });

          const mappedSeasons = [mainSeason, ...relatedSeasons];
          setSeasonsList(mappedSeasons);
          setActiveTab("coverage");

          const eps = await anilistGetAllEpisodes(raw.id, raw.id);
          const mappedEps = eps.map((ep: any) => ({
            ids: { trakt: ep.id } as any,
            number: ep.episode_number,
            title: ep.title,
            overview: ep.description,
            runtime: parseInt(ep.duration) || 24,
            first_aired: ep.air_date,
            images: { screenshot: [ep.thumbnail_url] }
          }));

          setSeasonEpisodes({ [1]: mappedEps });
          setSelectedSeason(1);
        } else {
          setError(`Could not fetch details for ID "${slug}" from AniList`);
        }
      } else if (provider === "tmdb") {
        const raw = await getTmdbDetail(slug);
        if (raw) {
          const mockShow: any = {
            ids: { slug: String(raw.id), trakt: raw.id } as any,
            title: raw.name || raw.original_name || "Unknown Title",
            year: raw.first_air_date ? parseInt(raw.first_air_date.slice(0, 4)) : 0,
            overview: raw.overview || "",
            genres: (raw.genres || []).map((g: any) => g.name),
            status: raw.status || "Returning Series",
            rating: raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : 0,
            votes: raw.vote_count || 0,
            network: (raw.networks || [])[0]?.name || "TMDB",
            country: (raw.origin_country || [])[0] || "CN",
            images: {
              poster: [raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : ""],
              fanart: [raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : ""]
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateTmdbCoverage(raw));
          setRawJson(JSON.stringify(raw, null, 2));

          const seasons = (raw.seasons || []).map((s: any) => ({
            number: s.season_number,
            title: s.name || `Season ${s.season_number}`,
            ids: { trakt: s.id } as any,
            images: { poster: [s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : ""] },
            episode_count: s.episode_count || 0,
            rating: s.vote_average || undefined,
          }));

          setSeasonsList(seasons.length > 0 ? seasons : [{
            number: 1,
            title: "Season 1",
            ids: { trakt: raw.id } as any,
            images: { poster: [raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : ""] },
            episode_count: raw.number_of_episodes || 0,
            rating: raw.vote_average || undefined,
          }]);

          setActiveTab("coverage");
          if (raw.seasons && raw.seasons.length > 0) {
            const firstSeasonNum = raw.seasons[0].season_number;
            const seasonData = await getTmdbSeasonDetail(raw.id, firstSeasonNum);
            if (seasonData && seasonData.episodes) {
              const mappedEps = seasonData.episodes.map((ep: any) => ({
                ids: { trakt: ep.id } as any,
                number: ep.episode_number,
                title: ep.name,
                overview: ep.overview,
                runtime: ep.runtime || 24,
                first_aired: ep.air_date,
                images: { screenshot: [ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : ""] }
              }));
              setSeasonEpisodes({ [firstSeasonNum]: mappedEps });
              setSelectedSeason(firstSeasonNum);
            }
          }
        } else {
          setError(`Could not fetch details for TMDB ID "${slug}"`);
        }
      } else if (isSankaDonghua) {
        const raw = await getSankaDonghuaDetail(slug);
        if (raw) {
          const mockShow: any = {
            ids: { slug: slug, trakt: Math.abs(hashCode(slug)) } as any,
            title: raw.title,
            year: parseInt(raw.season) || 0,
            overview: raw.synopsis || "",
            genres: (raw.genres || []).map((g: any) => g.name),
            status: raw.status || "Ongoing",
            rating: parseFloat(raw.rating) || 0,
            votes: 0,
            network: raw.network || "",
            country: raw.country || "CN",
            images: {
              poster: [raw.poster],
              fanart: []
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateSankaDonghuaCoverage(raw));
          setRawJson(JSON.stringify(raw, null, 2));

          const mainSeason = {
            number: 1,
            title: "Episodes List",
            ids: { trakt: slug } as any,
            images: { poster: [raw.poster] },
            episode_count: raw.episodes_list?.length || 0,
            rating: parseFloat(raw.rating) || undefined,
          };
          setSeasonsList([mainSeason]);
          setActiveTab("coverage");

          const eps = await getSankaDonghuaEpisodes(slug);
          const mappedEps = eps.map((ep: any) => ({
            ids: { trakt: ep.id } as any,
            number: ep.episode_number,
            title: ep.title,
            overview: ep.description,
            runtime: 24,
            first_aired: ep.air_date || null,
            images: { screenshot: [ep.thumbnail_url] }
          }));
          setSeasonEpisodes({ [1]: mappedEps });
          setSelectedSeason(1);
        } else {
          setError(`Could not fetch details for "${slug}" from Sanka Donghua`);
        }
      } else if (isSankaDonghub) {
        // Find clicked search result or fallback to catalog test result
        let clickedItem: any = searchResults.find(r => r.slug === slug);
        if (!clickedItem) {
          const catMatch = catalogResults.find(r => r.traktSlug === slug);
          if (catMatch) {
            clickedItem = {
              ...catMatch.local,
              slug: catMatch.traktSlug,
              image: catMatch.image || catMatch.local.image,
              id: catMatch.local.id
            };
          }
        }
        if (clickedItem) {
          const mockShow: any = {
            ids: { slug: slug, trakt: clickedItem.id } as any,
            title: clickedItem.title,
            year: clickedItem.year,
            overview: clickedItem.synopsis || "",
            genres: [],
            status: clickedItem.status,
            rating: 0,
            votes: 0,
            network: "Donghub",
            country: "CN",
            images: {
              poster: [clickedItem.image],
              fanart: []
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateSankaDonghubCoverage(clickedItem));
          setRawJson(JSON.stringify(clickedItem, null, 2));

          const mainSeason = {
            number: 1,
            title: "Streams Only (Search Item)",
            ids: { trakt: clickedItem.id } as any,
            images: { poster: [clickedItem.image] },
            episode_count: 0,
            rating: undefined,
          };
          setSeasonsList([mainSeason]);
          setActiveTab("coverage");
        } else {
          setError(`Could not resolve search result for "${slug}" from Sanka Donghub`);
        }
      } else if (provider === "omdb") {
        const raw = await getOmdbDetail(slug);
        if (raw && raw.Response !== "False") {
          const mockShow: any = {
            ids: { slug: slug, trakt: Math.abs(hashCode(slug)) } as any,
            title: raw.Title,
            year: parseInt(raw.Year) || 0,
            overview: raw.Plot || "",
            genres: raw.Genre?.split(",")?.map((g: any) => g.trim()) || [],
            status: "Completed",
            rating: parseFloat(raw.imdbRating) || 0,
            votes: parseInt(raw.imdbVotes?.replace(/,/g, "")) || 0,
            network: raw.Production || "OMDb",
            country: raw.Country || "US",
            images: {
              poster: [raw.Poster !== "N/A" ? raw.Poster : ""],
              fanart: []
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateOmdbCoverage(raw));
          setRawJson(JSON.stringify(raw, null, 2));

          const mainSeason = {
            number: 1,
            title: `Seasons (${raw.totalSeasons || 1})`,
            ids: { trakt: slug } as any,
            images: { poster: [raw.Poster !== "N/A" ? raw.Poster : ""] },
            episode_count: 0,
            rating: parseFloat(raw.imdbRating) || undefined,
          };
          setSeasonsList([mainSeason]);
          setActiveTab("coverage");
        } else {
          setError(`Could not fetch details for "${slug}" from OMDb`);
        }
      } else if (provider === "bangumi") {
        const raw = await getBangumiDetail(slug);
        if (raw) {
          const infoMap: Record<string, string> = {};
          if (raw.infobox && Array.isArray(raw.infobox)) {
            raw.infobox.forEach((item: any) => {
              if (item.key && item.value) {
                infoMap[item.key] = Array.isArray(item.value) 
                  ? item.value.map((v: any) => typeof v === "object" ? v.v || "" : v).join(", ")
                  : typeof item.value === "object" ? item.value.v || "" : item.value;
              }
            });
          }

          const mockShow: any = {
            ids: { slug: slug, trakt: raw.id } as any,
            title: raw.name_cn || raw.name || "Unknown Title",
            year: parseInt(raw.date?.split("-")[0]) || 0,
            overview: raw.summary || "",
            genres: raw.tags?.map((t: any) => t.name) || [],
            status: "Ongoing",
            rating: raw.rating?.score || 0,
            votes: raw.rating?.total || 0,
            network: infoMap["动画制作"] || infoMap["制作"] || "Bangumi",
            country: "CN",
            images: {
              poster: [raw.images?.large || raw.images?.common || ""],
              fanart: []
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateBangumiCoverage(raw));
          setRawJson(JSON.stringify(raw, null, 2));

          const mainSeason = {
            number: 1,
            title: `Subject (eps: ${raw.eps || raw.total_episodes || 0})`,
            ids: { trakt: raw.id } as any,
            images: { poster: [raw.images?.large || raw.images?.common || ""] },
            episode_count: raw.eps || raw.total_episodes || 0,
            rating: raw.rating?.score || undefined,
          };
          setSeasonsList([mainSeason]);
          setActiveTab("coverage");
        } else {
          setError(`Could not fetch details for ID "${slug}" from Bangumi`);
        }
      } else if (provider === "fandom") {
        const sub = localStorage.getItem("fandom-subdomain") || "soulland";
        const raw = await getFandomDetail(sub, slug);
        if (raw) {
          const mockShow: any = {
            ids: { slug: slug, trakt: raw.pageid } as any,
            title: raw.title,
            year: 0,
            overview: raw.introText || "",
            genres: ["Wiki", sub],
            status: "Wiki Page",
            rating: 0,
            votes: 0,
            network: "Fandom Wiki",
            country: "CN",
            images: {
              poster: [raw.logoImage || ""],
              fanart: []
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateFandomCoverage(raw));
          setRawJson(JSON.stringify(raw, null, 2));

          const mainSeason = {
            number: 1,
            title: `Page sections (${raw.sections?.length || 0})`,
            ids: { trakt: raw.pageid } as any,
            images: { poster: [raw.logoImage || ""] },
            episode_count: raw.sections?.length || 0,
            rating: undefined,
          };
          setSeasonsList([mainSeason]);
          
          // Map sections as episodes list so they can browse the character sections/fields interactively!
          const mappedEps = (raw.sections || []).map((sec: any, index: number) => ({
            ids: { trakt: index } as any,
            number: index + 1,
            title: sec.title || `Section ${index + 1}`,
            overview: `Section level: ${sec.level || "2"}, anchor link: ${sec.anchor || ""}`,
            first_aired: "",
            images: { screenshot: [] },
          }));
          setSeasonEpisodes((prev) => ({ ...prev, [1]: mappedEps }));
          setSelectedSeason(1);

          setActiveTab("coverage");
        } else {
          setError(`Could not fetch details for page "${slug}" from Fandom subdomain: ${sub}`);
        }
      } else if (provider === "simkl") {
        let simklId = slug;
        const isNumeric = /^\d+$/.test(slug);
        if (!isNumeric) {
          const resolvedResults = await searchSimkl(slug);
          if (resolvedResults.length > 0 && resolvedResults[0].slug && /^\d+$/.test(resolvedResults[0].slug)) {
            simklId = resolvedResults[0].slug;
          } else {
            throw new Error(`Search result does not contain a numeric Simkl ID for "${slug}".`);
          }
        }
        
        const raw = await getSimklDetail(simklId);
        if (raw) {
          setRawDetailsJson(JSON.stringify(raw, null, 2));
          const imagesPayload = {
            poster: raw.poster || null,
            fanart: raw.fanart || null,
            banner: raw.banner || null,
            images: raw.images || null,
          };
          setRawImagesJson(JSON.stringify(imagesPayload, null, 2));

          const posterUrl = raw.poster ? (raw.poster.startsWith("http") ? raw.poster : `https://wsrv.nl/?url=https://simkl.in/posters/${raw.poster}_m.webp&q=90`) : "";
          const fanartUrl = raw.fanart ? (raw.fanart.startsWith("http") ? raw.fanart : `https://wsrv.nl/?url=https://simkl.in/fanart/${raw.fanart}_medium.webp&q=90`) : "";

          const mockShow: any = {
            ids: { slug: String(raw.ids?.simkl), trakt: raw.ids?.simkl } as any,
            title: raw.title,
            year: raw.year,
            overview: raw.overview,
            genres: raw.genres || [],
            status: raw.status || "ended",
            rating: raw.ratings?.simkl?.rating || 0,
            votes: raw.ratings?.simkl?.votes || 0,
            network: "Simkl Network",
            country: "CN",
            images: {
              poster: [posterUrl],
              fanart: [fanartUrl]
            }
          };

          // Query the local database for ID fallbacks
          let dbAnime: any = null;
          try {
            const anilistId = raw.ids?.anilist;
            if (anilistId) {
              const { data } = await supabase
                .from('anime')
                .select('*')
                .eq('anilist_id', parseInt(String(anilistId), 10))
                .maybeSingle();
              dbAnime = data;
            }
            if (!dbAnime) {
              const isNumericSlug = /^\d+$/.test(slug);
              const queryField = isNumericSlug ? 'id' : 'slug';
              const queryVal = isNumericSlug ? parseInt(slug, 10) : slug;
              const { data } = await supabase
                .from('anime')
                .select('*')
                .eq(queryField, queryVal)
                .maybeSingle();
              dbAnime = data;
            }
          } catch (dbErr) {
            console.warn("Failed to retrieve local show record for ID fallback:", dbErr);
          }

          setSelectedShow(mockShow);
          setCoverageReport(generateSimklCoverage(raw, dbAnime));
          setRawJson(JSON.stringify(raw, null, 2));

          if (dbAnime) {
            console.log(`[SyncService] Triggering automatic sync for database show ID: ${dbAnime.id}`);
            const { syncEpisodesFromAniListAndSimkl } = await import("@/services/syncService");
            syncEpisodesFromAniListAndSimkl(dbAnime.id).catch((err) => {
              console.error("Auto sync failed:", err);
            });
          }

          // Fetch real episodes from the dedicated Simkl episodes API endpoint using numeric ID
          const eps = await getSimklEpisodes(simklId).catch(() => []);
          setRawEpisodesJson(JSON.stringify(eps, null, 2));

          console.log("[SIMKL RAW EPISODES]", eps.slice(0, 3));
          console.log(
            "[SIMKL IMAGE FIELDS LOG]",
            eps.slice(0, 3).map((ep: any) => ({
              episode: ep.episode,
              season: ep.season,
              title: ep.title,
              img: ep.img,
              image: ep.image,
              thumbnail: ep.thumbnail,
              images: ep.images,
            }))
          );

          // Resolve episodes with TMDB fallbacks if needed
          const mappedEpsPromises = eps.map(async (ep: any) => {
            const sNum = Number(ep.season ?? 1);
            let episodeImage = getSimklEpisodeImage(ep);

            const targetTmdbId = dbAnime?.tmdb_id || raw.ids?.tmdb;
            if (!episodeImage && targetTmdbId && Number(ep.episode) <= 3) {
              const { getTmdbEpisodeThumbnail } = await import("@/services/metadata/tmdbEpisodeImage");
              const tmdbThumb = await getTmdbEpisodeThumbnail(
                Number(targetTmdbId),
                sNum,
                Number(ep.episode)
              );
              if (tmdbThumb) {
                episodeImage = tmdbThumb;
              }
            }

            return {
              ...ep,
              resolvedImage: episodeImage
            };
          });

          const resolvedEps = await Promise.all(mappedEpsPromises);

          const seasonsMap: Record<number, any> = {};
          const episodesBySeason: Record<number, any[]> = {};

          resolvedEps.forEach((ep: any) => {
            const sNum = Number(ep.season ?? 1);
            const episodeImage = ep.resolvedImage;

            if (!seasonsMap[sNum]) {
              seasonsMap[sNum] = {
                number: sNum,
                title: `Season ${sNum}`,
                ids: { simkl: raw.ids?.simkl },
                images: { poster: [episodeImage || posterUrl] },
                episode_count: 0,
                rating: raw.ratings?.simkl?.rating,
              };
            }
            seasonsMap[sNum].episode_count++;

            if (!episodesBySeason[sNum]) {
              episodesBySeason[sNum] = [];
            }

            episodesBySeason[sNum].push({
              ids: { simkl: ep.episode },
              number: Number(ep.episode),
              title: ep.title || `Episode ${ep.episode}`,
              overview: ep.overview || "",
              runtime: raw.runtime || 24,
              first_aired: ep.air_date || "",
              images: {
                screenshot: episodeImage ? [episodeImage] : []
              },
              rawImg: ep.img ?? ep.image ?? null,
              thumbnailLarge: episodeImage || null,
              thumbnailCard: episodeImage || null,
              thumbnailSmall: episodeImage || null,
            });
          });

          const seasonsList = Object.values(seasonsMap).sort((a, b) => a.number - b.number);
          setSeasonsList(seasonsList.length > 0 ? seasonsList : [{
            number: 1,
            title: "Season 1",
            ids: { simkl: raw.ids?.simkl },
            images: { poster: [posterUrl] },
            episode_count: raw.episodes_count || 24,
            rating: raw.ratings?.simkl?.rating,
          }]);

          setSeasonEpisodes(Object.keys(episodesBySeason).length > 0 ? episodesBySeason : {
            [1]: Array.from({ length: raw.episodes_count || 24 }).map((_, i) => ({
              ids: { simkl: i + 1 },
              number: i + 1,
              title: `Episode ${i + 1}`,
              overview: `Simkl metadata coverage description for Episode ${i + 1}.`,
              runtime: raw.runtime || 24,
              first_aired: "",
              images: { screenshot: [] }
            }))
          });

          const firstSeason = seasonsList[0]?.number || 1;
          setSelectedSeason(firstSeason);
          setActiveTab("coverage");
        } else {
          setError(`Could not fetch details for "${slug}" from Simkl API`);
        }
      } else if (provider === "default") {
        const raw = await defaultAnime.fetchAnimeBySlug(slug);
        if (raw) {
          const mockShow: any = {
            ids: { slug: raw.slug, trakt: raw.id } as any,
            title: raw.title,
            year: raw.year || 0,
            overview: raw.synopsis || "",
            genres: raw.genres || [],
            status: raw.status || "Completed",
            rating: raw.rating || 0,
            votes: 0,
            network: raw.studio || "Supabase",
            country: "CN",
            images: {
              poster: [raw.image || ""],
              fanart: [raw.banner_url || raw.banner || ""]
            }
          };

          setSelectedShow(mockShow);
          setCoverageReport(generateDefaultCoverage(raw));
          setRawJson(JSON.stringify(raw, null, 2));

          const eps = await defaultEpisodes.fetchEpisodes(raw.id).catch(() => []);

          const mainSeason = {
            number: 1,
            title: "Season 1",
            ids: { trakt: raw.id } as any,
            images: { poster: [raw.image || ""] },
            episode_count: eps.length,
            rating: raw.rating || undefined,
          };
          setSeasonsList([mainSeason]);
          setActiveTab("coverage");

          const mappedEps = eps.map((ep: any) => ({
            ids: { trakt: ep.id } as any,
            number: ep.number,
            title: ep.title || `Episode ${ep.number}`,
            overview: ep.synopsis || "",
            first_aired: ep.air_date || "",
            images: { screenshot: [ep.thumbnail_url || ep.image || ""] },
            rating: undefined,
          }));
          setSeasonEpisodes({ [1]: mappedEps });
          setSelectedSeason(1);
        } else {
          setError(`Could not fetch details for "${slug}" from local database`);
        }
      } else {
        const [raw, seasons] = await Promise.all([
          traktGetShowRaw(slug),
          traktGetSeasons(slug).catch(() => [] as TraktSeason[])
        ]);
        if (raw) {
          setSelectedShow(raw);
          setCoverageReport(generateCoverageReport(raw));
          setRawJson(JSON.stringify(raw, null, 2));
          setSeasonsList(seasons || []);
          setActiveTab("coverage");
          
          if (seasons && seasons.length > 0) {
            const firstSeason = seasons.find(s => s.number > 0)?.number ?? seasons[0].number;
            const eps = await traktGet<TraktEpisode[]>(
              `/shows/${slug}/seasons/${firstSeason}`,
              { extended: "full" }
            ).catch(() => [] as TraktEpisode[]);
            setSeasonEpisodes({ [firstSeason]: eps });
            setSelectedSeason(firstSeason);
          }
        } else {
          setError(`Could not fetch details for "${slug}"`);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch show details");
    } finally {
      setLoading(false);
    }
  }, [searchResults]);
 
  const loadSeasonEpisodes = useCallback(async (showSlug: string, seasonNumber: number) => {
    const provider = localStorage.getItem("donghua-metadata-provider") || "default";
    const isAniList = provider === "anilist";
    const isSankaDonghua = provider === "sanka-donghua";

    if (seasonEpisodes[seasonNumber]) {
      setSelectedSeason(seasonNumber);
      return;
    }
    setLoadingSeasons(true);
    try {
      if (isAniList) {
        const matchedSeason = seasonsList.find(s => s.number === seasonNumber);
        const aniListId = matchedSeason ? matchedSeason.ids.trakt : Number(showSlug);
        
        const eps = await anilistGetAllEpisodes(aniListId, aniListId);
        
        const mappedEps = eps.map((ep: any) => ({
          ids: { trakt: ep.id } as any,
          number: ep.episode_number,
          title: ep.title,
          overview: ep.description,
          runtime: parseInt(ep.duration) || 24,
          first_aired: ep.air_date,
          images: { screenshot: [ep.thumbnail_url] }
        }));
        
        setSeasonEpisodes((prev: any) => ({ ...prev, [seasonNumber]: mappedEps }));
        setSelectedSeason(seasonNumber);
      } else if (isSankaDonghua) {
        const eps = await getSankaDonghuaEpisodes(showSlug);
        const mappedEps = eps.map((ep: any) => ({
          ids: { trakt: ep.id } as any,
          number: ep.episode_number,
          title: ep.title,
          overview: ep.description,
          runtime: 24,
          first_aired: ep.air_date || null,
          images: { screenshot: [ep.thumbnail_url] }
        }));
        setSeasonEpisodes((prev: any) => ({ ...prev, [seasonNumber]: mappedEps }));
        setSelectedSeason(seasonNumber);
      } else if (provider === "default") {
        // Find local anime ID from selected show
        const localShowId = selectedShow?.ids.trakt;
        if (localShowId) {
          const eps = await defaultEpisodes.fetchEpisodes(localShowId).catch(() => []);
          const mappedEps = eps.map((ep: any) => ({
            ids: { trakt: ep.id } as any,
            number: ep.number,
            title: ep.title || `Episode ${ep.number}`,
            overview: ep.synopsis || "",
            first_aired: ep.air_date || "",
            images: { screenshot: [ep.thumbnail_url || ep.image || ""] },
            rating: undefined,
          }));
          setSeasonEpisodes((prev: any) => ({ ...prev, [seasonNumber]: mappedEps }));
          setSelectedSeason(seasonNumber);
        }
      } else if (provider === "fandom" || provider === "omdb" || provider === "bangumi") {
        // Already loaded during inspectShow
        setSelectedSeason(seasonNumber);
      } else {
        const eps = await traktGet<TraktEpisode[]>(
          `/shows/${showSlug}/seasons/${seasonNumber}`,
          { extended: "full" }
        );
        setSeasonEpisodes((prev) => ({ ...prev, [seasonNumber]: eps }));
        setSelectedSeason(seasonNumber);
      }
    } catch (err: any) {
      setError(`Failed to load episodes: ${err.message}`);
    } finally {
      setLoadingSeasons(false);
    }
  }, [seasonEpisodes, seasonsList]);

  // ─── Provider Toggle ────────────────────────────────

  const toggleProvider = useCallback((provider: string) => {
    localStorage.setItem("donghua-metadata-provider", provider);
    setProviderOverride(provider);
  }, []);

  // Fetch db count on mount
  useEffect(() => {
    async function loadDbCount() {
      try {
        const shows = await fetchAnimeCatalog({ limit: 1000 });
        setDbCatalogCount(shows.length);
        setFullCatalog(shows);
      } catch (err) {
        console.warn("Failed to fetch database catalog count:", err);
        setDbCatalogCount(animeCatalog.length);
        setFullCatalog(animeCatalog);
      }
    }
    loadDbCount();
  }, []);

  // ─── Catalog Test ────────────────────────────────────

  const [catalogResults, setCatalogResults] = useState<
    Array<{ local: Anime; traktSlug: string; found: boolean; traktTitle?: string; image?: string; subdomain?: string }>
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [testProgress, setTestProgress] = useState<{ current: number; total: number } | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "found" | "missing">("all");

  const testCatalogCoverage = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogResults([]);
    setError("");

    const provider = localStorage.getItem("donghua-metadata-provider") || "default";
    const isAniList = provider === "anilist";

    let showsToTest = fullCatalog;
    if (showsToTest.length === 0) {
      try {
        showsToTest = await fetchAnimeCatalog({ limit: 1000 });
        setFullCatalog(showsToTest);
      } catch (err) {
        showsToTest = animeCatalog;
      }
    }

    const results: typeof catalogResults = [];
    const total = showsToTest.length;
    setTestProgress({ current: 0, total });

    for (let i = 0; i < total; i++) {
      const anime = showsToTest[i];
      setTestProgress({ current: i + 1, total });

      try {
        let searchResult: Anime[] = [];
        let resolvedSub = "";

        if (provider === "anilist") {
          searchResult = await anilistSearchShows(anime.title, 1);
        } else if (provider === "sanka-donghua") {
          searchResult = await searchSankaDonghua(anime.title);
        } else if (provider === "sanka-donghub") {
          searchResult = await searchSankaDonghub(anime.title);
        } else if (provider === "omdb") {
          searchResult = await searchOmdb(anime.title);
        } else if (provider === "bangumi") {
          searchResult = await searchBangumi(anime.title);
        } else if (provider === "fandom") {
          resolvedSub = resolveFandomSubdomain(anime.title);
          searchResult = await searchFandom(resolvedSub, anime.title);
        } else if (provider === "simkl") {
          searchResult = await searchSimkl(anime.title);
        } else if (provider === "default") {
          searchResult = await defaultAnime.fetchAnimeCatalog({ search: anime.title, limit: 1 });
        } else {
          searchResult = await traktSearchShows(anime.title, 1);
        }

        if (searchResult.length > 0) {
          results.push({
            local: anime,
            traktSlug: searchResult[0].slug,
            found: true,
            traktTitle: searchResult[0].title,
            image: searchResult[0].image || "",
            subdomain: resolvedSub,
          });
        } else {
          results.push({ local: anime, traktSlug: "", found: false });
        }
      } catch {
        results.push({ local: anime, traktSlug: "", found: false });
      }
      
      // Update results array periodically to show live progress
      if (i % 2 === 0 || i === total - 1) {
        setCatalogResults([...results]);
      }
      
      // Small delay between requests to respect rate limits
      await new Promise((r) => setTimeout(r, 750));
    }

    setCatalogResults(results);
    setTestProgress(null);
    setCatalogLoading(false);
  }, [fullCatalog]);

  const filteredCatalogResults = catalogResults.filter((r) => {
    if (filterMode === "found") return r.found;
    if (filterMode === "missing") return !r.found;
    return true;
  });

  // Find next episode in loaded season episodes
  const upcomingEpisode = (() => {
    let nextEp: TraktEpisode | null = null;
    let nextEpTime = Infinity;
    
    Object.values(seasonEpisodes).forEach((eps) => {
      eps.forEach((ep) => {
        if (ep.first_aired) {
          const airTime = new Date(ep.first_aired).getTime();
          if (airTime > Date.now() && airTime < nextEpTime) {
            nextEpTime = airTime;
            nextEp = ep;
          }
        }
      });
    });
    
    return nextEp;
  })();

  // ─── Cache Stats ─────────────────────────────────────

  const cacheStats = getTraktCacheStats();

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🔬 Simkl Metadata Explorer & Sync Hub
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Explore Simkl and AniList database metadata coverage and synchronise with Supabase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-white/5">
            Provider: {providerOverride}
          </div>
        </div>
      </div>

      {/* Credentials Check */}
      {providerOverride === "trakt" && !hasCredentials && (
        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300">
          <strong>⚠️ No Trakt Credentials:</strong> Add your{" "}
          <code className="bg-black/30 px-1 rounded">VITE_TRAKT_CLIENT_ID</code> to{" "}
          <code className="bg-black/30 px-1 rounded">.env</code> and restart the dev server.
          {TRAKT_CLIENT_ID && (
            <span className="block mt-1 text-zinc-500">
              Current: {TRAKT_CLIENT_ID.slice(0, 8)}…
            </span>
          )}
        </div>
      )}

      {providerOverride === "tmdb" && !isTmdbConfigured() && (
        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300">
          <strong>⚠️ No TMDB Credentials:</strong> Add your{" "}
          <code className="bg-black/30 px-1 rounded">VITE_TMDB_API_KEY</code> or{" "}
          <code className="bg-black/30 px-1 rounded">VITE_TMDB_READ_ACCESS_TOKEN</code> to{" "}
          <code className="bg-black/30 px-1 rounded">.env</code> and restart your dev server.
        </div>
      )}

      {/* Provider Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-black/30 p-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Provider:</span>
          <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 flex-wrap gap-1">
            {["default", "trakt", "anilist", "sanka-donghua", "sanka-donghub", "omdb", "bangumi", "fandom", "simkl", "tmdb"].map((p) => (
              <button
                key={p}
                onClick={() => toggleProvider(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  providerOverride === p
                    ? "bg-primary text-white shadow-lg"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {p === "default" 
                  ? "📦 Default" 
                  : p === "trakt" 
                    ? "🎬 Trakt" 
                    : p === "anilist" 
                      ? "🌸 AniList" 
                      : p === "sanka-donghua" 
                        ? "🟢 Sanka Donghua" 
                        : p === "sanka-donghub"
                          ? "🔵 Sanka Donghub"
                          : p === "omdb"
                            ? "🎬 OMDb (IMDb)"
                            : p === "bangumi"
                              ? "📺 Bangumi"
                              : p === "simkl"
                                ? "✨ Simkl API"
                                : p === "tmdb"
                                  ? "🎥 TMDB API"
                                  : "🌐 Fandom Wiki"}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[9px] text-zinc-500 font-mono sm:ml-auto flex items-center gap-2">
          <span>Trakt Cache: {cacheStats.entries}</span>
          <button
            onClick={() => { clearTraktCache(); clearAniListCache(); setSearchResults([]); }}
            className="text-yellow-500 hover:text-yellow-400 hover:underline font-bold"
          >
            Clear All Cache
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
        {(["search", "coverage", "seasons", "raw", "catalog"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
              activeTab === tab
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab === "search" 
              ? "🔍 Search" 
              : tab === "coverage" 
                ? "📊 Coverage" 
                : tab === "seasons"
                  ? "🎬 Seasons"
                  : tab === "raw" 
                    ? "{ } Raw" 
                    : "📋 Catalog"}
          </button>
        ))}
      </div>

      {providerOverride === "simkl" && (
        <div className="p-4 rounded-xl bg-black border border-white/5 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Simkl Debug Console</span>
            <button
              onClick={() => { clearSimklDebugLogs(); setSimklLogs([]); }}
              className="text-[9px] text-zinc-500 hover:text-white underline uppercase tracking-wider"
            >
              Clear Console
            </button>
          </div>
          <div className="font-mono text-[10px] space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar text-left text-zinc-400">
            {simklLogs.length === 0 ? (
              <span className="text-zinc-600 italic">No request logs recorded yet. Run a search to trigger queries...</span>
            ) : (
              simklLogs.map((logLine, idx) => (
                <div key={idx} className={cn(
                  "py-0.5 whitespace-pre-line leading-relaxed",
                  (logLine.startsWith("GET") || logLine.startsWith("Simkl Search")) && "text-blue-400 font-bold",
                  logLine.startsWith("Status: 200") && "text-emerald-400",
                  logLine.includes("↳") && "text-zinc-500 font-semibold"
                )}>
                  {logLine}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* ═══ SEARCH TAB ═══ */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {providerOverride === "fandom" && (
              <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs shrink-0 text-zinc-400">
                <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-500">Wiki Subdomain:</span>
                <input
                  type="text"
                  value={fandomSubdomain}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFandomSubdomain(val);
                    localStorage.setItem("fandom-subdomain", val);
                  }}
                  className="bg-transparent border-none outline-none text-white w-28 text-xs font-mono font-bold placeholder:text-zinc-600 focus:ring-0 p-0"
                  placeholder="soulland"
                />
                <span className="text-[9px] text-zinc-600">.fandom.com</span>
              </div>
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={`Search ${
                providerOverride === "anilist" 
                  ? "AniList" 
                  : providerOverride === "sanka-donghua" 
                    ? "Sanka Donghua" 
                    : providerOverride === "sanka-donghub" 
                      ? "Sanka Donghub" 
                      : providerOverride === "omdb"
                        ? "OMDb (IMDb)"
                        : providerOverride === "bangumi"
                          ? "Bangumi"
                          : providerOverride === "fandom"
                            ? `${fandomSubdomain}.fandom.com`
                            : "Trakt"
              } (e.g. 'Battle Through the Heavens', 'Soul Land')`}
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            />
            <button
              onClick={handleSearch}
              disabled={loading || (providerOverride === "trakt" && !hasCredentials)}
              className="px-4 py-2 bg-primary rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary/80 transition-colors"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">
                {searchResults.length} Results
              </span>
              {searchResults.map((anime) => (
                <button
                  key={anime.id}
                  onClick={() => inspectShow(anime.slug)}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  {anime.image ? (
                    <img
                      src={anime.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-14 rounded object-cover bg-zinc-800"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-[10px]">
                      No img
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {anime.title}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {anime.year} · {anime.episodes} eps · {anime.genres.join(", ")}
                    </p>
                    <p className="text-[10px] text-zinc-600 truncate">
                      {anime.synopsis.slice(0, 100)}…
                    </p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    ⭐ {anime.rating}/10
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ COVERAGE TAB ═══ */}
      {activeTab === "coverage" && (
        <div className="space-y-4">
          {selectedShow ? (
            <>
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-bold text-white">{selectedShow.title}</h4>
                <span className="text-[10px] text-zinc-500 capitalize">
                  {providerOverride}/{selectedShow.ids.slug}
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left px-3 py-2 text-zinc-400 font-semibold">Field</th>
                      <th className="text-left px-3 py-2 text-zinc-400 font-semibold">
                        {providerOverride === "anilist" 
                          ? "AniList Value" 
                          : providerOverride === "sanka-donghua" 
                            ? "Sanka Donghua Value" 
                            : providerOverride === "sanka-donghub" 
                              ? "Sanka Donghub Value" 
                              : providerOverride === "omdb"
                                ? "OMDb Value"
                                : providerOverride === "bangumi"
                                  ? "Bangumi Value"
                                  : providerOverride === "fandom"
                                    ? "Fandom Value"
                                    : providerOverride === "default" 
                                      ? "Supabase Value" 
                                      : "Trakt Value"}
                      </th>
                      <th className="text-center px-3 py-2 text-zinc-400 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageReport.map((field, idx) => (
                      <tr
                        key={field.field}
                        className={idx % 2 === 0 ? "bg-black/20" : "bg-black/10"}
                      >
                        <td className="px-3 py-1.5 text-zinc-300 font-medium">
                          {field.field}
                        </td>
                        <td className="px-3 py-1.5 text-zinc-400 max-w-[280px] truncate font-mono text-[10px]">
                          {field.traktValue}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {field.hasData ? (
                            <span className="text-green-400">✅</span>
                          ) : (
                            <span className="text-red-400" title={field.notes}>
                              ❌
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 text-[11px] text-zinc-500">
                <span>
                  ✅ Available:{" "}
                  {coverageReport.filter((f) => f.hasData).length}/{coverageReport.length}
                </span>
                <span>
                  ❌ Missing:{" "}
                  {coverageReport.filter((f) => !f.hasData).length}/{coverageReport.length}
                </span>
                <span>
                  Coverage:{" "}
                  {Math.round(
                    (coverageReport.filter((f) => f.hasData).length / coverageReport.length) * 100
                  )}%
                </span>
              </div>
            </>
          ) : (
            <div className="text-center text-zinc-600 py-8 text-sm">
              Search for a show and click it to see the coverage report.
            </div>
          )}
        </div>
      )}

      {/* ═══ SEASONS & EPISODES TAB ═══ */}
      {activeTab === "seasons" && (
        <div className="space-y-6">
          {selectedShow ? (
            <div className="space-y-6">
              {/* Show Header Info */}
              <div className="flex flex-col sm:flex-row gap-4 items-start bg-white/3 p-4 rounded-xl border border-white/5">
                {resolveImage(selectedShow.images, "poster") && (
                  <img
                    src={resolveImage(selectedShow.images, "poster")}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-20 h-28 object-cover rounded-lg shadow-lg bg-zinc-800"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="text-base font-bold text-white">{selectedShow.title}</h4>
                    <p className="text-xs text-zinc-400">
                      {selectedShow.year} · {selectedShow.network || "Unknown Network"} · {selectedShow.country?.toUpperCase() || "CN"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-semibold uppercase">
                      Status: {selectedShow.status || "Unknown"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-semibold">
                      ⭐ {selectedShow.rating ? Math.round(selectedShow.rating * 10)/10 : "N/A"}/10
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-semibold">
                      📺 {seasonsList.filter(s => s.number > 0).length} Seasons
                    </span>
                  </div>
                  
                  {/* Next Episode Air Date Countdown */}
                  {upcomingEpisode && (
                    <div className="p-2.5 bg-green-500/10 border border-green-500/25 rounded-lg text-xs text-green-300 space-y-1 animate-pulse">
                      <span className="font-bold flex items-center gap-1 text-[11px] text-green-400">📅 Upcoming Air Date Scheduled:</span>
                      <p className="text-[11px]">
                        Season {upcomingEpisode.season} Episode {upcomingEpisode.number} — <strong className="text-white">"{upcomingEpisode.title}"</strong>
                      </p>
                      <p className="text-[9px] text-zinc-400 font-mono">
                        Airs on: {new Date(upcomingEpisode.first_aired!).toLocaleString()} ({Math.ceil((new Date(upcomingEpisode.first_aired!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days from now)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seasons Selector / Cards Grid */}
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                  Select Season to View Episodes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {seasonsList.map((season) => {
                    const seasonPoster = resolveImage(season.images, "poster");
                    return (
                      <button
                        key={season.ids.trakt}
                        onClick={() => loadSeasonEpisodes(selectedShow.ids.slug, season.number)}
                        className={`flex gap-3 p-3 rounded-xl border text-left transition-all items-center ${
                          selectedSeason === season.number
                            ? "bg-primary/10 border-primary shadow-lg shadow-primary/5"
                            : "bg-white/3 border-white/5 hover:bg-white/5 hover:border-white/10"
                        }`}
                      >
                        {seasonPoster ? (
                          <img
                            src={seasonPoster}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 object-cover rounded bg-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-[8px] font-bold uppercase shrink-0">
                            No Poster
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-bold text-white block truncate">
                              {season.number === 0 ? "Specials" : `Season ${season.number}`}
                            </span>
                            {season.rating && (
                              <span className="text-[9px] text-zinc-400 shrink-0">⭐ {Math.round(season.rating * 10)/10}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {season.episode_count || 0} Episodes
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Season Episode List */}
              {selectedSeason !== null && (
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      {selectedSeason === 0 ? "Specials" : `Season ${selectedSeason}`} Episodes
                    </h5>
                    <div className="flex items-center gap-3">
                      {providerOverride === "simkl" && (
                        <button
                          type="button"
                          onClick={() => setShowEpisodeDebug(!showEpisodeDebug)}
                          className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-300 rounded hover:text-white transition-colors"
                        >
                          {showEpisodeDebug ? "Hide Episode Debug" : "Show Episode Debug"}
                        </button>
                      )}
                      {loadingSeasons && (
                        <span className="text-[10px] text-zinc-500 animate-pulse">Loading episodes...</span>
                      )}
                    </div>
                  </div>

                  {providerOverride === "simkl" && showEpisodeDebug && seasonEpisodes[selectedSeason] && (
                    <div className="bg-black/60 border border-white/5 p-4 rounded-xl space-y-3 animate-in slide-in-from-top duration-300 text-left font-mono text-[10px]">
                      <div className="text-xs font-black uppercase text-primary border-b border-white/5 pb-2">
                        Simkl Episode Image Debug Panel
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left leading-relaxed">
                          <thead>
                            <tr className="border-b border-white/5 text-zinc-500">
                              <th className="py-1">Episode</th>
                              <th className="py-1">Raw img Value</th>
                              <th className="py-1">Generated Thumbnail URL</th>
                              <th className="py-1 text-center">Load Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seasonEpisodes[selectedSeason].map((ep) => {
                              const imgStatus = ep.rawImg 
                                ? (imageLoadStatus[ep.number] || "loading") 
                                : "missing";

                              return (
                                <tr key={ep.number} className="border-b border-white/5 text-zinc-400">
                                  <td className="py-1.5 font-bold">Ep {ep.number}</td>
                                  <td className="py-1.5 text-zinc-500 break-all select-all pr-2 max-w-[120px] truncate">{ep.rawImg || "—"}</td>
                                  <td className="py-1.5 text-zinc-600 break-all select-all pr-2 max-w-[200px] truncate">
                                    {ep.thumbnailLarge ? (
                                      <a href={ep.thumbnailLarge} target="_blank" rel="noreferrer" className="hover:underline text-blue-400">
                                        {ep.thumbnailLarge.slice(0, 45)}...
                                      </a>
                                    ) : "—"}
                                  </td>
                                  <td className="py-1.5 text-center">
                                    {ep.thumbnailLarge && (
                                      <img
                                        src={ep.thumbnailLarge}
                                        alt=""
                                        onLoad={() => {
                                          setImageLoadStatus(prev => ({ ...prev, [ep.number]: "success" }));
                                        }}
                                        onError={() => {
                                          setImageLoadStatus(prev => ({ ...prev, [ep.number]: "failed" }));
                                        }}
                                        className="hidden"
                                      />
                                    )}
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                                      imgStatus === "success" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                      imgStatus === "failed" && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                                      imgStatus === "loading" && "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse",
                                      imgStatus === "missing" && "bg-zinc-500/10 text-zinc-500 border border-white/5"
                                    )}>
                                      {imgStatus === "success" && "✅ Loaded"}
                                      {imgStatus === "failed" && "❌ Failed"}
                                      {imgStatus === "loading" && "⏳ Loading"}
                                      {imgStatus === "missing" && "🚫 Missing"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {loadingSeasons ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                      {(!seasonEpisodes[selectedSeason] || seasonEpisodes[selectedSeason].length === 0) ? (
                        <div className="text-center text-zinc-600 py-8 text-xs italic">
                          No episodes found for this season.
                        </div>
                      ) : (
                        seasonEpisodes[selectedSeason].map((ep) => {
                          const epScreenshot = resolveImage(ep.images, "screenshot");
                          const fallbackImage = resolveImage(selectedShow?.images, "fanart") || resolveImage(selectedShow?.images, "poster") || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=225&fit=crop";
                          const displayImg = epScreenshot || fallbackImage;
                          return (
                            <div
                              key={ep.ids.simkl || ep.ids.trakt}
                              className="group cursor-pointer bg-[#0d0f17]/40 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-left transition-all duration-200 hover:border-white/10 active:scale-98"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="relative aspect-video w-20 rounded-xl overflow-hidden shrink-0 bg-black border border-white/5">
                                  <img
                                    src={displayImg}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-white fill-white opacity-85">
                                      <path d="M8 5.14v14c0 .86.94 1.36 1.66.9l10-7c.61-.43.61-1.37 0-1.8 l-10-7A1.002 1.002 0 0 0 8 5.14z"/>
                                    </svg>
                                  </div>
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <h4 className="text-xs font-black text-white truncate">
                                    {ep.title || `Episode ${ep.number}`}
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 font-bold">
                                    {ep.runtime ? `${ep.runtime} min` : "24 min"}
                                    {ep.first_aired && ` • ${formatAiredAgo(ep.first_aired)}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                    <polygon points="6 3 20 12 6 21 6 3" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-600 py-12 text-sm">
              Search for a show and click it to inspect its seasons & episodes.
            </div>
          )}
        </div>
      )}

      {/* ═══ RAW JSON TAB ═══ */}
      {activeTab === "raw" && (
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-black/40 rounded-lg border border-white/5 w-fit">
            {(["search", "details", "episodes", "images"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedRawType(type)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded capitalize transition-all",
                  selectedRawType === type 
                    ? "bg-primary text-white shadow" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {type} JSON
              </button>
            ))}
          </div>

          <pre className="bg-black/50 p-4 rounded-xl text-[10px] text-zinc-400 overflow-auto max-h-[500px] font-mono leading-relaxed border border-white/5">
            {selectedRawType === "search" && (rawSearchJson || "No search query run yet.")}
            {selectedRawType === "details" && (rawDetailsJson || "No show details loaded yet.")}
            {selectedRawType === "episodes" && (rawEpisodesJson || "No episodes details loaded yet.")}
            {selectedRawType === "images" && (rawImagesJson || "No image details loaded yet.")}
          </pre>
        </div>
      )}

      {/* ═══ CATALOG TAB ═══ */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">
                Test all <strong className="text-white">{dbCatalogCount || animeCatalog.length}</strong> titles from your database/local catalog against {
                  providerOverride === "anilist" 
                    ? "AniList" 
                    : providerOverride === "sanka-donghua" 
                      ? "Sanka Donghua" 
                      : providerOverride === "sanka-donghub" 
                        ? "Sanka Donghub" 
                        : providerOverride === "omdb"
                          ? "OMDb (IMDb)"
                          : providerOverride === "bangumi"
                            ? "Bangumi"
                            : providerOverride === "fandom"
                              ? `${fandomSubdomain}.fandom.com`
                              : "Trakt"
                }.
              </p>
              {testProgress && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Running live search scans...</span>
                    <span>{testProgress.current} / {testProgress.total} ({Math.round((testProgress.current / testProgress.total) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={testCatalogCoverage}
              disabled={catalogLoading || (providerOverride === "trakt" && !hasCredentials)}
              className="px-3 py-1.5 bg-primary rounded-lg text-xs font-semibold text-white disabled:opacity-40 whitespace-nowrap hover:bg-primary/80 transition-colors"
            >
              {catalogLoading ? "Testing..." : "Run Database Test"}
            </button>
          </div>

          {catalogResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex gap-4 text-[11px] text-zinc-500 font-semibold">
                  <span className="text-green-400">
                    ✅ Found: {catalogResults.filter((r) => r.found).length}
                  </span>
                  <span className="text-red-400">
                    ❌ Missing: {catalogResults.filter((r) => !r.found).length}
                  </span>
                  <span>
                    Coverage: {Math.round((catalogResults.filter((r) => r.found).length / catalogResults.length) * 100)}%
                  </span>
                </div>
                
                {/* Filters */}
                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                  {(["all", "found", "missing"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilterMode(mode)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded capitalize transition-all ${
                        filterMode === mode
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Viewport for large list */}
              <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1 select-none custom-scrollbar">
                {filteredCatalogResults.length === 0 ? (
                  <div className="text-center text-zinc-600 py-6 text-xs italic">
                    No results match this filter.
                  </div>
                ) : (
                  filteredCatalogResults.map((result) => (
                    <button
                      key={result.local.id}
                      onClick={async () => {
                        if (result.found) {
                          inspectShow(result.traktSlug);
                        } else {
                          setSearchQuery(result.local.title);
                          setActiveTab("search");
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 bg-[#090b11]/60 rounded-xl text-xs transition-all border border-white/5 text-left",
                        result.found 
                          ? "cursor-pointer hover:bg-[#0c0e18]/80 hover:border-primary/45 hover:scale-[1.005]" 
                          : "cursor-pointer hover:bg-red-500/5 hover:border-red-500/25"
                      )}
                      title={result.found ? `Click to inspect details for ${result.traktTitle}` : `Click to search for ${result.local.title} manually`}
                    >
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0",
                        result.found ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {result.found ? "✓" : "✗"}
                      </span>
                      
                      {/* Image Thumbnail */}
                      {result.found && result.image ? (
                        <img 
                          src={result.image} 
                          alt="" 
                          className="w-8 h-10 object-cover rounded-md bg-zinc-900 border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-10 rounded-md bg-zinc-900/60 border border-white/5 flex items-center justify-center shrink-0 text-zinc-700 text-[8px] font-bold uppercase">
                          No Pic
                        </div>
                      )}

                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-white font-bold block truncate">
                          {result.local.title}
                        </span>
                        {result.subdomain && (
                          <span className="text-[9px] text-primary font-mono font-bold block mt-0.5">
                            Subdomain: {result.subdomain}.fandom.com
                          </span>
                        )}
                      </div>

                      {result.found ? (
                        <span className="text-zinc-400 font-medium text-[10px] text-right truncate max-w-[200px]">
                          → {result.traktTitle}
                        </span>
                      ) : (
                        <span className="text-red-400/60 text-[9px] font-black uppercase tracking-wider text-right">
                          Missing
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
