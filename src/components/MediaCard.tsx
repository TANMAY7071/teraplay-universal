import React, { type SVGProps } from "react";
import { Play, Star, Clock, PlayCircle, Trash2, Info, Share2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { animeCatalog } from "@/data/anime";
import { getCleanCoverUrl } from "@/data/anilistDonghuaMap";
import { useContinueWatchingQuery } from "@/hooks/useAnimeQueries";
import { cn } from "@/lib/utils";
import CardQuickActions from "./CardQuickActions";
import type { Anime } from "@/types/anime";

export function EllipsisVerticalIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.75a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5m0 6a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5m0 6a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5"/>
    </svg>
  );
}

interface MediaCardProps {
  anime: Anime;
  variant: "portrait" | "portrait-premium" | "landscape-progress" | "landscape-compact" | "landscape-thumbnail";
  rankIndex?: number;
  progress?: number; // 0 to 100
  remainingTime?: string;
  episode?: string | number;
  airTime?: string;
  releaseStatus?: 'released' | 'upcoming';
  addedDate?: string;
  className?: string;
  image?: string;
  seasonName?: string;
  installmentType?: string;
  onDelete?: (e: React.MouseEvent) => void;
}

export const formatSeasonTag = (sName?: string, iType?: string, epNum?: string | number, title?: string, slug?: string) => {
  const ep = epNum || 1;
  const isMovie = 
    iType === "Movie" || 
    (sName && sName.toLowerCase().includes("movie")) ||
    (title && title.toLowerCase().includes("movie")) ||
    slug === "renegade-immortal-movie-battle-of-the-gods" ||
    slug === "ri-movie-1";

  if (isMovie) return "MOVIE";

  if (sName) {
    const seasonMatch = sName.match(/Season\s*(\d+)/i);
    if (seasonMatch) {
      return `S${seasonMatch[1]} • EP${ep}`;
    }
    const sShortMatch = sName.match(/^S(\d+)$/i);
    if (sShortMatch) {
      return `S${sShortMatch[1]} • EP${ep}`;
    }
    if (sName.toLowerCase().includes("special")) {
      return `${sName} • EP${ep}`;
    }
    if (sName.toLowerCase().includes("pledge") || sName.toLowerCase().includes("agreement")) {
      return `${sName} • EP${ep}`;
    }
  }
  return `S1 • EP${ep}`;
};

const DEFAULT_POSTER_FALLBACK = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=780&auto=format&fit=crop&q=80";

