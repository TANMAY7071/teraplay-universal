import React from "react";
import { Play, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroButtonsProps {
  primaryLabel: string;
  onPrimaryClick: () => void;
  isAdded?: boolean;
  onLibraryClick?: () => void;
  theme?: "gold" | "red" | "blue" | "orange" | "cyan";
}

const HeroButtons: React.FC<HeroButtonsProps> = ({
  primaryLabel,
  onPrimaryClick,
  isAdded = false,
  onLibraryClick,
  theme = "gold"
}) => {
  return (
    <div className="flex flex-row items-center gap-3 w-full z-20">
      {/* Primary Action Button (Watch Now: 195px width, 50px height) */}
      <Button
        onClick={onPrimaryClick}
        className={cn(
          "w-[195px] h-[50px] rounded-2xl text-[11px] font-black shadow-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 px-6 shrink-0 hover:scale-[1.02] bg-[#A855F7] hover:bg-[#9333EA] text-white border border-[#A855F7] shadow-[0_4px_15px_rgba(168,85,247,0.35)]"
        )}
      >
        <Play className="h-4 w-4 fill-current shrink-0" />
        <span className="uppercase tracking-wider font-extrabold">{primaryLabel}</span>
      </Button>

      {/* Favorite Button (50px x 50px circle) */}
      {onLibraryClick && (
        <button
          onClick={onLibraryClick}
          className="h-[50px] w-[50px] rounded-full bg-black/45 border border-white/10 flex items-center justify-center backdrop-blur-md text-white hover:bg-black/60 active:scale-90 transition-all shadow-lg shrink-0"
          aria-label="Toggle Watchlist"
        >
          <Heart 
            className={cn(
              "h-5 w-5 transition-all duration-300", 
              isAdded 
                ? "fill-[#A855F7] text-[#A855F7] scale-110" 
                : "text-white"
            )} 
          />
        </button>
      )}
    </div>
  );
};

export default HeroButtons;
