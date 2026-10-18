import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { Skeleton as UiSkeleton } from "@/components/ui/skeleton";

export const PageSkeleton = () => {
  return (
    <BoneyardSkeleton name="page-skeleton" loading={true} darkColor="rgba(255, 255, 255, 0.05)" animate="pulse">
      <div className="w-full bg-[#05060a] text-white min-h-[calc(100vh-80px)] px-4 sm:px-8 md:px-16 pt-4 pb-12 space-y-12">
        {/* Hero Section Skeleton (Matching HeroDesktop) */}
        <div className="relative w-full max-w-[1700px] mx-auto min-h-[480px] md:min-h-[560px] rounded-3xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/5 p-6 md:p-12 flex flex-col justify-between overflow-hidden">
          {/* Soft Purple Glow in background */}
          <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-[#A855F7]/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Top Left & Hero Content Block */}
          <div className="relative z-10 max-w-[650px] space-y-4">
            {/* 1. Trending Badge */}
            <UiSkeleton className="h-6 w-32 rounded-full bg-[#A855F7]/20 border border-[#A855F7]/30" />

            {/* 2. Poster Image Box & Meta Row */}
            <div className="flex items-center gap-4 pt-1">
              <UiSkeleton className="w-[110px] sm:w-[130px] aspect-[1/1] sm:aspect-[3/4] rounded-2xl bg-white/10 border border-white/10 shrink-0 shadow-lg" />
              
              <div className="space-y-3 flex-1">
                {/* Rating line */}
                <UiSkeleton className="h-5 w-44 bg-white/15 rounded-md" />
                {/* Genres row */}
                <div className="flex flex-wrap gap-2">
                  <UiSkeleton className="h-6 w-16 bg-white/10 rounded-full" />
                  <UiSkeleton className="h-6 w-20 bg-white/10 rounded-full" />
                  <UiSkeleton className="h-6 w-18 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>

            {/* 3. Description Lines */}
            <div className="space-y-2 pt-1 max-w-xl">
              <UiSkeleton className="h-4 w-full bg-white/10 rounded-md" />
              <UiSkeleton className="h-4 w-4/5 bg-white/10 rounded-md" />
            </div>

            {/* 4. Action Buttons (Watch Now & Add to Library) */}
            <div className="flex items-center gap-4 pt-3">
              <UiSkeleton className="h-[54px] w-40 rounded-full bg-[#A855F7]/30 border border-[#A855F7]/40 shadow-lg" />
              <UiSkeleton className="h-[54px] w-44 rounded-full bg-white/10 border border-white/10" />
            </div>
          </div>

          {/* Bottom Right Carousel Thumbnails Row */}
          <div className="relative z-10 hidden sm:flex items-center justify-end gap-3 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-40 sm:w-44 h-16 rounded-2xl bg-black/40 border border-white/10 p-2 flex items-center gap-3 backdrop-blur-md">
                <UiSkeleton className="h-12 w-12 rounded-xl bg-white/10 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <UiSkeleton className="h-3 w-10 bg-[#A855F7]/30 rounded" />
                  <UiSkeleton className="h-3 w-full bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Catalog Section (Today's Releases) */}
        <div className="w-full max-w-[1700px] mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <UiSkeleton className="h-7 w-48 bg-white/15 rounded-lg" />
            <UiSkeleton className="h-4 w-24 bg-white/10 rounded-md" />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 space-y-3 overflow-hidden">
                {/* Poster */}
                <div className="relative">
                  <UiSkeleton className="aspect-[2/3] w-full bg-white/10 rounded-xl" />
                  <UiSkeleton className="absolute top-2 left-2 h-4 w-9 bg-emerald-500/20 rounded-md" />
                </div>
                {/* Meta */}
                <UiSkeleton className="h-4 w-full bg-white/15 rounded" />
                <UiSkeleton className="h-3 w-2/3 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BoneyardSkeleton>
  );
};
