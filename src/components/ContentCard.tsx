import { useNavigate } from "react-router-dom";
import { Play, Star, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WatchlistButton from "./WatchlistButton";
import CardQuickActions from "./CardQuickActions";
import { StarRating } from "./StarRating";
import { useRatings } from "@/hooks/useLocalStorage";
import { getCleanCoverUrl } from "@/data/anilistDonghuaMap";
import type { AnimeCardItem } from "@/types/anime";

type ContentCardProps = AnimeCardItem;

const DEFAULT_POSTER_FALLBACK = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=780&auto=format&fit=crop&q=80";

const ContentCard = ({ id, slug, title, image, rating, episodes, year, genre, genres, isNew }: ContentCardProps) => {
  const [ratings] = useRatings();
  const navigate = useNavigate();
  const userRating = ratings[id] || 0;
  const cardCover = getCleanCoverUrl(slug || id) || getCleanCoverUrl(id) || image || DEFAULT_POSTER_FALLBACK;

  const displayGenre = (genres && genres.length > 0)
    ? genres.join(" • ")
    : (genre || "").replace(/,\s*/g, " • ");

  return (
    <div 
      className="relative flex flex-col group cursor-pointer w-full transition-all"
      onClick={() => navigate(`/anime/${slug}`)}
    >
      {/* Poster Wrapper matching Home MediaCard design */}
      <div className="relative aspect-[2/3] rounded-3xl overflow-hidden border border-white/10 group-hover:border-primary/40 transition-all bg-white/[0.02] shadow-md">
        <img 
          src={cardCover} 
          alt={title}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(e) => {
            const current = e.currentTarget;
            if (image && current.src !== image) {
              current.src = image;
            } else if (current.src !== DEFAULT_POSTER_FALLBACK) {
              current.src = DEFAULT_POSTER_FALLBACK;
            }
          }}
          style={{ filter: "brightness(1.05) contrast(1.08)" }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
        />
        
        {/* Rating Badge on Top Right */}
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-black/80 text-amber-400 border border-white/10 text-[9px] font-black rounded-full px-2 py-0.5 flex items-center gap-0.5 backdrop-blur-sm shadow-md">
            <Star className="h-2.5 w-2.5 fill-current text-amber-400" />
            {rating}
          </Badge>
        </div>

        {/* NEW Badge on Bottom Left if applicable */}
        {isNew && (
          <div className="absolute bottom-2 left-2 z-10">
            <Badge className="rounded-md bg-emerald-500/90 text-white font-black text-[8px] px-1.5 py-0.5 border border-white/5 backdrop-blur-md uppercase tracking-wider">
              NEW
            </Badge>
          </div>
        )}

        {/* Play Overlay */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/watch/${slug}/episode-1`);
          }}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 z-20"
        >
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-4.5 w-4.5 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content Info (Title display with 3-dots Quick Actions) */}
      <div className="mt-2.5 px-0.5 text-left">
        <div className="flex items-start justify-between gap-1.5">
          <h4 className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors flex-1 min-w-0">
            {title}
          </h4>
          <CardQuickActions
            animeId={id}
            slug={slug}
            title={title}
            episodes={episodes}
            triggerClassName="h-6 w-6 shrink-0 bg-transparent border-none hover:bg-white/10 text-muted-foreground hover:text-white"
          />
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 font-medium gap-2">
          <span className="truncate min-w-0 flex-1 text-muted-foreground/80">{displayGenre || "Cultivation"}</span>
          <span className="shrink-0">{year}</span>
        </div>
      </div>
    </div>
  );
};

export default ContentCard;
