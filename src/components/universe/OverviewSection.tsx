import React from "react";
import { cn } from "@/lib/utils";
import { Installment, Universe } from "@/types/universe";
import { BookOpen, Flame, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OverviewSectionProps {
  universe: Universe;
  selectedInstallment: Installment;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  universe,
  selectedInstallment,
}) => {
  const cultivationModule = universe.modules?.cultivation;
  const loreModule = universe.modules?.lore;
  const flamesModule = universe.modules?.heavenlyFlames;

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. SYNOPSIS & SEASON SUMMARY (Always Visible) */}
      <div className="bg-[#0c0d12]/95 border border-white/10 p-6 rounded-3xl backdrop-blur-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <BookOpen className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
            {selectedInstallment.title} • Story Overview
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
          {selectedInstallment.description}
        </p>

        <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-muted-foreground block">Format & Type</span>
            <span className="font-black text-primary block">{selectedInstallment.type}</span>
          </div>

          <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-muted-foreground block">Total Duration</span>
            <span className="font-black text-white block">{selectedInstallment.episodesCount} Episodes</span>
          </div>

          <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-muted-foreground block">Broadcast Year</span>
            <span className="font-black text-white block">{selectedInstallment.year || "2017 - Present"}</span>
          </div>
        </div>
      </div>

      {/* 2. CULTIVATION REALM PROGRESSION (Conditional Block) */}
      {cultivationModule?.enabled && cultivationModule.realms && (
        <div className="bg-[#0c0d12]/95 border border-white/10 p-6 rounded-3xl backdrop-blur-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4.5 w-4.5 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                {cultivationModule.title || "Cultivation Realm Progression"}
              </h3>
            </div>
            <Badge variant="outline" className="bg-amber-400/10 border-amber-400/20 text-amber-400 text-[10px] font-black uppercase">
              Power Scale
            </Badge>
          </div>

          {/* Connected Horizontal Node Progression Path */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2 [scrollbar-width:thin] min-h-[120px]">
            {cultivationModule.realms.map((realm, idx) => {
              // Highlight the active realm (Dou Wang - stage 5)
              const isCurrent = idx === 4;

              return (
                <React.Fragment key={realm.name}>
                  <div
                    className={cn(
                      "flex flex-col justify-between p-3.5 rounded-2xl border shrink-0 w-44 h-24 text-left relative transition-all duration-300",
                      isCurrent
                        ? "border-primary bg-primary/10 shadow-lg -translate-y-0.5 scale-102"
                        : "bg-[#0d0f17] border-white/10 opacity-80"
                    )}
                  >
                    <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground">
                      <span>{realm.level}</span>
                      {isCurrent && (
                        <span className="text-primary font-black uppercase tracking-wider text-[8px] animate-pulse">
                          ● CURRENT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className={cn("h-2 w-2 rounded-full", isCurrent ? "bg-primary animate-ping" : "bg-zinc-600")} />
                      <h4 className="text-xs font-black text-white truncate">{realm.name}</h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate pt-1">{realm.desc}</p>
                  </div>

                  {/* Connected progression line connector */}
                  {idx < cultivationModule.realms.length - 1 && (
                    <div className={cn("h-[2px] w-8 shrink-0", isCurrent || idx === 3 ? "bg-primary" : "bg-white/10")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. HEAVENLY FLAMES (Conditional Block) */}
      {flamesModule?.enabled && flamesModule.items && (
        <div className="bg-[#0c0d12]/95 border border-white/10 p-6 rounded-3xl backdrop-blur-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Flame className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {flamesModule.title || "Heavenly Flames Codex"}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {flamesModule.items.map((item) => (
              <div key={item.name} className="p-3 bg-[#0d0f17] border border-white/5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-[9px] font-black text-primary uppercase">
                  <span>Rank #{item.rank}</span>
                </div>
                <h4 className="text-xs font-black text-white pt-1">{item.name}</h4>
                <p className="text-[10px] text-zinc-400 pt-1 leading-normal">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FRANCHISE LORE (Conditional Block) */}
      {loreModule?.enabled && (
        <div className="bg-[#0c0d12]/95 border border-white/10 p-6 rounded-3xl backdrop-blur-2xl shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              Franchise Lore & Universe Setting
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {loreModule.description}
          </p>
        </div>
      )}

    </div>
  );
};
