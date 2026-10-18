import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlistQuery, useAddToWatchlistMutation, useRemoveFromWatchlistMutation } from "@/hooks/useAnimeQueries";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  animeId: number;
  size?: "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

const WatchlistButton = ({ 
  animeId, 
  size = "sm", 
  variant = "outline",
  className 
}: WatchlistButtonProps) => {
  const { data: watchlist = [] } = useWatchlistQuery();
  const addToWatchlist = useAddToWatchlistMutation();
  const removeFromWatchlist = useRemoveFromWatchlistMutation();
  
  const isInWatchlist = watchlist.includes(animeId);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    
    if (isInWatchlist) {
      removeFromWatchlist.mutate(animeId);
    } else {
      addToWatchlist.mutate(animeId);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleWatchlist}
      className={cn(
        "transition-colors",
        isInWatchlist ? "border-primary text-primary hover:bg-primary/10 hover:text-primary" : "hover:text-foreground",
        className
      )}
    >
      {isInWatchlist ? (
        <Heart className={cn(
          "fill-current",
          size === "sm" ? "h-3 w-3" : "h-4 w-4"
        )} />
      ) : (
        <Plus className={cn(
          size === "sm" ? "h-3 w-3" : "h-4 w-4"
        )} />
      )}
    </Button>
  );
};

export default WatchlistButton;