import { useState, useEffect, useMemo, useRef } from "react";
import { Search as SearchIcon, X, ArrowLeft, Star, Flame, Trash2, Sparkles, Film, Tag, HelpCircle, Keyboard, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { animeCatalog, standardizedGenres } from "@/data/anime";
import PageWrapper from "@/components/layout/PageWrapper";
import ResponsiveGrid from "@/components/layout/ResponsiveGrid";
import ContentCard from "@/components/ContentCard";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAnimeCatalogQuery } from "@/hooks/useAnimeQueries";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";

// Mock Data Maps for Characters & Studios
const characterMap: Record<string, string[]> = {
  "battle-through-the-heavens": ["Xiao Yan", "Medusa", "Yao Lao", "Xiao Xun'er"],
  "heaven-officials-blessing": ["Xie Lian", "Hua Cheng"],
  "dragon-prince-yuan": ["Zhou Yuan", "Yaoyao"],
  "soul-land": ["Tang San", "Xiao Wu", "Dai Mubai"],
  "daily-life-of-the-immortal-king": ["Wang Ling", "Sun Rong"],
  "throne-of-seal": ["Long Haochen", "Sheng Cai'er"],
  "perfect-world": ["Shi Hao", "Huo Ling'er", "Qing Yi"],
  "stellar-transformations": ["Qin Yu", "Jiang Li"],
  "jade-dynasty": ["Zhang Xiaofan", "Lu Xueqi", "Bi Yao"],
  "swallowed-star": ["Luo Feng", "Xu Xin"],
  "renegade-immortal": ["Wang Lin", "Li Muwan"],
  "tales-of-herding-gods": ["Qin Mu", "Ling Yuxiu"]
};

const studioMap: Record<string, string> = {
  "battle-through-the-heavens": "Motion Magic",
  "heaven-officials-blessing": "Bilibili",
  "dragon-prince-yuan": "Sparkly Key",
  "soul-land": "Sparkly Key",
  "daily-life-of-the-immortal-king": "Bilibili",
  "throne-of-seal": "Shenman Entertainment",
  "perfect-world": "Foch Film",
  "stellar-transformations": "Foch Film",
  "jade-dynasty": "Foch Film",
  "swallowed-star": "Sparkly Key",
  "renegade-immortal": "Foch Film",
  "tales-of-herding-gods": "Foch Film"
};

// Cultivation quick discovery chips
const cultivationChips = [
  "Sword Cultivation",
  "Alchemy",
  "Dragon Clan",
  "Spirit Beast",
  "Heavenly Flame",
  "Body Tempering",
  "Demonic Cultivation",
  "Array Master",
  "Artifact Refining"
];

