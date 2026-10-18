import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { Skeleton as UiSkeleton } from "@/components/ui/skeleton";

const SkeletonCard = () => {
  return (
    <BoneyardSkeleton name="anime-card" darkColor="rgba(255, 255, 255, 0.05)" animate="pulse">
      <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        {/* Image Skeleton */}
        <UiSkeleton className="aspect-[2/3] w-full bg-white/5" />
        
        {/* Content Skeleton */}
        <div className="p-4 space-y-3">
          <UiSkeleton className="h-4 w-full bg-white/10" />
          <UiSkeleton className="h-3 w-3/4 bg-white/5" />
          
          <div className="flex items-center justify-between pt-1">
            <UiSkeleton className="h-3 w-16 bg-white/5" />
            <UiSkeleton className="h-3 w-12 bg-white/5" />
          </div>
          
          <div className="flex items-center space-x-2 pt-1">
            <UiSkeleton className="h-3 w-3 rounded-full bg-white/10" />
            <UiSkeleton className="h-3 w-20 bg-white/5" />
          </div>
        </div>
      </div>
    </BoneyardSkeleton>
  );
};

const SkeletonGrid = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export { SkeletonCard, SkeletonGrid };