import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Search, Filter, Settings, RefreshCw, Layers, Tv, Calendar, Clock, BookOpen, Play, Star, Check, X, Flame, Sparkles, History, ArrowDownAZ } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProximitySelect,
  ProximitySelectTrigger,
  ProximitySelectContent,
  ProximitySelectItem
} from "@/components/ui/proximity-select";
import { useNavigate } from "react-router-dom";
import ContentCard from "@/components/ContentCard";
import { animeCatalog, standardizedGenres } from "@/data/anime";
import { useAnimeCatalogQuery } from "@/hooks/useAnimeQueries";
import { getSeedMetrics, getTopDonghuaRankings } from "@/services/donghuaMetricsService";
import { useLenis } from "lenis/react";
import PageWrapper from "@/components/layout/PageWrapper";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";
import exploreBg from "@/assets/explore-bg.webp";

const getStudio = (id: number) => {
  if ([1, 3, 12].includes(id)) return "Tencent Penguin Pictures";
  if ([4, 10].includes(id)) return "Sparkly Key Animation";
  if ([7, 8, 11].includes(id)) return "Foch Film";
  if ([2, 5, 9].includes(id)) return "Bilibili";
  return "Shenman Entertainment";
};

const getFormat = (item: any) => {
  if (item.format) {
    const f = item.format.toUpperCase();
    if (["TV", "MOVIE", "ONA", "SPECIAL", "SHORT"].includes(f)) return item.format;
    if (f.includes("MOVIE")) return "Movie";
    if (f.includes("SPECIAL")) return "Special";
    if (f.includes("SHORT")) return "Short";
    return "ONA";
  }
  const formats = ["TV", "Movie", "ONA", "Special", "Short"];
  return formats[item.id % formats.length];
};

