import { useMemo, useState, useEffect } from "react";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import MediaCard from "@/components/MediaCard";
import homepageDragonBg from "@/assets/homepage-dragon-bg.webp";
import { animeCatalog } from "@/data/anime";
import { useContinueWatchingQuery, useCompletedEpisodesCountQuery, useAnimeCatalogQuery, useTodayReleasesQuery, useDeleteProgressMutation } from "@/hooks/useAnimeQueries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Sword, CalendarDays, Trophy, ArrowRight, Compass, Play } from "lucide-react";
import type { Anime } from "@/types/anime";
import { isChineseDonghua } from "@/services/donghuaFilter";
import { useAuth } from "@/contexts/AuthContext";
import { HeroCMSPanel } from "@/components/admin/HeroCMSPanel";
import { slidesConfig, HeroSlideConfig } from "@/components/Hero/hero-config";
import { getTopDonghuaRankings } from "@/services/donghuaMetricsService";
import { cn } from "@/lib/utils";
import HorizontalScrollRow from "@/components/ui/HorizontalScrollRow";
import SectionHeading from "@/components/ui/SectionHeading";



const Home = () => {
  const navigate = useNavigate();
  const { data: dbCatalog } = useAnimeCatalogQuery();
  const { data: dbTodayReleases = [] } = useTodayReleasesQuery();
  const { data: continueWatching = {} } = useContinueWatchingQuery();
  const { data: completedCount = 0 } = useCompletedEpisodesCountQuery();
  const deleteProgress = useDeleteProgressMutation();
  const { profile } = useAuth();

  const handleRemoveContinueWatching = (e: React.MouseEvent, animeId: number | string) => {
    e.stopPropagation();
    deleteProgress.mutate(Number(animeId));
  };

  const [heroSlides, setHeroSlides] = useState<HeroSlideConfig[]>(() => {
    const saved = localStorage.getItem("donghua-custom-hero-slides");
    return saved ? JSON.parse(saved) : slidesConfig;
  });
  const [devModeActive, setDevModeActive] = useState(false);

  const handleSaveHeroSlides = (updatedSlides: HeroSlideConfig[]) => {
    setHeroSlides(updatedSlides);
    localStorage.setItem("donghua-custom-hero-slides", JSON.stringify(updatedSlides));
  };

  const catalog = useMemo(() => {
    return dbCatalog && dbCatalog.length > 0 ? dbCatalog : animeCatalog;
  }, [dbCatalog]);

  // Reactive breakpoint detection for adaptive row order
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. Get continue watching progress
  const continueWatchingItems = useMemo(() => {
    const rawList = Object.values(continueWatching);
    console.log("[Home Debug] Continue Watching Raw Count:", rawList.length);

    const list = rawList
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((progress) => {
        const anime = catalog.find((a) => a.id === progress.animeId || String(a.id) === String(progress.animeId) || a.slug === (progress.animeId as any) || (progress.animeId === ("btth-universe" as any) && a.slug === "battle-through-the-heavens"));
        if (!anime) return null;
        const canonical = animeCatalog.find(ca => ca.id === anime.id || ca.slug === anime.slug);
        const cleanAnime = canonical ? { ...anime, title: canonical.title } : anime;
        return {
          anime: cleanAnime,
          episode: progress.episode,
          episodeImage: progress.episodeImage,
          progress: Math.min(100, Math.max(5, (progress.time / progress.totalTime) * 100)),
          remainingTime: `${Math.max(1, Math.round((progress.totalTime - progress.time) / 60))}m remaining`
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        const valid = isChineseDonghua(item.anime);
        console.log(`[Home Debug] Continue Watching - Title: "${item.anime.title}", countryOfOrigin: "${item.anime.countryOfOrigin || 'CN'}", isDonghua: ${valid}`);
        return valid;
      });

    console.log("[Home Debug] Continue Watching Filtered Count:", list.length);

    return list;
  }, [continueWatching, catalog]);

  // Get the most recent continue watching item for the Instant Resume widget


  // 2. Personalized recommendations flag (based on watched shows genres)
  const watchedCultivationCount = useMemo(() => {
    return continueWatchingItems.filter(item => 
      item.anime.genres.includes("Cultivation") || 
      item.anime.genres.includes("Martial Arts")
    ).length;
  }, [continueWatchingItems]);

  const recommendedHeader = watchedCultivationCount >= 1 
    ? "Recommended for Cultivators"
    : "Because you watched Battle Through The Heavens";

  // 3. Smart Released Today (mapping from actual DB schedule & episodes)
  const releasedTodayItems = useMemo(() => {
    if (dbTodayReleases && dbTodayReleases.length > 0) {
      return dbTodayReleases.slice(0, 8).map((item) => ({
        anime: item.anime,
        episode: item.episodeNumber,
        airTime: item.airTime,
        releaseStatus: item.releaseStatus,
      }));
    }

    const times = ["10:00 AM", "12:30 PM", "02:00 PM", "04:30 PM", "06:00 PM", "08:30 PM"];
    return catalog
      .filter(item => item.isNew || item.status === "Ongoing")
      .slice(0, 6)
      .map((item, idx) => ({
        anime: item,
        episode: item.episodes,
        airTime: times[idx % times.length],
        releaseStatus: 'released' as const,
      }));
  }, [dbTodayReleases, catalog]);

  // 4. Trending This Week - Synced with Explore and Watch TopDonghuaSidebar
  const trendingItems = useMemo(() => {
    const rankings = getTopDonghuaRankings(catalog, "weekly");
    return rankings
      .map(r => catalog.find(c => c.id === r.id || c.slug === r.slug))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 10);
  }, [catalog]);

  // 5. New Episodes / Recently Added
  const newEpisodesItems = useMemo(() => {
    return catalog
      .slice(0, 8)
      .map((item) => ({
        anime: item,
        addedDate: item.year && item.year >= new Date().getFullYear() ? "Added Recently" : `Season ${item.year || 2024}`
      }));
  }, [catalog]);

  // 6. Recommendation catalog list (always fills a full rail so the row never looks empty)
  const recommendationItems = useMemo(() => {
    const cultivation = catalog.filter(item => item.slug !== "battle-through-the-heavens" && item.genres.includes("Cultivation"));
    if (cultivation.length >= 6) return cultivation.slice(0, 6);

    const seen = new Set(cultivation.map(item => item.id));
    const filler = [...catalog]
      .filter(item => !seen.has(item.id) && item.slug !== "battle-through-the-heavens")
      .sort((a, b) => b.rating - a.rating);

    return [...cultivation, ...filler].slice(0, 6);
  }, [catalog]);

  // 7. Popular Cultivation (Desktop only)
  const popularCultivation = useMemo(() => {
    const cultivation = catalog.filter(item => item.genres.includes("Cultivation"));
    if (cultivation.length >= 8) return cultivation.slice(0, 8);

    const seen = new Set(cultivation.map(item => item.id));
    const filler = [...catalog]
      .filter(item => !seen.has(item.id))
      .sort((a, b) => b.rating - a.rating);

    return [...cultivation, ...filler].slice(0, 8);
  }, [catalog]);

  // 8. Top Rated (Premium Portrait Indexing)
  const topRatedItems = useMemo(() => {
    return [...catalog]
      .filter(item => isChineseDonghua(item))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);
  }, [catalog]);

  // Realm Tracker details for tablet sidebar widget
  const totalCompletedEpisodes = completedCount;

  const cultivationInfo = useMemo(() => {
    const count = totalCompletedEpisodes;
    if (count === 0) {
      return { realm: "Qi Condensation I", progress: 20, min: 0, next: 5 };
    } else if (count <= 5) {
      return { realm: "Qi Condensation V", progress: 60, min: 1, next: 15 };
    } else {
      return { realm: "Foundation Stage I", progress: 40, min: 16, next: 60 };
    }
  }, [totalCompletedEpisodes]);

  // Layout render configurations for Mobile and Desktop
  const renderContinueWatching = () => (
    continueWatchingItems.length > 0 && (
      <div className="animate-fade-in">
        <SectionHeading eyebrow="Pick up where you left off" title="Continue Watching" />
        <HorizontalScrollRow>
          {continueWatchingItems.map((item, idx) => (
            <div key={idx} className="snap-start">
              <MediaCard
                anime={item.anime}
                variant="landscape-progress"
                episode={item.episode}
                progress={item.progress}
                remainingTime={item.remainingTime}
                image={item.episodeImage || item.anime.banner || item.anime.image}
                onDelete={(e) => handleRemoveContinueWatching(e, item.anime.id)}
              />
            </div>
          ))}
        </HorizontalScrollRow>
      </div>
    )
  );

  const renderReleasedToday = () => (
    <div>
      <SectionHeading
        eyebrow="Airing today"
        title="Today's Releases"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/calendar")} className="text-primary hover:text-primary/80 font-bold text-xs p-0 h-auto">
            Calendar <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        }
      />
      <HorizontalScrollRow>
        {releasedTodayItems.map((item, idx) => (
          <div key={idx} className="snap-start">
            <MediaCard
              anime={item.anime}
              variant="landscape-compact"
              episode={item.episode}
              airTime={item.airTime}
              releaseStatus={item.releaseStatus}
            />
          </div>
        ))}
      </HorizontalScrollRow>
    </div>
  );

  const renderTrending = () => (
    <div>
      <SectionHeading
        eyebrow="Weekly chart"
        title="Trending This Week"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")} className="text-primary hover:text-primary/80 font-bold text-xs p-0 h-auto">
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        }
      />
      <HorizontalScrollRow>
        {trendingItems.map((item, idx) => (
          <div key={idx} className="snap-start">
            <MediaCard
              anime={item}
              variant="portrait"
            />
          </div>
        ))}
      </HorizontalScrollRow>
    </div>
  );

  const renderTopRated = () => (
    <div>
      <SectionHeading
        eyebrow="Hall of Fame"
        title="Top 10 Xianxia Masterpieces"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")} className="text-primary hover:text-primary/80 font-bold text-xs p-0 h-auto">
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        }
      />
      <HorizontalScrollRow>
        {topRatedItems.map((item, idx) => (
          <div key={idx} className="snap-start">
            <MediaCard
              anime={item}
              variant="portrait-premium"
              rankIndex={idx + 1}
            />
          </div>
        ))}
      </HorizontalScrollRow>
    </div>
  );

  const renderNewEpisodes = () => (
    <div>
      <SectionHeading
        eyebrow="Fresh episodes"
        title="Recently Added"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")} className="text-primary hover:text-primary/80 font-bold text-xs p-0 h-auto">
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        }
      />
      <HorizontalScrollRow>
        {newEpisodesItems.map((item, idx) => (
          <div key={idx} className="snap-start">
            <MediaCard
              anime={item.anime}
              variant="landscape-thumbnail"
              addedDate={item.addedDate}
            />
          </div>
        ))}
      </HorizontalScrollRow>
    </div>
  );

  const renderRecommendations = () => (
    <div>
      <SectionHeading
        eyebrow="Curated for you"
        title={recommendedHeader}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")} className="text-primary hover:text-primary/80 font-bold text-xs p-0 h-auto">
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        }
      />
      <HorizontalScrollRow>
        {recommendationItems.map((item, idx) => (
          <div key={idx} className="snap-start">
            <MediaCard
              anime={item}
              variant="portrait"
            />
          </div>
        ))}
      </HorizontalScrollRow>
    </div>
  );

  const renderPopularCultivation = () => (
    <div>
      <SectionHeading
        eyebrow="Most watched"
        title="Popular Cultivation"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/genre/cultivation")} className="text-primary hover:text-primary/80 font-bold text-xs p-0 h-auto">
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        }
      />
      <HorizontalScrollRow>
        {popularCultivation.map((item, idx) => (
          <div key={idx} className="snap-start">
            <MediaCard
              anime={item}
              variant="portrait"
            />
          </div>
        ))}
      </HorizontalScrollRow>
    </div>
  );

  const renderExploreGenres = () => (
    <div>
      <SectionHeading eyebrow="Browse by mood" title="Explore Genres" />
      <div className="flex flex-wrap gap-2">
        {["Action", "Adventure", "Cultivation", "Martial Arts", "Fantasy", "Romance", "Mystery", "Historical"].map((genre) => (
          <Button
            key={genre}
            variant="outline"
            className="rounded-full border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] sm:text-xs font-bold px-3 py-1.5 h-auto"
            onClick={() => navigate(`/genre/${genre.toLowerCase()}`)}
          >
            {genre}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-16 relative overflow-hidden">
      {/* Fixed backdrop (handles cover sizing relative to viewport, preventing tall-page zoom-in bugs) */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 animate-fade-in pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(6, 7, 12, 0.35), rgba(5, 6, 10, 0.82)), url(${homepageDragonBg})`,
        }}
      />
      {/* Bottom transition blend overlay (sits at bottom of scrollable page to fade background into footer) */}
      <div className="absolute bottom-0 left-0 right-0 h-[150px] md:h-[200px] bg-gradient-to-t from-background via-background/70 to-transparent z-0 pointer-events-none" />

      <div className="relative z-10">
        <SEO />
        {/* Hero Cinematic Section */}
        <div className="relative z-20">
          <HeroSection slides={heroSlides} />
        </div>

      {/* Relative wrapper containing the pattern blend overlay and the feed container */}
      <div className="relative">
        {/* Pattern Blend Overlay (fades from solid background color to transparent to blend the dragon-scales pattern) */}
        <div className="absolute -top-12 md:-top-16 left-0 right-0 h-[150px] md:h-[200px] bg-gradient-to-b from-background via-background/70 to-transparent z-10 pointer-events-none" />

        {/* Responsive Feed Container (Full width clean feed) */}
        <div className="mx-auto w-full max-w-[1440px] mt-1 md:mt-8 relative z-20 pt-1 md:pt-4 px-4 md:px-8 lg:px-12">
          
          {/* Main Content Feed Column */}
          <div className="w-full space-y-8 md:space-y-12 lg:space-y-14">
            {renderReleasedToday()}
            {renderContinueWatching()}
            {renderTrending()}
            {renderTopRated()}
            {renderRecommendations()}
            {renderNewEpisodes()}
            {renderPopularCultivation()}
            {renderExploreGenres()}
          </div>

        </div>
      </div>
      {/* FLOATING DEV MODE TRIGGER (ADMIN ONLY) */}
      {profile?.subscription_tier === 'admin' && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in zoom-in duration-200">
          <button
            onClick={() => setDevModeActive(!devModeActive)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl transition-all cursor-pointer border backdrop-blur-md",
              devModeActive 
                ? "bg-primary border-primary text-white" 
                : "bg-[#0c0d12]/90 border-white/15 text-zinc-300 hover:text-white hover:border-white/30"
            )}
          >
            <span>🛠 Edit Hero Slider</span>
            <span className={cn("w-1.5 h-1.5 rounded-full", devModeActive ? "bg-white animate-pulse" : "bg-zinc-500")} />
          </button>
        </div>
      )}

      {/* HERO CMS PANEL */}
      {devModeActive && (
        <HeroCMSPanel
          slides={heroSlides}
          onSave={handleSaveHeroSlides}
          onClose={() => setDevModeActive(false)}
        />
      )}
    </div>
  </div>
  );
};

export default Home;
