import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { EpisodeProgress } from "@/types/anime";
import { cn } from "@/lib/utils";

const EPISODE_RANGE_SIZE = 50;

interface EpisodeNavigatorProps {
  animeSlug: string;
  totalEpisodes: number;
  currentEpisode: number;
  recentlyWatchedEpisode?: number;
  episodeProgress?: Record<number, EpisodeProgress>;
  onSelectEpisode: (episode: number) => void;
  className?: string;
}

const buildEpisodeRanges = (totalEpisodes: number) => {
  return Array.from({ length: Math.ceil(totalEpisodes / EPISODE_RANGE_SIZE) }, (_, index) => {
    const start = index * EPISODE_RANGE_SIZE + 1;
    const end = Math.min(start + EPISODE_RANGE_SIZE - 1, totalEpisodes);
    return { start, end, label: `${start}-${end}` };
  });
};

const getProgressPercent = (progress: EpisodeProgress | undefined) => {
  if (!progress?.totalTime) return 0;
  return Math.min(100, Math.round((progress.time / progress.totalTime) * 100));
};

const EpisodeGrid = ({
  episodes,
  currentEpisode,
  recentlyWatchedEpisode,
  episodeProgress,
  onSelectEpisode,
}: {
  episodes: number[];
  currentEpisode: number;
  recentlyWatchedEpisode?: number;
  episodeProgress?: Record<number, EpisodeProgress>;
  onSelectEpisode: (episode: number) => void;
}) => (
  <div className="grid grid-cols-5 gap-2 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-10 2xl:grid-cols-12">
    {episodes.map((episode) => {
      const progress = episodeProgress?.[episode];
      const progressPercent = getProgressPercent(progress);
      const isCurrent = currentEpisode === episode;
      const isRecent = recentlyWatchedEpisode === episode && !isCurrent;
      const isCompleted = Boolean(progress?.completed || progressPercent >= 90);

      return (
        <Button
          key={episode}
          variant={isCurrent ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectEpisode(episode)}
          className={cn(
            "relative aspect-square h-auto min-h-10 overflow-hidden rounded-xl border-white/10 bg-white/5 p-0 text-xs font-semibold sm:text-sm",
            isRecent && "border-donghua-orange text-donghua-orange",
            isCompleted && !isCurrent && "border-donghua-cyan/70 text-donghua-cyan",
          )}
          aria-label={`Episode ${episode}${isCurrent ? ", current episode" : ""}`}
        >
          <span className="relative z-10">{episode}</span>
          {isCompleted && (
            <CheckCircle2 className="absolute right-1 top-1 h-3 w-3 text-donghua-cyan" />
          )}
          {progressPercent > 0 && !isCompleted && (
            <span
              className="absolute inset-x-0 bottom-0 h-1 bg-donghua-orange"
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </Button>
      );
    })}
  </div>
);

const EpisodeNavigator = ({
  animeSlug,
  totalEpisodes,
  currentEpisode,
  recentlyWatchedEpisode,
  episodeProgress,
  onSelectEpisode,
  className,
}: EpisodeNavigatorProps) => {
  const ranges = useMemo(() => buildEpisodeRanges(totalEpisodes), [totalEpisodes]);
  const currentRangeIndex = Math.max(0, Math.ceil(currentEpisode / EPISODE_RANGE_SIZE) - 1);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(currentRangeIndex);
  const selectedRange = ranges[selectedRangeIndex] ?? ranges[currentRangeIndex] ?? { start: 1, end: totalEpisodes, label: `1-${totalEpisodes}` };
  const visibleEpisodes = useMemo(() => {
    return Array.from(
      { length: selectedRange.end - selectedRange.start + 1 },
      (_, index) => selectedRange.start + index,
    );
  }, [selectedRange.end, selectedRange.start]);
  const currentProgress = getProgressPercent(episodeProgress?.[currentEpisode]);
  const canGoPrevious = currentEpisode > 1;
  const canGoNext = currentEpisode < totalEpisodes;

  useEffect(() => {
    setSelectedRangeIndex(currentRangeIndex);
  }, [currentRangeIndex]);

  const handleSelectEpisode = (episode: number) => {
    onSelectEpisode(episode);
    setSelectedRangeIndex(Math.max(0, Math.ceil(episode / EPISODE_RANGE_SIZE) - 1));
  };

  const renderRangeControls = () => (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {ranges.map((range, index) => (
        <Button
          key={range.label}
          variant={selectedRangeIndex === index ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedRangeIndex(index)}
          className="shrink-0 rounded-full border-white/10"
        >
          {range.label}
        </Button>
      ))}
    </div>
  );

  const renderEpisodeGrid = () => (
    <EpisodeGrid
      episodes={visibleEpisodes}
      currentEpisode={currentEpisode}
      recentlyWatchedEpisode={recentlyWatchedEpisode}
      episodeProgress={episodeProgress}
      onSelectEpisode={handleSelectEpisode}
    />
  );

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">Episodes</h2>
          <p className="text-sm text-muted-foreground">
            Episode {currentEpisode} of {totalEpisodes}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectEpisode(currentEpisode - 1)}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectEpisode(currentEpisode + 1)}
            disabled={!canGoNext}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="md:hidden">
                <ListVideo className="mr-2 h-4 w-4" />
                Episodes
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{animeSlug.split("-").join(" ")}</SheetTitle>
                <SheetDescription>
                  Select an episode range, then jump straight to an episode.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                {renderRangeControls()}
                {renderEpisodeGrid()}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current episode progress</span>
          <span className="font-medium text-foreground">{currentProgress}%</span>
        </div>
        <Progress value={currentProgress} className="h-2" />
      </div>

      <div className="hidden space-y-4 md:block">
        {renderRangeControls()}
        {renderEpisodeGrid()}
      </div>
    </section>
  );
};

export default EpisodeNavigator;
