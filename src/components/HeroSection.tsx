import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useWatchlistQuery,
  useContinueWatchingQuery,
  useAnimeCatalogQuery,
  useTodayReleasesQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from "@/hooks/useAnimeQueries";
import { slidesConfig, HeroSlideConfig } from "./Hero/hero-config";
import HeroDesktop from "./Hero/HeroDesktop";
import HeroMobile from "./Hero/HeroMobile";

import { useHomeHeroReleaseStates } from "@/hooks/useReleaseState";
import { getCleanBannerUrl, getCleanCoverUrl } from "@/data/anilistDonghuaMap";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeroSectionProps {
  slides?: HeroSlideConfig[];
}

const HeroSection: React.FC<HeroSectionProps> = ({ slides = slidesConfig }) => {
  const navigate = useNavigate();
  const { data: watchlist = [] } = useWatchlistQuery();
  const { data: continueWatching = {} } = useContinueWatchingQuery();
  const { data: dbCatalog = [] } = useAnimeCatalogQuery();
  const { data: dbTodayReleases = [] } = useTodayReleasesQuery();
  const addToWatchlist = useAddToWatchlistMutation();
  const removeFromWatchlist = useRemoveFromWatchlistMutation();

  const heroSlugs = useMemo(() => slides.map(s => s.slug || String(s.id)), [slides]);
  const { data: releaseStates = [] } = useHomeHeroReleaseStates(heroSlugs);

  // Dynamically sync slide metadata from Canonical ReleaseState Resolver
  const enrichedSlides = useMemo(() => {
    const mapped = slides.map((slide) => {
      const matchedCatalog = dbCatalog.find(
        (a) =>
          a.id === slide.id ||
          a.slug === slide.slug ||
          (slide.originalTitle && a.originalTitle === slide.originalTitle)
      );

      const releaseState = releaseStates.find(
        (r) => r.animeSlug === slide.slug || String(r.animeId) === String(slide.id)
      );

      const rating = matchedCatalog?.rating && matchedCatalog.rating > 0 ? matchedCatalog.rating : slide.rating;
      const year = matchedCatalog?.year && matchedCatalog.year > 0 ? matchedCatalog.year : slide.year;
      const genres = matchedCatalog?.genres && matchedCatalog.genres.length > 0 ? matchedCatalog.genres : slide.genres;
      const description = matchedCatalog?.synopsis || slide.description;

      const desktopImage = releaseState?.artwork?.resolvedBanner || slide.image;
      const mobileImage = releaseState?.artwork?.resolvedPoster || slide.mobileImage || slide.image;
      const badge = releaseState?.heroBadgeText || slide.badge;
      const episodes = releaseState?.latestAiredEpisode?.relativeNumber || slide.episodes;

      return {
        ...slide,
        rating,
        year,
        episodes,
        genres,
        description,
        image: desktopImage,
        mobileImage,
        badge,
        releaseState
      };
    });

    return mapped;
  }, [slides, dbCatalog, releaseStates]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem("donghua-last-hero-index");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < enrichedSlides.length) {
        return parsed;
      }
    }
    return 0;
  });
  const [isHovered, setIsHovered] = useState(false);

  // Autoplay cycle driven by interval, paused when user hovers
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % enrichedSlides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHovered, enrichedSlides.length]);

  useEffect(() => {
    localStorage.setItem("donghua-last-hero-index", currentIndex.toString());
  }, [currentIndex]);

  const toggleWatchlist = (id: number) => {
    if (watchlist.includes(id)) {
      removeFromWatchlist.mutate(id);
    } else {
      addToWatchlist.mutate(id);
    }
  };

  // Smart Contextual Button Label based on user watch progress
  const getPrimaryButtonLabel = (id: number) => {
    const progress = continueWatching[id];
    if (progress) {
      if (progress.completed) return "Watch Again";
      return `Continue Ep ${progress.episode}`;
    }
    return "Watch Now";
  };

  const handleNavigateToWatch = (slug: string, id: number) => {
    const progress = continueWatching[id];
    const episodeNum = progress ? progress.episode : 1;
    navigate(`/watch/${slug}/episode-${episodeNum}`);
  };

  const handleNavigateToDetails = (slug: string) => {
    navigate(`/anime/${slug}`);
  };

  const isMobile = useIsMobile();

  return (
    <>
      {/* Desktop Hero Slider (Visible on screens md and above) */}
      {!isMobile && (
        <HeroDesktop
          slides={enrichedSlides}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          isHovered={isHovered}
          setIsHovered={setIsHovered}
          watchlist={watchlist}
          continueWatching={continueWatching}
          toggleWatchlist={toggleWatchlist}
          getPrimaryButtonLabel={getPrimaryButtonLabel}
          onNavigateToWatch={handleNavigateToWatch}
          onNavigateToDetails={handleNavigateToDetails}
        />
      )}

      {/* Dedicated Mobile Hero System (Visible on screens below md) */}
      {isMobile && (
        <HeroMobile
          slides={enrichedSlides}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          watchlist={watchlist}
          toggleWatchlist={toggleWatchlist}
          continueWatching={continueWatching}
          getPrimaryButtonLabel={getPrimaryButtonLabel}
          onNavigateToWatch={handleNavigateToWatch}
          onNavigateToDetails={handleNavigateToDetails}
        />
      )}
    </>
  );
};

export default HeroSection;
