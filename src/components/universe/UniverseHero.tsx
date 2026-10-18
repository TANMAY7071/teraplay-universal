import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Star, Share2, Sparkles, Calendar, Clock, Volume2, VolumeX, ChevronDown, CheckCircle2, Film, Maximize2, Plus, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Universe, Installment } from "@/types/universe";
import WatchlistButton from "@/components/WatchlistButton";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getProgress } from "@/lib/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBrandingOverrides } from "@/lib/overrides";
import { BrandingEditModal } from "@/components/admin/BrandingEditModal";
import { useLogoScale } from "@/hooks/useLogoScale";

interface UniverseHeroProps {
  universe: Universe;
  selectedInstallment: Installment;
  displayInstallment: Installment;
  onSelectInstallment: (installment: Installment) => void;
  onHoverInstallment?: (installment: Installment | null) => void;
}

export const UniverseHero: React.FC<UniverseHeroProps> = ({
  universe,
  selectedInstallment,
  displayInstallment,
  onSelectInstallment,
  onHoverInstallment
}) => {
  const navigate = useNavigate();
  const useOfficialLogo = true;
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showMobileTrailerModal, setShowMobileTrailerModal] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  const overrides = getBrandingOverrides(universe.slug, displayInstallment.id);
  const logoMode = overrides.logoDisplayMode || "desktop_only";
  const logoImg = logoMode !== "none" ? (overrides.logo || (useOfficialLogo && universe.slug === "battle-through-the-heavens" ? "/logos/battle-through-the-heavens-logo.png" : null)) : null;
  const posterImg = overrides.poster || displayInstallment.poster || universe.cover;
  const bannerImg = overrides.banner || displayInstallment.banner || universe.banner;

  const [posterSrc, setPosterSrc] = useState(posterImg);
  useEffect(() => {
    setPosterSrc(posterImg);
  }, [posterImg]);

  const handlePosterError = () => {
    if (posterSrc && !posterSrc.includes("wsrv.nl") && posterSrc.startsWith("http")) {
      setPosterSrc(`https://wsrv.nl/?url=${encodeURIComponent(posterSrc)}&q=90`);
    } else if (universe.cover && posterSrc !== universe.cover) {
      setPosterSrc(universe.cover);
    }
  };

  // Canvas-based transparent padding compensation for logos
  const logoContainerRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  useEffect(() => {
    if (logoContainerRef.current) {
      setContainerH(logoContainerRef.current.offsetHeight);
    }
  }, [logoImg]);
  const logoScale = useLogoScale(logoImg, containerH, 0.9);

  // Auto-hide controls after 2 seconds of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    };

    window.addEventListener("mousemove", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      clearTimeout(timeoutId);
    };
  }, []);

  // Smooth crossfade transition lock on installment change
  const [isChanging, setIsChanging] = useState(false);
  useEffect(() => {
    setIsChanging(true);
    const timer = setTimeout(() => setIsChanging(false), 250);
    return () => clearTimeout(timer);
  }, [displayInstallment.id]);

  // 1-second deterministic video fade-in delay
  useEffect(() => {
    setVideoLoaded(false);
    const timer = setTimeout(() => {
      setVideoLoaded(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [displayInstallment.id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${universe.title} - ${displayInstallment.title}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  // Fetch watch progress state
  const watchProgress = getProgress(universe.slug);
  
  // CTA Action details
  let playBtnText = "Start Journey";
  let playBtnSubtitle = "Season 1 • Episode 1";
  let journeyStatusTitle = "Not Started";
  let journeyStatusDetail = "Recommended Starting Point: Season 1 • Episode 1";
  let targetEpisode = 1;
  let targetInstallmentSlug = universe.installments[0]?.slug || "season-1";

  let ctaTitleLine = "Start Journey";
  let ctaDetailsLine = "Season 1 • Episode 1";
  let progressText = "";

  if (watchProgress) {
    const matchedInst = universe.installments.find(i => i.id === watchProgress.installmentId);
    const totalEps = matchedInst?.episodesCount || 12;
    const seasonNumber = matchedInst?.seasonNumber || (matchedInst?.type === "Season" ? matchedInst.seasonNumber : null);
    const seasonPrefix = seasonNumber ? `S${seasonNumber}` : (matchedInst?.title || "S1");
    
    if (watchProgress.episodeNumber >= totalEps) {
      playBtnText = "Restart Journey";
      playBtnSubtitle = "Season 1 • Episode 1";
      ctaTitleLine = "Restart Journey";
      ctaDetailsLine = "Season 1 • Episode 1";
      progressText = "";
      journeyStatusTitle = "Journey Completed";
      journeyStatusDetail = "You have finished watching the current season.";
      targetEpisode = 1;
      targetInstallmentSlug = universe.installments[0]?.slug || "season-1";
    } else {
      playBtnText = `Continue ${seasonPrefix} Episode ${watchProgress.episodeNumber}`;
      playBtnSubtitle = "";
      ctaTitleLine = `Continue ${seasonPrefix} Episode ${watchProgress.episodeNumber}`;
      ctaDetailsLine = `${seasonPrefix} • Episode ${watchProgress.episodeNumber}`;
      progressText = "24 min left";
      journeyStatusTitle = `Watching: ${watchProgress.installmentTitle}`;
      journeyStatusDetail = `Latest Watched: Episode ${watchProgress.episodeNumber} of ${totalEps}`;
      targetEpisode = watchProgress.episodeNumber;
      targetInstallmentSlug = matchedInst?.slug || "season-1";
    }
  } else {
    ctaTitleLine = "Start Journey";
    ctaDetailsLine = "Season 1 • Episode 1";
    progressText = "";
  }

  const handleResumePlay = () => {
    navigate(`/watch/${universe.slug}/${targetEpisode}`);
  };

  const ytVideoId = displayInstallment.youtubeId;
  const embedUrl = ytVideoId ? `https://www.youtube.com/embed/${ytVideoId}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${ytVideoId}&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}` : "";

  return (
    <>
      {/* ==================== DESKTOP HERO VIEWPORT (md:block) ==================== */}
      <div className="hidden md:flex relative w-full overflow-hidden bg-[#05060a] border-b border-white/5 pb-12 pt-20 sm:pt-24 min-h-[62vh] items-center">
        
        {/* Backdrop Visuals */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 blur-[0.5px] ${videoLoaded && isPlaying && ytVideoId ? 'opacity-0' : 'opacity-40'}`}
          style={{ backgroundImage: `url(${bannerImg})` }}
        />

        {isPlaying && ytVideoId && (
          <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${videoLoaded ? 'opacity-75' : 'opacity-0'}`}>
            <iframe
              key={ytVideoId}
              className="absolute w-[115%] h-[115%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ top: displayInstallment.videoOffsetY || "50%" }}
              src={embedUrl}
              title={`${displayInstallment.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-[#05060a]/60 to-transparent" />
        <div 
          className="absolute inset-0" 
          style={{
            background: "linear-gradient(90deg, rgba(5,5,10,0.96) 0%, rgba(5,5,10,0.85) 45%, rgba(5,5,10,0.3) 80%, transparent 100%)"
          }} 
        />

        {/* Media controls capsule (fades after 2s of mouse stillness) */}
        <div 
          onMouseEnter={() => setShowControls(true)}
          className={`absolute bottom-10 right-4 sm:bottom-12 sm:right-6 z-20 flex items-center gap-2 bg-black/80 border border-white/15 p-1.5 rounded-2xl backdrop-blur-2xl shadow-2xl transition-opacity duration-500 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-1.5 px-2 text-[10px] font-black uppercase text-primary tracking-widest border-r border-white/10">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span>TRAILER</span>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 text-xs font-bold"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 text-xs font-bold"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />}
            <span>{isMuted ? "Mute" : "Audio"}</span>
          </button>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full z-10">
          <div className="flex items-start justify-start gap-10 text-left">
            
            {/* Desktop Left Poster */}
            <div className="shrink-0">
              <div className="relative aspect-[2/3] w-48 sm:w-56 lg:w-60 rounded-2xl overflow-hidden border border-white/15 shadow-[0_10px_28px_rgba(0,0,0,0.45)] bg-[#0a0c14] group transition-all duration-500 hover:scale-102">
                <img src={posterSrc} alt={displayInstallment.title} referrerPolicy="no-referrer" onError={handlePosterError} className="h-full w-full object-cover" />
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider border border-white/10">
                  {displayInstallment.type}
                </div>
              </div>
            </div>

            {/* Desktop Details Content */}
            <div className={`flex-1 text-left max-w-2xl min-h-[340px] transition-all duration-300 will-change-[transform,opacity] ${isChanging ? 'opacity-40 translate-y-1' : 'opacity-100 translate-y-0'}`}>
              
              {/* 1. Logo / Title Container (Fixed Height) */}
              <div 
                ref={logoContainerRef}
                className="w-full flex items-center justify-start overflow-hidden"
                style={{ height: "clamp(90px, 9vw, 130px)" }}
              >
                {logoImg && logoMode === "both" ? (
                  <img 
                    src={logoImg} 
                    alt={universe.title} 
                    className="object-contain object-left select-none pointer-events-none"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      width: "auto",
                      height: "100%",
                      transform: `scale(${logoScale})`,
                      transformOrigin: "left center",
                    }}
                  />
                ) : logoImg && logoMode === "desktop_only" ? (
                  <>
                    <img 
                      src={logoImg} 
                      alt={universe.title} 
                      className="hidden md:block object-contain object-left select-none pointer-events-none"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        width: "auto",
                        height: "100%",
                        transform: `scale(${logoScale})`,
                        transformOrigin: "left center",
                      }}
                    />
                    <div className="block md:hidden flex flex-col justify-center">
                      <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none drop-shadow-2xl truncate">
                        {universe.title}
                      </h1>
                      {universe.originalTitle && (
                        <p className="text-[14px] font-semibold text-muted-foreground/70 tracking-wide mt-1">
                          {universe.originalTitle}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col justify-center">
                    <h1 className="text-4xl lg:text-[54px] font-extrabold text-white tracking-tight leading-none drop-shadow-2xl truncate">
                      {universe.title}
                    </h1>
                    {universe.originalTitle && (
                      <p className="text-[18px] font-semibold text-muted-foreground/70 tracking-wide mt-1">
                        {universe.originalTitle}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Metadata (16px gap) */}
              <div className="flex flex-wrap items-center justify-start gap-2.5 text-[17px] font-semibold text-muted-foreground mt-4">
                {displayInstallment.rating && (
                  <div className="flex items-center gap-1 bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-[#fbbf24] px-2 py-0.5 rounded-full text-[15px] font-black">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{displayInstallment.rating}</span>
                  </div>
                )}
                <span>{displayInstallment.year}</span>
                <span>{displayInstallment.episodesCount} Episodes</span>
                <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-400 uppercase text-[11px] font-black">
                  {displayInstallment.status}
                </Badge>
              </div>

              {/* 3. Season Active Badge */}
              <div className="mt-4">
                <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-wider backdrop-blur-md shadow-sm">
                  <span>{displayInstallment.title}</span>
                </div>
              </div>

              {/* 4. Genres (16px gap) */}
              <div className="flex flex-wrap items-center justify-start gap-1.5 mt-4">
                {universe.genres.map((g) => (
                  <span key={g} className="px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-[15px] font-bold">
                    {g}
                  </span>
                ))}
              </div>

              {/* 5. Description (20px gap) */}
              <div className="mt-5">
                <p className="text-[18px] text-muted-foreground/70 font-medium leading-[1.7] max-w-2xl line-clamp-3">
                  {displayInstallment.description}
                </p>
              </div>

              {/* 6. Buttons (24px gap) */}
              <div className="flex flex-wrap items-center justify-start gap-3 mt-6">
                <Button 
                  onClick={handleResumePlay} 
                  size="lg" 
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold uppercase tracking-wider transition-all flex items-center justify-center text-center h-12 px-6 text-[15px]"
                >
                  <div className="flex items-center justify-center gap-2 text-[15px] font-extrabold">
                    <Play className="h-4 w-4 fill-current" />
                    <span>{ctaTitleLine}</span>
                  </div>
                </Button>
                <WatchlistButton 
                  animeId={typeof universe.id === 'number' ? universe.id : 1} 
                  size="lg" 
                  className="w-12 h-12 rounded-xl p-0 flex items-center justify-center border-white/10 bg-white/5 hover:bg-white/10" 
                />
                <Button variant="outline" onClick={handleShare} size="lg" className="h-12 px-5 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-bold text-[15px] uppercase flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <span>SHARE</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowBrandingModal(true)} 
                  size="lg" 
                  className="h-12 w-12 rounded-xl p-0 border-white/10 bg-white/5 hover:bg-white/10 hover:text-primary flex items-center justify-center"
                  title="Customize Branding"
                >
                  <Settings className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ==================== MOBILE PHONE VIEWPORT (block md:hidden) ==================== */}
      <div className="block md:hidden w-full bg-[#05060a] border-b border-white/5 pb-6">
        
        {/* 1. 16:9 BANNER CONTAINER */}
        <div className="relative w-full aspect-video bg-black overflow-hidden border-b border-white/5">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: `url(${bannerImg})` }}
          />

          {isPlaying && ytVideoId && (
            <iframe
              key={ytVideoId}
              className="absolute w-[115%] h-[115%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ top: displayInstallment.videoOffsetY || "50%" }}
              src={embedUrl}
              title={`${displayInstallment.title} Mobile Trailer`}
              allow="autoplay; encrypted-media"
            />
          )}

          {/* Bottom-Right Floating Mute Control Capsule */}
          <div className="absolute bottom-3.5 right-3.5 z-20 flex items-center justify-center bg-black/80 border border-white/15 rounded-full backdrop-blur-md w-9 h-9">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="text-white/80 hover:text-white transition-colors flex items-center justify-center w-full h-full"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-primary" />}
            </button>
          </div>
        </div>

        {/* 2. OVERLAPPING POSTER + TITLE BLOCK Stack */}
        <div className="px-4 pt-1 flex items-start gap-4">
          
          {/* Overlapping Poster */}
          <div className="shrink-0 -mt-10 relative z-10 w-28 sm:w-32 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-[#0a0c14]">
            <img src={posterImg} alt={displayInstallment.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/85 text-white text-[7px] font-black uppercase tracking-wider">
              {displayInstallment.type}
            </div>
          </div>

          {/* Title block on the right */}
          <div className="flex-1 min-w-0 pt-2 space-y-1">
            <h1 className="text-base sm:text-lg font-black text-white leading-tight line-clamp-2">
              {universe.title}
            </h1>

            {/* Mobile Static Active Season Badge (No duplicate dropdown control) */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary font-black text-[10px] uppercase">
              <span>{displayInstallment.title}</span>
            </div>

            {/* Rating ⭐ 7.9 • 2017 • TV-14 */}
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground pt-0.5">
              <span className="text-[#fbbf24] flex items-center gap-0.5">
                ★ {displayInstallment.rating || "8.2"}
              </span>
              <span>•</span>
              <span>{displayInstallment.year}</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">TV-14</span>
            </div>

            {/* Episode Count & Status */}
            <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-300">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {displayInstallment.episodesCount} Episodes
              </span>
              <span className="flex items-center gap-1 text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {displayInstallment.status}
              </span>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY ACTIONS BLOCK */}
        <div className="mt-4 px-4 space-y-1.5">
          <div className="flex items-center gap-2">
            {/* Resume Play (Purple CTA) */}
            <Button 
              onClick={handleResumePlay}
              className="flex-1 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-black uppercase tracking-wider transition-all flex items-center justify-center text-center shadow-lg shadow-primary/10 h-11 px-4"
            >
              <div className="flex items-center justify-center w-full gap-1.5 text-xs font-black">
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{ctaTitleLine}</span>
              </div>
            </Button>

            {/* Saved (Watchlist) Square Button */}
            <WatchlistButton 
              animeId={typeof universe.id === 'number' ? universe.id : 1}
              size="icon"
              className="w-11 h-11 shrink-0 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-foreground flex items-center justify-center"
            />

            {/* Share Square Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="w-11 h-11 shrink-0 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground flex items-center justify-center"
            >
              <Share2 className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
          </div>


        </div>

        {/* 4. SYNOPSIS & DESCRIPTION */}
        <div className="px-4 mt-3">
          <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed line-clamp-3">
            {displayInstallment.description}
          </p>
        </div>

      </div>

      {/* MOBILE TRAILER MODAL */}
      {showMobileTrailerModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <button
              onClick={() => setShowMobileTrailerModal(false)}
              className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-black/80 text-white font-bold text-xs border border-white/20"
            >
              ✕ Close
            </button>
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&controls=1`}
              title={`${displayInstallment.title} Trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {showBrandingModal && (
        <BrandingEditModal
          universe={universe}
          selectedInstallment={selectedInstallment}
          onSave={() => {
            window.location.reload();
          }}
          onClose={() => setShowBrandingModal(false)}
        />
      )}
    </>
  );
};