const Search = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialQuery);
  const [activeMode, setActiveMode] = useState<"all" | "shows" | "characters" | "studios" | "episodes">("all");
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>("donghua-recent-searches", ["BTTH", "Perfect World", "Renegade Immortal"]);
  const [recentlyViewed] = useLocalStorage<number[]>("donghua-recently-viewed", [1, 9, 10, 11]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search term changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);
  
  const { data: dbAnime = [] } = useAnimeCatalogQuery(
    debouncedSearchTerm.trim() ? { search: debouncedSearchTerm } : undefined
  );

  // Focus Search Shortcut (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      
      if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.key === "/" && !isInputFocused)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setSearchTerm(initialQuery);
    setDebouncedSearchTerm(initialQuery); // Sync immediately on route updates
  }, [initialQuery]);

  const handleSearchSubmit = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;

    // Save search query
    const updated = [cleaned, ...recentSearches.filter(s => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);

    setSearchTerm(cleaned);
    setDebouncedSearchTerm(cleaned); // Bypass debounce delay on explicit submit
    setSearchParams({ q: cleaned });
    setActiveMode("all");
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm(""); // Clear immediately
    setSearchParams({});
    setActiveMode("all");
  };

  // Perform multi-dimensional search
  const searchResults = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return null;
    const cleanQuery = debouncedSearchTerm.trim().toLowerCase();

    // 1. Anime Results
    const anime = dbAnime;

    // 2. Character Results
    const characters: { name: string; animeTitle: string; slug: string; image: string }[] = [];
    Object.entries(characterMap).forEach(([slug, chars]) => {
      const show = animeCatalog.find((a) => a.slug === slug);
      if (show) {
        chars.forEach((char) => {
          if (char.toLowerCase().includes(cleanQuery)) {
            characters.push({ name: char, animeTitle: show.title, slug, image: show.image });
          }
        });
      }
    });

    // 3. Studios Results
    const studios: { name: string; showsCount: number }[] = [];
    const matchedStudios = new Set<string>();
    animeCatalog.forEach((show) => {
      const studio = studioMap[show.slug] || "Foch Film";
      if (studio.toLowerCase().includes(cleanQuery)) {
        matchedStudios.add(studio);
      }
    });
    matchedStudios.forEach((studioName) => {
      const count = animeCatalog.filter(s => (studioMap[s.slug] || "Foch Film") === studioName).length;
      studios.push({ name: studioName, showsCount: count });
    });

    // 4. Genres Results
    const genres = standardizedGenres.filter(g => g.toLowerCase().includes(cleanQuery));

    // 5. Episodes Results (mocking episode match if query has number/ep)
    const episodes: { animeTitle: string; episodeNumber: number; slug: string; image: string }[] = [];
    const numberMatch = cleanQuery.match(/\d+/);
    if (numberMatch) {
      const epNum = parseInt(numberMatch[0]);
      animeCatalog.forEach((show) => {
        if (epNum <= show.episodes) {
          episodes.push({ animeTitle: show.title, episodeNumber: epNum, slug: show.slug, image: show.image });
        }
      });
    }

    return { anime, characters, studios, genres, episodes: episodes.slice(0, 4) };
  }, [searchTerm]);

  const topRanking = useMemo(() => {
    return [...animeCatalog]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }, []);

  // Check if current active mode has results
  const hasModeResults = useMemo(() => {
    if (!searchResults) return false;
    if (activeMode === "all") {
      return (
        searchResults.anime.length > 0 ||
        searchResults.characters.length > 0 ||
        searchResults.studios.length > 0 ||
        searchResults.episodes.length > 0 ||
        searchResults.genres.length > 0
      );
    }
    if (activeMode === "shows") return searchResults.anime.length > 0 || searchResults.genres.length > 0;
    if (activeMode === "characters") return searchResults.characters.length > 0;
    if (activeMode === "studios") return searchResults.studios.length > 0;
    if (activeMode === "episodes") return searchResults.episodes.length > 0;
    return false;
  }, [searchResults, activeMode]);

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="pb-4">
        {/* Header Back Button */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground font-semibold">Search Hub</span>
        </div>

        {/* Input Bar */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search titles, characters, studios, or cultivation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchSubmit(searchTerm);
              }
            }}
            className="h-14 rounded-2xl border-white/10 bg-white/[0.05] pl-12 pr-20 text-base focus:border-primary/60 focus:ring-1 focus:ring-primary/40 shadow-inner"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchTerm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="h-auto rounded-full p-2 hover:bg-white/10 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <kbd className="hidden md:inline-flex h-6 select-none items-center gap-1 rounded border border-white/15 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-white/50 opacity-100 shadow-inner">
                <span className="text-[8px]">Ctrl</span>K
              </kbd>
            )}
          </div>
        </div>

        {/* Search Mode Filter Capsules */}
        {searchTerm.trim() && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x select-none">
            {(["all", "shows", "characters", "studios", "episodes"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-black capitalize transition-all border shrink-0 snap-start active:scale-95 duration-200",
                  activeMode === mode
                    ? "bg-[#A855F7] border-[#A855F7] text-white shadow-lg shadow-[#A855F7]/25"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                {mode === "shows" ? "Shows" : mode}
              </button>
            ))}
          </div>
        )}

        {/* Conditional Layout */}
        {!searchTerm.trim() ? (
          /* Static Discovery Layout */
          <div className="space-y-8 animate-fade-in">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-foreground tracking-tight">Recent Searches</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearRecent}
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="cursor-pointer rounded-full px-4 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-sm"
                      onClick={() => handleSearchSubmit(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Cultivation Discovery Chips */}
            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-donghua-orange animate-pulse" />
                Cultivation Discovery
              </h3>
              <div className="flex flex-wrap gap-2">
                {cultivationChips.map((chip, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer rounded-full px-4 py-1.5 border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-semibold"
                    onClick={() => handleSearchSubmit(chip)}
                  >
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Browse by Genre */}
            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Browse by Genre</h3>
              <div className="flex flex-wrap gap-2">
                {standardizedGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleSearchSubmit(genre)}
                    className="bg-white/5 border border-white/10 hover:border-primary/45 rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-foreground tracking-tight">Recently Viewed</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
                  {recentlyViewed.map((id) => {
                    const anime = animeCatalog.find(a => a.id === id);
                    if (!anime) return null;
                    return (
                      <div
                        key={anime.id}
                        onClick={() => navigate(`/anime/${anime.slug}`)}
                        className="w-24 xs:w-28 sm:w-32 shrink-0 group cursor-pointer"
                      >
                        <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/45 transition-colors bg-white/5">
                          <img src={anime.image} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <h5 className="text-[10px] sm:text-xs font-black text-foreground truncate mt-1.5 group-hover:text-primary transition-colors px-0.5">
                          {anime.title}
                        </h5>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Rankings */}
            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Top Ranking Donghua</h3>
              <div className="premium-surface rounded-3xl p-4 divide-y divide-white/5 border border-white/5">
                {topRanking.map((anime, idx) => (
                  <div
                    key={anime.id}
                    className="flex items-center justify-between py-3 cursor-pointer group first:pt-1 last:pb-1"
                    onClick={() => navigate(`/anime/${anime.slug}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`text-base font-black w-5 text-center ${
                        idx === 0 ? "text-donghua-orange" : idx === 1 ? "text-donghua-cyan" : idx === 2 ? "text-purple-400" : "text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </span>
                      <img src={anime.image} alt={anime.title} className="h-10 w-8 rounded-md object-cover border border-white/10 shadow" />
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {anime.title}
                        </h4>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{anime.genre} • {anime.year}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs text-donghua-orange font-bold">
                      <Star className="h-3 w-3 fill-current" />
                      {anime.rating}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Multi-Dimensional Search Results */
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Search Results for <span className="text-foreground">"{searchTerm}"</span>
              </h3>
            </div>

            {searchResults && (
              <>
                {/* 1. Anime Results */}
                {(activeMode === "all" || activeMode === "shows") && searchResults.anime.length > 0 && (
                  <div className="space-y-3.5 animate-fade-in">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 pl-0.5">
                      <Film className="h-3.5 w-3.5" />
                      Shows matched
                    </h4>
                    <ResponsiveGrid>
                      {searchResults.anime.map((item) => (
                        <div key={item.id} className="w-[44vw] shrink-0 sm:w-[30vw] md:w-auto">
                          <ContentCard {...item} />
                        </div>
                      ))}
                    </ResponsiveGrid>
                  </div>
                )}

                {/* 2. Character Results */}
                {(activeMode === "all" || activeMode === "characters") && searchResults.characters.length > 0 && (
                  <div className="space-y-3.5 animate-fade-in">
                    <h4 className="text-xs font-black uppercase tracking-wider text-donghua-orange flex items-center gap-1.5 pl-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Characters found
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {searchResults.characters.map((char, idx) => (
                        <div
                          key={idx}
                          onClick={() => navigate(`/anime/${char.slug}`)}
                          className="premium-surface rounded-2xl p-3 border border-white/5 flex items-center gap-3 cursor-pointer hover:border-donghua-orange/40 transition-colors"
                        >
                          <div className="h-10 w-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                            <img src={char.image} alt={char.name} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-extrabold text-foreground">{char.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">from {char.animeTitle}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Studios Results */}
                {(activeMode === "all" || activeMode === "studios") && searchResults.studios.length > 0 && (
                  <div className="space-y-3.5 animate-fade-in">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5 pl-0.5">
                      <Film className="h-3.5 w-3.5" />
                      Studios matched
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {searchResults.studios.map((studio, idx) => (
                        <Badge
                          key={idx}
                          onClick={() => handleSearchSubmit(studio.name)}
                          className="cursor-pointer rounded-full px-4.5 py-1.5 bg-white/5 border border-white/10 hover:border-primary/45 hover:bg-primary/5 text-xs text-foreground font-extrabold"
                        >
                          {studio.name} ({studio.showsCount} series)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Episodes Results */}
                {(activeMode === "all" || activeMode === "episodes") && searchResults.episodes.length > 0 && (
                  <div className="space-y-3.5 animate-fade-in">
                    <h4 className="text-xs font-black uppercase tracking-wider text-donghua-cyan flex items-center gap-1.5 pl-0.5">
                      <Play className="h-3 w-3 fill-current" />
                      Episodes matched
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {searchResults.episodes.map((ep, idx) => (
                        <div
                          key={idx}
                          onClick={() => navigate(`/watch/${ep.slug}/episode-${ep.episodeNumber}`)}
                          className="premium-surface rounded-2xl p-3 border border-white/5 flex items-center gap-3 cursor-pointer hover:border-donghua-cyan/40 transition-colors"
                        >
                          <div className="h-10 w-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                            <img src={ep.image} alt={ep.animeTitle} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{ep.animeTitle}</div>
                            <div className="text-[10px] text-primary font-black mt-0.5">Episode {ep.episodeNumber}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Genres Results */}
                {(activeMode === "all" || activeMode === "shows") && searchResults.genres.length > 0 && (
                  <div className="space-y-3.5 animate-fade-in">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 pl-0.5">
                      <Tag className="h-3.5 w-3.5" />
                      Genres matched
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {searchResults.genres.map((genre) => (
                        <Badge
                          key={genre}
                          onClick={() => handleSearchSubmit(genre)}
                          className="cursor-pointer rounded-full px-4 py-1.5 bg-white/5 border border-white/10 hover:border-primary/45 text-xs text-foreground font-bold"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart Empty State with Suggestions */}
                {!hasModeResults && (
                  <div className="text-center py-12 premium-surface rounded-3xl border border-white/5 p-8 max-w-md mx-auto space-y-6 animate-fade-in">
                    <div>
                      <div className="text-5xl mb-4">🔍</div>
                      <h3 className="text-lg font-bold text-foreground mb-2">No matching items found</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                        We couldn't find any results for "{searchTerm}" in this category.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="text-[10px] uppercase font-black tracking-widest text-[#A855F7]">People also watched</div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {["Battle Through the Heavens", "Soul Land", "Perfect World", "Renegade Immortal"].map((showTitle) => (
                          <Badge
                            key={showTitle}
                            variant="secondary"
                            className="cursor-pointer rounded-full px-3.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-bold text-white"
                            onClick={() => {
                              setSearchTerm(showTitle);
                              handleSearchSubmit(showTitle);
                            }}
                          >
                            {showTitle}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleClearSearch} variant="ghost" className="rounded-full font-bold text-xs mt-2 hover:bg-white/5">
                      Clear Search
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </PageWrapper>
    </div>
  );
};

export default Search;
