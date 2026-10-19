import React, { useState, useEffect, useRef } from "react";
import { Play, Info, Star, Plus, Check, Volume2, VolumeX, PlayCircle, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HeroSlideConfig } from "./hero-config";
import { resolveCurrentWatchState, resolveAiringHeroItem } from "@/services/watchStateResolver";
import { useNavigate } from "react-router-dom";
import { getBrandingOverrides } from "@/lib/overrides";
import { BrandingEditModal } from "@/components/admin/BrandingEditModal";
import { useAuth } from "@/contexts/AuthContext";

// --- Feature Flags ---
const SHOW_HERO_TRAILER_BUTTON = false;

interface HeroDesktopProps {
  slides: HeroSlideConfig[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  watchlist: number[];
  continueWatching?: Record<string | number, any>;
  toggleWatchlist: (id: number) => void;
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

const formatSeasonTag = (sName?: string, iType?: string, epNum?: string | number) => {
  const ep = epNum || 1;
  if (iType === "Movie" || (sName && sName.toLowerCase().includes("movie"))) return `MOVIE • EP${ep}`;
  if (sName) {
    const seasonMatch = sName.match(/Season\s*(\d+)/i);
    if (seasonMatch) {
      return `S${seasonMatch[1]} • EP ${ep}`;
    }
    const sShortMatch = sName.match(/^S(\d+)$/i);
    if (sShortMatch) {
      return `S${sShortMatch[1]} • EP ${ep}`;
    }
    if (sName.toLowerCase().includes("special")) {
      return `${sName} • EP ${ep}`;
    }
  }
  return `S1 • EP ${ep}`;
};

const DesktopBackground: React.FC<{
  slide: HeroSlideConfig;
  isActive: boolean;
  isTrailerActive: boolean;
  isMuted: boolean;
  volume: number;
  isTabVisible: boolean;
  prefersReducedMotion: boolean;
}> = ({ slide, isActive, isTrailerActive, isMuted, volume, isTabVisible, prefersReducedMotion }) => {
  const [loaded, setLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleYTMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "onStateChange" && data.info === 1) {
          setYoutubeReady(true);
        }
      } catch (e) {
        // Safe to ignore
      }
    };
    window.addEventListener("message", handleYTMessage);
    return () => window.removeEventListener("message", handleYTMessage);
  }, []);

  const computedFocus = (slide.focusX !== undefined && slide.focusY !== undefined)
    ? `${slide.focusX}% ${slide.focusY}%`
    : slide.focus;

  // Play video only if configured and active
  const showVideo = isActive && isTrailerActive && slide.enableDesktopTrailer && !prefersReducedMotion;
  const isYouTubeTrailer = showVideo && !slide.trailerUrl;
  const showLocalVideo = showVideo && !!slide.trailerUrl;
  const isVideoPlaying = showVideo && ((showLocalVideo && videoReady) || (isYouTubeTrailer && youtubeReady));

  const youtubeEmbedUrl = React.useMemo(() => {
    if (!isYouTubeTrailer || !slide.youtubeTrailerId) return null;
    const cleanId = getYoutubeVideoId(slide.youtubeTrailerId);
    let url = `https://www.youtube.com/embed/${cleanId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${cleanId}&showinfo=0&rel=0&iv_load_policy=3&enablejsapi=1&playsinline=1&modestbranding=1`;
    if (slide.trailerStart !== undefined) {
      url += `&start=${slide.trailerStart}`;
    }
    if (slide.trailerEnd !== undefined) {
      url += `&end=${slide.trailerEnd}`;
    }
    return url;
  }, [isYouTubeTrailer, slide.youtubeTrailerId, slide.trailerStart, slide.trailerEnd]);

  // Imperatively control video playback state on visibility/active change
  useEffect(() => {
    if (videoRef.current) {
      if (showLocalVideo && isTabVisible) {
        videoRef.current.play().catch((err) => {
          console.log("Auto-playback was prevented or interrupted:", err);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Seek to 0 when inactive
      }
    }
  }, [showLocalVideo, isTabVisible]);

  // Imperatively control video volume / muted states
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  // Send mute/unmute and volume commands to YouTube iframe postMessage
  useEffect(() => {
    if (iframeRef.current && isYouTubeTrailer && iframeRef.current.contentWindow) {
      if (isMuted) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "mute", args: [] }),
          "*"
        );
      } else {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "unMute", args: [] }),
          "*"
        );
        const ytVolume = Math.round(volume * 100);
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [ytVolume] }),
          "*"
        );
      }
    }
  }, [isMuted, volume, isYouTubeTrailer]);

  // Reset video ready state when slide is deactivated
  useEffect(() => {
    if (!isActive) {
      setVideoReady(false);
      setYoutubeReady(false);
    }
  }, [isActive]);

  return (
    <div
      className={cn(
        "absolute -top-12 left-0 w-full h-[calc(100%+48px)] transition-all duration-700 ease-in-out bg-black overflow-hidden",
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* 1. Blurred LQIP Placeholder */}
      {!loaded && (
        <div
          className="absolute inset-0 w-full h-full bg-cover blur-2xl scale-110 opacity-70 transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${slide.image})`,
            backgroundPosition: computedFocus
          }}
        />
      )}

      {/* 2. High-resolution Image (Ken Burns transitions when loaded, active, and motion is allowed) */}
      <img
        src={slide.image}
        alt={slide.title}
        {...({ fetchpriority: isActive ? "high" : "auto" } as Record<string, string>)}
        loading={isActive ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-cover ease-out transition-all",
          isActive || loaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          objectPosition: computedFocus,
          transform: (isActive && loaded && !prefersReducedMotion)
            ? "scale3d(1.08, 1.08, 1)"
            : "scale3d(1, 1, 1)",
          willChange: (isActive && loaded && !prefersReducedMotion) ? "transform" : "auto",
          filter: "brightness(0.9) contrast(1.03) saturate(0.96)",
          transitionDuration: "8000ms"
        }}
      />

      {/* 3. Looping background video trailer */}
      {showLocalVideo && (
        <video
          ref={videoRef}
          src={slide.trailerUrl}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoReady(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            videoReady ? "opacity-100 z-10 animate-fade-in-video" : "opacity-0 z-0"
          )}
          style={{
            objectPosition: computedFocus,
            filter: "brightness(0.9) contrast(1.03) saturate(0.96)"
          }}
        />
      )}

      {/* 3b. Looping background YouTube trailer */}
      {isYouTubeTrailer && youtubeEmbedUrl && (
        <>
          <iframe
            ref={iframeRef}
            src={youtubeEmbedUrl}
            loading="lazy"
            onLoad={() => setYoutubeReady(true)}
            className={cn(
              "absolute pointer-events-none transition-opacity duration-500 border-0",
              youtubeReady ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
            style={{
              top: '50%',
              left: '50%',
              width: '130vw',
              height: '73.125vw',
              minHeight: '130%',
              minWidth: '231.1vh',
              transform: 'translate(-50%, -50%)',
              filter: "brightness(0.9) contrast(1.03) saturate(0.96)",
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            allow="autoplay; encrypted-media"
          />
          {/* Transparent click/hover blocker to keep player 100% clean */}
          <div className="absolute inset-0 z-30 bg-transparent" />
        </>
      )}

      {/* 4. Single Master Masking Overlays */}
      <div 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(6, 8, 15, 0.98) 0%, rgba(6, 8, 15, 0.88) 9%, rgba(6, 8, 15, 0.71) 18%, rgba(6, 8, 15, 0.48) 27%, rgba(6, 8, 15, 0.24) 36%, transparent 45%)"
        }}
      />
      <div 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(to top, rgba(6, 8, 15, 1) 0%, rgba(6, 8, 15, 0.95) 4%, rgba(6, 8, 15, 0.82) 8%, rgba(6, 8, 15, 0.60) 14%, rgba(6, 8, 15, 0.35) 20%, rgba(6, 8, 15, 0.15) 24%, rgba(6, 8, 15, 0.05) 28%, transparent 35%)"
        }}
      />
      <div 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(6, 8, 15, 0.6) 0%, rgba(6, 8, 15, 0.25) 5%, transparent 10%), radial-gradient(circle at top right, rgba(6, 8, 15, 0.45) 0%, transparent 35%)"
        }}
      />
      <div 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, transparent 35%, rgba(6, 8, 15, 0.12) 70%, rgba(6, 8, 15, 0.25) 100%)"
        }}
      />
    </div>
  );
};

