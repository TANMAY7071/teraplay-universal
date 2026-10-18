import React, { useState, useMemo } from "react";
import { Installment } from "@/types/universe";
import { Search, Play, Film, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface UniverseEpisodesGridProps {
  selectedInstallment: Installment;
}

export const UniverseEpisodesGrid: React.FC<UniverseEpisodesGridProps> = ({
  selectedInstallment
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);

  const totalEps = selectedInstallment.episodesCount || 12;

  // Generate episode chunks of 25 episodes each
  const chunks = useMemo(() => {
    const chunkSize = 25;
    const result: Array<{ start: number; end: number; label: string }> = [];
    for (let i = 1; i <= totalEps; i += chunkSize) {
      const end = Math.min(i + chunkSize - 1, totalEps);
      result.push({
        start: i,
        end: end,
        label: `${i}–${end}`
      });
    }
    return result;
  }, [totalEps]);

  const activeChunk = chunks[activeChunkIndex] || chunks[0] || { start: 1, end: totalEps };

  // Filtered episodes based on active chunk range and search query
  const episodesList = useMemo(() => {
    const items = [];
    for (let i = activeChunk.start; i <= activeChunk.end; i++) {
      items.push({
        number: i,
        title: `Episode ${i}`,
        duration: "24 min",
        releasedAgo: `${(totalEps - i) % 7 + 1} days ago`,
        thumbnail: selectedInstallment.poster || "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=225&fit=crop&q=80",
        isWatched: i < activeChunk.end,
        isCurrent: i === activeChunk.end
      });
    }

    if (!searchQuery.trim()) return items;
    return items.filter(ep => 
      ep.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeChunk, searchQuery, selectedInstallment, totalEps]);

  const handleEpisodeClick = (epNum: number) => {
    const franchiseSlug = selectedInstallment.donghuaApiSlug || "battle-through-the-heavens";
    navigate(`/watch/${franchiseSlug}/${epNum}`);
  };

  return (
    <div className="space-y-4 text-left">
      {/* HEADER & RANGE CHUNK SELECTOR */}
      <div className="space-y-3 bg-[#0c0d12]/90 p-4 rounded-3xl border border-white/5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              {selectedInstallment.title} ({totalEps} Episodes)
            </h3>
          </div>

          {/* Episode Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search episode number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-black/50 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* EPISODE RANGE CHUNK BUTTONS */}
        {chunks.length > 1 && (
          <div role="tablist" aria-label="Episode range selector" className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 [scrollbar-width:none]">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
              Episodes:
            </span>
            {chunks.map((chunk, idx) => (
              <button
                key={chunk.label}
                role="tab"
                aria-selected={activeChunkIndex === idx}
                aria-label={`Show episodes ${chunk.label}`}
                onClick={() => setActiveChunkIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  activeChunkIndex === idx
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-[#12141f] border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
                }`}
              >
                {chunk.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INDEPENDENTLY SCROLLABLE EPISODE LIST CONTAINER */}
      <div data-lenis-prevent className="max-h-[650px] overflow-y-auto overscroll-contain pr-1 space-y-2.5 [scrollbar-width:thin]">
        {episodesList.map((ep) => (
          <div
            key={ep.number}
            role="button"
            tabIndex={0}
            aria-label={`Play ${ep.title}`}
            onClick={() => handleEpisodeClick(ep.number)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleEpisodeClick(ep.number);
              }
            }}
            className="group cursor-pointer bg-[#0d0f17]/90 border border-white/5 rounded-2xl p-3 hover:border-primary/40 hover:bg-[#12141f] transition-all flex items-center justify-between gap-3 text-left overflow-hidden shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {/* Thumbnail + Metadata */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="relative aspect-video w-24 sm:w-28 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/60">
                <img
                  src={ep.thumbnail}
                  alt={ep.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-primary/25 flex items-center justify-center transition-colors">
                  <Play className="h-5 w-5 text-white fill-white opacity-90 group-hover:scale-110 transition-transform" />
                </div>
                {ep.isWatched && (
                  <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-green-500 text-black shadow-md">
                    <CheckCircle2 className="h-3 w-3 fill-current stroke-[2.5]" />
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-foreground group-hover:text-primary truncate transition-colors">
                    {ep.title}
                  </h4>
                  {ep.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider border border-primary/30 shrink-0">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                  <span>{ep.duration}</span>
                  <span>•</span>
                  <span>Released {ep.releasedAgo}</span>
                </div>
              </div>
            </div>

            {/* Right Play Trigger */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleEpisodeClick(ep.number);
              }}
              className="h-9 px-4 rounded-xl bg-white/5 hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Continue</span>
            </Button>
          </div>
        ))}

        {episodesList.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium bg-[#0d0f17]/90 rounded-2xl border border-white/5">
            No episodes match your search query.
          </div>
        )}
      </div>
    </div>
  );
};
