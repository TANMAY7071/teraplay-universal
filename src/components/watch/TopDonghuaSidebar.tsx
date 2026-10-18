import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Star, Eye } from "lucide-react";
import { getTopDonghuaRankings, formatMetricCount, DonghuaMetric } from "@/services/donghuaMetricsService";
import { useAnimeCatalogQuery } from "@/hooks/useAnimeQueries";
import { cn } from "@/lib/utils";

interface TopDonghuaSidebarProps {
  catalog?: any[];
  currentDonghuaSlug?: string;
}

export const TopDonghuaSidebar: React.FC<TopDonghuaSidebarProps> = ({
  catalog: propCatalog,
  currentDonghuaSlug
}) => {
  const navigate = useNavigate();
  const [timeWindow, setTimeWindow] = useState<"weekly" | "monthly" | "all-time">("weekly");

  // Dynamic live query from Supabase / configured provider
  const { data: dbCatalog = [], isLoading } = useAnimeCatalogQuery();

  const activeCatalog = useMemo(() => {
    if (dbCatalog && dbCatalog.length > 0) return dbCatalog;
    if (propCatalog && propCatalog.length > 0) return propCatalog;
    return [];
  }, [dbCatalog, propCatalog]);

  const rankings = useMemo(() => {
    return getTopDonghuaRankings(activeCatalog, timeWindow);
  }, [activeCatalog, timeWindow]);

  const handleSelectDonghua = (slug: string) => {
    navigate(`/watch/${slug}/episode-1`);
  };

  return (
    <div className="bg-[#0c0d12]/40 backdrop-blur-md border border-white/[0.06] rounded-3xl p-5 space-y-4 hover:border-primary/20 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] text-left">
      {/* HEADER - Matches CharactersWidget & CommentSection */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#a855f7] animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-100">
            Top Donghua
          </h3>
        </div>
        <button
          onClick={() => navigate("/explore?browse=trending")}
          className="text-[9px] font-black uppercase tracking-widest text-[#a855f7] hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
        >
          <span>View All</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>

      {/* TIME WINDOW PILL TABS - Matches SeasonNavigator & Watch Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-full">
        {(["weekly", "monthly", "all-time"] as const).map((tab) => {
          const isActive = timeWindow === tab;
          const label = tab === "weekly" ? "Weekly" : tab === "monthly" ? "Monthly" : "All Time";
          return (
            <button
              key={tab}
              onClick={() => setTimeWindow(tab)}
              className={cn(
                "flex-1 py-1 px-2 text-[10px] font-black uppercase tracking-wider rounded-full transition-all duration-200 text-center cursor-pointer",
                isActive
                  ? "bg-primary/20 text-[#c084fc] border border-primary/30 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* RANKED LIST (Top 10) - Matches Episode List & Characters Widgets */}
      <div className="space-y-2">
        {isLoading && rankings.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-3 p-2 rounded-2xl bg-white/[0.02] border border-transparent animate-pulse">
                <div className="w-6 h-4 bg-white/5 rounded" />
                <div className="w-10 h-14 bg-white/5 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-white/5 rounded" />
                  <div className="h-2 w-1/2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          rankings.map((item: DonghuaMetric, idx: number) => {
            const rank = idx + 1;
            const isCurrent = currentDonghuaSlug && item.slug === currentDonghuaSlug;
            const displayMetric =
              timeWindow === "weekly"
                ? item.weeklyViews
                : timeWindow === "monthly"
                ? item.monthlyViews
                : item.views;

            return (
              <div
                key={item.id}
                onClick={() => handleSelectDonghua(item.slug)}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-2xl border transition-all duration-300 cursor-pointer relative group active:scale-98",
                  isCurrent
                    ? "bg-white/[0.06] border-primary/40 shadow-[0_0_20px_rgba(168,85,247,0.12)] ring-1 ring-primary/20"
                    : "border-transparent bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]"
                )}
              >
                {/* RANK NUMBER */}
                <div
                  className={cn(
                    "w-6 text-center font-mono font-black text-xs shrink-0",
                    rank === 1
                      ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                      : rank === 2
                      ? "text-zinc-300"
                      : rank === 3
                      ? "text-amber-600"
                      : "text-zinc-600"
                  )}
                >
                  {rank < 10 ? `0${rank}` : rank}
                </div>

                {/* POSTER THUMBNAIL */}
                <div className="relative w-10 h-14 rounded-xl overflow-hidden border border-white/[0.06] shrink-0 bg-black/60 shadow-sm">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* METADATA */}
                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <h4 className={cn(
                      "text-xs font-black truncate leading-snug transition-colors",
                      isCurrent ? "text-primary" : "text-white group-hover:text-primary"
                    )}>
                      {item.title}
                    </h4>
                    {isCurrent && (
                      <span className="text-primary font-black uppercase tracking-wider text-[8px] bg-primary/15 border border-primary/30 px-1.5 py-0.2 rounded-full shrink-0">
                        Watching
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-semibold leading-none">
                    {/* RATING */}
                    <span className="flex items-center gap-0.5 text-yellow-400 font-bold">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{item.rating.toFixed(1)}</span>
                    </span>

                    <span className="text-zinc-600">•</span>

                    {/* VIEWS */}
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Eye className="w-3 h-3 text-zinc-500" />
                      <span>{formatMetricCount(displayMetric)}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