const HeroDesktop: React.FC<HeroDesktopProps> = ({
  slides,
  currentIndex,
  setCurrentIndex,
  isHovered,
  setIsHovered,
  watchlist,
  continueWatching,
  toggleWatchlist,
  getPrimaryButtonLabel,
  onNavigateToWatch,
  onNavigateToDetails,
  className
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.subscription_tier === "admin";
  const rawActiveSlide = slides[currentIndex];
  const overrides = getBrandingOverrides(rawActiveSlide.slug);
  const logoMode = overrides.logoDisplayMode || "desktop_only";
  const effectiveLogo = logoMode !== "none" ? (overrides.logo || rawActiveSlide.logo) : undefined;
  const activeSlide = {
    ...rawActiveSlide,
    logo: effectiveLogo,
    image: overrides.banner || rawActiveSlide.image
  };
  const isAdded = watchlist.includes(activeSlide.id);
  
  // Canonical Single Source of Truth Watch State Resolution
  const activeWatchState = resolveCurrentWatchState({
    anime: activeSlide,
    continueWatching,
  });

  // Accessibility prefers-reduced-motion checker
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  const isCinematicMode = false;

  // Trailer states
  const [isTrailerActive, setIsTrailerActive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0);
  const prevVolume = useRef(0.25);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearFadeInterval = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  };

  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearFadeInterval();
    };
  }, []);

  useEffect(() => {
    clearFadeInterval();
    setIsTrailerActive(false);
    setIsMuted(true);
    setVolume(0);

    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }) : undefined;
    const isDataSaver = Boolean(nav?.connection?.saveData) || Boolean(nav?.connection?.effectiveType && /2g/.test(nav.connection.effectiveType));

    if (activeSlide.enableDesktopTrailer && !prefersReducedMotion && !isDataSaver) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          window.requestIdleCallback(() => setIsTrailerActive(true), { timeout: 2000 });
        } else {
          setIsTrailerActive(true);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, activeSlide, prefersReducedMotion]);

  const handleToggleMute = () => {
    clearFadeInterval();
    const steps = 15;
    const stepDuration = 20;

    if (isMuted) {
      setIsMuted(false);
      let currentStep = 0;
      const targetVolume = prevVolume.current;
      const stepChange = targetVolume / steps;

      fadeIntervalRef.current = setInterval(() => {
        setVolume((prev) => {
          const next = prev + stepChange;
          currentStep++;
          if (currentStep >= steps) {
            clearFadeInterval();
            return targetVolume;
          }
          return Math.min(targetVolume, next);
        });
      }, stepDuration);
    } else {
      prevVolume.current = volume > 0 ? volume : 0.25;
      let currentStep = 0;
      const stepChange = volume / steps;

      fadeIntervalRef.current = setInterval(() => {
        setVolume((prev) => {
          const next = prev - stepChange;
          currentStep++;
          if (currentStep >= steps) {
            clearFadeInterval();
            setIsMuted(true);
            return 0;
          }
          return Math.max(0, next);
        });
      }, stepDuration);
    }
  };

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex h-[70vh] lg:h-[80vh] items-center w-full transition-all duration-700 bg-black select-none",
        className
      )}
    >
      {/* Background Container */}
      <div className="absolute inset-0 overflow-hidden z-10">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          const slideOverrides = getBrandingOverrides(slide.slug);
          const effectiveSlide = {
            ...slide,
            image: slideOverrides.banner || slide.image,
            logo: slideOverrides.logoDisplayMode !== "none" ? (slideOverrides.logo || slide.logo) : undefined
          };
          return (
            <DesktopBackground
              key={slide.id}
              slide={effectiveSlide}
              isActive={isActive}
              isTrailerActive={isTrailerActive}
              isMuted={isMuted}
              volume={volume}
              isTabVisible={isTabVisible}
              prefersReducedMotion={prefersReducedMotion}
            />
          );
        })}

        {!prefersReducedMotion && (
          <div className={cn(
            "absolute inset-0 z-10 pointer-events-none overflow-hidden transition-opacity duration-700",
            isCinematicMode ? "opacity-10" : "opacity-100"
          )}>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full opacity-0 animate-drift-spark-desktop"
                style={{
                  left: `${20 + (i * 6) + Math.random() * 6}%`,
                  bottom: `${12 + Math.random() * 45}%`,
                  width: `${1.5 + Math.random() * 2}px`,
                  height: `${1.5 + Math.random() * 2}px`,
                  backgroundColor: "hsl(var(--primary))",
                  boxShadow: `0 0 8px hsl(var(--primary) / 0.8)`,
                  animationDuration: `${5.0 + Math.random() * 2.5}s`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-[150px] sm:h-[200px] md:h-[250px] bg-gradient-to-t from-background via-background/60 to-transparent z-20 pointer-events-none" />
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "relative z-30 w-full px-8 md:px-16 lg:px-20 pt-16 transition-all duration-700 ease-in-out",
        isCinematicMode ? "opacity-10 scale-[0.98] pointer-events-none" : "opacity-100 scale-100 pointer-events-auto"
      )}>
        <div
          key={currentIndex}
          className="relative max-w-[650px] text-left flex flex-col items-start space-y-4 animate-fade-in-content"
        >
          <div className="absolute -inset-8 bg-black/20 blur-3xl rounded-full pointer-events-none -z-10" />
          


          {/* 2. Title Header */}
          {activeSlide.logo ? (
            <div className="transition-all duration-500 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
              <img
                src={activeSlide.logo}
                alt={activeSlide.title}
                className="h-auto max-h-[120px] sm:max-h-[140px] md:max-h-[160px] w-auto max-w-[340px] sm:max-w-[400px] md:max-w-[440px] object-contain select-none pointer-events-none"
              />
            </div>
          ) : (
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight text-white drop-shadow-xl">
              {activeSlide.title}
            </h1>
          )}

          {/* 3. Rating & Refined Metadata Row: Rating -> Year -> Season │ Episode */}
          <div className="flex flex-wrap items-center gap-2.5 text-base sm:text-lg font-bold text-white/90">
            <div className="flex items-center gap-1 text-amber-400 font-black">
              <Star className="h-5 w-5 fill-current" />
              <span>{activeSlide.rating}</span>
            </div>
            <span className="text-white/20">•</span>
            <span>{activeSlide.year}</span>
            <span className="text-white/20">•</span>
            
            {/* Season Tag - 18px / 700 weight white text matching Episode */}
            <span className="text-white font-bold text-base sm:text-lg tracking-tight">
              {activeWatchState.formattedPillTag}
            </span>

            <span className="text-white/30 font-light mx-0.5">│</span>

            {/* Episode Tag - 18px / 700 weight */}
            <span className="text-white font-bold text-base sm:text-lg tracking-tight">
              {activeWatchState.formattedEpisodeTag}
            </span>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-1.5">
            {activeSlide.genres.map((g) => (
              <span key={g} className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/5 text-[10px] sm:text-xs text-white/80 font-black tracking-wide uppercase">
                {g}
              </span>
            ))}
          </div>

          {/* 4. Description */}
          <p className="text-sm sm:text-lg text-white/80 leading-relaxed line-clamp-3 max-w-xl">
            {activeSlide.description}
          </p>

          {/* 5. Buttons Row */}
          <div className="flex flex-wrap items-center gap-5 pt-2">
            {/* Primary CTA Play Button */}
            <Button
              className="h-[54px] rounded-full px-8 text-sm font-black shadow-lg hover:scale-105 active:scale-95 flex items-center shrink-0 transition-transform duration-300 bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7E22CE] text-white border border-[#A855F7]/30 shadow-[0_4px_20px_rgba(168,85,247,0.35)]"
              onClick={() => navigate(activeWatchState.watchUrl)}
            >
              <Play className="mr-2 h-5 w-5 fill-current text-white" />
              {activeWatchState.ctaLabel}
            </Button>

            {/* Library Button */}
            <Button
              variant="outline"
              className={cn(
                "h-[54px] rounded-full border px-7 text-sm font-bold backdrop-blur-md flex items-center hover:scale-105 shrink-0 transition-all duration-300",
                isAdded
                  ? "bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/30 hover:bg-[#A855F7]/30 hover:border-[#A855F7]/40 hover:text-[#A855F7] hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                  : "bg-white/5 border-white/10 hover:bg-white/15 text-white hover:text-white hover:border-white/25 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              )}
              onClick={() => toggleWatchlist(activeSlide.id)}
            >
              {isAdded ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-[#A855F7]" />
                  In Library
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4 text-white" />
                  Add to Library
                </>
              )}
            </Button>

            {/* Admin CMS Branding & Banner Edit Button (Visible only to authenticated Admin role) */}
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                title="Edit Hero Banner & Branding CMS"
                className="h-[54px] w-[54px] rounded-full border-white/10 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white backdrop-blur-md flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-105"
                onClick={() => setShowBrandingModal(true)}
              >
                <Settings className="h-5 w-5 text-primary" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Mute Button */}
      {(activeSlide.trailerUrl || activeSlide.youtubeTrailerId) && isTrailerActive && (
        <button
          onClick={handleToggleMute}
          aria-label={isMuted ? "Unmute trailer video" : "Mute trailer video"}
          className={cn(
            "absolute bottom-36 right-12 z-30 h-11 w-11 rounded-full border border-white/10 bg-black/45 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-700 pointer-events-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            isCinematicMode ? "opacity-10 scale-95 pointer-events-none" : "opacity-100 scale-100"
          )}
          title={isMuted ? "Unmute Trailer" : "Mute Trailer"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white/80" />
          ) : (
            <Volume2 className="h-4 w-4 text-primary animate-pulse" />
          )}
        </button>
      )}

      {/* FILMSTRIP SLIDE NAVIGATOR (Bottom Right) */}
      <div 
        role="tablist"
        aria-label="Hero slide navigator"
        className={cn(
          "absolute bottom-[8px] right-12 z-30 hidden lg:flex items-center gap-4 pointer-events-auto transition-all duration-700 ease-in-out",
          isCinematicMode ? "opacity-10 scale-95 pointer-events-none" : "opacity-100 scale-100"
        )}
      >
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          const slideAiringState = resolveAiringHeroItem({
            anime: slide,
            backendPublishedEpisodeCount: slide.episodes,
          });

          return (
            <button
              key={slide.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`Go to slide ${index + 1}: ${slide.title}`}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "relative flex items-center gap-2 p-1.5 rounded-xl border backdrop-blur-md transition-all duration-500 text-left w-[140px] overflow-hidden group/card focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                isActive
                  ? "bg-white/15 border-[#A855F7]/70 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.25)] opacity-100"
                  : "bg-black/60 border-white/10 opacity-60 hover:opacity-90 hover:bg-black/75 hover:-translate-y-0.5"
              )}
            >
              {/* Slide Thumbnail */}
              <div className="h-11 w-9 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                <img
                  src={slideAiringState.seasonPoster || slide.mobileImage || slide.image}
                  alt={slide.title}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (slide.image && target.src !== slide.image) {
                      target.src = slide.image;
                    }
                  }}
                  className="h-full w-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Slide Meta */}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="text-[9px] font-black uppercase text-[#A855F7] tracking-wider">
                  {slideAiringState.formattedHeroTag}
                </div>
                <div className="text-xs font-bold text-white truncate pr-1">{slide.title}</div>

                {/* Progress bar line */}
                <div className="w-full h-0.5 bg-white/25 rounded-full mt-1.5 overflow-hidden">
                  <div
                    key={`${index}-${isActive}`}
                    className="h-full transition-all ease-linear"
                    style={{
                      width: isActive && !isHovered ? "100%" : "0%",
                      transitionDuration: isActive && !isHovered ? "8000ms" : "0ms",
                      backgroundColor: "#A855F7"
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tablet-Only Glass Capsule Indicators (Hidden on Desktop & Mobile) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex lg:hidden items-center justify-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] w-max mx-auto">
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

      {/* DEDICATED FULLSCREEN TRAILER MODAL */}
      {showTrailerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl px-4 py-3 animate-fade-in pointer-events-auto">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center font-bold active:scale-95 transition-transform"
              title="Close Trailer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Control Video */}
            <video
              src={activeSlide.trailerUrl}
              autoPlay
              controls
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes driftSparkDesktop {
          0% {
            transform: translate3d(0, 0, 0) scale(0.5);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          85% {
            opacity: 0.3;
          }
          100% {
            transform: translate3d(${(Math.random() - 0.5) * 120}px, -110px, 0) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes fadeInContent {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes fadeInVideo {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in-content {
          animation: fadeInContent 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-video {
          animation: fadeInVideo 1s ease-out forwards;
        }
        .animate-drift-spark-desktop {
          animation: driftSparkDesktop 5s ease-in-out infinite;
        }
      `}</style>

      {showBrandingModal && (
        <BrandingEditModal
          universe={{
            id: activeSlide.id,
            slug: activeSlide.slug,
            title: activeSlide.title,
            cover: activeSlide.image,
            banner: activeSlide.image,
            description: activeSlide.description,
            genres: activeSlide.genres,
            studios: "Tencent",
            statistics: { totalEpisodes: activeSlide.episodes, totalInstallments: 1, viewsCount: "0", score: activeSlide.rating },
            installments: []
          }}
          selectedInstallment={{
            id: activeSlide.id,
            slug: activeSlide.slug,
            title: activeSlide.title,
            type: "Season",
            installmentOrder: 1,
            status: "Ongoing",
            episodesCount: activeSlide.episodes,
            poster: activeSlide.image,
            banner: activeSlide.image,
            description: activeSlide.description
          }}
          onSave={() => window.location.reload()}
          onClose={() => setShowBrandingModal(false)}
        />
      )}
    </section>
  );
};

export default HeroDesktop;
