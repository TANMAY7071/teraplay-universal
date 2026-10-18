import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Clock, CalendarDays, Bell, BellRing, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { animeCatalog } from "@/data/anime";
import { useWatchlistQuery, useAddToWatchlistMutation, useRemoveFromWatchlistMutation, useScheduleQuery } from "@/hooks/useAnimeQueries";
import PageWrapper from "@/components/layout/PageWrapper";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import calendarBg from "@/assets/calendar-bg.webp";

// Schedule data mapping shows to release times and days
const scheduleData = [
  { day: "Monday", time: "10:00 AM", animeId: 7, episode: "Ep 183" }, // Perfect World
  { day: "Tuesday", time: "11:30 AM", animeId: 5, episode: "Ep 53" },  // Daily Life of the Immortal King
  { day: "Wednesday", time: "09:00 AM", animeId: 6, episode: "Ep 169" }, // Throne Of Seal
  { day: "Thursday", time: "08:00 PM", animeId: 8, episode: "Ep 46" },  // Stellar Transformations
  { day: "Friday", time: "07:30 PM", animeId: 11, episode: "Ep 98" },  // Renegade Immortal
  { day: "Saturday", time: "07:30 PM", animeId: 1, episode: "Ep 158" }, // Battle Through the Heavens
  { day: "Saturday", time: "10:00 AM", animeId: 3, episode: "Ep 37" },  // Dragon Prince Yuan
  { day: "Sunday", time: "09:30 AM", animeId: 2, episode: "Ep 13" },   // Heaven Official's Blessing
  { day: "Sunday", time: "04:00 PM", animeId: 12, episode: "Ep 40" },  // Tales of Herding Gods
  { day: "Monday", time: "02:00 PM", animeId: 10, episode: "Ep 96" },  // Swallowed Star
  { day: "Wednesday", time: "07:00 PM", animeId: 9, episode: "Ep 67" },  // Jade Dynasty
  { day: "Thursday", time: "10:00 AM", animeId: 4, episode: "Ep 266" }, // Soul Land
];

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getStudioName = (anime?: any, animeId?: number) => {
  if (anime) {
    if (anime.studio) return anime.studio;
    if (anime.studios) return anime.studios;
  }
  const id = animeId || anime?.id || 0;
  const studios: Record<number, string> = {
    1: "Motion Magic",
    2: "Haoliners Animation",
    3: "Foch Film",
    4: "Sparkly Key Animation",
    5: "Tencent Animation",
    6: "Sparkly Key Animation",
    7: "Sparkly Key Animation",
    8: "Foch Film",
    9: "Yunfang Media",
    10: "Sparkly Key Animation",
    11: "Foch Film",
    12: "Build Dream Animation",
  };
  return studios[id] || "Chinese Animation Studio";
};

type ViewMode = "today" | "week" | "tomorrow" | "following" | "month";