const MediaCard: React.FC<MediaCardProps> = ({
  anime,
  variant,
  rankIndex,
  progress = 0,
  remainingTime,
  episode,
  airTime,
  releaseStatus = 'released',
  addedDate,
  className,
  image,
  seasonName,
  installmentType,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { data: continueWatching = {} } = useContinueWatchingQuery();
  const watchProgress = continueWatching[anime.id];

  const canonicalSlug = String(
    animeCatalog.find(ca => ca.id === anime.id || ca.slug === anime.slug)?.slug || anime.slug || anime.id
  );
  const cleanCover = getCleanCoverUrl(anime.slug || anime.id) || getCleanCoverUrl(anime.id);
  const cardImage = image || cleanCover || anime.image || DEFAULT_POSTER_FALLBACK;

  const handleCardClick = (e: React.MouseEvent) => {
    if (variant === "landscape-progress") {
      const targetEpisode = episode ? `episode-${String(episode).replace(/\D/g, "") || "1"}` : "episode-1";
      navigate(`/watch/${canonicalSlug}/${targetEpisode}`);
    } else {
      navigate(`/anime/${canonicalSlug}`);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetEpisode = episode ? `episode-${String(episode).replace(/\D/g, "") || "1"}` : "episode-1";
    navigate(`/watch/${canonicalSlug}/${targetEpisode}`);
  };

  // 1. Landscape Progress (Continue Watching)
  if (variant === "landscape-progress") {
    const sName = seasonName || watchProgress?.seasonName;
    const iType = installmentType || watchProgress?.installmentType;
    const isMovie = 
      iType === "Movie" || 
      (sName && sName.toLowerCase().includes("movie")) ||
      (anime.title && anime.title.toLowerCase().includes("movie")) ||
      anime.slug === "renegade-immortal-movie-battle-of-the-gods" ||
      anime.slug === "ri-movie-1" ||
      watchProgress?.animeId === "renegade-immortal-movie-battle-of-the-gods" ||
      watchProgress?.animeId === "ri-movie-1";

    const isRIMovie =
      anime.slug === "renegade-immortal-movie-battle-of-the-gods" ||
      anime.slug === "ri-movie-1" ||
      watchProgress?.animeId === "renegade-immortal-movie-battle-of-the-gods" ||
      watchProgress?.animeId === "ri-movie-1";

    const cleanCover = isRIMovie
      ? (getCleanCoverUrl("renegade-immortal-movie-battle-of-the-gods") || getCleanCoverUrl(anime.slug || anime.id))
      : (getCleanCoverUrl(anime.slug || anime.id) || getCleanCoverUrl(anime.id));

    const cardImage = (isRIMovie ? cleanCover : null) || image || watchProgress?.episodeImage || cleanCover || anime.banner || anime.image;
    const seasonTag = formatSeasonTag(sName, iType, episode, anime.title, anime.slug);

    const targetEpisode = episode ? `episode-${String(episode).replace(/\D/g, "") || "1"}` : "episode-1";

    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "relative rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group transition-all aspect-video border border-white/10 hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.6)] shadow-md select-none bg-black/40",
          !className?.includes("w-") && "shrink-0 w-[210px] sm:w-[240px] md:w-[270px] lg:w-[280px]",
          className
        )}
      >
        {/* Background Image & Gradient Overlay */}
        <div className="absolute inset-0 w-full h-full z-0 bg-black">
          <img
            src={cardImage}
            alt={anime.title}
            draggable={false}
            onError={(e) => {
              const fallback = anime.image || anime.banner;
              if (fallback && e.currentTarget.src !== fallback) {
                e.currentTarget.src = fallback;
              }
            }}
            style={{ filter: "brightness(1.02) contrast(1.06)" }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30 z-10 pointer-events-none" />
        </div>

        {/* Top-Right Frameless Three-Dots Options Menu Button (Flush in corner edge) */}
        <div className="absolute top-0.5 right-0.5 z-30" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center p-0 text-white/90 hover:text-white transition-all duration-200 focus:outline-none focus:ring-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] hover:scale-110 active:scale-95 bg-transparent border-none"
                aria-label="More Options"
              >
                <EllipsisVerticalIcon size={18} className="text-white/90 hover:text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#0b0c10]/98 border border-white/15 rounded-2xl p-1.5 shadow-2xl z-[100] backdrop-blur-2xl min-w-[175px] text-left"
            >
              <DropdownMenuItem
                onClick={handlePlayClick}
                className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center gap-2.5"
              >
                <Play className="h-3.5 w-3.5 text-primary fill-current" />
                <span>Resume Episode</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/anime/${canonicalSlug}`);
                }}
                className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center gap-2.5"
              >
                <Info className="h-3.5 w-3.5 text-sky-400" />
                <span>View Details</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}/anime/${canonicalSlug}`;
                  navigator.clipboard?.writeText(shareUrl);
                }}
                className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center gap-2.5"
              >
                <Share2 className="h-3.5 w-3.5 text-purple-400" />
                <span>Copy Series Link</span>
              </DropdownMenuItem>

              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e);
                  }}
                  className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:text-red-400 focus:bg-red-500/10 rounded-xl cursor-pointer py-2 px-3 flex items-center gap-2.5 mt-0.5 border-t border-white/5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove History</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bottom Text Content Overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3 sm:left-3.5 sm:right-3.5 z-20 flex flex-col text-left">
          <h4 className="font-black text-xs sm:text-sm text-white tracking-tight leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {anime.title}
          </h4>

          <div className="text-[10px] sm:text-xs text-white/75 font-semibold mt-0.5 tracking-wide">
            {seasonTag}
          </div>
        </div>

        {/* Progress Bar at bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20 overflow-hidden">
          <div
            className="progress-soft h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // 2. Landscape Compact (New Episodes)
  if (variant === "landscape-compact") {
    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "relative flex flex-col group cursor-pointer w-[calc((100vw-44px)/2)] sm:w-[calc((100vw-64px)/3)] md:w-[calc((100vw-112px)/4)] lg:w-[calc((100vw-176px)/6)] xl:w-[200px] shrink-0",
          className
        )}
      >
        {/* Poster Wrapper */}
        <div className="relative aspect-[2/3] rounded-3xl overflow-hidden border border-white/10 group-hover:border-primary/40 transition-all bg-white/[0.02] shadow-md">
          <img
            src={cardImage}
            alt={anime.title}
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER_FALLBACK;
            }}
            style={{ filter: "brightness(1.05) contrast(1.08)" }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
          />

          {/* Sleek Episode Badge on Bottom Right */}
          <div className="absolute bottom-2 right-2 z-20">
            <span className="rounded-md border border-white/10 bg-black/55 px-1.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.08em] text-white/85 backdrop-blur-md">
              EP {episode || anime.episodes}
            </span>
          </div>

          {/* Sleek NEW Badge on Top Left */}
          <div className="absolute top-2 left-2 z-20">
            <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/55 px-1.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.08em] text-white/85 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              NEW
            </span>
          </div>

          {/* Play Overlay */}
          <div 
            onClick={handlePlayClick}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300"
          >
            <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="h-4.5 w-4.5 fill-black text-black ml-0.5" />
            </div>
          </div>
        </div>

        {/* Titles / Metadata */}
        <div className="mt-2.5 px-0.5 text-left">
          <h4 className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {anime.title}
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium truncate flex items-center gap-1">
            {releaseStatus === 'upcoming' ? (
              <span className="text-amber-400 font-semibold">Today · {airTime || 'Upcoming'}</span>
            ) : airTime ? (
              <span>Released Today · {airTime}</span>
            ) : (
              <span>Released Today</span>
            )}
          </p>
        </div>
      </div>
    );
  }

  // 3. Portrait Standard (Trending, Recommend, Cultivation)
  if (variant === "portrait") {
    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "group relative flex shrink-0 cursor-pointer select-none flex-col w-[calc((100vw-44px)/2)] sm:w-[calc((100vw-64px)/3)] md:w-[calc((100vw-112px)/4)] lg:w-[calc((100vw-176px)/6)] xl:w-[208px]",
          className
        )}
      >
        {/* Poster Wrapper */}
        <div className="poster-tile poster-sheen relative aspect-[2/3] w-full">
          <img
            src={cardImage}
            alt={anime.title}
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER_FALLBACK;
            }}
            className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />

          {/* Legibility scrim */}
          <div className="poster-scrim z-[2]" />

          {/* Rating Badge */}
          <div className="absolute top-2 right-2 z-20">
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 py-[3px] text-[10px] font-semibold tabular-nums text-white/90 backdrop-blur-md">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {anime.rating}
            </span>
          </div>

          {/* Play Overlay */}
          <div
            onClick={handlePlayClick}
            className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <span className="flex h-10 w-10 scale-90 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-100 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)]">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </div>
        </div>

        {/* Titles / Metadata (fixed min-height keeps every rail baseline aligned) */}
        <div className="mt-2.5 flex flex-col gap-0.5 px-0.5">
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors flex-1 min-w-0">
              {anime.title}
            </h4>
            <CardQuickActions
              animeId={anime.id}
              slug={canonicalSlug}
              title={anime.title}
              episodes={anime.episodes}
              triggerClassName="h-6 w-6 shrink-0 rounded-md border-none bg-transparent text-muted-foreground/70 hover:bg-white/10 hover:text-white"
            />
          </div>
          <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
            {anime.genres ? anime.genres.join(" • ") : anime.genre}
          </p>
        </div>
      </div>
    );
  }

  // 4. Portrait Premium (Leaderboard - contained rank watermark + metallic tiers)
  if (variant === "portrait-premium") {
    const rank = typeof rankIndex === "number" ? rankIndex : 0;
    const tierClass =
      rank === 1
        ? "rank-watermark--gold"
        : rank === 2
          ? "rank-watermark--silver"
          : rank === 3
            ? "rank-watermark--bronze"
            : "";

    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "group relative flex shrink-0 cursor-pointer select-none flex-col w-[calc((100vw-44px)/2)] sm:w-[calc((100vw-64px)/3)] md:w-[calc((100vw-112px)/4)] lg:w-[calc((100vw-176px)/6)] xl:w-[208px]",
          className
        )}
      >
        {/* Poster Wrapper */}
        <div className="poster-tile poster-sheen relative aspect-[2/3] w-full">
          <img
            src={cardImage}
            alt={anime.title}
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER_FALLBACK;
            }}
            className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />

          {/* Legibility scrim */}
          <div className="poster-scrim z-[2]" />

          {/* Rank numeral: sized to the tile and blended into the artwork */}
          {rankIndex !== undefined && (
            <span
              className={cn(
                "rank-watermark absolute bottom-2.5 left-2.5 z-20 text-[2.5rem] leading-none md:text-[2.75rem] xl:text-[3rem]",
                tierClass
              )}
            >
              {rankIndex}
            </span>
          )}

          {/* Rating Badge Top Right */}
          <div className="absolute top-2 right-2 z-20">
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 py-[3px] text-[10px] font-semibold tabular-nums text-white/90 backdrop-blur-md">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {anime.rating}
            </span>
          </div>

          {/* Play Overlay */}
          <div
            onClick={handlePlayClick}
            className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <span className="flex h-10 w-10 scale-90 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-100 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)]">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </div>
        </div>

        {/* Title & Metadata below poster */}
        <div className="mt-2.5 flex flex-col gap-0.5 px-0.5">
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors flex-1 min-w-0">
              {anime.title}
            </h4>
            <CardQuickActions
              animeId={anime.id}
              slug={canonicalSlug}
              title={anime.title}
              episodes={anime.episodes}
              triggerClassName="h-6 w-6 shrink-0 rounded-md border-none bg-transparent text-muted-foreground/70 hover:bg-white/10 hover:text-white"
            />
          </div>
          <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
            {anime.genres ? anime.genres.join(" • ") : anime.genre}
          </p>
        </div>
      </div>
    );
  }

  // 5. Landscape Thumbnail (Recently Added)
  if (variant === "landscape-thumbnail") {
    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "poster-tile flex flex-col cursor-pointer group shrink-0 w-[180px] xs:w-[200px] sm:w-[230px]",
          className
        )}
      >
        <div className="relative aspect-video overflow-hidden bg-white/[0.02]">
          <img
            src={cardImage}
            alt={anime.title}
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER_FALLBACK;
            }}
            style={{ filter: "brightness(1.05) contrast(1.08)" }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
          />
          {/* Added Date Label */}
          {addedDate && (
            <div className="absolute bottom-2 left-2">
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2 py-[3px] text-[10px] font-semibold text-white/85 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {addedDate}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-0.5 p-2.5">
          <h4 className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {anime.title}
          </h4>
          <p className="text-[10px] font-semibold text-muted-foreground truncate">
            {(anime as any).studio || "Foch Film"} • {anime.year}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default MediaCard;
