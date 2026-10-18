import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search as SearchIcon, X, Clock, Star, Play, Sparkles, Film, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { animeCatalog, standardizedGenres } from "@/data/anime";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock Character mapping for suggestions
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

// Mock Studio mapping
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

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchVal, setSearchVal] = useState("");
  const [debouncedVal, setDebouncedVal] = useState("");

  // LocalStorage searches & recently viewed
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>("donghua-recent-searches", ["BTTH", "Perfect World", "Renegade Immortal"]);
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage<number[]>("donghua-recently-viewed", [1, 9, 10, 11]); // Mocks: BTTH, Jade Dynasty, Swallowed Star, Renegade Immortal

  // 1. Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVal(searchVal);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // 2. Autofocus and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
      setSearchVal("");
      setDebouncedVal("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // 3. Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 4. Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // 5. Submit search query
  const triggerSearch = (queryStr: string) => {
    if (!queryStr.trim()) return;

    // Add to recent searches (keep unique, max 5)
    const updated = [queryStr.trim(), ...recentSearches.filter(s => s.toLowerCase() !== queryStr.trim().toLowerCase())].slice(0, 5);
    setRecentSearches(updated);

    onClose();
    navigate(`/explore?search=${encodeURIComponent(queryStr.trim())}`);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      triggerSearch(searchVal);
    }
  };

  // 6. Generate Live Suggestions
  const suggestions = useMemo(() => {
    if (!debouncedVal.trim()) return null;
    const cleanQuery = debouncedVal.trim().toLowerCase();

    // Match Titles
    const titles = animeCatalog
      .filter(item => item.title.toLowerCase().includes(cleanQuery))
      .slice(0, 3);

    // Match Characters
    const characters: { name: string; animeName: string; animeSlug: string }[] = [];
    Object.entries(characterMap).forEach(([slug, chars]) => {
      const anime = animeCatalog.find(a => a.slug === slug);
      if (anime) {
        chars.forEach(charName => {
          if (charName.toLowerCase().includes(cleanQuery) && characters.length < 3) {
            characters.push({ name: charName, animeName: anime.title, animeSlug: anime.slug });
          }
        });
      }
    });

    // Match Genres
    const genres = standardizedGenres
      .filter(g => g.toLowerCase().includes(cleanQuery))
      .slice(0, 2);

    // Match Studios
    const studios: string[] = [];
    Object.values(studioMap).forEach(studio => {
      if (studio.toLowerCase().includes(cleanQuery) && !studios.includes(studio) && studios.length < 2) {
        studios.push(studio);
      }
    });

    return { titles, characters, genres, studios };
  }, [debouncedVal]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* Search Container Box */}
      <div
        ref={overlayRef}
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        className="premium-surface w-full max-w-[780px] max-h-[85vh] rounded-[14px] border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-background/90 overscroll-contain"
      >
        {/* Header Search Bar */}
        <div className="flex items-center px-5 py-4 border-b border-white/5 gap-3 shrink-0">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anime, characters, studios, or cultivation paths..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground outline-none text-sm sm:text-base font-semibold py-1 pr-4"
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal("")}
              className="text-muted-foreground hover:text-foreground h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable Contents area */}
        <div 
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin] overscroll-contain"
        >
          {searchVal.trim() ? (
            /* Live Suggestions Mode */
            <div className="space-y-6 animate-fade-in">
              {suggestions && (
                <>
                  {/* Titles Section */}
                  {suggestions.titles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 pl-1">
                        <Play className="h-3 w-3 fill-current" />
                        Titles
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {suggestions.titles.map((anime) => (
                          <div
                            key={anime.id}
                            onClick={() => {
                              onClose();
                              navigate(`/anime/${anime.slug}`);
                            }}
                            className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 flex items-center gap-3 cursor-pointer group"
                          >
                            <div className="h-10 w-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                              <img src={anime.image} alt={anime.title} className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                                {anime.title}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{anime.genre} • {anime.year}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Characters Section */}
                  {suggestions.characters.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-donghua-orange flex items-center gap-1.5 pl-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        Characters
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {suggestions.characters.map((char, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              onClose();
                              navigate(`/anime/${char.animeSlug}`);
                            }}
                            className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-donghua-orange/30 flex flex-col justify-center cursor-pointer"
                          >
                            <div className="text-xs sm:text-sm font-extrabold text-foreground">{char.name}</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5 font-medium truncate">from {char.animeName}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Genres & Studios Section */}
                  {(suggestions.genres.length > 0 || suggestions.studios.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.genres.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-donghua-cyan flex items-center gap-1.5 pl-1">
                            <Tag className="h-3.5 w-3.5" />
                            Genres
                          </h4>
                          <div className="flex gap-2 flex-wrap">
                            {suggestions.genres.map((genre) => (
                              <Badge
                                key={genre}
                                onClick={() => triggerSearch(genre)}
                                className="rounded-full bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/5 text-xs text-foreground cursor-pointer px-3 py-1 font-bold"
                              >
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {suggestions.studios.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5 pl-1">
                            <Film className="h-3.5 w-3.5" />
                            Studios
                          </h4>
                          <div className="flex gap-2 flex-wrap">
                            {suggestions.studios.map((studio) => (
                              <Badge
                                key={studio}
                                onClick={() => triggerSearch(studio)}
                                className="rounded-full bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/5 text-xs text-foreground cursor-pointer px-3 py-1 font-bold"
                              >
                                {studio}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {suggestions.titles.length === 0 && suggestions.characters.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-2">🔍</div>
                      <h4 className="text-sm font-bold text-muted-foreground">Press Enter to perform a complete search</h4>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Static Categories Mode */
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                {/* Left Column: Recent Searches & Genres */}
                <div className="space-y-6">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">Recent Searches</h4>
                      <div className="flex gap-2 flex-wrap">
                        {recentSearches.map((search) => (
                          <div
                            key={search}
                            onClick={() => triggerSearch(search)}
                            className="bg-white/5 border border-white/5 hover:border-primary/30 rounded-xl px-3.5 py-1.5 flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold text-foreground group"
                          >
                            <Clock className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span>{search}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Genres */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">Browse Genres</h4>
                    <div className="flex gap-2 flex-wrap">
                      {standardizedGenres.slice(0, 8).map((genre) => (
                        <button
                          key={genre}
                          onClick={() => triggerSearch(genre)}
                          className="bg-white/5 border border-white/10 hover:border-primary/40 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground font-extrabold transition-all"
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Trending Now & Top Ranked */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Trending Now */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">Trending Now</h4>
                    <div className="space-y-2">
                      {animeCatalog.slice(0, 4).map((anime) => (
                        <div
                          key={anime.id}
                          onClick={() => {
                            onClose();
                            navigate(`/anime/${anime.slug}`);
                          }}
                          className="text-xs font-bold text-muted-foreground hover:text-primary cursor-pointer truncate transition-colors flex items-center gap-1.5 py-0.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {anime.title}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Ranked */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">Top Ranked</h4>
                    <div className="space-y-2.5">
                      {animeCatalog.slice(0, 3).map((anime, idx) => (
                        <div
                          key={anime.id}
                          onClick={() => {
                            onClose();
                            navigate(`/anime/${anime.slug}`);
                          }}
                          className="flex justify-between items-center text-xs font-bold hover:text-primary cursor-pointer transition-colors py-0.5 border-b border-white/5 last:border-none"
                        >
                          <span className="truncate pr-1 text-muted-foreground">
                            {idx + 1}. {anime.title}
                          </span>
                          <span className="text-donghua-orange flex items-center shrink-0">
                            ⭐{anime.rating}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Recently Viewed */}
              {recentlyViewed.length > 0 && (
                <div className="space-y-3.5 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">Recently Viewed</h4>
                  <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {recentlyViewed.map((id) => {
                      const anime = animeCatalog.find(a => a.id === id);
                      if (!anime) return null;
                      return (
                        <div
                          key={anime.id}
                          onClick={() => {
                            onClose();
                            navigate(`/anime/${anime.slug}`);
                          }}
                          className="w-24 xs:w-28 sm:w-32 shrink-0 group cursor-pointer"
                        >
                          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/45 transition-colors bg-white/5 relative">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
