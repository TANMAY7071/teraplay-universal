import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

export interface Character {
  id?: string;
  name: string;
  role?: string;
  avatar?: string;
  image?: string;
  alias?: string;
  faction?: string;
  realmName?: string;
  detailSlug?: string;
  cultivation?: string;
}

interface CharactersWidgetProps {
  characters?: Character[];
  seriesSlug?: string;
}

const FALLBACK_AVATARS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=400&fit=crop",
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=400&fit=crop",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop",
  "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&h=400&fit=crop",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&h=400&fit=crop",
];

export const CharactersWidget: React.FC<CharactersWidgetProps> = ({
  characters,
  seriesSlug = "battle-through-the-heavens"
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Hide widget completely if no character data is available for this donghua
  if (!characters || characters.length === 0) {
    return null;
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const getCleanAvatarUrl = (url?: string, idx: number = 0) => {
    if (!url) return FALLBACK_AVATARS[idx % FALLBACK_AVATARS.length];
    return url;
  };

  return (
    <div className="bg-[#0c0d12]/40 backdrop-blur-md border border-white/[0.06] rounded-3xl p-5 space-y-4 hover:border-primary/20 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] text-left group/widget">
      {/* Header with Title, Count, Navigation and View All Link */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-[#a855f7]" />
          </div>
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-100">
            Main Characters
          </h3>
          <span className="text-[9px] font-mono font-bold text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
            {characters.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll arrow buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="w-6 h-6 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="w-6 h-6 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => navigate(`/series/${seriesSlug}/lore/characters`)}
            className="text-[9px] font-black uppercase tracking-widest text-[#a855f7] hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
          >
            <span>View All</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      </div>

      {/* Scrollable Horizontal Character Carousel with data-lenis-prevent */}
      <div 
        ref={scrollRef}
        data-lenis-prevent
        className="flex gap-3.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory items-start text-left overscroll-x-contain"
      >
        {characters.map((char, idx) => {
          const hasFailed = failedImages[char.name];
          const avatarUrl = hasFailed 
            ? FALLBACK_AVATARS[idx % FALLBACK_AVATARS.length]
            : getCleanAvatarUrl(char.image || char.avatar, idx);
          const detailSlug = char.detailSlug || char.name.replace(/ /g, "_");

          return (
            <div 
              key={idx} 
              onClick={() => navigate(`/series/${seriesSlug}/lore/characters/${detailSlug}`)}
              className="group relative w-[130px] sm:w-[155px] aspect-[3/4] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0e17] shadow-lg cursor-pointer hover:border-primary/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.18)] hover:-translate-y-1 transition-all duration-300"
            >
              <img 
                src={avatarUrl} 
                alt={char.name} 
                onError={() => {
                  if (!failedImages[char.name]) {
                    setFailedImages(prev => ({ ...prev, [char.name]: true }));
                  }
                }}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              
              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent transition-opacity duration-300" />
              
              {/* Top Mini Cultivation Pill (if available) */}
              {(char.realmName || char.cultivation) && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 text-[7.5px] font-mono font-bold text-[#C084FC] max-w-[85%] truncate">
                  {char.realmName || char.cultivation}
                </div>
              )}

              {/* Bottom Character Info */}
              <div className="absolute inset-x-2.5 bottom-2.5 space-y-0.5 text-left">
                <span className="text-[11px] font-black text-white block truncate leading-tight group-hover:text-primary transition-colors">
                  {char.name}
                </span>
                <span className="text-[8px] font-black text-[#C084FC] uppercase tracking-wider block truncate">
                  {char.alias || char.role || "CHARACTER"}
                </span>
                {char.faction && (
                  <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-[7px] font-bold text-zinc-400 font-mono border-t border-white/10 mt-1">
                    <Sparkles className="w-2 h-2 text-primary shrink-0" />
                    <span className="truncate">{char.faction}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* View All Characters Card at end of row */}
        <div 
          onClick={() => navigate(`/series/${seriesSlug}/lore/characters`)}
          className="group relative w-[130px] sm:w-[155px] aspect-[3/4] shrink-0 snap-start overflow-hidden rounded-2xl border border-dashed border-white/10 hover:border-primary/40 bg-white/[0.02] hover:bg-primary/[0.04] transition-all duration-300 flex flex-col items-center justify-center gap-2.5 cursor-pointer shadow-lg active:scale-98"
        >
          <div className="h-10 w-10 rounded-full bg-white/[0.03] group-hover:bg-primary/20 flex items-center justify-center border border-white/[0.06] group-hover:border-primary/30 transition-all duration-300">
            <Users className="h-4 w-4 text-zinc-400 group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center space-y-0.5 px-2">
            <span className="text-[10px] font-black uppercase text-zinc-200 group-hover:text-white tracking-widest block">
              View All
            </span>
            <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-wider block">
              Character Lore
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
