import React from "react";
import { MoreVertical, Heart, Bookmark, CheckCircle2, Eye, Share2, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWatchlistQuery, useAddToWatchlistMutation, useRemoveFromWatchlistMutation, useSaveProgressMutation } from "@/hooks/useAnimeQueries";
import { useFavorites, useCompleted } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface CardQuickActionsProps {
  animeId: number | string;
  slug: string;
  title: string;
  episodes?: number;
  triggerClassName?: string;
}

const CardQuickActions: React.FC<CardQuickActionsProps> = ({
  animeId,
  slug,
  title,
  episodes = 12,
  triggerClassName,
}) => {
  const navigate = useNavigate();

  // Watchlist (Watch Later) state
  const { data: watchlist = [] } = useWatchlistQuery();
  const addToWatchlist = useAddToWatchlistMutation();
  const removeFromWatchlist = useRemoveFromWatchlistMutation();
  const numericId = typeof animeId === "number" ? animeId : parseInt(String(animeId), 10) || 0;
  const isWatchlisted = watchlist.some((id) => String(id) === String(animeId));

  // Favorites state
  const [favorites, setFavorites] = useFavorites();
  const isFavorited = favorites.some((id) => String(id) === String(animeId) || String(id) === slug);

  // Completed state
  const [completedList, setCompletedList] = useCompleted();
  const isCompleted = completedList.some((id) => String(id) === String(animeId) || String(id) === slug);

  // Watch progress mutation
  const saveProgress = useSaveProgressMutation();

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWatchlisted) {
      removeFromWatchlist.mutate(numericId);
      toast.success(`Removed "${title}" from Watch Later`);
    } else {
      addToWatchlist.mutate(numericId);
      toast.success(`Added "${title}" to Watch Later`);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorited) {
      setFavorites((prev) => prev.filter((id) => String(id) !== String(animeId) && String(id) !== slug));
      toast.success(`Removed "${title}" from Favorites`);
    } else {
      setFavorites((prev) => [...prev, animeId]);
      toast.success(`Saved "${title}" to Favorites`);
    }
  };

  const handleToggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted) {
      setCompletedList((prev) => prev.filter((id) => String(id) !== String(animeId) && String(id) !== slug));
      toast.success(`Removed "${title}" from Completed list`);
    } else {
      setCompletedList((prev) => [...prev, animeId]);
      // Also mark episode as completed in watch progress
      if (numericId > 0) {
        saveProgress.mutate({
          animeId: numericId,
          episodeId: 1,
          episodeNumber: episodes || 1,
          currentTime: 1200,
          duration: 1200,
          completed: true,
        });
      }
      toast.success(`Marked "${title}" as Completed!`);
    }
  };

  const handleMarkWatching = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (numericId > 0) {
      saveProgress.mutate({
        animeId: numericId,
        episodeId: 1,
        episodeNumber: 1,
        currentTime: 30,
        duration: 1200,
        completed: false,
      });
    }
    toast.success(`Added "${title}" to Watching list`);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/anime/${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success(`Series link copied for "${title}"!`);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none hover:scale-110 active:scale-95 bg-black/60 hover:bg-black/80 text-white/90 border border-white/10 shadow-md backdrop-blur-md",
              triggerClassName
            )}
            aria-label="Anime Options"
          >
            <MoreVertical className="h-4 w-4 text-white" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-[#0b0c10]/98 border border-white/15 rounded-2xl p-1.5 shadow-2xl z-[100] backdrop-blur-2xl min-w-[185px] text-left animate-fade-in"
        >
          {/* Watch Later */}
          <DropdownMenuItem
            onClick={handleToggleWatchlist}
            className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <Bookmark className={cn("h-3.5 w-3.5", isWatchlisted ? "text-primary fill-current" : "text-muted-foreground")} />
              <span>{isWatchlisted ? "In Watch Later" : "Watch Later"}</span>
            </div>
            {isWatchlisted && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
          </DropdownMenuItem>

          {/* Favorite */}
          <DropdownMenuItem
            onClick={handleToggleFavorite}
            className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <Heart className={cn("h-3.5 w-3.5", isFavorited ? "text-rose-400 fill-rose-400" : "text-muted-foreground")} />
              <span>{isFavorited ? "In Favorites" : "Add to Favorites"}</span>
            </div>
            {isFavorited && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />}
          </DropdownMenuItem>

          {/* Mark as Completed */}
          <DropdownMenuItem
            onClick={handleToggleCompleted}
            className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className={cn("h-3.5 w-3.5", isCompleted ? "text-emerald-400 fill-emerald-400/20" : "text-muted-foreground")} />
              <span>{isCompleted ? "Completed" : "Mark Completed"}</span>
            </div>
            {isCompleted && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />}
          </DropdownMenuItem>

          {/* Mark as Watching */}
          <DropdownMenuItem
            onClick={handleMarkWatching}
            className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center gap-2.5"
          >
            <Eye className="h-3.5 w-3.5 text-donghua-cyan" />
            <span>Mark Watching</span>
          </DropdownMenuItem>

          {/* Copy Link */}
          <DropdownMenuItem
            onClick={handleCopyLink}
            className="text-xs font-bold text-foreground hover:bg-white/10 rounded-xl cursor-pointer py-2 px-3 flex items-center gap-2.5 border-t border-white/5 mt-0.5 pt-2"
          >
            <Share2 className="h-3.5 w-3.5 text-purple-400" />
            <span>Copy Series Link</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CardQuickActions;
