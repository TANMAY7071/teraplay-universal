import React, { useState, useEffect, useMemo } from "react";
import { Installment } from "@/types/universe";
import { Play, Check, Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { useEpisodesQuery } from "@/hooks/useAnimeQueries";
import { 
  getHighResSimklImage, 
  SIMKL_CLIENT_ID, 
  type CanonicalEpisode, 
  type ThumbnailSource, 
  resolveSimklIdForShow 
} from "@/services/simklAnime";

import { fetchTmdbEpisodeImage, fetchTmdbEpisodeStillByMetadata, fetchTmdbSeasonDetails } from "@/services/metadata/externalApis";
import { getBrandingOverrides } from "@/lib/overrides";

interface EpisodesPreviewProps {
  animeId: number;
  anilistId?: number;
  selectedInstallment: Installment;
  installments: Installment[];
}

const EpisodeThumbnail: React.FC<{
  src: string;
  alt: string;
  fallbackSrc?: string;
}> = ({ src, alt, fallbackSrc }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [errorStage, setErrorStage] = useState(0);

  useEffect(() => {
    setImgSrc(src);
    setErrorStage(0);
  }, [src]);

  const handleError = () => {
    if (errorStage === 0) {
      setErrorStage(1);
      if (imgSrc && !imgSrc.includes("wsrv.nl") && imgSrc.includes("simkl.in")) {
        setImgSrc(`https://wsrv.nl/?url=${encodeURIComponent(imgSrc)}&q=90`);
      } else if (fallbackSrc) {
        setImgSrc(fallbackSrc);
      }
    } else if (errorStage === 1 && fallbackSrc && imgSrc !== fallbackSrc) {
      setErrorStage(2);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className="h-full w-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out"
    />
  );
};

export const EpisodesPreview: React.FC<EpisodesPreviewProps> = ({ 
  animeId, 
  anilistId,
  selectedInstallment, 
  installments 
}) => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  // Live Overrides sync tick to force re-render when CMS changes are saved
  const [, setOverridesTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setOverridesTick(t => t + 1);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("branding_overrides_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("branding_overrides_updated", handleUpdate);
    };
  }, []);

  // Fetch episodes from database
  const { data: dbEpisodes } = useEpisodesQuery(animeId);

  // Dynamic Simkl thumbnails & TMDB fallback thumbnails state
  const [simklThumbnails, setSimklThumbnails] = useState<Record<number, string>>({});
  const [tmdbThumbnails, setTmdbThumbnails] = useState<Record<number, string>>({});
  const [tmdbTitles, setTmdbTitles] = useState<Record<number, string>>({});
  const [simklEpisodes, setSimklEpisodes] = useState<{ absoluteNumber: number; relativeNumber: number; title: string; thumbnail: string; duration: string; aired: boolean; date?: string; }[]>([]);

  useEffect(() => {
    // Reset thumbnails and episode state on installment change to prevent cross-season thumbnail leaks
    setSimklEpisodes([]);
    setSimklThumbnails({});
    setTmdbTitles({});

    // Fallback lookup mapping of AniList IDs / Slugs / Installment IDs to Simkl IDs
    const getSimklId = (aniId?: number, slugStr?: string): number | null => {
      const map: Record<number, number> = {
        164057: 2275520, // Renegade Immortal (Xian Ni)
        125139: 1492145, // Swallowed Star (Tunshi Xingkong)
        134108: 1623359, // Perfect World (Wanmei Shijie)
        137728: 1972214, // BTTH S5 (Dou Po Cangqiong Nian Fan)
        100806: 1972214, // BTTH (default to S5 ONA)
        134088: 2275626, // The Great Ruler (Da Zhu Zai Nian Fan)
        198706: 3019366, // The Great Ruler S2 (Da Zhu Zai Nian Fan 2)
        106880: 106880,  // Stellar Transformations
      };
      
      if (aniId && map[aniId]) return map[aniId];
      
      const key = (slugStr || "").toLowerCase();
      if (key.includes("shuang-shen-zhi-zhan") || key.includes("dual-gods-battle") || selectedInstallment?.id === "sl-movie") return 2458428;
      if (key.includes("soul-land-2") || key.includes("jueshi-tangmen") || selectedInstallment?.id === "sl-s2") return 2193170;
      if (key.includes("soul-land") || selectedInstallment?.id === "sl-s1") return 764963;
      if (key.includes("battle-of-the-gods") || key.includes("shenlin-zhi-zhan") || key.includes("renegade-immortal-movie") || selectedInstallment?.id === "ri-movie-1") return 2801634;
      if (key.includes("renegade-immortal")) return 2275520;
      if (key.includes("swallowed-star")) return 1492145;
      if (key.includes("perfect-world")) return 1623359;
      if (key.includes("battle-through-the-heavens-season-5") || key.includes("dou-po-cangqiong-nian-fan")) return 1972214;
      if (key.includes("battle-through-the-heavens-season-1") || key === "battle-through-the-heavens") return 769063;
      if (key.includes("battle-through-the-heavens-season-2")) return 773451;
      if (key.includes("battle-through-the-heavens-season-3")) return 1213055;
      if (key.includes("battle-through-the-heavens-season-4")) return 1580703;
      if (key.includes("three-years-of-pledge") || key.includes("san-nian-zhi-yue")) return 1782480;
      if (key.includes("song-of-desert") || key.includes("special-2")) return 1068211;
      if (key.includes("special-1")) return 773451;
      if (key.includes("the-great-ruler-season-2")) return 3019366;
      if (key.includes("the-great-ruler")) return 2275626;
      if (key.includes("martial-universe") || key.includes("wu-dong-qiankun")) return 1033695;
      if (key.includes("stellar-transformations")) return 106880;
      
      return null;
    };

    async function fetchSimklThumbs() {
      setTmdbThumbnails({});
      try {
        let simklIds: { id: number; offset: number }[] = [];
        
        const slugKey = (selectedInstallment.donghuaApiSlug || selectedInstallment.slug || "").toLowerCase();
        
        // 1. Direct Installment Configuration (Primary & Automated)
        if (selectedInstallment?.simklIds && selectedInstallment.simklIds.length > 0) {
          simklIds = selectedInstallment.simklIds;
        } else if (selectedInstallment?.simklId) {
          simklIds = [{ id: selectedInstallment.simklId, offset: 0 }];
        } else if (anilistId === 125139 || slugKey.includes("swallowed-star")) {
          simklIds = [
            { id: 1492145, offset: 0 },
            { id: 1820140, offset: 26 },
            { id: 2333758, offset: 78 },
            { id: 2333760, offset: 130 }
          ];
        } else if (anilistId === 106880 || slugKey.includes("stellar-transformations")) {
          simklIds = [
            { id: 1302779, offset: 0 },
            { id: 1753725, offset: 12 },
            { id: 1721821, offset: 24 },
            { id: 1721827, offset: 36 },
            { id: 2070508, offset: 48 },
            { id: 2700144, offset: 60 }
          ];
        } else if (slugKey.includes("martial-universe") || slugKey.includes("wu-dong-qiankun")) {
          simklIds = [
            { id: 1033695, offset: 0 },
            { id: 1411153, offset: 12 },
            { id: 1721825, offset: 24 },
            { id: 2073864, offset: 36 },
            { id: 2694450, offset: 48 },
            { id: 2941078, offset: 60 }
          ];
        } else {
          let simklId = getSimklId(selectedInstallment.anilistId || anilistId, selectedInstallment.donghuaApiSlug || selectedInstallment.slug);
          
          if (!simklId) {
            simklId = await resolveSimklIdForShow(
              selectedInstallment.title || selectedInstallment.donghuaApiSlug || slug || "",
              selectedInstallment.anilistId || anilistId
            );
          }
          
          if (simklId) {
            simklIds = [{ id: simklId, offset: 0 }];
          }
        }

        if (simklIds.length === 0) return;
        
        const thumbsMap: Record<number, string> = {};
        const parsedEps: { absoluteNumber: number; relativeNumber: number; title: string; thumbnail: string; duration: string; aired: boolean; date?: string; }[] = [];
        
        await Promise.all(
          simklIds.map(async ({ id, offset }) => {
            try {
              const epUrl = `https://api.simkl.com/anime/episodes/${id}?extended=full&client_id=${SIMKL_CLIENT_ID}`;
              const epRes = await fetch(epUrl);
              if (!epRes.ok) return;
              const eps = await epRes.json();
              
              eps.forEach((e: any) => {
                if (e.episode) {
                  // Exclude mini-stories or specials intermixed into main season episode lists
                  const isSpecial = e.type === "special" || (e.title && (
                    e.title.toLowerCase().includes("mini stori") || 
                    e.title.toLowerCase().includes("special")
                  ));
                  if (isSpecial) return;

                  const isAired = e.aired !== false && (!e.date || new Date(e.date) <= new Date());

                  let thumbnail = "";
                  if (e.img || e.image) {
                    const rawImg = e.img || e.image;
                    thumbnail = getHighResSimklImage(rawImg);
                    thumbsMap[Number(e.episode) + offset] = thumbnail;
                    if (simklIds.length === 1 && offset === 0) {
                      thumbsMap[Number(e.episode)] = thumbnail;
                    }
                  }
                  
                  parsedEps.push({
                    absoluteNumber: Number(e.episode) + offset,
                    relativeNumber: Number(e.episode),
                    title: e.title || `Episode ${e.episode}`,
                    thumbnail: thumbnail,
                    duration: e.runtime ? `${e.runtime} min` : "24 min",
                    aired: isAired,
                    date: e.date,
                  });
                }
              });
            } catch (err) {
              console.warn(`[EpisodesPreview] Failed to fetch Simkl ID ${id}:`, err);
            }
          })
        );
        
        parsedEps.sort((a, b) => a.absoluteNumber - b.absoluteNumber);
        setSimklEpisodes(parsedEps);
        setSimklThumbnails(thumbsMap);

        // Fetch TMDB Season details for season episode titles & stills (e.g. BTTH Season 5, Soul Land, etc.)
        const explicitTmdbId = selectedInstallment.tmdbId || (
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

        let fetchedTmdbStills: Record<number, string> = {};
        if (explicitTmdbId) {
          const { stills: tmdbSStills, titles: tmdbSTitles } = await fetchTmdbSeasonDetails(
            explicitTmdbId,
            selectedInstallment.seasonNumber || 1
          );

          // For long-running donghua, also fetch TMDB Season 1 continuous stills
          const { stills: tmdbS1Stills } = await fetchTmdbSeasonDetails(
            explicitTmdbId,
            1
          );

          fetchedTmdbStills = { ...tmdbSStills };
          Object.keys(tmdbS1Stills).forEach((epKey) => {
            const epNum = Number(epKey);
            fetchedTmdbStills[epNum] = tmdbS1Stills[epNum];
            if (epNum >= startEpisode && epNum < startEpisode + (selectedInstallment.episodesCount || 200)) {
              const relNum = epNum - startEpisode + 1;
              fetchedTmdbStills[relNum] = tmdbS1Stills[epNum];
            }
          });

          if (Object.keys(fetchedTmdbStills).length > 0) {
            setTmdbThumbnails(prev => ({ ...prev, ...fetchedTmdbStills }));
          }
          if (Object.keys(tmdbSTitles).length > 0) {
            setTmdbTitles(tmdbSTitles);
          }
        }

        // Execute TMDB thumbnail rescue safely ONLY for aired episodes with missing scene stills
        const missingEpisodes = parsedEps.filter(ep => 
          ep.aired && 
          (!ep.thumbnail || ep.thumbnail.trim() === "") &&
          !fetchedTmdbStills[ep.relativeNumber] &&
          !fetchedTmdbStills[ep.absoluteNumber]
        );
        if (missingEpisodes.length > 0) {
          const showTitle = slug || selectedInstallment.donghuaApiSlug || selectedInstallment.title || "";
          const tmdbMap: Record<number, string> = {};
          const assignedStills = new Set<string>();

          // Calculate same-date batch indices for multi-episode premieres
          const dateCounts: Record<string, number> = {};
          const epDateIndices: Record<number, number> = {};

          parsedEps.forEach((ep) => {
            const cleanDate = ep.date ? ep.date.slice(0, 10) : "";
            if (cleanDate) {
              const count = dateCounts[cleanDate] || 0;
              epDateIndices[ep.absoluteNumber] = count;
              dateCounts[cleanDate] = count + 1;
            } else {
              epDateIndices[ep.absoluteNumber] = 0;
            }
          });

          for (const ep of missingEpisodes) {
            const cleanDate = ep.date ? ep.date.slice(0, 10) : "";
            const sameDateIndex = cleanDate ? (epDateIndices[ep.absoluteNumber] || 0) : 0;

            const canonicalGlobalEpNum = startEpisode + ep.relativeNumber - 1;
            const explicitTmdbId = selectedInstallment.tmdbId || (
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

            const seasonEpNum = (ep.relativeNumber >= startEpisode)
              ? (ep.relativeNumber - startEpisode + 1)
              : ep.relativeNumber;

            const tmdbStill = await fetchTmdbEpisodeStillByMetadata({
              showTitle,
              explicitTmdbId,
              airDate: ep.date,
              episodeTitle: ep.title,
              seasonNumber: selectedInstallment.seasonNumber || 1,
              episodeNumber: seasonEpNum,
              globalEpisodeNumber: ep.absoluteNumber,
              sameDateIndex,
            });

            if (tmdbStill) {
              if (!assignedStills.has(tmdbStill)) {
                assignedStills.add(tmdbStill);
                tmdbMap[canonicalGlobalEpNum] = tmdbStill;
                tmdbMap[ep.absoluteNumber] = tmdbStill;
                tmdbMap[seasonEpNum] = tmdbStill;
                if (!selectedInstallment.seasonNumber || selectedInstallment.seasonNumber === 1) {
                  tmdbMap[ep.relativeNumber] = tmdbStill;
                }
                console.log(`[TMDB Episode Match] Our S${selectedInstallment.seasonNumber || 1} E${seasonEpNum} (Global: ${ep.absoluteNumber}) -> TMDB Still: ${tmdbStill}`);
              } else {
                console.warn(`[TMDB Duplicate Prevented] Still ${tmdbStill} was already claimed. Declining duplicate assignment for E${ep.relativeNumber}.`);
              }
            }
          }

          if (Object.keys(tmdbMap).length > 0) {
            setTmdbThumbnails(prev => ({ ...prev, ...tmdbMap }));
          }
        }
      } catch (err) {
        console.warn("[EpisodesPreview] Failed to fetch Simkl thumbnails:", err);
      }
    }
    
    fetchSimklThumbs();
  }, [anilistId, selectedInstallment]);

  const [isExpanded, setIsExpanded] = useState(false);
  const watchProgress = getProgress(slug || "battle-through-the-heavens");

  const isMovieInstallment = selectedInstallment.type === "Movie" || selectedInstallment.episodesCount === 1 || (selectedInstallment.slug || "").includes("movie") || String(selectedInstallment.id || "").includes("movie");

  // Helper for resolving scene thumbnails from SIMKL API or TMDB fallback or clean installment poster/banner fallback with source provenance
  const resolveEpisodeThumbnailAndSource = (
    epNum: number,
    relativeNum: number,
    simklThumb?: string,
    isUpcoming?: boolean
  ): { url: string; source: ThumbnailSource } => {
    // 1. Local & CMS Saved Verified Episode Thumbnail Overrides (Fast & Live Synchronized)
    const seriesSlug = slug || selectedInstallment.donghuaApiSlug || "battle-through-the-heavens";
    const brandingOverride = getBrandingOverrides(seriesSlug, selectedInstallment.id);

    const mergedVerified = {
      ...(selectedInstallment.verifiedEpisodeThumbnails || {}),
      ...(brandingOverride.verifiedEpisodeThumbnails || {})
    };

    const verifiedUrl = mergedVerified[relativeNum] || mergedVerified[epNum];
    if (verifiedUrl && verifiedUrl.trim() !== "") {
      return { url: verifiedUrl, source: "simkl" };
    }

    // 2. If episode is upcoming/unaired, NEVER display scene stills (which might be leaked preview stills). Strictly use active season poster!
    if (isUpcoming) {
      if (selectedInstallment.poster && selectedInstallment.poster.trim() !== "") {
        return { url: selectedInstallment.poster, source: "installment-poster" };
      }
      if (selectedInstallment.banner && selectedInstallment.banner.trim() !== "") {
        return { url: selectedInstallment.banner, source: "installment-banner" };
      }
    }

    const seasonEpNum = (relativeNum >= startEpisode) ? (relativeNum - startEpisode + 1) : relativeNum;
    const rawTmdb = tmdbThumbnails[epNum] || tmdbThumbnails[seasonEpNum] || tmdbThumbnails[relativeNum];
    if (rawTmdb && rawTmdb.trim() !== "") {
      return { url: rawTmdb, source: "tmdb" as any };
    }

    const rawSimkl = simklThumb || simklThumbnails[epNum] || simklThumbnails[relativeNum];
    if (rawSimkl && rawSimkl.trim() !== "") {
      return { url: getHighResSimklImage(rawSimkl), source: "simkl" };
    }
    if (selectedInstallment.poster && selectedInstallment.poster.trim() !== "") {
      return { url: selectedInstallment.poster, source: "installment-poster" };
    }
    if (selectedInstallment.banner && selectedInstallment.banner.trim() !== "") {
      return { url: selectedInstallment.banner, source: "installment-banner" };
    }
    return {
      url: selectedInstallment.poster || selectedInstallment.banner || "",
      source: "series-poster"
    };
  };

  // 1. Calculate absolute episode range for selected installment
  const installmentIndex = installments.findIndex(inst => inst.id === selectedInstallment.id);
  let startEpisode = 1;
  if (installmentIndex !== -1) {
    for (let i = 0; i < installmentIndex; i++) {
      startEpisode += installments[i].episodesCount || 0;
    }
  }
  const endEpisode = startEpisode + (selectedInstallment.episodesCount || 0) - 1;

  // Filter SIMKL episodes to AIRED episodes only
  const airedSimklEpisodes = useMemo(() => simklEpisodes.filter(ep => ep.aired), [simklEpisodes]);
  const nextScheduledEpisode = useMemo(() => simklEpisodes.find(ep => !ep.aired), [simklEpisodes]);

  const maxAiredSimklEp = airedSimklEpisodes.length > 0 ? airedSimklEpisodes[airedSimklEpisodes.length - 1] : null;
  const maxAiredRelativeEp = maxAiredSimklEp ? maxAiredSimklEp.relativeNumber : (dbEpisodes && dbEpisodes.length > 0 ? dbEpisodes.length : 37);

  // 2. Build canonical episode list dynamically
  const matchedDbEps = dbEpisodes && dbEpisodes.length > 0
    ? dbEpisodes.filter(ep => 
        (ep.season_id !== null && ep.season_id !== undefined && ep.season_id === selectedInstallment.id) || 
        (ep.episode_number >= startEpisode && ep.episode_number <= endEpisode)
      )
    : [];

  const isCompletedSeason = selectedInstallment.status === "Completed";
  const airedCount = Math.max(airedSimklEpisodes.length, matchedDbEps.length, maxAiredRelativeEp);
  
  // For ongoing seasons: render all AIRED episodes + at most 1 next upcoming episode (e.g. Ep 38).
  // Do NOT render unreleased future episodes (Ep 39-52) on ongoing shows.
  const totalCountToRender = isCompletedSeason
    ? (selectedInstallment.episodesCount || 52)
    : Math.min(airedCount + 1, selectedInstallment.episodesCount || 52);

  let rawEpisodesList: CanonicalEpisode[] = isMovieInstallment
    ? (() => {
        const thumbObj = resolveEpisodeThumbnailAndSource(startEpisode, 1, undefined);
        return [
          {
            installmentId: String(selectedInstallment.id),
            simklId: selectedInstallment.simklId || 0,
            absoluteNumber: startEpisode,
            relativeNumber: 1,
            title: selectedInstallment.title,
            duration: "1h 45m",
            isWatched: false,
            isUpcoming: false,
            isAired: true,
            thumbnailUrl: thumbObj.url,
            thumbnailSource: thumbObj.source,
          }
        ];
      })()
    : Array.from({ length: totalCountToRender }, (_, idx) => {
        const relativeEpNum = idx + 1;
        const absoluteEpNum = startEpisode + idx;
        const dbEp = matchedDbEps.find(e => e.episode_number === absoluteEpNum || e.episode_number === relativeEpNum);
        const simklEp = simklEpisodes.find(e => e.relativeNumber === relativeEpNum || e.absoluteNumber === absoluteEpNum);

        const isWatched = watchProgress ? absoluteEpNum < watchProgress.episodeNumber : false;
        
        const isAired = dbEp ? true : (simklEp ? simklEp.aired : relativeEpNum <= maxAiredRelativeEp);
        const isUpcoming = !isAired;
        
        const dbThumb = dbEp?.thumbnail_url && dbEp.thumbnail_url.trim() !== "" ? dbEp.thumbnail_url : undefined;
        const simklImg = isAired ? (simklEp?.thumbnail || simklThumbnails[absoluteEpNum] || simklThumbnails[relativeEpNum]) : undefined;
        const thumbObj = dbThumb ? { url: dbThumb, source: "db" } : resolveEpisodeThumbnailAndSource(absoluteEpNum, relativeEpNum, simklImg, isUpcoming);
        const verifiedTitle = selectedInstallment.verifiedEpisodeTitles?.[relativeEpNum] || selectedInstallment.verifiedEpisodeTitles?.[absoluteEpNum];
        const dbTitle = dbEp?.title && !dbEp.title.toLowerCase().startsWith("episode ") ? dbEp.title : undefined;
        const simklTitle = simklEp?.title && !simklEp.title.toLowerCase().startsWith("episode ") ? simklEp.title : undefined;
        const tmdbTitle = tmdbTitles[relativeEpNum] || tmdbTitles[absoluteEpNum];

        const title = verifiedTitle || dbTitle || simklTitle || tmdbTitle || `Episode ${relativeEpNum}`;
        const duration = isUpcoming 
          ? (simklEp?.date ? `Airs ${new Date(simklEp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Upcoming")
          : (dbEp?.duration || simklEp?.duration || "24 min");

        return {
          installmentId: String(selectedInstallment.id),
          simklId: selectedInstallment.simklId || 0,
          absoluteNumber: absoluteEpNum,
          relativeNumber: relativeEpNum,
          title,
          duration,
          isWatched,
          isUpcoming,
          isAired,
          airDate: simklEp?.date,
          thumbnailUrl: thumbObj.url,
          thumbnailSource: thumbObj.source,
        };
      });

  const episodesList = rawEpisodesList;
  const totalEpisodesCount = episodesList.filter(e => !e.isUpcoming).length;
  const visibleEpisodes = isExpanded ? episodesList : episodesList.slice(0, 8);

  const handleEpisodeClick = (absoluteEpNum: number) => {
    const franchiseSlug = selectedInstallment.donghuaApiSlug || selectedInstallment.slug || slug || "donghua";
    navigate(`/watch/${franchiseSlug}/${absoluteEpNum}`);
  };

  return (
    <div className="space-y-5 text-left w-full">
      
      {/* Upcoming Episode Scheduled Notice */}
      {nextScheduledEpisode && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg shadow-emerald-950/20">
          <Calendar className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white uppercase tracking-wider">Upcoming Air Date Scheduled:</span>
            <span>Episode {nextScheduledEpisode.relativeNumber} — "{nextScheduledEpisode.title}"</span>
            {nextScheduledEpisode.date && (
              <span className="text-zinc-400 font-medium">
                (Airs on: {new Date(nextScheduledEpisode.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Episodes Header with search and layout details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-1 sm:gap-2">
        <div className="flex items-center gap-2">
          <Play className="h-4.5 w-4.5 text-primary fill-current" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">EPISODES</h3>
        </div>
        <span className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider truncate max-w-full">
          {selectedInstallment.title} • {totalEpisodesCount} Available
        </span>
      </div>

      {/* EPISODES GRID (Matches original premium layout) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleEpisodes.map((ep) => {
          let detailLabel = ep.duration;
          let isResume = false;
          
          const isCurrentProgress = watchProgress ? watchProgress.episodeNumber === ep.absoluteNumber : false;
          if (isCurrentProgress) {
            detailLabel = "13:42 remaining";
            isResume = true;
          }

          return (
            <div
              key={ep.absoluteNumber}
              onClick={() => handleEpisodeClick(ep.absoluteNumber)}
              className={cn(
                "group cursor-pointer bg-[#0c0d12]/40 border rounded-2xl overflow-hidden transition-all duration-300 relative p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_20px_rgba(168,85,247,0.08)]",
                ep.isUpcoming ? "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400" : "border-white/5 hover:border-primary/30"
              )}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video overflow-hidden rounded-xl bg-black/40 border border-white/5">
                <EpisodeThumbnail 
                  src={ep.thumbnailUrl} 
                  alt={ep.title} 
                  fallbackSrc={selectedInstallment.poster || selectedInstallment.banner}
                />
                
                {/* Overlay Vignette */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300",
                    ep.isUpcoming ? "bg-emerald-500 text-black" : "bg-primary text-white"
                  )}>
                    {ep.isUpcoming ? (
                      <Calendar className="h-4 w-4" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Checkmark, resume, and UPCOMING badges */}
                {ep.isUpcoming ? (
                  <div className="absolute top-2 left-2 bg-emerald-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider z-10 shadow flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5 stroke-[3]" />
                    UPCOMING
                  </div>
                ) : (
                  <>
                    {ep.isWatched && (
                      <div className="absolute top-2 right-2 bg-green-500 text-black p-0.5 rounded-full z-10 shadow">
                        <Check className="h-2 w-2 stroke-[4]" />
                      </div>
                    )}
                    {isResume && (
                      <div className="absolute top-2 left-2 bg-primary/95 text-white px-2 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider z-10 shadow">
                        RESUME
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Text Metadata */}
              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider">
                  <span className={ep.isUpcoming ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                    EP {ep.relativeNumber < 10 ? `0${ep.relativeNumber}` : ep.relativeNumber}
                  </span>
                  <span className="font-mono text-zinc-600">{ep.absoluteNumber}</span>
                </div>
                <h4 className={cn(
                  "text-[10.5px] font-black truncate transition-colors",
                  ep.isUpcoming ? "text-emerald-300 group-hover:text-emerald-200" : "text-white group-hover:text-primary"
                )}>
                  {(() => {
                    const seriesSlug = slug || selectedInstallment.donghuaApiSlug || "battle-through-the-heavens";
                    const brandingOverride = getBrandingOverrides(seriesSlug, selectedInstallment.id);
                    const titleOverride = brandingOverride.verifiedEpisodeTitles?.[ep.relativeNumber] || 
                                          brandingOverride.verifiedEpisodeTitles?.[ep.absoluteNumber] ||
                                          selectedInstallment.verifiedEpisodeTitles?.[ep.relativeNumber];
                    return titleOverride || ep.title;
                  })()}
                </h4>
                <span className={cn(
                  "text-[8.5px] font-bold block font-mono",
                  ep.isUpcoming ? "text-emerald-400/90" : "text-zinc-400"
                )}>
                  {detailLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW ALL TOGGLE BUTTON */}
      {totalEpisodesCount > 8 && (
        <div className="pt-4 border-t border-white/5 mt-4 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-black/45 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white hover:border-primary/20 transition-all cursor-pointer active:scale-95"
          >
            <span>{isExpanded ? "Show Less" : "View All Episodes"}</span>
            <span>☰</span>
          </button>
        </div>
      )}

    </div>
  );
};