const Calendar = () => {
  const navigate = useNavigate();
  const { data: dbSchedule } = useScheduleQuery();
  const { data: watchlist = [] } = useWatchlistQuery();
  const addToWatchlist = useAddToWatchlistMutation();
  const removeFromWatchlist = useRemoveFromWatchlistMutation();

  // Map database schedule to the local format expected by components
  const activeSchedule = useMemo(() => {
    if (dbSchedule && dbSchedule.length > 0) {
      return dbSchedule.map((item) => ({
        day: item.day_of_week,
        time: item.air_time || "12:00 PM",
        animeId: item.anime?.id || 0,
        episode: item.episode_number ? `Ep ${item.episode_number}` : "New Ep",
        watchState: (item as any).watchState as string | undefined,
        air_date: (item as any).air_date as string | undefined,
        anime: item.anime ? {
          ...item.anime,
          image: item.anime.poster_url || "",
          genres: item.anime.genres || []
        } : null
      })).filter(x => x.anime);
    }

    // Q3b: hardcoded fallback is a dev-only seeding path — never ship fake
    // schedule data to visitors.
    if (import.meta.env.DEV) {
      return scheduleData.map((item) => ({
        ...item,
        watchState: undefined,
        anime: animeCatalog.find((a) => a.id === item.animeId) || null,
      })).filter(x => x.anime);
    }

    return [];
  }, [dbSchedule]);

  const [viewMode, setViewMode] = useState<ViewMode>("today");

  const [selectedDay] = useState<string>(() => {
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
    return daysOfWeek.includes(dayName) ? dayName : "Saturday"; // fallback
  });

  const tomorrowDay = useMemo(() => {
    const todayIndex = daysOfWeek.indexOf(selectedDay);
    return daysOfWeek[(todayIndex + 1) % 7];
  }, [selectedDay]);

  // Selected date details side panel/sheet for monthly calendar view
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<{ dayNum: number; dayName: string; releases: any[] } | null>(null);

  // Dynamic month name & details
  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());
  }, []);

  // Handle adding/removing from watchlist
  const toggleWatchlist = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (watchlist.includes(id)) {
      removeFromWatchlist.mutate(id);
    } else {
      addToWatchlist.mutate(id);
    }
  };

  // Helper to calculate dynamic release countdown and status
  const getReleaseStatus = (itemDay: string, timeStr: string) => {
    const now = new Date();
    const currentDayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);

    // Parse target time format: "07:30 PM" or "at 12:30"
    const isAtFormat = timeStr.toLowerCase().includes("at");
    let match;
    if (isAtFormat) {
      match = timeStr.match(/(\d+):(\d+)/);
    } else {
      match = timeStr.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
    }
    
    if (!match) return { status: "Upcoming", detail: "Upcoming" };

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    if (!isAtFormat) {
      const ampm = (match[3] || "").toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }

    const currentDayIdx = daysOfWeek.indexOf(currentDayName);
    const targetDayIdx = daysOfWeek.indexOf(itemDay);

    if (currentDayIdx === -1 || targetDayIdx === -1) {
      return { status: "Upcoming", detail: "Upcoming" };
    }

    // Day offset calculation
    let dayDiff = targetDayIdx - currentDayIdx;
    if (dayDiff < 0) dayDiff += 7;

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayDiff);
    targetDate.setHours(hours, minutes, 0, 0);

    const diffMs = targetDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) {
      return { status: "Released", detail: "Available" };
    } else if (dayDiff === 0) {
      return { status: "Releasing Today", detail: "Coming Today" };
    } else if (dayDiff === 1) {
      return { status: "Upcoming", detail: "Tomorrow" };
    } else if (dayDiff < 7) {
      return { status: "Upcoming", detail: itemDay };
    } else {
      return { status: "Upcoming", detail: "Upcoming" };
    }
  };

  // Lookup the next upcoming release in the schedule for today's smart empty state
  const nextRelease = useMemo(() => {
    const todayIdx = daysOfWeek.indexOf(selectedDay);
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = daysOfWeek[(todayIdx + offset) % 7];
      const items = activeSchedule.filter(item => item.day === nextDay);
      if (items.length > 0) {
        const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time));
        const firstRelease = sorted[0];
        const anime = firstRelease.anime;
        if (anime) {
          const isTomorrow = offset === 1;
          const dayLabel = isTomorrow ? "Tomorrow" : firstRelease.day;
          return {
            ...firstRelease,
            anime,
            dayLabel,
          };
        }
      }
    }
    return null;
  }, [selectedDay, activeSchedule]);

  // Get shows for selected views
  const scheduledItems = useMemo(() => {
    let targetDays: string[] = [];

    if (viewMode === "today") {
      targetDays = [selectedDay];
    } else if (viewMode === "tomorrow") {
      targetDays = [tomorrowDay];
    } else if (viewMode === "week" || viewMode === "month") {
      return activeSchedule;
    }

    return activeSchedule
      .filter((item) => targetDays.includes(item.day))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [viewMode, selectedDay, tomorrowDay, activeSchedule]);

  // Get followed series releases
  const followedScheduledItems = useMemo(() => {
    return activeSchedule
      .filter((item) => watchlist.includes(item.animeId))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [watchlist, activeSchedule]);

  // Personalization widget: Your Next Releases (up to 3 items)
  const yourNextReleases = useMemo(() => {
    return activeSchedule
      .filter(item => watchlist.includes(item.animeId))
      .map(item => {
        const releaseInfo = getReleaseStatus(item.day, item.time);
        return { ...item, releaseInfo };
      })
      .filter(item => item.releaseInfo.status !== "Released")
      .sort((a, b) => {
        const aIdx = daysOfWeek.indexOf(a.day);
        const bIdx = daysOfWeek.indexOf(b.day);
        const todayIdx = daysOfWeek.indexOf(selectedDay);

        let aDiff = aIdx - todayIdx;
        if (aDiff < 0) aDiff += 7;
        let bDiff = bIdx - todayIdx;
        if (bDiff < 0) bDiff += 7;

        return aDiff - bDiff;
      })
      .slice(0, 3);
  }, [watchlist, selectedDay, activeSchedule]);

  // Top statistics counts row
  const statsSummary = useMemo(() => {
    const todayReleases = activeSchedule.filter(item => item.day === selectedDay);
    const releasedCount = todayReleases.filter(item => getReleaseStatus(item.day, item.time).status === "Released").length;
    const upcomingCount = todayReleases.length - releasedCount;
    const followedTodayCount = todayReleases.filter(item => watchlist.includes(item.animeId)).length;

    return {
      totalToday: todayReleases.length,
      released: releasedCount,
      upcoming: upcomingCount,
      following: followedTodayCount,
      totalWeek: activeSchedule.length,
    };
  }, [selectedDay, watchlist, activeSchedule]);

  // Next release countdown calculation for contextual labels
  const nextReleaseCountdown = useMemo(() => {
    const now = new Date();
    const currentDayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
    const currentDayIdx = daysOfWeek.indexOf(currentDayName);
    if (currentDayIdx === -1) return null;

    let minDiffMins = Infinity;

    activeSchedule.forEach((item) => {
      const isAtFormat = item.time.toLowerCase().includes("at");
      let match;
      if (isAtFormat) {
        match = item.time.match(/(\d+):(\d+)/);
      } else {
        match = item.time.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
      }
      if (!match) return;

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);

      if (!isAtFormat) {
        const ampm = (match[3] || "").toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
      }

      const targetDayIdx = daysOfWeek.indexOf(item.day);
      if (targetDayIdx === -1) return;

      let dayDiff = targetDayIdx - currentDayIdx;
      if (dayDiff < 0) dayDiff += 7;

      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayDiff);
      targetDate.setHours(hours, minutes, 0, 0);

      const diffMs = targetDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      // Only care about future releases
      if (diffMins > 0 && diffMins < minDiffMins) {
        minDiffMins = diffMins;
      }
    });

    if (minDiffMins === Infinity) return null;

    if (minDiffMins < 60) {
      return `Next release in ${minDiffMins}m`;
    } else {
      const hours = Math.floor(minDiffMins / 60);
      return `Next release in ${hours}h`;
    }
  }, [selectedDay, activeSchedule]);

  const currentHero = useMemo(() => {
    if (viewMode === "today") {
      return yourNextReleases[0] || nextRelease;
    }
    if (viewMode === "following" && yourNextReleases.length > 0) {
      return yourNextReleases[0];
    }
    return null;
  }, [viewMode, yourNextReleases, nextRelease]);

  const currentHeroId = currentHero?.animeId || currentHero?.anime?.id;
  const currentHeroSlug = currentHero?.anime?.slug;

  // Render generalized spotlight hero card
  const renderHeroCard = (item: any, defaultHeroTitle?: string) => {
    if (!item || !item.anime) return null;

    const releaseInfo = item.releaseInfo || getReleaseStatus(item.day, item.time);
    const isReleased = releaseInfo.status === "Released";
    const heroTitle = defaultHeroTitle || (isReleased ? "Available Now" : "Coming Next");
    const remainingCount = yourNextReleases.length - 1;

    const heroStatusLabel = isReleased
      ? "AVAILABLE NOW"
      : releaseInfo.detail === "Coming Today"
      ? "COMING TODAY"
      : releaseInfo.detail === "Tomorrow"
      ? "TOMORROW"
      : `COMING ${item.day.toUpperCase()}`;

    return (
      <div className="mb-8 text-left animate-reveal-up">
        <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">
          {heroTitle}
        </h3>

        <div
          className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-r from-purple-950/30 via-[#131316]/95 to-neutral-950/40 p-3.5 sm:p-5 flex flex-row items-center sm:items-start gap-3.5 sm:gap-5 md:gap-6 cursor-pointer group hover:border-primary/30 transition-all duration-500 shadow-2xl"
          onClick={() => navigate(`/anime/${item.anime?.slug}`)}
        >
          {/* Blurred background image banner */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-[0.14] scale-110 pointer-events-none transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url(${item.anime.image})` }}
          />

          {/* Soft purple radial glow behind the artwork */}
          <div className="absolute top-1/2 left-8 md:left-12 -translate-y-1/2 w-64 h-64 bg-purple-600/15 blur-[80px] rounded-full pointer-events-none z-0" />

          {/* Spotlight Poster */}
          <div className="relative h-[125px] w-[86px] sm:h-[140px] sm:w-[96px] shrink-0 rounded-2xl overflow-hidden border border-white/15 shadow-[0_12px_24px_rgba(0,0,0,0.6)] z-10 transition-transform duration-500 group-hover:scale-[1.02]">
            <img src={item.anime.image} alt={item.anime.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <span className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 text-[9px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap shadow-md">
              {item.episode}
            </span>
          </div>

          {/* Text Info Column */}
          <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center py-0.5 h-full">
            <span className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
              {heroStatusLabel}
            </span>
            <h4 className="text-base sm:text-2xl font-black text-white tracking-tight leading-snug mb-1.5 sm:mb-2 group-hover:text-primary transition-colors line-clamp-1 sm:line-clamp-2">
              {item.anime.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 max-w-xl mb-3 font-medium leading-relaxed">
              {item.anime.synopsis}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
              <Button
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-xs font-black gap-1.5 h-8 sm:h-9 px-4 sm:px-6 flex items-center justify-center transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] border border-primary/20"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isReleased && item.watchState !== 'unavailable') {
                    navigate(`/watch/${item.anime?.slug}/episode-1`);
                  } else {
                    navigate(`/anime/${item.anime?.slug}`);
                  }
                }}
              >
                {isReleased ? (
                  <>
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 fill-current shrink-0" />
                    <span>Watch Now</span>
                  </>
                ) : (
                  <span>View Details</span>
                )}
              </Button>

              <div className="flex items-center gap-2 sm:gap-3">
                {defaultHeroTitle !== "Next Up" && remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode("following");
                      const tabElement = document.getElementById("calendar-tabs");
                      if (tabElement) {
                        tabElement.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                    className="inline-flex items-center gap-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                  >
                    <span>+{remainingCount} More</span>
                    <span className="hidden xs:inline">Followed</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Right Stat Block */}
          <div className="hidden lg:flex flex-col gap-3 text-xs border-l border-white/5 pl-8 shrink-0 min-w-[150px] self-stretch justify-center text-left">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block">Episode</span>
              <span className="text-white font-extrabold text-xs sm:text-sm">{item.episode}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block">Release Day</span>
              <span className="text-white font-bold text-xs sm:text-sm">{item.day}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block">Studio</span>
              <span className="text-[#A855F7] font-medium text-xs sm:text-sm truncate max-w-[130px] block">{getStudioName(item.anime, item.animeId)}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block">Status</span>
              <span className={cn("font-black uppercase tracking-wider text-[9px]", isReleased ? "text-emerald-400" : "text-purple-400")}>
                {releaseInfo.detail}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderYourNextReleases = () => {
    if (viewMode === "today") {
      const target = yourNextReleases[0] || nextRelease;
      return renderHeroCard(target, "Coming Next");
    }
    if (viewMode === "following" && yourNextReleases.length > 0) {
      return renderHeroCard(yourNextReleases[0], "Next Episode You're Following");
    }
    return null;
  };

  // Redesigned dense schedule list rendering (UX Polish - Responsive Grid Layout)
  const renderScheduleList = (items: typeof scheduledItems) => {
    const listItems = currentHero
      ? items.filter((item) => {
          const itemId = item.animeId || item.anime?.id;
          const itemSlug = item.anime?.slug;
          if (currentHeroId !== undefined && currentHeroId !== null && String(itemId) === String(currentHeroId)) return false;
          if (currentHeroSlug && itemSlug && itemSlug === currentHeroSlug) return false;
          return true;
        })
      : items;

    if (listItems.length === 0) {
      if (viewMode === "today" && nextRelease && !currentHeroId) {
        return (
          <div className="text-center py-12 max-w-2xl mx-auto animate-reveal-up">
            <h3 className="text-xl sm:text-2xl font-black text-foreground mb-1">Nothing new today.</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-8 font-medium">
              Your next release is {nextRelease.dayLabel.toLowerCase()}.
            </p>
            {renderHeroCard(nextRelease, "Coming Next")}
          </div>
        );
      }
      if (viewMode === "following" && yourNextReleases.length > 0) {
        return null; // Hero card above displays the single followed show cleanly
      }
      return (
        <div className="text-center py-12 bg-[#1b1b1f]/10 rounded-[32px] p-8 border border-[#26262b] max-w-md mx-auto">
          <div className="text-4xl mb-3">💤</div>
          <h3 className="text-base font-bold text-foreground mb-1">No other releases scheduled</h3>
          <p className="text-muted-foreground text-xs mb-5">There are no other donghua episodes scheduled for this selection.</p>
          <Button onClick={() => navigate("/explore")} className="rounded-full font-bold text-xs">
            Browse the Catalog
          </Button>
        </div>
      );
    }

    // Split today's items if viewMode is today
    const groupSections = (() => {
      if (viewMode === "tomorrow") {
        return [{ title: "Tomorrow's Releases", list: listItems }];
      }
      if (viewMode !== "today") return [{ title: null, list: listItems }];

      const released = listItems.filter(item => getReleaseStatus(item.day, item.time).status === "Released");
      const upcoming = listItems.filter(item => getReleaseStatus(item.day, item.time).status !== "Released");

      const sections = [];
      if (released.length > 0) {
        sections.push({ title: "Available Today", list: released });
      }
      if (upcoming.length > 0) {
        sections.push({ title: "Today's Releases", list: upcoming });
      }
      return sections;
    })();

    return (
      <div className="space-y-8">
        {groupSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-3 text-left">
            {section.title && (
              <div className="flex items-center justify-between pb-1.5 border-b border-[#26262b] mb-3">
                <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  {section.title === "Available Today" && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                  <span>
                    {section.title === "Available Today" 
                      ? `${section.list.length} Episode${section.list.length > 1 ? "s" : ""} Live` 
                      : section.title}
                  </span>
                </h4>
                <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                  {section.list.length} Release{section.list.length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {section.list.map((item, index) => {
                if (!item.anime) return null;
                const isAdded = watchlist.includes(item.animeId);
                const releaseInfo = getReleaseStatus(item.day, item.time);
                const isReleased = releaseInfo.status === "Released";

                return (
                  <div
                    key={index}
                    className="flex flex-row items-center gap-4 p-3.5 bg-[#1b1b1f]/20 hover:bg-[#26262b]/30 border border-[#26262b] hover:border-primary/40 rounded-2xl transition-all duration-300 group cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(168,85,247,0.06)]"
                    onClick={() => navigate(`/anime/${item.anime?.slug}`)}
                  >
                    {/* Compact Poster */}
                    <div className="relative h-20 w-14 shrink-0 rounded-lg overflow-hidden border border-white/5 shadow-sm transition-all duration-300">
                      <img
                        src={item.anime.image}
                        alt={item.anime.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      {isAdded && (
                        <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary z-20" />
                      )}
                    </div>

                    {/* Metadata column */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn(
                          "border font-mono text-[9px] px-2 py-0.5 rounded-full shrink-0",
                          isReleased
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-[#26262b] text-purple-400 border-neutral-700/50"
                        )}>
                          {releaseInfo.detail}
                        </Badge>
                        {/* Q26/Q27/Q31: availability state from the DB, never guessed */}
                        {item.watchState === 'pending' && (
                          <Badge className="border font-mono text-[9px] px-2 py-0.5 rounded-full shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                            Link pending
                          </Badge>
                        )}
                        {item.watchState === 'unavailable' && (
                          <Badge className="border font-mono text-[9px] px-2 py-0.5 rounded-full shrink-0 bg-red-500/10 text-red-400 border-red-500/20">
                            Source unavailable
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm md:text-base text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2 uppercase tracking-wide mt-1">
                        {item.anime.title}
                      </h4>
                      <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground mt-0.5">
                        <span className="text-white/80 font-bold">{item.episode}</span>
                        <span className="text-muted-foreground/60 font-medium">{getStudioName(item.anime, item.animeId)}</span>
                      </div>
                    </div>

                    {/* Action & Notification Buttons (Realigned to fit grid columns) */}
                    <div className="flex flex-col items-end justify-between py-0.5 shrink-0 self-stretch gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-full hover:bg-white/10 shrink-0 transition-colors border",
                          isAdded 
                            ? "text-primary bg-primary/10 border-primary/20" 
                            : "text-muted-foreground/70 border-transparent hover:border-[#26262b]"
                        )}
                        onClick={(e) => toggleWatchlist(e, item.animeId)}
                        aria-label={isAdded ? "Remove Reminder" : "Set Reminder"}
                      >
                        {isAdded ? (
                          <BellRing className="h-3.5 w-3.5 fill-current text-primary" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      {isReleased && item.watchState !== 'unavailable' && (
                        <Button
                          variant="default"
                          className="h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-0.5 shadow-md transition-all active:scale-95 duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/watch/${item.anime?.slug}/episode-1`);
                          }}
                        >
                          <span>Watch</span>
                          <span>→</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Grouped schedule by day for "Week" view
  const groupedWeeklySchedule = useMemo(() => {
    return daysOfWeek.map((day) => {
      const items = activeSchedule
        .filter((item) => item.day === day)
        .sort((a, b) => a.time.localeCompare(b.time));
      return { day, items };
    });
  }, [activeSchedule]);

  return (
    <div className="min-h-screen bg-background pb-12 relative overflow-hidden">
      {/* Fixed backdrop (handles cover sizing relative to viewport, preventing tall-page zoom-in bugs) */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 animate-fade-in pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 10, 0.45), rgba(5, 6, 10, 0.9)), url(${calendarBg})`,
        }}
      />
      {/* Bottom transition blend overlay (sits at bottom of scrollable page to fade background into footer) */}
      <div className="absolute bottom-0 left-0 right-0 h-[150px] md:h-[200px] bg-gradient-to-t from-background via-background/70 to-transparent z-0 pointer-events-none" />

      <div className="relative z-10">
        <PageWrapper className="pb-4">
        {/* Title block */}
        <div className="mb-6 text-left">
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-1.5">
            Release Calendar
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            {`${statsSummary.totalToday} release${statsSummary.totalToday !== 1 ? "s" : ""} today • ${statsSummary.totalWeek} this week`}
          </p>
        </div>

        {/* Filter Bar (1:1 Match with Library.tsx) */}
        <div id="calendar-tabs" className="flex border-b border-white/10 mb-6 gap-4 sm:gap-6 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "today", label: "Today", count: statsSummary.totalToday, icon: Clock },
            { id: "week", label: "This Week", count: statsSummary.totalWeek, icon: CalendarDays },
            { id: "following", label: "Following", count: followedScheduledItems.length, icon: Bell }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id as any)}
                className={cn(
                  "pb-3 text-xs sm:text-sm font-extrabold relative shrink-0 transition-colors flex items-center gap-2 whitespace-nowrap px-1 group",
                  isActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>{tab.label}</span>
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

        {/* Personalized Watchlist Tracker widget */}
        {renderYourNextReleases()}

        {/* Main schedule view */}
        {viewMode === "today" ? (
          <div>
            {renderScheduleList(scheduledItems)}
          </div>
        ) : viewMode === "week" ? (
          <div className="space-y-8">
            {groupedWeeklySchedule.map(({ day, items }) => {
              if (items.length === 0) return null;
              return (
                <div key={day} className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-primary tracking-widest text-left pl-1">
                    {day}
                  </h3>
                  {renderScheduleList(items)}
                </div>
              );
            })}
          </div>
        ) : viewMode === "following" ? (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-black uppercase text-primary tracking-widest pl-1 mb-2">
              All Following Shows
            </h3>
            {followedScheduledItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {followedScheduledItems.map((item, idx) => {
                  if (!item.anime) return null;
                  const isAdded = watchlist.includes(item.animeId);
                  const releaseInfo = getReleaseStatus(item.day, item.time);

                  return (
                    <div
                      key={idx}
                      className="flex gap-4 p-4 bg-[#1b1b1f]/20 border border-[#26262b] rounded-2xl hover:border-primary/45 transition-all duration-300 group cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(168,85,247,0.06)]"
                      onClick={() => navigate(`/anime/${item.anime?.slug}`)}
                    >
                      {/* Poster */}
                      <div className="relative h-24 w-16 shrink-0 rounded-xl overflow-hidden border border-white/5 shadow-md">
                        <img 
                          src={item.anime.image} 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                          alt={item.anime.title}
                        />
                      </div>

                      {/* Info & Action */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm md:text-base text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2 uppercase tracking-wide">
                            {item.anime.title}
                          </h4>
                          <span className="text-white/80 font-bold text-xs block mt-1">
                            {item.episode}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3 gap-2">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-wider",
                            releaseInfo.status === "Released" ? "text-emerald-400 animate-pulse" : "text-purple-400"
                          )}>
                            {releaseInfo.detail}
                          </span>

                          <Button
                            variant="ghost"
                            className="h-7 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                            onClick={(e) => toggleWatchlist(e, item.animeId)}
                          >
                            <span>Watchlist ✓</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#1b1b1f]/10 rounded-[32px] border border-[#26262b] p-8 max-w-md mx-auto">
                <div className="text-5xl mb-4">🔔</div>
                <h3 className="text-lg font-black text-foreground mb-2">No followed series</h3>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto mb-6">
                  You are not tracking any ongoing series. Add shows to your Watchlist to see their release schedules here!
                </p>
                <Button onClick={() => navigate("/explore")} className="rounded-full font-bold text-xs">
                  Discover Shows
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Smart fallback upcoming list if any other state triggers viewMode */
          <div className="space-y-4 text-left">
            {renderScheduleList(scheduledItems)}
          </div>
        )}

        {/* Selected date details sliding sheet side panel */}
        <Sheet open={!!selectedCalendarDate} onOpenChange={(open) => !open && setSelectedCalendarDate(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md bg-card/95 border-l border-white/5 backdrop-blur-xl p-6 text-left">
            <SheetHeader className="mb-4">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Release Schedule</span>
              <SheetTitle className="text-xl font-black text-white tracking-tight mt-0.5">
                {selectedCalendarDate?.dayName}, {currentMonthName} {selectedCalendarDate?.dayNum}
              </SheetTitle>
            </SheetHeader>

            {/* Releases List */}
            <div className="space-y-3 mt-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {selectedCalendarDate?.releases.map((release, rIdx) => {
                const anime = animeCatalog.find(a => a.id === release.animeId);
                if (!anime) return null;
                const isFollowed = watchlist.includes(release.animeId);
                const statusInfo = getReleaseStatus(release.day, release.time);

                return (
                  <div
                    key={rIdx}
                    className={cn(
                      "flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer bg-white/[0.02] hover:border-primary/30",
                      isFollowed ? "border-primary/30 bg-primary/5" : "border-white/5"
                    )}
                    onClick={() => {
                      setSelectedCalendarDate(null);
                      navigate(`/anime/${anime.slug}`);
                    }}
                  >
                    <div className="h-14 w-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                      <img src={anime.image} className="h-full w-full object-cover" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold text-donghua-cyan uppercase">{release.time}</span>
                        <span className="text-white/25">•</span>
                        <span className="text-[10px] font-bold text-muted-foreground">{release.episode}</span>
                        {isFollowed && (
                          <Badge className="bg-primary/20 text-primary border border-primary/30 text-[8px] font-black tracking-wider uppercase rounded-md py-0 px-1 hover:bg-primary/20">
                            Watchlist
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-white truncate mt-0.5">{anime.title}</h4>
                      <div className="text-[9px] font-bold text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span className={statusInfo.status === "Released" ? "text-emerald-400" : "text-purple-400"}>
                          ● {statusInfo.detail}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                onClick={() => setSelectedCalendarDate(null)}
                className="w-full rounded-full text-xs font-bold"
              >
                Close View
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        </PageWrapper>
      </div>
    </div>
  );
};

export default Calendar;
