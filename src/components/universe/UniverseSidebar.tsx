import React from "react";
import { Installment, Universe } from "@/types/universe";
import { Play, Calendar, Check, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UniverseSidebarProps {
  universe: Universe;
  selectedInstallment: Installment;
}

export const UniverseSidebar: React.FC<UniverseSidebarProps> = ({
  universe,
  selectedInstallment
}) => {
  const navigate = useNavigate();

  const handleContinueWatching = () => {
    navigate(`/watch/${universe.slug}/1`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8 text-left h-full">
      
      {/* SECTION 1: WATCH STATUS & NEAREST RELEASE */}
      <div className="space-y-4 flex flex-col justify-between h-full">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <BookmarkCheck className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">
              WATCH STATUS
            </h3>
          </div>

          {/* Continue Watching Quick Trigger */}
          <div className="p-4 bg-[#0c0d12]/50 border border-white/5 rounded-2xl space-y-3 hover:border-primary/20 transition-all duration-300">
            <div className="text-[10px] font-black uppercase text-primary tracking-wider">
              Continue Watching
            </div>
            <div className="text-xs font-black text-white truncate">
              {selectedInstallment.title}
            </div>
            <Button
              onClick={handleContinueWatching}
              className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Watch Now</span>
            </Button>
          </div>
        </div>

        {/* Next Broadcast Release Countdown */}
        <div className="p-3 bg-[#0c0d12]/30 border border-white/5 rounded-2xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-bold text-zinc-400">Next Release</span>
          </div>
          <span className="font-mono font-black text-green-400">In 6 Days</span>
        </div>
      </div>

      {/* SECTION 2: UNIVERSE PROGRESS CHECKLIST */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Check className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest">
            UNIVERSE PROGRESS
          </h3>
        </div>

        <div data-lenis-prevent className="space-y-2 max-h-[220px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] scrollbar-none hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:w-1 hover:[&::-webkit-scrollbar-thumb]:bg-primary/30 hover:[&::-webkit-scrollbar-thumb]:rounded-full">
          {universe.installments.map((item) => {
            const isSelected = item.id === selectedInstallment.id;
            const isWatched = item.status === "Completed";

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected 
                    ? "bg-primary/10 border border-primary/20 text-primary" 
                    : "bg-black/20 border border-white/5 text-zinc-400 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isWatched ? (
                    <div className="h-4.5 w-4.5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 border border-green-500/10">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="h-4.5 w-4.5 rounded-full bg-white/5 border border-white/10 shrink-0" />
                  )}
                  <span className="truncate">{item.title}</span>
                </div>
                <span className="text-[9px] font-mono opacity-80 shrink-0">
                  {isWatched ? "Done" : isSelected ? "Watching" : "Next"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
