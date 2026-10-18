import { useState } from "react";
import { X, Play, Plus, Heart, Star, Clock, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWatchlistQuery, useRatingsQuery, useAddToWatchlistMutation, useRemoveFromWatchlistMutation, useSaveRatingMutation, useAnimeDetailQuery } from "@/hooks/useAnimeQueries";
import { StarRating } from "./StarRating";
import { useNavigate } from "react-router-dom";
import { findAnimeById } from "@/data/anime";
import type { AnimeCardItem } from "@/types/anime";

interface AnimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  anime: AnimeCardItem | null;
}

const AnimeModal = ({ isOpen, onClose, anime }: AnimeModalProps) => {
  const navigate = useNavigate();
  const { data: watchlist = [] } = useWatchlistQuery();
  const { data: ratings = {} } = useRatingsQuery();
  const addToWatchlist = useAddToWatchlistMutation();
  const removeFromWatchlist = useRemoveFromWatchlistMutation();
  const saveRating = useSaveRatingMutation();

  const slugOrId = anime?.slug || (anime?.id ? String(anime.id) : "");
  const { data: fetchedAnime } = useAnimeDetailQuery(slugOrId);

  if (!anime) return null;

  const isInWatchlist = watchlist.includes(anime.id);
  const currentUserRating = ratings[anime.id] || 0;
  const animeDetails = findAnimeById(anime.id);

  const synopsis = (anime as any).synopsis || fetchedAnime?.synopsis || animeDetails?.synopsis || "No summary available for this title.";
  const tags: string[] = ((anime as any).tags && (anime as any).tags.length > 0)
    ? (anime as any).tags
    : (fetchedAnime?.tags && fetchedAnime.tags.length > 0)
      ? fetchedAnime.tags
      : (animeDetails?.tags || []);
  const status = (anime as any).status || fetchedAnime?.status || animeDetails?.status || anime.genre || "Ongoing";
  const effectiveSlug = anime.slug || fetchedAnime?.slug || String(anime.id);

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeFromWatchlist.mutate(anime.id);
    } else {
      addToWatchlist.mutate(anime.id);
    }
  };

  const handleRating = (rating: number) => {
    saveRating.mutate({ animeId: anime.id, score: rating });
  };

  const handleWatchNow = () => {
    if (effectiveSlug) {
      navigate(`/watch/${effectiveSlug}/episode-1`);
      onClose();
    }
  };

  const handleMoreInfo = () => {
    if (effectiveSlug) {
      navigate(`/anime/${effectiveSlug}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        className="max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain bg-background border-border backdrop-blur-sm"
      >
        <DialogHeader>
          <DialogTitle className="sr-only">{anime.title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="relative">
            <img 
              src={anime.image} 
              alt={anime.title}
              className="w-full aspect-[2/3] object-cover rounded-lg"
            />
            {anime.isNew && (
              <Badge className="absolute top-4 left-4 bg-donghua-orange text-black font-semibold">
                NEW
              </Badge>
            )}
          </div>

          {/* Content Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{anime.title}</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{anime.year}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{anime.episodes} episodes</span>
                </div>
                <Badge variant="outline" className="text-donghua-cyan border-donghua-cyan">
                  {status}
                </Badge>
              </div>
            </div>

            {/* Rating Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-donghua-orange text-donghua-orange" />
                <span className="font-semibold">{anime.rating}</span>
                <span className="text-muted-foreground text-sm">/ 10</span>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Rating:</p>
                <StarRating 
                  rating={currentUserRating} 
                  onRatingChange={handleRating}
                  size="lg"
                />
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {synopsis}
              </p>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleWatchNow}
              >
                <Play className="h-4 w-4 mr-2" />
                Watch Now
              </Button>
              
              <Button 
                variant="outline" 
                onClick={toggleWatchlist}
                className={isInWatchlist ? "border-primary text-primary hover:text-primary hover:bg-primary/10" : "hover:text-foreground"}
              >
                {isInWatchlist ? (
                  <Heart className="h-4 w-4 fill-current" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button variant="secondary" className="w-full" onClick={handleMoreInfo}>
              More Info
            </Button>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-donghua-orange">
                  <Users className="h-4 w-4" />
                  <span className="font-semibold">12.5K</span>
                </div>
                <p className="text-xs text-muted-foreground">Watching</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-donghua-cyan">
                  <Heart className="h-4 w-4" />
                  <span className="font-semibold">8.9K</span>
                </div>
                <p className="text-xs text-muted-foreground">Favorites</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnimeModal;
