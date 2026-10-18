import React, { useEffect, useRef } from "react";
import { Installment } from "@/types/universe";
import { cn } from "@/lib/utils";
import { Sparkles, Check, ChevronRight } from "lucide-react";
import { getBrandingOverrides } from "@/lib/overrides";

interface SeasonNavigatorProps {
  installments: Installment[];
  selectedInstallment: Installment;
  displayInstallment: Installment;
  onSelectInstallment: (installment: Installment) => void;
  onHoverInstallment?: (installment: Installment | null) => void;
}

const TimelinePoster: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [imgSrc, setImgSrc] = React.useState(src);

  React.useEffect(() => {
    setImgSrc(src);
  }, [src]);

  const handleError = () => {
    if (imgSrc && !imgSrc.includes("wsrv.nl") && imgSrc.startsWith("http")) {
      setImgSrc(`https://wsrv.nl/?url=${encodeURIComponent(imgSrc)}&q=90`);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
};

export const SeasonNavigator: React.FC<SeasonNavigatorProps> = ({
  installments,
  selectedInstallment,
  displayInstallment,
  onSelectInstallment,
  onHoverInstallment
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);

  // Live Overrides listener state to force re-render when CMS updates posters
  const [, setOverridesTick] = React.useState(0);

  useEffect(() => {
    const handleUpdate = () => setOverridesTick(t => t + 1);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("branding_overrides_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("branding_overrides_updated", handleUpdate);
    };
  }, []);

  // Auto-center the active poster card in the timeline carousel when selection changes
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }, [selectedInstallment.id]);

  // Helper to determine the explicit Season/Movie label for each installment card
  const getSeasonBadgeText = (item: Installment, index: number) => {
    const lowerTitle = item.title.toLowerCase();
    
    if (item.type === "Movie" || lowerTitle.includes("movie")) {
      if (lowerTitle.includes("xueluo") || lowerTitle.includes("blood")) return { text: "MOVIE 1", badgeBg: "bg-amber-500/25 text-amber-300 border-amber-500/40" };
      if (lowerTitle.includes("showdown") || lowerTitle.includes("primordial") || lowerTitle.includes("primal")) return { text: "MOVIE 2", badgeBg: "bg-purple-500/25 text-purple-300 border-purple-500/40" };
      if (lowerTitle.includes("origin")) return { text: "ORIGIN MOVIE", badgeBg: "bg-amber-500/25 text-amber-300 border-amber-500/40" };
      return { text: "MOVIE", badgeBg: "bg-amber-500/25 text-amber-300 border-amber-500/40" };
    }

    const seasonMatch = lowerTitle.match(/season\s*(\d+)/);
    if (seasonMatch) {
      return { text: `SEASON ${seasonMatch[1]}`, badgeBg: "bg-blue-500/25 text-blue-300 border-blue-500/40" };
    }
    if (item.seasonNumber) {
      return { text: `SEASON ${item.seasonNumber}`, badgeBg: "bg-blue-500/25 text-blue-300 border-blue-500/40" };
    }

    return { text: `SEASON ${index + 1}`, badgeBg: "bg-blue-500/25 text-blue-300 border-blue-500/40" };
  };

  return (
    <div className="space-y-3 text-left">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
            FRANCHISE JOURNEY
          </h2>
        </div>
        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest hidden sm:inline">
          Chronological View Order
        </span>
      </div>

      {/* CONTINUOUS HORIZONTAL JOURNEY TIMELINE (CONSOLIDATED) */}
      <div 
        ref={containerRef}
        className="flex items-center gap-2 sm:gap-3.5 overflow-x-auto pb-3 pt-1 [scrollbar-width:thin]"
      >
        {installments.map((item, index) => {
          const isSelected = item.id === selectedInstallment.id;
          const isDisplayed = item.id === displayInstallment.id;
          const isActive = isSelected || isDisplayed;
          const seasonBadge = getSeasonBadgeText(item, index);
          const seriesSlug = selectedInstallment.donghuaApiSlug || "battle-through-the-heavens";
          const override = getBrandingOverrides(seriesSlug, item.id);
          const posterSrc = override?.poster || item.poster;

          return (
            <React.Fragment key={item.id}>
              {/* Card node */}
              <div
                ref={isSelected ? activeCardRef : null}
                onClick={() => onSelectInstallment(item)}
                onMouseEnter={() => onHoverInstallment?.(null)}
                onMouseLeave={() => onHoverInstallment?.(null)}
                className={cn(
                  "group cursor-pointer shrink-0 rounded-2xl overflow-hidden border transition-all duration-300 w-32 sm:w-36 aspect-[2/3] text-left relative bg-[#0d0f17] shadow-[0_10px_28px_rgba(0,0,0,0.45)]",
                  isActive
                    ? "border-primary ring-1 ring-primary/40 -translate-y-1"
                    : "border-white/10 hover:border-white/25 hover:-translate-y-0.5 opacity-90 hover:opacity-100"
                )}
              >
                {/* Full-Bleed Poster Image */}
                <TimelinePoster src={posterSrc} alt={item.title} />

                {/* Dark Gradient Overlay for Text Visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

                {/* Explicit Season / Movie Badge */}
                <div className={cn(
                  "absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-md z-10",
                  seasonBadge.badgeBg
                )}>
                  {seasonBadge.text}
                </div>

                {/* Status Completed Checkmark */}
                {item.status === "Completed" ? (
                  <div className="absolute top-2.5 right-2.5 p-1 rounded-full bg-green-500 text-black shadow-md z-10">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                ) : isActive ? (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-wider shadow z-10 animate-pulse">
                    CURRENT
                  </div>
                ) : null}

                {/* Bottom Text Details */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-0.5">
                  <h3 className="text-xs font-black text-white truncate drop-shadow">
                    {item.title}
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-300 drop-shadow-sm flex items-center justify-between">
                    <span>{item.episodesCount} Episodes</span>
                    <span className="text-zinc-400 text-[9px] font-mono">{item.year}</span>
                  </p>

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className="h-1 w-full bg-primary rounded-full pt-0.5 mt-1" />
                  )}
                </div>
              </div>

              {/* Connected node timeline arrow (Desktop/Tablet flow indicator) */}
              {index < installments.length - 1 && (
                <ChevronRight className="h-5 w-5 text-white/10 shrink-0 mx-1 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
