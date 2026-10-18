import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Universe, Installment, CharacterItem } from "@/types/universe";
import { Users, Flame, BookOpen, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UniverseCodexProps {
  universe: Universe;
  selectedInstallment: Installment;
  charactersList: CharacterItem[];
}

export const UniverseCodex: React.FC<UniverseCodexProps> = ({
  universe,
  selectedInstallment,
  charactersList,
}) => {
  const cultivationModule = universe.modules?.cultivation;
  const flamesModule = universe.modules?.heavenlyFlames;
  const loreModule = universe.modules?.lore;

  const tabs = [
    { id: "characters", label: "Cast & Characters", icon: Users },
    {
      id: "cultivation",
      label: "Cultivation Guide",
      icon: Flame,
      enabled: cultivationModule?.enabled && cultivationModule.realms && cultivationModule.realms.length > 0,
    },
    {
      id: "flames",
      label: "Heavenly Flames",
      icon: Compass,
      enabled: flamesModule?.enabled && flamesModule.items && flamesModule.items.length > 0,
    },
    { id: "lore", label: "World Settings", icon: BookOpen },
  ].filter((t) => t.enabled !== false);

  const [activeTab, setActiveTab] = useState<string>("characters");

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id || "characters");
    }
  }, [universe]);

  const protagonist = selectedInstallment.characters?.find(
    (c) => c.name.toLowerCase() === "xiao yan" || c.role.toLowerCase() === "protagonist"
  ) || charactersList.find(
    (c) => c.name.toLowerCase() === "xiao yan" || c.role.toLowerCase() === "protagonist"
  );
  
  const activeCultivation = protagonist?.cultivation;

  const isCurrentRealm = (realmName: string, activeCultivation?: string) => {
    if (!activeCultivation) return false;
    const r = realmName.toLowerCase().replace(/\s*\(.*\)/, "").trim();
    const c = activeCultivation.toLowerCase().replace(/\s*\(.*\)/, "").trim();
    return r.includes(c) || c.includes(r);
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. TYPOGRAPHIC TAB CONTROLS (No box boundaries, elegant alignment) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-white/5 pb-2">
        <h2 className="text-xl font-black text-white tracking-tight">
          Universe Codex
        </h2>

        {/* Cinematic Underlined Tab Switcher */}
        <div className="flex items-center gap-6 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-3 text-xs font-black uppercase tracking-wider transition-all relative block shrink-0",
                  isActive
                    ? "text-[#C084FC]"
                    : "text-zinc-500 hover:text-white"
                )}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C084FC] rounded-full shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TAB PORTAL */}
      <div className="min-h-[200px] pt-2">
        
        {/* TAB: CHARACTERS */}
        {activeTab === "characters" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {charactersList.map((char, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#0c0d12]/40 border border-white/5 hover:border-[#C084FC]/30 hover:bg-[#0c0d12]/75 rounded-2xl flex items-center gap-4 transition-all duration-300 group"
              >
                <img
                  src={char.avatar}
                  alt={char.name}
                  className="h-14 w-14 rounded-full object-cover shrink-0 border border-white/10 shadow-md group-hover:border-[#C084FC]/40 transition-colors"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-black text-white truncate group-hover:text-primary transition-colors">
                      {char.name}
                    </span>
                    <span className="text-[9px] text-[#C084FC] font-black uppercase tracking-widest shrink-0">
                      {char.role.split("/")[0]?.trim()}
                    </span>
                  </div>
                  {char.cultivation && (
                    <span className="inline-block text-[8px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">
                      {char.cultivation}
                    </span>
                  )}
                  <p className="text-[10px] text-zinc-400 line-clamp-2 pt-1 leading-normal">
                    {char.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: CULTIVATION */}
        {activeTab === "cultivation" && cultivationModule && (
          <div className="space-y-6 pt-2">
            {/* Constellation Progression Map */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 [scrollbar-width:thin] min-h-[120px] relative">
              {cultivationModule.realms.map((realm, idx) => {
                const isCurrent = isCurrentRealm(realm.name, activeCultivation);
                
                return (
                  <React.Fragment key={realm.name}>
                    <div
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-2xl border shrink-0 w-44 h-24 text-left transition-all duration-300 relative",
                        isCurrent
                          ? "border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                          : "bg-[#0c0d12]/30 border-white/5 opacity-80 hover:opacity-100 hover:border-white/15"
                      )}
                    >
                      <div className="flex items-center justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                        <span>{realm.level}</span>
                        {isCurrent && (
                          <span className="text-primary font-black uppercase tracking-wider text-[8px] animate-pulse">
                            ● Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isCurrent ? "bg-primary animate-ping" : "bg-zinc-600"
                          )}
                        />
                        <h4 className="text-xs font-black text-white truncate">{realm.name}</h4>
                      </div>
                      <p className="text-[9px] text-zinc-400 truncate pt-1">
                        {realm.desc}
                      </p>
                    </div>

                    {/* Progress Connector Line */}
                    {idx < cultivationModule.realms.length - 1 && (
                      <div
                        className={cn(
                          "h-[1px] w-8 shrink-0",
                          isCurrent || idx < cultivationModule.realms.findIndex(r => isCurrentRealm(r.name, activeCultivation))
                            ? "bg-primary"
                            : "bg-white/10"
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: HEAVENLY FLAMES */}
        {activeTab === "flames" && flamesModule && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flamesModule.items.map((item) => (
              <div
                key={item.name}
                className="p-4 bg-[#0c0d12]/40 border border-white/5 hover:border-primary/20 hover:bg-[#0c0d12]/75 rounded-2xl flex flex-col justify-between transition-all duration-300 relative group overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    Rank #{item.rank}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white pt-3 group-hover:text-primary transition-colors">
                  {item.name}
                </h4>
                <p className="text-[10px] text-zinc-400 pt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* TAB: WORLD SETTINGS */}
        {activeTab === "lore" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
            {/* Story Overview */}
            <div className="lg:col-span-8 space-y-4">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-[#C084FC]">
                  {selectedInstallment.title} Overview
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {selectedInstallment.description}
                </p>
              </div>

              {loreModule?.enabled && (
                <div className="space-y-1 pt-3 border-t border-white/5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#C084FC]">
                    World Lore & Background
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {loreModule.description}
                  </p>
                </div>
              )}
            </div>

            {/* Key Alliances */}
            <div className="lg:col-span-4 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-[#C084FC]">
                Universe Factions
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-[#0c0d12]/20 border border-white/5 rounded-xl">
                  <span className="text-xs font-black text-white block">Xiao Yan & Yao Lao</span>
                  <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">
                    Yao Lao guides Xiao Yan through alchemical training and Heavenly Flame fusion.
                  </p>
                </div>

                <div className="p-3 bg-[#0c0d12]/20 border border-white/5 rounded-xl">
                  <span className="text-xs font-black text-white block">Queen Medusa Alliance</span>
                  <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">
                    Snake tribe sovereign safeguards Xiao Yan in critical section battles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
