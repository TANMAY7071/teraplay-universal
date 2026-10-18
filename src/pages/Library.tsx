import { useState, useMemo } from "react";
import { ArrowLeft, Clock, History, Heart, FolderHeart, Play, Trash2, CheckCircle, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useSearchParams } from "react-router-dom";
import { animeCatalog } from "@/data/anime";
import { useWatchlistQuery, useContinueWatchingQuery, useAnimeCatalogQuery, useRemoveFromWatchlistMutation, useDeleteProgressMutation } from "@/hooks/useAnimeQueries";
import PageWrapper from "@/components/layout/PageWrapper";
import ResponsiveGrid from "@/components/layout/ResponsiveGrid";
import ContentCard from "@/components/ContentCard";
import MediaCard, { formatSeasonTag } from "@/components/MediaCard";
import { getCleanCoverUrl } from "@/data/anilistDonghuaMap";
import { useFavorites } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import libraryBg from "@/assets/library-bg.webp";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Anime } from "@/types/anime";

const DEFAULT_POSTER_FALLBACK = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=780&auto=format&fit=crop&q=80";

const Library = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "watchlist";

  const { user } = useAuth();
  const isAnonymous = !user || user.is_anonymous;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("alpha");
  
  const { data: dbCatalog = [] } = useAnimeCatalogQuery();
  const { data: watchlist = [] } = useWatchlistQuery();
  const { data: continueWatching = {} } = useContinueWatchingQuery();
  const [favorites] = useFavorites();
  const removeFromWatchlist = useRemoveFromWatchlistMutation();
  const deleteHistory = useDeleteProgressMutation();

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const catalog = useMemo(() => {
    return dbCatalog && dbCatalog.length > 0 ? dbCatalog : animeCatalog;
  }, [dbCatalog]);

  const resolveAnimeFromProgress = (progress: any) => {
    const isRIMovie =
      progress.animeId === "renegade-immortal-movie-battle-of-the-gods" ||
      progress.animeId === "ri-movie-1" ||
      String(progress.animeId).includes("renegade-immortal-movie");

    const idStr = String(progress.animeId);

    let anime = catalog.find(
      (a) =>
        a.id === progress.animeId ||
        String(a.id) === idStr ||
        a.slug === (progress.animeId as any) ||
        a.slug?.toLowerCase() === idStr.toLowerCase() ||
        a.title.toLowerCase() === idStr.toLowerCase() ||
        (isRIMovie && a.slug === "renegade-immortal") ||
        (progress.animeId === ("btth-universe" as any) && a.slug === "battle-through-the-heavens")
    );

    if (!anime) {
      anime = animeCatalog.find(
        (a) =>
          a.id === progress.animeId ||
          String(a.id) === idStr ||
          a.slug === (progress.animeId as any) ||
          a.slug?.toLowerCase() === idStr.toLowerCase() ||
          a.title.toLowerCase() === idStr.toLowerCase()
      );
    }

    if (isRIMovie) {
      const baseImage = anime ? anime.image : (getCleanCoverUrl("renegade-immortal-movie-battle-of-the-gods") || DEFAULT_POSTER_FALLBACK);
      return {
        ...(anime || {}),
        id: "renegade-immortal-movie-battle-of-the-gods",
        title: "Renegade Immortal Movie: Battle of the Gods",
        slug: "renegade-immortal-movie-battle-of-the-gods",
        image: getCleanCoverUrl("renegade-immortal-movie-battle-of-the-gods") || baseImage,
        banner: getCleanCoverUrl("renegade-immortal-movie-battle-of-the-gods") || baseImage,
        episodes: 1,
        genre: "Action",
        genres: ["Action", "Cultivation"],
        rating: 9.2,
        synopsis: "The legend of Wang Lin ascending through divine realms.",
        year: 2024,
        status: "Completed",
        progress: { ...progress, installmentType: "Movie", seasonName: "Movie" },
      } as Anime & { progress: any };
    }

    if (!anime) {
      const cleanTitle = progress.episodeTitle || idStr.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      const coverUrl = getCleanCoverUrl(idStr) || progress.episodeImage || DEFAULT_POSTER_FALLBACK;
      anime = {
        id: typeof progress.animeId === "number" ? progress.animeId : idStr,
        title: cleanTitle,
        japaneseTitle: cleanTitle,
        slug: idStr,
        image: coverUrl,
        banner: coverUrl,
        rating: 8.5,
        episodes: progress.episode || 12,
        status: "Ongoing",
        type: "ONA",
        genre: "Action",
        genres: ["Action", "Cultivation"],
        synopsis: "Watch progress entry.",
        season: progress.seasonName || "S1",
        year: new Date().getFullYear(),
        studios: ["Foch Film"],
        hasSub: true,
        hasDub: false,
        isChinese: true,
        countryOfOrigin: "CN",
      } as Anime;
    }

    const canonical = animeCatalog.find((ca) => ca.id === anime!.id || ca.slug === anime!.slug);
    const cleanAnime = canonical ? { ...anime, title: canonical.title } : anime;
    return { ...cleanAnime, progress };
  };

  // 1. Continue Watching Items
  const continueWatchingItems = useMemo(() => {
    return Object.values(continueWatching)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((progress) => resolveAnimeFromProgress(progress))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [continueWatching, catalog]);

  // 2. Watching Items (Active in-progress shows)
  const watchingItems = useMemo(() => {
    return continueWatchingItems.map((item) => item);
  }, [continueWatchingItems]);

  // 3. Completed Items (Shows user has finished watching)
  const completedItems = useMemo(() => {
    return Object.values(continueWatching)
      .map((progress) => {
        const item = resolveAnimeFromProgress(progress);
        if (!item) return null;
        const percent = (progress.time / progress.totalTime) * 100;
        const totalEps = item.slug === "renegade-immortal-movie-battle-of-the-gods" ? 1 : item.episodes;
        const isCompleted = progress.episode === totalEps && percent >= 90;
        return isCompleted ? item : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [continueWatching, catalog]);

  // 4. Watch Later (User Watchlist)
  const watchLaterItems = useMemo(() => {
    return catalog.filter((item) =>
      watchlist.some((wId) => String(wId) === String(item.id) || String(wId) === item.slug)
    );
  }, [watchlist, catalog]);

  // 5. Favorites (User favorited shows)
  const favoriteItems = useMemo(() => {
    if (!favorites || favorites.length === 0) return [];
    return catalog.filter((item) =>
      favorites.some((fId) => String(fId) === String(item.id) || String(fId) === item.slug)
    );
  }, [favorites, catalog]);

  // 6. History Logs (Sortable watch entries list)
  const historyLogs = useMemo(() => {
    return Object.values(continueWatching)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((progress) => resolveAnimeFromProgress(progress))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [continueWatching, catalog]);

  const processedContinueWatching = useMemo(() => {
    return continueWatchingItems
      .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "alpha") return a.title.localeCompare(b.title);
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "updated") {
          return new Date(b.progress.updatedAt).getTime() - new Date(a.progress.updatedAt).getTime();
        }
        return 0;
      });
  }, [continueWatchingItems, searchQuery, sortBy]);

  const processedWatching = useMemo(() => {
    return watchingItems
      .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "alpha") return a.title.localeCompare(b.title);
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "updated") {
          const tA = (a as any).progress ? new Date((a as any).progress.updatedAt).getTime() : 0;
          const tB = (b as any).progress ? new Date((b as any).progress.updatedAt).getTime() : 0;
          return tB - tA;
        }
        return 0;
      });
  }, [watchingItems, searchQuery, sortBy]);

  const processedCompleted = useMemo(() => {
    return completedItems
      .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "alpha") return a.title.localeCompare(b.title);
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "updated") {
          const tA = (a as any).progress ? new Date((a as any).progress.updatedAt).getTime() : 0;
          const tB = (b as any).progress ? new Date((b as any).progress.updatedAt).getTime() : 0;
          return tB - tA;
        }
        return 0;
      });
  }, [completedItems, searchQuery, sortBy]);

  const processedFavorites = useMemo(() => {
    return favoriteItems
      .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "alpha") return a.title.localeCompare(b.title);
        if (sortBy === "rating") return b.rating - a.rating;
        return 0;
      });
  }, [favoriteItems, searchQuery, sortBy]);

  const processedWatchLater = useMemo(() => {
    return watchLaterItems
      .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "alpha") return a.title.localeCompare(b.title);
        if (sortBy === "rating") return b.rating - a.rating;
        return 0;
      });
  }, [watchLaterItems, searchQuery, sortBy]);

  const processedHistoryLogs = useMemo(() => {
    return historyLogs
      .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "alpha") return a.title.localeCompare(b.title);
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "updated") {
          return new Date(b.progress.updatedAt).getTime() - new Date(a.progress.updatedAt).getTime();
        }
        return 0;
      });
  }, [historyLogs, searchQuery, sortBy]);

  const handleRemoveHistory = (e: React.MouseEvent, animeId: number | string) => {
    e.stopPropagation();
    deleteHistory.mutate(Number(animeId));
  };

  const renderSyncJourneyBanner = () => {
    if (!isAnonymous) return null;

    const watchlistCount = watchlist.length;
    const historyCount = Object.keys(continueWatching).length;

    // Only show banner if the user has accumulated some actual progress
    if (watchlistCount === 0 && historyCount === 0) return null;

    return (
      <div className="animate-reveal-up mb-8">
        <div className="relative rounded-[32px] overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/10 via-background/40 to-background/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col md:flex-row gap-5 items-center justify-between">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          
          <div className="space-y-1.5 text-center md:text-left z-10">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              Sect Synchronization
            </span>
            <h4 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              Sync Your Cultivation Journey
            </h4>
            <p className="text-xs text-muted-foreground max-w-xl font-medium leading-relaxed">
              You already have <span className="text-[#A855F7] font-bold">{watchlistCount} saved titles</span> and <span className="text-[#A855F7] font-bold">{historyCount} watched progress logs</span> stored ephemerally. Sign in to sync them across all your devices forever!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 z-10">
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="rounded-full text-xs font-bold px-6 border-white/10 hover:bg-white/5 h-11"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/register")}
              className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs px-6 h-11 shadow-lg shadow-primary/20"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-12 relative overflow-hidden">
      {/* Fixed backdrop (handles cover sizing relative to viewport, preventing tall-page zoom-in bugs) */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 animate-fade-in pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 10, 0.45), rgba(5, 6, 10, 0.9)), url(${libraryBg})`,
        }}
      />
      {/* Bottom transition blend overlay (sits at bottom of scrollable page to fade background into footer) */}
      <div className="absolute bottom-0 left-0 right-0 h-[150px] md:h-[200px] bg-gradient-to-t from-background via-background/70 to-transparent z-0 pointer-events-none" />

      <div className="relative z-10">
        <PageWrapper className="pb-4">
        {/* Title */}
        <div className="mb-6 text-left">
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-1.5">
            My Library
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            {`Continue where you left off. ${watchlist.length} saved • ${completedItems.length} completed`}
          </p>
        </div>

        {renderSyncJourneyBanner()}

        {/* Tabs Bar */}
        <div className="flex border-b border-white/10 mb-6 gap-3 sm:gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "continue-watching", label: "Continue Watching", shortLabel: "Continue", count: continueWatchingItems.length, icon: Play },
            { id: "watching", label: "Watching", shortLabel: "Watching", count: watchingItems.length, icon: Play },
            { id: "completed", label: "Completed", shortLabel: "Completed", count: completedItems.length, icon: CheckCircle },
            { id: "favorites", label: "Favorites", shortLabel: "Favorites", count: favoriteItems.length, icon: Heart },
            { id: "watchlist", label: "Watch Later", shortLabel: "Watch Later", count: watchLaterItems.length, icon: Heart },
            { id: "history", label: "History", shortLabel: "History", count: historyLogs.length, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "pb-3 text-xs sm:text-sm font-extrabold relative shrink-0 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-1 group",
                  isActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={cn(
                  "text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold transition-colors",
                  isActive ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground group-hover:bg-white/10"
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {currentTab === "continue-watching" && (
          <div className="space-y-4 animate-fade-in">
            {processedContinueWatching.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {processedContinueWatching.map((item) => {
                  const progressPercent = Math.min(
                    100,
                    Math.round((item.progress.time / item.progress.totalTime) * 100)
                  );
                  return (
                    <MediaCard
                      key={item.id}
                      anime={item}
                      variant="landscape-progress"
                      episode={item.progress.episode}
                      progress={progressPercent}
                      image={getCleanCoverUrl(item.slug || item.id) || item.progress?.episodeImage || item.banner || item.image}
                      seasonName={item.progress?.seasonName}
                      installmentType={item.progress?.installmentType}
                      className="w-full"
                      onDelete={(e) => handleRemoveHistory(e, item.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 premium-surface rounded-3xl border border-white/5 p-8">
                <div className="text-5xl mb-4">🎬</div>
                <h2 className="text-xl font-bold text-foreground mb-2">No active watch sessions</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                  Select a series from the explore page and start watching to track your progress here.
                </p>
                <Button onClick={() => navigate("/explore")} className="rounded-full font-bold">
                  Explore Catalog
                </Button>
              </div>
            )}
          </div>
        )}

        {currentTab === "watching" && (
          <div className="space-y-4 animate-fade-in">
            {processedWatching.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {processedWatching.map((item) => (
                  <div key={item.id} className="w-full" onClick={() => navigate(`/anime/${item.slug}`)}>
                    <ContentCard {...item} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 premium-surface rounded-3xl border border-white/5 p-8">
                <div className="text-5xl mb-4">📺</div>
                <h2 className="text-xl font-bold text-foreground mb-2">No shows currently watching</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Shows you have active watching episodes for will display here.
                </p>
              </div>
            )}
          </div>
        )}

        {currentTab === "completed" && (
          <div className="space-y-4 animate-fade-in">
            {processedCompleted.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {processedCompleted.map((item) => (
                  <div key={item.id} className="w-full relative" onClick={() => navigate(`/anime/${item.slug}`)}>
                    <ContentCard {...item} />
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-full px-2 py-0.5 text-[9px] flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3 fill-current text-white" />
                        Completed
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 premium-surface rounded-3xl border border-white/5 p-8">
                <div className="text-5xl mb-4">🏆</div>
                <h2 className="text-xl font-bold text-foreground mb-2">No completed series</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Ascend to peak levels! Finish all episodes of an ongoing or completed series to see it here.
                </p>
              </div>
            )}
          </div>
        )}

        {currentTab === "favorites" && (
          <div className="space-y-4 animate-fade-in">
            {processedFavorites.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {processedFavorites.map((item) => (
                  <div key={item.id} className="w-full shrink-0">
                    <ContentCard {...item} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 premium-surface rounded-3xl border border-white/5 p-8">
                <div className="text-5xl mb-4">⭐</div>
                <h2 className="text-xl font-bold text-foreground mb-2">No Favorites</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Items you rate highly will appear here as favorites automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {currentTab === "watchlist" && (
          <div className="space-y-4 animate-fade-in">
            {processedWatchLater.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {processedWatchLater.map((item) => {
                  const posterSrc = getCleanCoverUrl(item.slug || item.id) || item.image;
                  return (
                    <div
                      key={item.id}
                      className="premium-surface rounded-3xl p-4 flex gap-4 items-center cursor-pointer hover:border-primary/40 transition-colors group"
                      onClick={() => navigate(`/anime/${item.slug}`)}
                    >
                      <div className="h-24 w-16 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-md">
                        <img
                          src={posterSrc}
                          alt={item.title}
                          onError={(e) => {
                            if (e.currentTarget.src !== item.image) {
                              e.currentTarget.src = item.image;
                            }
                          }}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="rounded-full text-[10px] px-2 border-white/10">
                            {item.genre}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.year}</span>
                        </div>
                        <h3 className="font-extrabold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.synopsis}
                        </p>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-8 rounded-full text-xs font-bold flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/watch/${item.slug}/episode-1`);
                            }}
                          >
                            Watch Now
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-xs flex-1 border-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWatchlist.mutate(Number(item.id));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 premium-surface rounded-3xl border border-white/5 p-8">
                <div className="text-5xl mb-4">💖</div>
                <h2 className="text-xl font-bold text-foreground mb-2">Watch Later list is empty</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                  Save shows you want to watch later and they'll appear here for quick access.
                </p>
                <Button onClick={() => navigate("/explore")} className="rounded-full font-bold">
                  Browse Shows
                </Button>
              </div>
            )}
          </div>
        )}

        {currentTab === "history" && (
          <div className="space-y-4 animate-fade-in">
            {processedHistoryLogs.length > 0 ? (
              <div className="premium-surface rounded-3xl p-5 border border-white/5 divide-y divide-white/5 max-w-2xl mx-auto">
                <h3 className="font-extrabold text-sm sm:text-base text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-primary" />
                  Detailed Watch History Log
                </h3>
                {processedHistoryLogs.map((item, idx) => {
                  const isRIMovie =
                    item.slug === "renegade-immortal-movie-battle-of-the-gods" ||
                    item.slug === "ri-movie-1" ||
                    item.progress?.animeId === "renegade-immortal-movie-battle-of-the-gods" ||
                    item.progress?.animeId === "ri-movie-1";

                  const seasonBadge = formatSeasonTag(
                    item.progress?.seasonName,
                    item.progress?.installmentType,
                    item.progress?.episode,
                    item.title,
                    item.slug
                  );

                  const posterSrc = (isRIMovie ? getCleanCoverUrl("renegade-immortal-movie-battle-of-the-gods") : null) || getCleanCoverUrl(item.slug || item.id) || item.image;

                  return (
                    <div 
                      key={idx}
                      className="flex justify-between items-center py-3.5 first:pt-1 last:pb-1 cursor-pointer group"
                      onClick={() => navigate(`/anime/${item.slug}`)}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={posterSrc} 
                          alt={item.title} 
                          onError={(e) => {
                            if (e.currentTarget.src !== item.image) {
                              e.currentTarget.src = item.image;
                            }
                          }}
                          className="h-10 w-7.5 rounded object-cover border border-white/10 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                              {item.title}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border-white/10",
                                seasonBadge === "MOVIE" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-primary/10 text-purple-300 border-primary/30"
                              )}
                            >
                              {seasonBadge}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            Watched Episode {item.progress.episode}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {new Date(item.progress.updatedAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full"
                          onClick={(e) => handleRemoveHistory(e, item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 premium-surface rounded-3xl border border-white/5 p-8">
                <div className="text-5xl mb-4">📜</div>
                <h2 className="text-xl font-bold text-foreground mb-2">Watch history log is empty</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                  Your detailed watch history log will populate as you complete episodes.
                </p>
              </div>
            )}
          </div>
        )}
        </PageWrapper>
      </div>
    </div>
  );
};

export default Library;
