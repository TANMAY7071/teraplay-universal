import React from "react";
import { Installment } from "@/types/universe";
import { cn } from "@/lib/utils";
import { Sparkles, Check, ArrowRight, Compass } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UniverseChronologyProps {
  installments: Installment[];
  selectedInstallment: Installment;
  displayInstallment: Installment;
  onSelectInstallment: (installment: Installment) => void;
  onHoverInstallment?: (installment: Installment | null) => void;
}

export const UniverseChronology: React.FC<UniverseChronologyProps> = ({
  installments,
  selectedInstallment,
  displayInstallment,
  onSelectInstallment,
  onHoverInstallment
}) => {
  return (
    <div className="space-y-4 text-left bg-[#0c0d12]/95 border border-white/10 p-4 sm:p-6 rounded-3xl backdrop-blur-2xl shadow-xl">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
            Universe Chronology
          </h2>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Recommended Watch Order • Select Season
        </span>
      </div>

      {/* MERGED CHRONOLOGICAL PORTRAIT CARDS (160-180px Wide, Crisp Artwork, Zero Purple Glow Clouds) */}
      <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 [scrollbar-width:thin] min-h-[290px]">
        {installments.map((item, index) => {
          const isSelected = item.id === selectedInstallment.id;
          const isDisplayed = item.id === displayInstallment.id;
          const isActive = isSelected || isDisplayed;

          return (
            <React.Fragment key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => onSelectInstallment(item)}
                    onMouseEnter={() => onHoverInstallment?.(item)}
                    onMouseLeave={() => onHoverInstallment?.(null)}
                    className={cn(
                      "group cursor-pointer shrink-0 flex flex-col gap-2 p-2.5 rounded-3xl border transition-all duration-300 w-40 sm:w-44 lg:w-48 text-left relative bg-[#0d0f17] shadow-[0_10px_28px_rgba(0,0,0,0.45)]",
                      isActive
                        ? "border-primary bg-primary/10 -translate-y-1.5 shadow-2xl"
                        : "border-white/10 hover:border-white/25 hover:-translate-y-1 opacity-90 hover:opacity-100"
                    )}
                  >
                    {/* 160-180px Portrait Poster Container (100% Crisp Key Art) */}
                    <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-black">
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Watch Order Index Badge */}
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[9px] font-black text-primary uppercase border border-white/10">
                        #{index + 1} {item.type === "Season" ? `Season ${item.seasonNumber || index + 1}` : item.type}
                      </div>

                      {/* Active Status Badge Pill */}
                      {isActive && (
                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 shrink-0">
                          <Sparkles className="h-2.5 w-2.5 fill-current" />
                          <span>CURRENT</span>
                        </div>
                      )}

                      {/* Completed Status Checkmark */}
                      {item.status === "Completed" && !isActive && (
                        <div className="absolute bottom-2.5 right-2.5 p-1 rounded-full bg-green-500 text-black shadow">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="space-y-0.5 px-1 pt-0.5">
                      <h3
                        className={cn(
                          "text-xs sm:text-sm font-black truncate leading-tight transition-colors",
                          isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                        )}
                      >
                        {item.title}
                      </h3>

                      <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-muted-foreground">
                        <span>{item.episodesCount} Episodes</span>
                        <span className="text-zinc-400 font-mono text-[9px]">{item.status}</span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>

                <TooltipContent side="top" className="bg-[#0f111a] border border-white/10 p-2.5 rounded-xl shadow-2xl text-left text-xs z-50">
                  <div className="font-black text-foreground">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">
                    {item.type} • {item.episodesCount} Episodes • {item.year}
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Connecting Watch Order Arrow */}
              {index < installments.length - 1 && (
                <ArrowRight className="h-4 w-4 text-white/20 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
