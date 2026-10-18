import React, { useState } from "react";
import { HeroSlideConfig } from "./hero-config";
import HeroSingle from "./HeroSingle";
import HeroAction from "./HeroAction";
import HeroDual from "./HeroDual";
import HeroLandscape from "./HeroLandscape";
import HeroRomance from "./HeroRomance";
import { resolveCurrentWatchState } from "@/services/watchStateResolver";
import { getBrandingOverrides } from "@/lib/overrides";
import { parseVideoUrl } from "@/lib/videoParser";
import { cn } from "@/lib/utils";

interface HeroMobileProps {
  slides: HeroSlideConfig[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  watchlist: number[];
  toggleWatchlist: (id: number) => void;
  continueWatching: Record<number, any>;
  getPrimaryButtonLabel: (id: number) => string;
  onNavigateToWatch: (slug: string, id: number) => void;
  onNavigateToDetails: (slug: string) => void;
  className?: string;
}

const getYoutubeVideoId = (str: string) => {
  if (!str) return "";
  if (str.length === 11 && !str.includes("/") && !str.includes("?")) {
    return str;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = str.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return str;
};

const HeroMobile: React.FC<HeroMobileProps> = ({
  slides,
  currentIndex,
  setCurrentIndex,
  watchlist,
  toggleWatchlist,
  continueWatching,
  getPrimaryButtonLabel,
  onNavigateToWatch,
  onNavigateToDetails,
  className
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [trailerModalUrl, setTrailerModalUrl] = useState<string | null>(null);
  const [trailerType, setTrailerType] = useState<"mp4" | "youtube" | "search">("mp4");

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentIndex((currentIndex + 1) % slides.length);
    } else if (isRightSwipe) {
      setCurrentIndex((currentIndex - 1 + slides.length) % slides.length);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const renderActiveSlideTemplate = (slide: HeroSlideConfig, active: boolean) => {
    const isAdded = watchlist.includes(slide.id);
    const overrides = getBrandingOverrides(slide.slug);
    const logoMode = overrides.logoDisplayMode || "desktop_only";
    const effectiveLogo = logoMode === "both" ? (overrides.logo || slide.logo) : undefined;
    const effectiveSlide = {
      ...slide,
      logo: effectiveLogo
    };

    const watchState = resolveCurrentWatchState({
      anime: effectiveSlide,
      continueWatching,
    });
    const primaryLabel = watchState.ctaLabel;

    const props = {
      slide: effectiveSlide,
      active,
      isAdded,
      watchState,
      onLibraryClick: () => toggleWatchlist(slide.id),
      primaryButtonLabel: primaryLabel,
      onPrimaryClick: () => onNavigateToWatch(slide.slug, slide.id),
      onSecondaryClick: () => onNavigateToDetails(slide.slug),
      onTrailerClick: (slide.trailerUrl || slide.youtubeTrailerId || slide.enableMobileTrailer) ? () => {
        if (slide.trailerUrl) {
          setTrailerModalUrl(slide.trailerUrl);
          setTrailerType("mp4");
        } else if (slide.youtubeTrailerId) {
          setTrailerModalUrl(getYoutubeVideoId(slide.youtubeTrailerId));
          setTrailerType("youtube");
        } else {
          setTrailerModalUrl("search");
          setTrailerType("search");
        }
      } : undefined
    };

    switch (slide.heroType) {
      case "action":
        return <HeroAction {...props} />;
      case "dual":
        return <HeroDual {...props} />;
      case "landscape":
        return <HeroLandscape {...props} />;
      case "romance":
        return <HeroRomance {...props} />;
      case "single":
      default:
        return <HeroSingle {...props} />;
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cn(
        "relative w-full h-[70vh] overflow-hidden bg-black select-none z-20",
        className
      )}
    >
      {/* Slides crossfade container */}
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
              isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
            )}
          >
            {renderActiveSlideTemplate(slide, isActive)}
          </div>
        );
      })}

      {/* Mobile-Only Carousel Indicators (Hidden on Desktop/Tablet) */}
      <div className="flex md:hidden items-center justify-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] w-max mx-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        {slides.map((_, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              data-carousel-dot="true"
              className="p-1 -m-0.5 flex items-center justify-center outline-none focus:outline-none min-w-0 min-h-0 bg-transparent border-0 cursor-pointer"
              aria-label={`Go to slide ${index + 1}`}
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-300 ease-in-out pointer-events-none",
                  isActive
                    ? "w-7 bg-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.85)]"
                    : "w-2 bg-white/60 hover:bg-white/90"
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Fullscreen Video Trailer Modal Overlay for Mobile */}
      {trailerModalUrl && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col justify-center items-center p-4">
          <button
            onClick={() => setTrailerModalUrl(null)}
            className="absolute top-4 right-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-lg pointer-events-auto active:scale-90 transition-transform z-50"
          >
            ✕
          </button>
          <div className="w-full max-w-2xl aspect-video rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-black relative">
            {(() => {
              const slide = slides[currentIndex];
              const parsed = parseVideoUrl(trailerModalUrl === "search" ? "" : trailerModalUrl, { autoplay: true });
              if (trailerType === "search" || !parsed.isEmbeddable) {
                const searchUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent((slide.originalTitle || slide.title) + " 官方预告")}&autoplay=1&rel=0`;
                return (
                  <iframe
                    src={searchUrl}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                );
              }
              if (parsed.provider === "direct") {
                return (
                  <video
                    src={parsed.embedUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                );
              }
              return (
                <iframe
                  src={parsed.embedUrl}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroMobile;
