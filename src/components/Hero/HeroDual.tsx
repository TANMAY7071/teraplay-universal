import React from "react";
import HeroImage from "./HeroImage";
import HeroOverlay from "./HeroOverlay";
import HeroButtons from "./HeroButtons";
import { HeroSlideConfig } from "./hero-config";
import { ResolvedWatchState } from "@/services/watchStateResolver";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateProps {
  slide: HeroSlideConfig;
  active: boolean;
  isAdded: boolean;
  watchState?: ResolvedWatchState;
  onLibraryClick: () => void;
  primaryButtonLabel: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
  onTrailerClick?: () => void;
}

const HeroDual: React.FC<TemplateProps> = ({
  slide,
  active,
  isAdded,
  watchState,
  onLibraryClick,
  primaryButtonLabel,
  onPrimaryClick,
  onSecondaryClick,
  onTrailerClick
}) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-end p-5 xs:p-6 pb-14 select-none">
      {/* Background Image: Focus center top to preserve faces of both characters */}
      <HeroImage
        image={slide.mobileImage || slide.image}
        focus={slide.focus || "center top"}
        focusX={slide.focusX}
        focusY={slide.focusY}
        active={active}
        isMobile={true}
        altText={slide.title}
      />
      {/* Softer overlay for dual/romance styles */}
      <HeroOverlay type="soft" isMobile={true} />

      {/* Main Content Area */}
      <div className="relative z-20 flex flex-col gap-2 max-w-full text-left pb-4 pl-1">
        {/* 1. Featured Badge */}
        <div 
          className={cn(
            "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#A855F7] transition-all duration-700 ease-out",
            active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: active ? "100ms" : "0ms" }}
        >
          <span className="w-1 h-3 bg-[#A855F7] rounded-full"></span>
          <span>Featured Today</span>
        </div>

        {/* 2. Text Block (Title & Subtitle limited to 85% width on mobile) */}
        <div className="max-w-[85%] space-y-1">
          {/* Title or Logo */}
          {slide.logo ? (
            <div 
              className={cn(
                "transition-all duration-700 ease-out filter drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]",
                active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
              style={{ transitionDelay: active ? "180ms" : "0ms" }}
            >
              <img
                src={slide.logo}
                alt={slide.title}
                className="h-auto max-h-[50px] w-auto max-w-full object-contain select-none pointer-events-none"
              />
            </div>
          ) : (
            <h2 
              className={cn(
                "text-xl sm:text-2xl font-black text-white leading-tight tracking-tight uppercase transition-all duration-700 ease-out",
                active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
              style={{ transitionDelay: active ? "180ms" : "0ms" }}
            >
              {slide.title}
            </h2>
          )}

          {/* Subtitle / Rating & Season/Episode Info */}
          <div 
            className={cn(
              "flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90 transition-all duration-700 ease-out",
              active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: active ? "260ms" : "0ms" }}
          >
            <div className="flex items-center gap-1 text-amber-400 font-black">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{slide.rating}</span>
            </div>
            <span className="text-white/20">•</span>
            <span>{slide.year}</span>
            <span className="text-white/20">•</span>
            <span className="text-white font-bold text-xs tracking-tight">
              {watchState?.formattedPillTag || "S1"}
            </span>
            <span className="text-white/30 font-light mx-0.5">│</span>
            <span className="text-white font-bold text-xs tracking-tight">
              {watchState?.formattedEpisodeTag || `EP ${slide.episodes || 1}`}
            </span>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div 
          className={cn(
            "transition-all duration-700 ease-out mt-2 w-full",
            active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: active ? "340ms" : "0ms" }}
        >
          <HeroButtons
            primaryLabel={primaryButtonLabel}
            onPrimaryClick={onPrimaryClick}
            isAdded={isAdded}
            onLibraryClick={onLibraryClick}
            theme={slide.theme}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroDual;