const Explore = () => {
  const navigate = useNavigate();

  // 1. Persistent Sorting & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [browseBy, setBrowseBy] = useState<string>(() => localStorage.getItem("ds_explore_browseby") || "discover");
  const [sortBy, setSortBy] = useState<string>(() => localStorage.getItem("ds_explore_sort") || "trending");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ds_explore_genres") || "[]");
    } catch { return []; }
  });
  const [selectedStatus, setSelectedStatus] = useState<string>(() => localStorage.getItem("ds_explore_status") || "all");
  const [selectedYear, setSelectedYear] = useState<string>(() => localStorage.getItem("ds_explore_year") || "all");
  const [selectedEpisodeCount, setSelectedEpisodeCount] = useState<string>(() => localStorage.getItem("ds_explore_episodes") || "all");
  const [minRating, setMinRating] = useState<number>(() => Number(localStorage.getItem("ds_explore_min_rating")) || 0);
  const [selectedFormat, setSelectedFormat] = useState<string>(() => localStorage.getItem("ds_explore_format") || "all");
  const [selectedStudio, setSelectedStudio] = useState<string>(() => localStorage.getItem("ds_explore_studio") || "all");

  const [displayCount, setDisplayCount] = useState(12);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const lenis = useLenis();

  useEffect(() => {
    if (isAdvancedOpen && lenis) {
      lenis.stop();
    } else if (lenis) {
      lenis.start();
    }
    return () => {
      if (lenis) lenis.start();
    };
  }, [isAdvancedOpen, lenis]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("ds_explore_browseby", browseBy);
    localStorage.setItem("ds_explore_sort", sortBy);
    localStorage.setItem("ds_explore_genres", JSON.stringify(selectedGenres));
    localStorage.setItem("ds_explore_status", selectedStatus);
    localStorage.setItem("ds_explore_year", selectedYear);
    localStorage.setItem("ds_explore_episodes", selectedEpisodeCount);
    localStorage.setItem("ds_explore_min_rating", minRating.toString());
    localStorage.setItem("ds_explore_format", selectedFormat);
    localStorage.setItem("ds_explore_studio", selectedStudio);
  }, [browseBy, sortBy, selectedGenres, selectedStatus, selectedYear, selectedEpisodeCount, minRating, selectedFormat, selectedStudio]);

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const studiosList = [
    "Tencent Penguin Pictures",
    "Sparkly Key Animation",
    "Foch Film",
    "Bilibili",
    "Shenman Entertainment"
  ];

  const formatsList = [
    { value: "TV", label: "TV Series" },
    { value: "ONA", label: "ONA" },
    { value: "Movie", label: "Movie" },
    { value: "Special", label: "Special" },
    { value: "Short", label: "Short" }
  ];

  const sortByOptions = [
    { value: "default", label: "Default", icon: "⚙️" },
    { value: "rating-desc", label: "Rating", icon: "⭐" },
    { value: "year-desc", label: "Release Date", icon: "📅" },
    { value: "updated-desc", label: "Recently Updated", icon: "🆕" },
    { value: "title-asc", label: "Title (A-Z)", icon: "🔤" },
    { value: "episodes-desc", label: "Episode Count", icon: "📺" }
  ];

  const browseByOptions = [
    { value: "discover", label: "Discover", icon: "🔍" },
    { value: "trending", label: "Trending", icon: "🔥" },
    { value: "top-rated", label: "Top Rated", icon: "⭐" },
    { value: "new", label: "New Releases", icon: "🆕" },
    { value: "airing", label: "Airing Today", icon: "📅" },
    { value: "popular", label: "Popular", icon: "👑" },
    { value: "most-favorited", label: "Most Favorited", icon: "❤️" },
    { value: "most-watched", label: "Most Watched", icon: "👁" },
    { value: "random", label: "Random", icon: "🎲" }
  ];

  const { data: dbCatalog } = useAnimeCatalogQuery();

  const catalogWithExtendedData = useMemo(() => {
    const list = dbCatalog && dbCatalog.length > 0 ? dbCatalog : animeCatalog;
    return list.map((item: any) => ({
      ...item,
      studio: item.studio || getStudio(item.id),
      format: getFormat(item)
    }));
  }, [dbCatalog]);

  const yearsList = useMemo(() => {
    const years = catalogWithExtendedData.map(item => item.year).filter(y => y && !isNaN(y));
    const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
    const minYear = 2020;
    const list: string[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y.toString());
    }
    return list;
  }, [catalogWithExtendedData]);

  const totalStudiosCount = useMemo(() => {
    const set = new Set<string>();
    catalogWithExtendedData.forEach(item => {
      if (item.studio) set.add(item.studio);
    });
    return set.size || 5;
  }, [catalogWithExtendedData]);

  const totalEpisodesCount = useMemo(() => {
    const sum = catalogWithExtendedData.reduce((acc, item) => acc + (Number(item.episodes) || 0), 0);
    return sum > 0 ? sum : 2484;
  }, [catalogWithExtendedData]);

  const genresList = useMemo(() => {
    const set = new Set<string>();
    catalogWithExtendedData.forEach(item => {
      if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach(g => { if (g) set.add(g); });
      }
    });
    standardizedGenres.forEach(g => set.add(g));
    return Array.from(set).sort();
  }, [catalogWithExtendedData]);

  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
    setDisplayCount(12);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setBrowseBy("discover");
    setSelectedGenres([]);
    setSelectedStudio("all");
    setSelectedFormat("all");
    setSelectedStatus("all");
    setSelectedYear("all");
    setSelectedEpisodeCount("all");
    setMinRating(0);
    setSortBy("trending");
    setDisplayCount(12);
  };

  // Active Filter Counter for Badge inside Search Bar
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedGenres.length > 0) count += selectedGenres.length;
    if (selectedStatus !== "all") count += 1;
    if (selectedYear !== "all") count += 1;
    if (selectedEpisodeCount !== "all") count += 1;
    if (minRating > 0) count += 1;
    if (selectedFormat !== "all") count += 1;
    if (selectedStudio !== "all") count += 1;
    if (browseBy !== "discover") count += 1;
    return count;
  }, [selectedGenres, selectedStatus, selectedYear, selectedEpisodeCount, minRating, selectedFormat, selectedStudio, browseBy]);

  // Smart Search Autocomplete Suggestions (Spotify Style)
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return { titles: [], genres: [], studios: [] };
    const term = searchTerm.toLowerCase();

    const titles = catalogWithExtendedData
      .filter(item => item.title.toLowerCase().includes(term) || (item as any).japaneseTitle?.toLowerCase().includes(term))
      .slice(0, 4);

    const genres = genresList
      .filter(g => g.toLowerCase().includes(term))
      .slice(0, 3);

    const studios = studiosList
      .filter(s => s.toLowerCase().includes(term))
      .slice(0, 3);

    return { titles, genres, studios };
  }, [searchTerm, catalogWithExtendedData, genresList, studiosList]);

  // Precomputed Trending Rankings Map for 100% synchronization across Home, Watch, and Explore
  const trendingRankMap = useMemo(() => {
    const rankings = getTopDonghuaRankings(catalogWithExtendedData, "weekly");
    const map = new Map<number, number>();
    rankings.forEach((r, idx) => map.set(r.id, idx));
    return map;
  }, [catalogWithExtendedData]);

  // Comprehensive Filtering & Sorting Logic
  const filteredAndSortedContent = useMemo(() => {
    let result = [...catalogWithExtendedData];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(term) ||
        (item as any).japaneseTitle?.toLowerCase().includes(term) ||
        item.synopsis.toLowerCase().includes(term) ||
        item.genres.some(g => g.toLowerCase().includes(term)) ||
        item.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Primary Feed Filter via Browse By
    if (browseBy === "airing") {
      result = result.filter(item => item.status === "Ongoing");
    }

    // Refinement filters
    if (selectedGenres.length > 0) {
      result = result.filter(item =>
        selectedGenres.every(g => item.genres.includes(g))
      );
    }

    if (selectedStatus !== "all") {
      result = result.filter(item => item.status === selectedStatus);
    }

    if (selectedYear !== "all") {
      if (selectedYear === "older") {
        result = result.filter(item => item.year < 2020);
      } else {
        result = result.filter(item => item.year === parseInt(selectedYear, 10));
      }
    }

    if (selectedEpisodeCount !== "all") {
      if (selectedEpisodeCount === "1-12") result = result.filter(item => item.episodes <= 12);
      else if (selectedEpisodeCount === "13-24") result = result.filter(item => item.episodes >= 13 && item.episodes <= 24);
      else if (selectedEpisodeCount === "25-50") result = result.filter(item => item.episodes >= 25 && item.episodes <= 50);
      else if (selectedEpisodeCount === "50+") result = result.filter(item => item.episodes > 50);
    }

    if (minRating > 0) {
      result = result.filter(item => item.rating >= minRating);
    }

    if (selectedFormat !== "all") {
      result = result.filter(item => item.format === selectedFormat);
    }

    if (selectedStudio !== "all") {
      result = result.filter(item => item.studio === selectedStudio);
    }

    if (browseBy === "random") {
      // Seeded stable random order using ID
      result.sort((a, b) => {
        const hashA = (a.id * 73) % 100;
        const hashB = (b.id * 73) % 100;
        return hashA - hashB;
      });
    } else {
      let finalSort = sortBy;
      if (finalSort === "default") {
        if (browseBy === "top-rated") finalSort = "rating-desc";
        else if (browseBy === "new") finalSort = "year-desc";
        else if (browseBy === "trending") finalSort = "trending";
        else if (browseBy === "popular") finalSort = "popular";
        else if (browseBy === "most-favorited") finalSort = "most-favorited";
        else if (browseBy === "most-watched") finalSort = "most-watched";
        else finalSort = "trending";
      }

      result.sort((a, b) => {
        if (finalSort === "trending") {
          const rankA = trendingRankMap.has(a.id) ? trendingRankMap.get(a.id)! : 999;
          const rankB = trendingRankMap.has(b.id) ? trendingRankMap.get(b.id)! : 999;
          if (rankA !== rankB) return rankA - rankB;
          return (b.rating || 0) - (a.rating || 0);
        }

        const mA = getSeedMetrics(a, 0);
        const mB = getSeedMetrics(b, 0);

        if (finalSort === "popular" || finalSort === "most-watched") return mB.views - mA.views;
        if (finalSort === "most-favorited") return mB.favoritesCount - mA.favoritesCount;
        if (finalSort === "rating-desc") return b.rating - a.rating;
        if (finalSort === "year-desc") return b.year - a.year;
        if (finalSort === "updated-desc") return b.year - a.year || b.id - a.id;
        if (finalSort === "episodes-desc") return b.episodes - a.episodes;
        if (finalSort === "title-asc") return a.title.localeCompare(b.title);
        return 0;
      });
    }

    return result;
  }, [catalogWithExtendedData, searchTerm, browseBy, selectedGenres, selectedStatus, selectedYear, selectedEpisodeCount, minRating, selectedFormat, selectedStudio, sortBy, trendingRankMap]);

  const displayedContent = filteredAndSortedContent.slice(0, displayCount);
  const hasMore = displayCount < filteredAndSortedContent.length;

  useEffect(() => {
    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setDisplayCount(prev => prev + 12);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  // Format Helper for clean Active Filters Listing
  const activeFiltersList = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];
    
    const activeBrowse = browseByOptions.find(b => b.value === browseBy);
    if (activeBrowse && browseBy !== "discover") {
      list.push({
        key: "browseBy",
        label: `${activeBrowse.icon} ${activeBrowse.label}`,
        onRemove: () => setBrowseBy("discover")
      });
    }

    selectedGenres.forEach(genre => {
      list.push({
        key: `genre-${genre}`,
        label: `⚔️ ${genre}`,
        onRemove: () => setSelectedGenres(selectedGenres.filter(g => g !== genre))
      });
    });

    if (selectedStatus !== "all") {
      list.push({
        key: "status",
        label: `📡 ${selectedStatus}`,
        onRemove: () => setSelectedStatus("all")
      });
    }

    if (selectedFormat !== "all") {
      const match = formatsList.find(f => f.value === selectedFormat);
      list.push({
        key: "format",
        label: `📺 ${match ? match.label : selectedFormat}`,
        onRemove: () => setSelectedFormat("all")
      });
    }

    if (minRating > 0) {
      list.push({
        key: "rating",
        label: `⭐ ${minRating}+`,
        onRemove: () => setMinRating(0)
      });
    }

    if (selectedYear !== "all") {
      list.push({
        key: "year",
        label: `📅 ${selectedYear === "older" ? "Older" : selectedYear}`,
        onRemove: () => setSelectedYear("all")
      });
    }

    if (selectedEpisodeCount !== "all") {
      list.push({
        key: "episodes",
        label: `🎬 ${selectedEpisodeCount} Eps`,
        onRemove: () => setSelectedEpisodeCount("all")
      });
    }

    return list;
  }, [browseBy, selectedGenres, selectedStatus, selectedFormat, minRating, selectedYear, selectedEpisodeCount]);

  return (
    <div className="min-h-screen bg-background pb-12 relative overflow-hidden">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 animate-fade-in pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 10, 0.45), rgba(5, 6, 10, 0.9)), url(${exploreBg})`,
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[150px] md:h-[200px] bg-gradient-to-t from-background via-background/70 to-transparent z-0 pointer-events-none" />

      <div className="relative z-10">
        <SEO
          title="Explore Donghua Catalog"
          description="Discover Chinese anime donghua by genre, status, rating, and episode count."
        />
        <PageWrapper className="pb-4 md:pb-6">
        
        {/* ============================================================ */}
        {/* DESKTOP & TABLET VIEW (Responsive >= md)                     */}
        {/* ============================================================ */}
        <div className="hidden md:block">
          {/* Header Title Section */}
          <div className="mb-6 text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-2 animate-reveal-up">
              Explore Donghua
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium animate-reveal-up delay-75">
              Discover infinite worlds of cultivation and adventure.
            </p>
          </div>

          {/* Universal Search Bar */}
          <div className="relative mb-6 group animate-reveal-up delay-150">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/35 to-accent/35 rounded-2xl blur opacity-30 group-focus-within:opacity-60 transition duration-300" />
            
            <div className="relative h-16 rounded-2xl border border-white/10 bg-[#0c0d12]/80 backdrop-blur-2xl px-5 flex items-center shadow-2xl">
              <Search className="h-5 w-5 text-primary shrink-0 mr-4" />
              
              <div className="flex-1 relative h-full flex items-center">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="w-full h-full bg-transparent border-none text-sm text-foreground placeholder-transparent focus:outline-none focus:ring-0"
                />
                
                {!searchTerm && !isSearchFocused && (
                  <div className="absolute left-0 pointer-events-none flex flex-col justify-center text-left">
                    <span className="text-sm font-extrabold text-primary tracking-wide leading-none">Universal Search</span>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-1 leading-none">
                      Search donghua, characters, studios, genres, realms and more...
                    </span>
                  </div>
                )}
              </div>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-muted-foreground hover:text-foreground text-[10px] transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Redesigned Primary & Secondary Filter Controls Bar */}
          {/* Redesigned Primary & Secondary Filter Controls Bar with Proximity Spring Select */}
          <div className="flex flex-wrap items-center gap-2.5 mb-6 text-left animate-reveal-up delay-200">
            
            {/* Explore Dropdown (Primary) */}
            <ProximitySelect value={browseBy} onValueChange={setBrowseBy}>
              <ProximitySelectTrigger variant="pill" active={browseBy !== "discover"}>
                <span>{(() => {
                  const opt = browseByOptions.find(o => o.value === browseBy);
                  return opt && browseBy !== "discover" ? `${opt.icon} ${opt.label}` : "Discover";
                })()}</span>
              </ProximitySelectTrigger>
              <ProximitySelectContent>
                {browseByOptions.map((option, idx) => (
                  <ProximitySelectItem key={option.value} index={idx} value={option.value}>
                    <span className="flex items-center gap-1.5">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </ProximitySelectItem>
                ))}
              </ProximitySelectContent>
            </ProximitySelect>

            {/* Genre Dropdown */}
            <ProximitySelect 
              value={selectedGenres[0] || "all"} 
              onValueChange={(val) => {
                if (val === "all") setSelectedGenres([]);
                else setSelectedGenres([val]);
              }}
            >
              <ProximitySelectTrigger variant="pill" active={selectedGenres.length > 0}>
                <span>{selectedGenres.length > 0 ? selectedGenres[0] : "Genre"}</span>
              </ProximitySelectTrigger>
              <ProximitySelectContent>
                <ProximitySelectItem index={0} value="all">Genre (All)</ProximitySelectItem>
                {genresList.map((g, idx) => (
                  <ProximitySelectItem key={g} index={idx + 1} value={g}>{g}</ProximitySelectItem>
                ))}
              </ProximitySelectContent>
            </ProximitySelect>

            {/* Status Dropdown */}
            <ProximitySelect value={selectedStatus} onValueChange={setSelectedStatus}>
              <ProximitySelectTrigger variant="pill" active={selectedStatus !== "all"}>
                <span>{selectedStatus !== "all" ? selectedStatus : "Status"}</span>
              </ProximitySelectTrigger>
              <ProximitySelectContent>
                <ProximitySelectItem index={0} value="all">Status (All)</ProximitySelectItem>
                <ProximitySelectItem index={1} value="Ongoing">Ongoing</ProximitySelectItem>
                <ProximitySelectItem index={2} value="Completed">Completed</ProximitySelectItem>
              </ProximitySelectContent>
            </ProximitySelect>

            {/* Rating Dropdown */}
            <ProximitySelect 
              value={minRating === 0 ? "all" : minRating.toString()} 
              onValueChange={(val) => setMinRating(val === "all" ? 0 : Number(val))}
            >
              <ProximitySelectTrigger variant="pill" active={minRating !== 0}>
                <span>{minRating !== 0 ? `★ ${minRating}.0+` : "Rating"}</span>
              </ProximitySelectTrigger>
              <ProximitySelectContent>
                <ProximitySelectItem index={0} value="all">Rating (All)</ProximitySelectItem>
                <ProximitySelectItem index={1} value="7">★ 7.0+ Rated</ProximitySelectItem>
                <ProximitySelectItem index={2} value="8">★ 8.0+ Rated</ProximitySelectItem>
                <ProximitySelectItem index={3} value="9">★ 9.0+ Rated</ProximitySelectItem>
              </ProximitySelectContent>
            </ProximitySelect>

            {/* Year Dropdown */}
            <ProximitySelect value={selectedYear} onValueChange={setSelectedYear}>
              <ProximitySelectTrigger variant="pill" active={selectedYear !== "all"}>
                <span>{selectedYear !== "all" ? (selectedYear === "older" ? "Older" : selectedYear) : "Year"}</span>
              </ProximitySelectTrigger>
              <ProximitySelectContent>
                <ProximitySelectItem index={0} value="all">Year (All)</ProximitySelectItem>
                {yearsList.map((y, idx) => (
                  <ProximitySelectItem key={y} index={idx + 1} value={y}>{y}</ProximitySelectItem>
                ))}
                <ProximitySelectItem index={yearsList.length + 1} value="older">Older</ProximitySelectItem>
              </ProximitySelectContent>
            </ProximitySelect>

            {/* Type/Format Dropdown */}
            <ProximitySelect value={selectedFormat} onValueChange={setSelectedFormat}>
              <ProximitySelectTrigger variant="pill" active={selectedFormat !== "all"}>
                <span>{selectedFormat !== "all" ? (formatsList.find(f => f.value === selectedFormat)?.label || "Type") : "Type"}</span>
              </ProximitySelectTrigger>
              <ProximitySelectContent>
                <ProximitySelectItem index={0} value="all">Type (All)</ProximitySelectItem>
                {formatsList.map((fmt, idx) => (
                  <ProximitySelectItem key={fmt.value} index={idx + 1} value={fmt.value}>{fmt.label}</ProximitySelectItem>
                ))}
              </ProximitySelectContent>
            </ProximitySelect>

            {/* Sort By Dropdown */}
            <ProximitySelect value={sortBy} onValueChange={setSortBy}>
              <ProximitySelectTrigger variant="pill" active={sortBy !== "default"}>
                <span>{sortBy !== "default" ? (sortByOptions.find(o => o.value === sortBy)?.label || "Sort By") : "Sort By"}</span>
              </ProximitySelectTrigger>
              <ProximitySelectContent>
                {sortByOptions.map((option, idx) => (
                  <ProximitySelectItem key={option.value} index={idx} value={option.value}>
                    <span className="flex items-center gap-1.5">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </ProximitySelectItem>
                ))}
              </ProximitySelectContent>
            </ProximitySelect>

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={cn(
                "h-10 rounded-full border px-4 text-xs font-extrabold backdrop-blur-md flex items-center justify-center gap-1.5 ml-auto cursor-pointer shrink-0 transition-colors duration-300",
                isAdvancedOpen || activeFilterCount > 0
                  ? "bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/40 hover:bg-[#A855F7]/30 hover:border-[#A855F7]/60 hover:text-[#A855F7] hover:shadow-[0_0_18px_rgba(168,85,247,0.35)] shadow-purple-950/30 active:scale-95"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/15 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
              )}
            >
              <Filter className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden lg:inline">Advanced Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 hidden lg:flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] font-black text-white px-1 shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Reset Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="h-10 rounded-full text-xs text-primary hover:text-primary-foreground hover:bg-primary font-bold px-3.5 border border-primary/20 flex items-center justify-center transition-all"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Desktop statistics and Active Filter Badges */}
          <div className="flex flex-row items-center justify-between gap-4 py-3 px-1 border-y border-white/5 mb-6 text-left animate-reveal-up delay-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-foreground tracking-tight">
                {filteredAndSortedContent.length.toLocaleString()} Donghua Found
              </span>
              {activeFiltersList.length > 0 && (
                <>
                  <span className="text-muted-foreground/40 text-xs">|</span>
                  <span className="text-[11px] text-muted-foreground font-bold">Showing:</span>
                </>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                {activeFiltersList.map((badge) => (
                  <span 
                    key={badge.key} 
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold shadow-sm transition-all"
                  >
                    {badge.label}
                    <button onClick={badge.onRemove} className="hover:text-white transition-colors ml-0.5">✕</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
              <Layers className="h-3 w-3 text-primary" />
              <span>Catalog Size: {catalogWithExtendedData.length}</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MOBILE VIEW (Responsive < md)                                */}
        {/* ============================================================ */}
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="mb-4 text-left">
            <h1 className="text-2xl font-black tracking-tight text-foreground mb-1 animate-reveal-up">
              Explore Donghua
            </h1>
            <p className="text-muted-foreground text-xs font-medium animate-reveal-up delay-75">
              Discover infinite worlds of cultivation and adventure.
            </p>
          </div>

          {/* Mobile Search Bar */}
          <div className="relative mb-4 group z-40 animate-reveal-up delay-150">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-25 group-focus-within:opacity-60 transition duration-300" />
            
            <div className="relative h-14 rounded-2xl border border-white/15 bg-[#0c0d12]/90 backdrop-blur-2xl px-4 flex items-center justify-between shadow-2xl">
              <div className="flex items-center flex-1 h-full">
                <Search className="h-5 w-5 text-primary shrink-0 mr-3" />
                
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder="Search Donghua..."
                  className="w-full h-full bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                />

                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-muted-foreground hover:text-foreground text-[10px] transition-colors shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Autocomplete Suggestions Box */}
            {searchTerm.trim().length >= 1 && isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-white/10 bg-[#0c0d12]/98 backdrop-blur-2xl p-4 shadow-2xl space-y-3 animate-fade-in text-left">
                {searchSuggestions.titles.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1.5 px-1">Titles</div>
                    <div className="space-y-1">
                      {searchSuggestions.titles.map((item) => (
                        <div
                          key={item.id}
                          onMouseDown={() => {
                            setSearchTerm(item.title);
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <img src={(item as any).posterImage || item.image} alt={item.title} className="h-9 w-7 rounded object-cover shrink-0" />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-foreground truncate">{item.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{item.genres?.slice(0, 2).join(" • ")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchSuggestions.genres.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1.5 px-1">Genres</div>
                    <div className="flex flex-wrap gap-1.5">
                      {searchSuggestions.genres.map((g) => (
                        <button
                          key={g}
                          onMouseDown={() => {
                            handleGenreToggle(g);
                            setSearchTerm("");
                            setIsSearchFocused(false);
                          }}
                          className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Filter Controls (Exact 3 Pills + 1 Circle Icon fitting 100% in viewport frame) */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 mb-4 text-left items-center w-full min-w-0 animate-reveal-up delay-200">
            {/* 1. Explore Pill Dropdown */}
            <Select value={browseBy} onValueChange={setBrowseBy}>
              <SelectTrigger className={cn(
                "w-full h-11 rounded-full border text-[11px] font-extrabold px-2.5 sm:px-3 flex items-center justify-between gap-1 focus:ring-0 transition-all min-w-0",
                browseBy !== "discover"
                  ? "bg-[#22133e] border-[#6b35aa] text-[#d896ff] shadow-md"
                  : "bg-white/[0.05] border-white/10 text-foreground hover:bg-white/10"
              )}>
                <span className="truncate">{(() => {
                  const opt = browseByOptions.find(o => o.value === browseBy);
                  return opt && browseBy !== "discover" ? opt.label : "Explore";
                })()}</span>
              </SelectTrigger>
              <SelectContent className="bg-[#0f1015] border border-white/10 rounded-2xl shadow-2xl shadow-black/90 z-[100]">
                {browseByOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 2. Genre Pill Dropdown */}
            <Select 
              value={selectedGenres[0] || "all"} 
              onValueChange={(val) => {
                if (val === "all") setSelectedGenres([]);
                else setSelectedGenres([val]);
              }}
            >
              <SelectTrigger className={cn(
                "w-full h-11 rounded-full border text-[11px] font-extrabold px-2.5 sm:px-3 flex items-center justify-between gap-1 focus:ring-0 transition-all min-w-0",
                selectedGenres.length > 0
                  ? "bg-[#22133e] border-[#6b35aa] text-[#d896ff] shadow-md"
                  : "bg-white/[0.05] border-white/10 text-foreground hover:bg-white/10"
              )}>
                <span className="truncate">{selectedGenres.length > 0 ? selectedGenres[0] : "Genre"}</span>
              </SelectTrigger>
              <SelectContent className="bg-[#0f1015] border border-white/10 rounded-2xl shadow-2xl shadow-black/90 z-[100]">
                <SelectItem value="all" className="text-xs">Genre (All)</SelectItem>
                {genresList.map(g => (
                  <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 3. Status Pill Dropdown */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className={cn(
                "w-full h-11 rounded-full border text-[11px] font-extrabold px-2.5 sm:px-3 flex items-center justify-between gap-1 focus:ring-0 transition-all min-w-0",
                selectedStatus !== "all"
                  ? "bg-[#22133e] border-[#6b35aa] text-[#d896ff] shadow-md"
                  : "bg-white/[0.05] border-white/10 text-foreground hover:bg-white/10"
              )}>
                <span className="truncate">{selectedStatus !== "all" ? selectedStatus : "Status"}</span>
              </SelectTrigger>
              <SelectContent className="bg-[#0f1015] border border-white/10 rounded-2xl shadow-2xl shadow-black/90 z-[100]">
                <SelectItem value="all" className="text-xs">Status (All)</SelectItem>
                <SelectItem value="Ongoing" className="text-xs">Ongoing</SelectItem>
                <SelectItem value="Completed" className="text-xs">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* 4. Filter Icon Circle Button */}
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(true)}
              className={cn(
                "relative h-11 w-11 rounded-full border flex items-center justify-center p-0 transition-colors duration-300 shrink-0 shadow-md backdrop-blur-md cursor-pointer",
                activeFilterCount > 0 || isAdvancedOpen
                  ? "bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/40 hover:bg-[#A855F7]/30 hover:border-[#A855F7]/60 hover:text-[#A855F7] hover:shadow-[0_0_18px_rgba(168,85,247,0.35)] shadow-purple-950/30 active:scale-95"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/15 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
              )}
            >
              <Filter className="h-4 w-4 fill-current" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary text-[9px] font-black text-white shadow-md border border-background">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Filter Bottom Sheet (Advanced Filters) with Smooth Spring Reveal */}
        <AnimatePresence>
          {isAdvancedOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md"
                onClick={() => setIsAdvancedOpen(false)}
              />

              {/* Responsive Container Wrapper: Bottom Sheet on Mobile, Centered Modal on Desktop */}
              <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-none">
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  data-lenis-prevent
                  data-lenis-prevent-wheel
                  data-lenis-prevent-touch
                  className="pointer-events-auto w-full rounded-t-3xl border border-white/15 bg-[#0b0c10]/98 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl pb-24 md:pb-6 max-h-[88vh] md:max-h-[82vh] flex flex-col md:max-w-3xl lg:max-w-4xl md:rounded-3xl overscroll-contain shadow-black/95"
                >
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 shrink-0 md:hidden" />
                  
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      <h3 className="text-base sm:text-lg font-black text-foreground">Advanced Filters</h3>
                    </div>
                    <button 
                      onClick={() => setIsAdvancedOpen(false)} 
                      className="text-muted-foreground hover:text-foreground text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                      Close ✕
                    </button>
                  </div>

                  <div 
                    data-lenis-prevent
                    data-lenis-prevent-wheel
                    data-lenis-prevent-touch
                    className="space-y-5 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-6 overflow-y-auto min-h-0 pr-2 flex-1 text-left pb-4 overscroll-contain"
                  >
                    {/* Left Column (Desktop) */}
                    <div className="space-y-5">
                      {/* Explore Feed selector */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Discover Feed</label>
                        <div className="grid grid-cols-2 gap-2">
                          {browseByOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setBrowseBy(opt.value)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 justify-center active:scale-95",
                                browseBy === opt.value
                                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                              )}
                            >
                              <span>{opt.icon}</span>
                              <span className="truncate">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Multi-select Genres */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Category / Genres</label>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {genresList.map((g) => {
                            const isSelected = selectedGenres.includes(g);
                            return (
                              <button
                                key={g}
                                onClick={() => handleGenreToggle(g)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-extrabold transition-all border active:scale-95",
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                                )}
                              >
                                {g} {isSelected && "✓"}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Series/Format */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Type</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedFormat("all")}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize active:scale-95",
                              selectedFormat === "all"
                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "bg-white/[0.03] border-white/10 text-muted-foreground"
                            )}
                          >
                            All
                          </button>
                          {formatsList.map((fmt) => (
                            <button
                              key={fmt.value}
                              onClick={() => setSelectedFormat(fmt.value)}
                              className={cn(
                                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize active:scale-95",
                                selectedFormat === fmt.value
                                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "bg-white/[0.03] border-white/10 text-muted-foreground"
                              )}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Status</label>
                        <div className="flex gap-2">
                          {["all", "Ongoing", "Completed"].map((st) => (
                            <button
                              key={st}
                              onClick={() => setSelectedStatus(st)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-extrabold transition-all border flex-1 text-center capitalize active:scale-95",
                                selectedStatus === st
                                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {st === "all" ? "Any Status" : st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column (Desktop) */}
                    <div className="space-y-5">
                      {/* Release Year */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Release Year</label>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          <button
                            onClick={() => setSelectedYear("all")}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize active:scale-95",
                              selectedYear === "all"
                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "bg-white/[0.03] border-white/10 text-muted-foreground"
                            )}
                          >
                            All Years
                          </button>
                          {yearsList.map((y) => (
                            <button
                              key={y}
                              onClick={() => setSelectedYear(y)}
                              className={cn(
                                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize active:scale-95",
                                selectedYear === y
                                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "bg-white/[0.03] border-white/10 text-muted-foreground"
                              )}
                            >
                              {y}
                            </button>
                          ))}
                          <button
                            onClick={() => setSelectedYear("older")}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize active:scale-95",
                              selectedYear === "older"
                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "bg-white/[0.03] border-white/10 text-muted-foreground"
                            )}
                          >
                            Older
                          </button>
                        </div>
                      </div>

                      {/* Episode Count */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Episode Count</label>
                        <div className="flex flex-wrap gap-2">
                          {["all", "1-12", "13-24", "25-50", "50+"].map((ep) => (
                            <button
                              key={ep}
                              onClick={() => setSelectedEpisodeCount(ep)}
                              className={cn(
                                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95",
                                selectedEpisodeCount === ep
                                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "bg-white/[0.03] border-white/10 text-muted-foreground"
                              )}
                            >
                              {ep === "all" ? "Any Episodes" : ep}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Minimum Rating */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Minimum Rating</label>
                        <div className="flex gap-2">
                          {[0, 7, 8, 9].map((r) => (
                            <button
                              key={r}
                              onClick={() => setMinRating(r)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-extrabold transition-all border flex-1 text-center active:scale-95",
                                minRating === r
                                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "bg-white/[0.03] border-white/10 text-muted-foreground"
                              )}
                            >
                              {r === 0 ? "Any Rating" : `★ ${r}+`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Studio Filter (Secondary/Advanced Filter) */}
                      <div>
                        <label className="text-[11px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Production Studio</label>
                        <Select value={selectedStudio} onValueChange={setSelectedStudio}>
                          <SelectTrigger className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] text-xs text-muted-foreground px-4 flex items-center justify-between">
                            <SelectValue placeholder="Studio" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0f1015] border border-white/10 rounded-xl">
                            <SelectItem value="all" className="text-xs">All Studios</SelectItem>
                            {studiosList.map(st => (
                              <SelectItem key={st} value={st} className="text-xs">{st}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Sticky Bottom Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/10 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={resetFilters}
                      className="rounded-full font-bold text-xs px-5 border border-white/10 hover:bg-white/10 active:scale-95"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={() => setIsAdvancedOpen(false)}
                      className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-6 flex-1 h-11 shadow-lg shadow-primary/20 active:scale-95"
                    >
                      Apply Filters ({filteredAndSortedContent.length} Results)
                    </Button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Results Poster Grid Starts Immediately */}
        {displayedContent.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5 lg:gap-6">
              {displayedContent.map((item) => (
                <div key={item.id} className="w-full">
                  <ContentCard {...item} />
                </div>
              ))}
            </div>

            {/* Sentinel element for infinite scroll */}
            <div id="scroll-sentinel" className="h-10 w-full flex items-center justify-center my-6">
              {hasMore && (
                <div className="text-xs font-bold text-muted-foreground animate-pulse flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" /> Loading more donghua...
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 premium-surface rounded-2xl border border-white/5 p-8 max-w-lg mx-auto">
            <div className="text-5xl mb-3">🔍</div>
            <h2 className="text-lg font-black text-foreground mb-2">
              No matches found
            </h2>
            <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-6">
              We couldn't find any donghua matching your selected filters. Try clearing some criteria.
            </p>
            <Button onClick={resetFilters} className="rounded-full font-bold text-xs px-6">
              Reset Filters
            </Button>
          </div>
        )}
        </PageWrapper>
      </div>
    </div>
  );
};

export default Explore;
