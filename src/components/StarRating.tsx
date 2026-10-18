import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const StarRating = ({ 
  rating, 
  onRatingChange, 
  maxRating = 5, 
  size = "md",
  readonly = false 
}: StarRatingProps) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, index) => {
        const starRating = index + 1;
        const isFilled = starRating <= rating;
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              "transition-colors",
              isFilled 
                ? "fill-donghua-orange text-donghua-orange" 
                : "text-muted-foreground",
              !readonly && onRatingChange && "cursor-pointer hover:text-donghua-orange"
            )}
            onClick={() => handleStarClick(starRating)}
          />
        );
      })}
      {rating > 0 && (
        <span className="ml-1 text-sm text-muted-foreground">
          ({rating}/{maxRating})
        </span>
      )}
    </div>
  );
};

export { StarRating };