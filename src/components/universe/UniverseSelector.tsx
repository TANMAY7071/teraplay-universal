import React from "react";
import { Installment } from "@/types/universe";
import { cn } from "@/lib/utils";
import { Layers, CheckCircle2, PlayCircle, Star, Sparkles, Film } from "lucide-react";

interface UniverseSelectorProps {
  installments: Installment[];
  selectedInstallment: Installment;
  onSelectInstallment: (installment: Installment) => void;
}

export const UniverseSelector: React.FC<UniverseSelectorProps> = ({
  installments,
  selectedInstallment,
  onSelectInstallment
}) => {
  return (
    <div className="space-y-4 text-left">
      {/* Title & Badge Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-primary animate-pulse" />
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
            Universe Timeline & Installments
          </h2>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          {installments.length} Installments
        </span>
      </div>

      {/* Grid Layout (Desktop/Tablet) + Scroll Snap (Mobile Phone) */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-x-auto sm:overflow-x-visible pb-3 sm:pb-0 [scrollbar-width:thin]">
        {installments.map((item) => {
          const isSelected = item.id === selectedInstallment.id;

          return (
            <div
              key={item.id}
              onClick={() => onSelectInstallment(item)}
              className={cn(
                "relative group cursor-pointer p-3 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 text-left shrink-0 w-[270px] sm:w-auto overflow-hidden",
                isSelected
                  ? "bg-primary/10 border-primary/50 shadow-xl shadow-primary/15 ring-2 ring-primary/40"
                  : "bg-[#0d0f17]/90 border-white/5 hover:border-white/20 hover:bg-[#12141f]"
              )}
            >
              {/* Prominent 2:3 Vertical Poster Thumbnail */}
              <div className="relative w-20 sm:w-24 aspect-[2/3] h-28 sm:h-32 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg bg-black/60">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Type Tag Overlay on Poster */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[8px] font-black text-primary uppercase border border-primary/30">
                  {item.type}
                </div>

                {isSelected && (
                  <div className="absolute inset-0 bg-primary/35 backdrop-blur-[1px] flex items-center justify-center">
                    <PlayCircle className="h-8 w-8 text-white fill-primary animate-pulse" />
                  </div>
                )}
              </div>

              {/* Installment Content Details */}
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h3
                    className={cn(
                      "text-xs sm:text-sm font-black truncate leading-tight transition-colors",
                      isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                    )}
                  >
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground pt-1">
                    <span className="text-zinc-300">{item.episodesCount} Episodes</span>
                    {item.year && (
                      <>
                        <span>•</span>
                        <span>{item.year}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Rating Badge */}
                {item.rating && (
                  <div className="flex items-center gap-1 text-[11px] font-black text-[#fbbf24]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{item.rating}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="pt-0.5">
                  {item.status === "Completed" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-green-500/10 text-green-400 border border-green-500/20">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Completed
                    </span>
                  ) : item.status === "Watching" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-primary/20 text-primary border border-primary/40 animate-pulse">
                      <Sparkles className="h-2.5 w-2.5" /> Watching Now
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Ongoing
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
