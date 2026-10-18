import React, { useState, useMemo, useEffect } from "react";
import { 
  Terminal, Sparkles, HelpCircle, Code, Cpu, ExternalLink, Play, 
  Settings, Layers, Compass, MessageSquare, Send, CheckCircle2,
  ArrowLeft, Download, Plus, Search, Star, Heart, X, Check, ChevronRight, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { animeCatalog } from "@/data/anime";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";
import PageWrapper from "@/components/layout/PageWrapper";
import TraktEvalPanel from "@/components/admin/TraktEvalPanel";
import { 
  useAnimeCatalogQuery, 
  useEpisodesQuery, 
  useCharactersQuery, 
  useRelatedAnimeQuery 
} from "@/hooks/useAnimeQueries";

interface ApiProvider {
  name: string;
  url: string;
  category: string;
  description: string;
  isAnimeSpecific?: boolean;
}

const API_PROVIDERS: ApiProvider[] = [
  { name: "1Embed", url: "https://1embed.cc/", category: "Embed Player API", description: "All-in-one embedding player for Movies, TV Shows, and Anime.", isAnimeSpecific: false },
  { name: "AutoEmbed", url: "https://autoembed.app/", category: "Embed Player API", description: "Responsive stream provider with Telegram integration.", isAnimeSpecific: false },
  { name: "Yenime", url: "https://api.yenime.net/", category: "Embed Player API", description: "Anime-focused embed player offering fast stream sources.", isAnimeSpecific: true },
  { name: "VidLink", url: "https://vidlink.pro/", category: "Embed Player API", description: "High-performance embedding API with custom player styles.", isAnimeSpecific: false },
  { name: "VidSrc.to", url: "https://vidsrc.to/", category: "Embed Player API", description: "Extremely popular media embedding player for streaming apps.", isAnimeSpecific: false },
  { name: "VidSrc.me", url: "https://vidsrc.me/", category: "Embed Player API", description: "Reliable and fast streaming host with fallback domains.", isAnimeSpecific: false },
  { name: "2embed", url: "https://www.2embed.cc/", category: "Embed Player API", description: "Classic movie and television series streaming resolver.", isAnimeSpecific: false },
  { name: "SmashyStream", url: "https://embed.smashystream.com/", category: "Embed Player API", description: "Multi-server resolver that returns multiple sources.", isAnimeSpecific: false },
  { name: "SpenEmbed", url: "https://spencerdevs.xyz/", category: "Embed Player API", description: "Lightweight and clean video player resolver.", isAnimeSpecific: false },
  { name: "VidFast", url: "https://vidfast.pro/", category: "Embed Player API", description: "Fast-loading video player with multi-regional CDNs.", isAnimeSpecific: false },
  { name: "Vidfun", url: "https://vidfun.pro/", category: "Embed Player API", description: "Streaming link generator for anime and serials.", isAnimeSpecific: false },
  { name: "Chillflix", url: "https://chillflix.pw/player-api", category: "Embed Player API", description: "Custom player API designed for high-resolution sources.", isAnimeSpecific: false },
  { name: "TheIntroDB", url: "https://theintrodb.org/", category: "Sponsor/Intro Skipper", description: "Open-source database of intro/outro timestamps for skipping credits.", isAnimeSpecific: true },
  { name: "Wyzie Subs", url: "https://sub.wyzie.ru/", category: "Subtitle Scraper", description: "Subtitle scraper API and NPM package for fetching media tracks.", isAnimeSpecific: false },
  { name: "P-Stream", url: "https://github.com/xp-technologies-dev/p-stream", category: "Self-Hosted API", description: "Open-source, self-hosted media streaming API engine.", isAnimeSpecific: false },
  { name: "poprink nano", url: "https://github.com/mohameodo/nano", category: "Self-Hosted API", description: "Lightweight self-hosted streaming player server.", isAnimeSpecific: false }
];

const ANILIST_IDS: Record<number, string> = {
  1: "100806", // Battle Through The Heavens
  2: "110956", // Heaven Official's Blessing
  3: "160492", // Dragon Prince Yuan
  4: "102140", // Soul Land
  5: "114092", // The Daily Life of the Immortal King
  6: "148043", // Throne Of Seal
  7: "134108", // Perfect World
  8: "106880", // Stellar Transformations
  9: "148042", // Jade Dynasty
  10: "125139", // Swallowed Star
  11: "164057", // Renegade Immortal
  12: "170792", // Tales of Herding Gods
  13: "176664", // The Great Ruler
};

// Mock voice actor mappings to recreate exact Actors cards shown in the user's screenshots
const MOCK_ACTORS: Record<number, Array<{ name: string; character: string; avatar: string }>> = {
  1: [
    { name: "Bu Yi", character: "萧炎 (voice)", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop" },
    { name: "Liu Yuxuan", character: "药老 / 药尘 (voice)", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop" },
    { name: "Chen Yiwen", character: "萧熏儿 / 古熏儿 (voice)", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop" },
    { name: "Feng Junhua", character: "美杜莎 / 彩鳞 (voice)", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop" },
    { name: "Wen Yixiao", character: "紫妍 (voice)", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop" },
    { name: "Zhu Jun", character: "纳兰嫣然 / 雅妃 (voice)", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop" },
    { name: "Yang Menglu", character: "云芝 / 云韵 (voice)", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop" },
    { name: "Meme Yan", character: "青鳞 (voice)", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop" },
    { name: "Xia Lei", character: "云山 (voice)", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop" },
    { name: "Tao Dian", character: "凤清儿 (voice)", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop" }
  ]
};

const DEFAULT_MOCK_ACTORS = [
  { name: "Lin Wei", character: "Protagonist (voice)", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop" },
  { name: "Zhang Min", character: "Mentor (voice)", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop" },
  { name: "Wang Ping", character: "Companion (voice)", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop" },
  { name: "Li Jing", character: "Rival (voice)", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop" }
];

export default function ExperimentalAI() {
  // 1. Fetch real website data dynamically from Supabase / API Hooks
  const { data: dbAnimeList = [], isLoading: isLoadingCatalog } = useAnimeCatalogQuery();
  const activeCatalog = useMemo(() => dbAnimeList.length > 0 ? dbAnimeList : animeCatalog, [dbAnimeList]);
  
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState<"playground" | "explorer" | "directory" | "chat" | "trakt">("explorer");
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | string>(animeCatalog[0].id);
  const selectedAnime = useMemo(() => {
    return activeCatalog.find(a => a.id === selectedAnimeId || String(a.id) === String(selectedAnimeId)) || activeCatalog[0] || animeCatalog[0];
  }, [activeCatalog, selectedAnimeId]);

  const { data: dbEpisodes = [] } = useEpisodesQuery(Number(selectedAnime.id));
  const { data: dbCharacters = [] } = useCharactersQuery(Number(selectedAnime.id));
  const { data: dbRelated = [] } = useRelatedAnimeQuery(Number(selectedAnime.id));

  const [selectedProvider, setSelectedProvider] = useState(API_PROVIDERS[0]);
  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [anilistId, setAnilistId] = useState<string>(ANILIST_IDS[selectedAnime.id] || "");
  const [tmdbId, setTmdbId] = useState<string>("");
  const [playerMode, setPlayerMode] = useState<"live" | "demo">("demo");
  const [showPlayer, setShowPlayer] = useState<boolean>(false);

  // Sync AniList ID state when selected anime changes
  useEffect(() => {
    setAnilistId(ANILIST_IDS[selectedAnime.id] || "");
  }, [selectedAnime.id]);

  // API Explorer states
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("details");
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [apiConsoleLogs, setApiConsoleLogs] = useState<string[]>([]);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("Season 1");

  // Dynamic backdrops linked to catalog items for premium UI hero preview
  const animeBackdrops: Record<number, string> = {
    1: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=600&fit=crop&q=80",
    2: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&h=600&fit=crop&q=80",
    3: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&h=600&fit=crop&q=80",
    4: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&h=600&fit=crop&q=80"
  };

  const activeBackdrop = selectedAnime.image || animeBackdrops[selectedAnime.id] || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=600&fit=crop&q=80";

  // AI Chat Assistant States
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Greetings, Fellow Cultivator! I am your Qi-Guided API Consultant. I have indexed the API endpoints from your credentials page. Ask me anything about embedding players, intro skipping (TheIntroDB), subtitle scraping (Wyzie Subs), or setting up self-hosted engines!"
    }
  ]);

  // Generate dynamic API response JSON payloads based on real DB values
  const apiResponseJson = useMemo(() => {
    const activeAniId = anilistId || ANILIST_IDS[selectedAnime.id] || "100806";
    
    if (selectedEndpoint === "details") {
      return selectedAnime;
    }

    if (selectedEndpoint === "episodes") {
      return {
        anime_id: selectedAnime.id,
        title: selectedAnime.title,
        total_episodes: dbEpisodes.length,
        episodes: dbEpisodes
      };
    }

    if (selectedEndpoint === "cast") {
      return {
        anime_id: selectedAnime.id,
        title: selectedAnime.title,
        cast: dbCharacters
      };
    }

    if (selectedEndpoint === "similar") {
      return {
        anime_id: selectedAnime.id,
        title: selectedAnime.title,
        similar_series: dbRelated
      };
    }

    return {};
  }, [selectedAnime, selectedEndpoint, anilistId, dbEpisodes, dbCharacters, dbRelated]);

  // Compatibility Checklist based on endpoint data structures
  const compatibilityReport = useMemo(() => {
    return {
      hero: { label: "Hero Banner Support", status: "passed", desc: "Backdrop, logo, description, release year and rating fields found." },
      episodes: { label: "Episodes Support", status: dbEpisodes.length > 0 ? "passed" : "warning", desc: "Requires episodes array with duration, descriptions and thumbnails." },
      actors: { label: "Actors Support", status: dbCharacters.length > 0 ? "passed" : "warning", desc: "Requires voice cast nodes with actor_name, character_name and avatar." },
      similar: { label: "Similar Series Support", status: dbRelated.length > 0 ? "passed" : "warning", desc: "Requires recommendation/similar series arrays for linking." }
    };
  }, [dbEpisodes, dbCharacters, dbRelated]);

  // Execute Mock API Call
  const handleTriggerApiCall = () => {
    setIsQuerying(true);
    setApiConsoleLogs([]);
    const logs = [
      `[info] Initiating socket handshake with Unified API gateway...`,
      `[info] Connected to node: ap-southeast-2.donghua.stream`,
      `[query] GET /api/anime/${selectedAnime.id}/${selectedEndpoint}?anilist_id=${anilistId || ANILIST_IDS[selectedAnime.id]}`,
      `[parser] Validating schema integrity...`
    ];

    let currentLogIdx = 0;
    const interval = setInterval(() => {
      if (currentLogIdx < logs.length) {
        setApiConsoleLogs(prev => [...prev, logs[currentLogIdx]]);
        currentLogIdx++;
      } else {
        clearInterval(interval);
        setIsQuerying(false);
        setApiConsoleLogs(prev => [...prev, `[success] 200 OK - Retrieved ${selectedEndpoint} payload successfully.`]);
      }
    }, 250);
  };

  // Live Embed Player calculation
  const embedUrl = useMemo(() => {
    if (playerMode === "demo") {
      return "https://geo.dailymotion.com/player/xj8x3.html?video=kSGzjgHIPxsVQXDpWKy";
    }

    const base = selectedProvider.url;
    const slug = selectedAnime.slug;
    const cleanEpisode = episodeNum || 1;
    const activeAniId = anilistId || ANILIST_IDS[selectedAnime.id] || "100806";

    if (selectedProvider.name === "VidSrc.to") {
      return `https://vidsrc.to/embed/anime/${activeAniId}/${cleanEpisode}`;
    }
    if (selectedProvider.name === "VidLink") {
      return `https://vidlink.pro/embed/anime/${activeAniId}?episode=${cleanEpisode}`;
    }
    if (selectedProvider.name === "Yenime") {
      return `https://api.yenime.net/embed/anime/${slug}-episode-${cleanEpisode}`;
    }
    if (selectedProvider.name === "AutoEmbed") {
      return `https://autoembed.app/embed/anime/${activeAniId}-${cleanEpisode}`;
    }

    return `${base}embed/anime/${activeAniId}/${cleanEpisode}?autoplay=0`;
  }, [selectedAnime, selectedProvider, episodeNum, anilistId, playerMode]);

  // Send Chat Messages
  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    setTimeout(() => {
      let aiReply = "I am processing your formula... Let me trace the optimal pathway for your streaming pipeline.";
      const query = userText.toLowerCase();

      if (query.includes("intro") || query.includes("skip") || query.includes("introdb")) {
        aiReply = "To enable credit skipping for your Donghuas, you should integrate 'TheIntroDB' (https://theintrodb.org/). It provides an open database of start/end timestamps for intros and outros. You can query their API with the anime title or AniList ID, then programmatically trigger player.seek(outroTime) on your player UI.";
      } else if (query.includes("sub") || query.includes("wyzie") || query.includes("subtitle")) {
        aiReply = "For subtitles, you can utilize 'Wyzie Subs' or 'Libre Subs'. They scrap and parse subtitle tracks. You can use the 'wyzie-lib' NPM package to fetch SRT/VTT subtitle files dynamically, convert them, and inject them into your player's HTML5 track element.";
      } else if (query.includes("self") || query.includes("host") || query.includes("nano") || query.includes("p-stream")) {
        aiReply = "If you want to host your own API, check out 'P-Stream' or 'poprink nano' on GitHub. These allow you to set up your own media indexing, proxying, and resolver streams on your own cloud instance, avoiding dependency on public third-party APIs.";
      } else if (query.includes("which api") || query.includes("best") || query.includes("recommend")) {
        aiReply = "For Chinese anime (Donghua), I highly recommend 'Yenime' as they specialize in anime sources. For broader redundancy, use 'VidSrc.to' and 'VidLink' as primary players, and keep 'AutoEmbed' or 'SmashyStream' as fallbacks. Having at least 3 resolvers ensures 99.9% playback availability.";
      } else if (query.includes("donghua") || query.includes("chinese")) {
        aiReply = "Chinese Donghuas (often listed under categories like Cultivation, Martial Arts, and Fantasy Series) are supported by resolvers like Yenime, VidLink, and VidSrc. Since Donghuas are series, you must specify the episode parameter (e.g. ?episode=1) in your iframe source URLs.";
      }

      setMessages(prev => [...prev, { sender: "ai", text: aiReply }]);
    }, 1000);
  };

  // Filtered preview episodes based on query using real dbEpisodes
  const previewEpisodes = useMemo(() => {
    const episodesList = dbEpisodes.length > 0 ? dbEpisodes.map(ep => ({
      number: ep.episode_number,
      title: ep.title || `Episode ${ep.episode_number}`,
      description: ep.description || "No description available.",
      duration: ep.duration || "21m",
      thumbnail: ep.thumbnail_url || "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=225&fit=crop&q=80"
    })) : [];

    // Fallback if DB episodes are empty
    if (episodesList.length === 0) {
      const limit = Math.min(selectedAnime.episodes || 12, 12);
      for (let i = 1; i <= limit; i++) {
        episodesList.push({
          number: i,
          title: `Episode ${i}`,
          description: "No description available.",
          duration: "21m",
          thumbnail: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=225&fit=crop&q=80"
        });
      }
    }

    if (!episodeSearchQuery.trim()) return episodesList;
    return episodesList.filter(ep => 
      ep.title.toLowerCase().includes(episodeSearchQuery.toLowerCase()) ||
      ep.description.toLowerCase().includes(episodeSearchQuery.toLowerCase())
    );
  }, [selectedAnime, episodeSearchQuery, dbEpisodes]);

  // Similar series list using real dbRelated
  const previewSimilars = useMemo(() => {
    if (dbRelated && dbRelated.length > 0) {
      return dbRelated.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image || "",
        rating: item.rating,
        genres: item.genres || []
      }));
    }
    return activeCatalog
      .filter(item => item.id !== selectedAnime.id && item.genres.some(g => selectedAnime.genres.includes(g)))
      .slice(0, 5);
  }, [dbRelated, selectedAnime, activeCatalog]);

  // Voice Cast list using real dbCharacters
  const castList = useMemo(() => {
    if (dbCharacters && dbCharacters.length > 0) {
      return dbCharacters.map(c => ({
        name: c.name,
        character: c.role || "Voice Cast",
        avatar: c.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop"
      }));
    }
    return MOCK_ACTORS[selectedAnime.id] || DEFAULT_MOCK_ACTORS;
  }, [dbCharacters, selectedAnime.id]);

  return (
    <div className="min-h-screen bg-[#05060a] pb-12 relative overflow-hidden text-left">
      {/* Background radial overlays */}
      <div className="absolute inset-0 bg-[#05060a]/40 z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-[#05060a] via-[#05060a]/80 to-transparent z-0 pointer-events-none" />

      <SEO 
        title="Experimental AI API Hub & Explorer"
        description="Explore streaming endpoints, inspect JSON schemas, and test live mockup layouts matching your design."
      />

      <PageWrapper className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Top Header Block */}
        <div className="mb-6 text-left border-b border-white/5 pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider mb-2 animate-reveal-up">
                <Cpu className="h-3.5 w-3.5 animate-spin" />
                Celestial Dev Sandbox
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-2 animate-reveal-up">
                Experimental AI Hub
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium max-w-2xl animate-reveal-up delay-75">
                Probe unified API servers, evaluate JSON payload structures, and preview actual parsed UI renders instantly before integration.
              </p>
            </div>
            <div className="shrink-0 flex items-center animate-reveal-up">
              <a
                href="/wiki-api-explorer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-lg transition-all border border-primary/20"
              >
                <ExternalLink className="h-4 w-4" />
                Wiki API Explorer Page
              </a>
            </div>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex gap-2 p-1.5 bg-[#0f1015]/60 border border-white/5 rounded-2xl mb-6 max-w-xl animate-reveal-up delay-100">
          <button
            onClick={() => setActiveTab("explorer")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
              activeTab === "explorer" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code className="h-3.5 w-3.5" />
            API Explorer
          </button>
          <button
            onClick={() => setActiveTab("playground")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
              activeTab === "playground" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Embed Sandbox
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
              activeTab === "directory" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            API Directory
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
              activeTab === "chat" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            AI Consultant
          </button>
          <button
            onClick={() => setActiveTab("trakt")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
              activeTab === "trakt" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            Trakt Eval
          </button>
        </div>

        {/* Page Tab Containers */}
        <div className="space-y-6">
          
          {/* TAB: API EXPLORER & MOCKUP PREVIEW */}
          {activeTab === "explorer" && (
            <div className="space-y-8 animate-reveal-up">
              {/* Upper Section: API Sandbox Config & Code Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Controller Deck */}
                <div className="space-y-5 bg-[#0c0d12]/90 border border-white/5 p-5 rounded-3xl backdrop-blur-2xl shadow-xl">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Settings className="h-4.5 w-4.5 text-primary" />
                    <h2 className="text-xs font-black text-foreground uppercase tracking-wider">Explorer Controls</h2>
                  </div>

                  {/* Pick Anime */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Target Anime</label>
                    <select
                      value={selectedAnime.id}
                      onChange={(e) => {
                        setSelectedAnimeId(Number(e.target.value));
                      }}
                      className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      {activeCatalog.map(anime => (
                        <option key={anime.id} value={anime.id} className="bg-[#0f1015]">{anime.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pick Endpoint */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Endpoint Route</label>
                    <select
                      value={selectedEndpoint}
                      onChange={(e) => setSelectedEndpoint(e.target.value)}
                      className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="details" className="bg-[#0f1015]">GET /api/anime/:id/details</option>
                      <option value="episodes" className="bg-[#0f1015]">GET /api/anime/:id/episodes</option>
                      <option value="cast" className="bg-[#0f1015]">GET /api/anime/:id/cast</option>
                      <option value="similar" className="bg-[#0f1015]">GET /api/anime/:id/similar</option>
                    </select>
                  </div>

                  {/* Call API Trigger */}
                  <Button 
                    onClick={handleTriggerApiCall}
                    disabled={isQuerying}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
                  >
                    <Code className="h-4 w-4" />
                    {isQuerying ? "Handshaking..." : "Call API Endpoint"}
                  </Button>

                  {/* Compatibility Report Matrix */}
                  <div className="pt-3 border-t border-white/5 space-y-2.5">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">UI Schema Compatibility</span>
                    <div className="space-y-2">
                      {Object.entries(compatibilityReport).map(([key, item]) => (
                        <div key={key} className="flex items-start gap-2 text-xs">
                          {item.status === "passed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                          ) : (
                            <HelpCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold text-foreground block leading-tight">{item.label}</span>
                            <span className="text-[10px] text-muted-foreground leading-normal block">{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Code Panel & Output Console */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Console logs */}
                  <div className="h-32 bg-black border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-zinc-400 space-y-1 overflow-y-auto">
                    <div className="text-zinc-600 border-b border-white/5 pb-1 mb-2">SYSTEM CONSOLE LOGS</div>
                    {apiConsoleLogs.map((log, i) => (
                      <div key={i} className={cn(
                        log.includes("[success]") ? "text-green-400 font-bold" : "",
                        log.includes("[query]") ? "text-primary" : ""
                      )}>
                        {log}
                      </div>
                    ))}
                    {apiConsoleLogs.length === 0 && (
                      <div className="text-zinc-600 italic">Console idle. Trigger an endpoint call above to stream connection handshakes...</div>
                    )}
                  </div>

                  {/* JSON Code Viewer */}
                  <div className="relative rounded-2xl border border-white/5 bg-[#08090d] overflow-hidden flex flex-col h-[320px]">
                    <div className="px-4 py-2 border-b border-white/5 bg-[#0a0b10] flex justify-between items-center shrink-0">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">JSON Response Payload</span>
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase tracking-wider">
                        200 OK
                      </span>
                    </div>
                    <div className="flex-1 p-4 overflow-auto font-mono text-[11px] text-primary/80 select-all [scrollbar-width:thin]">
                      <pre className="text-left leading-relaxed">
                        {JSON.stringify(apiResponseJson, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Capability Matrix Card */}
              <div className="bg-[#0c0d12]/90 border border-white/5 p-6 rounded-3xl backdrop-blur-2xl shadow-xl mt-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary animate-pulse" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                      API Capability Matrix: Rentry Registry Mappings
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-wider">
                    API Mapping Matrix
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  This matrix details which frontend elements of your streaming platform are powered by the credentials listed in 
                  <a href="https://rentry.co/onbksdgu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold ml-1 inline-flex items-center gap-0.5">
                    rentry.co/onbksdgu <ExternalLink className="h-3 w-3" />
                  </a>. Use this chart to verify where supplementary metadata sources (like AniList/Sanka) are needed to fill in gaps.
                </p>

                <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/40">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#0a0b10] text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                        <th className="p-4">UI Component Section</th>
                        <th className="p-4">Rentry API Provider Group</th>
                        <th className="p-4">What Data It Delivers</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4">Integration Logic</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {/* Watch Player */}
                      <tr className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black text-foreground">Video Stream Player</td>
                        <td className="p-4">
                          <span className="font-bold text-primary block">API Sites</span>
                          <span className="text-[10px] text-muted-foreground">(VidLink, VidSrc, Yenime, AutoEmbed)</span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">Direct streaming iframe URL / Server mirrors</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black">
                            <Check className="h-3.5 w-3.5 text-green-400 shrink-0" /> FULLY SUPPORTED
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground leading-normal">
                          Generates embed source dynamically: <br />
                          <code className="text-[10px] text-primary/80 font-mono bg-black/50 px-1 py-0.5 rounded border border-white/5 mt-1 block">
                            https://vidlink.pro/embed/anime/&#123;anilist_id&#125;/&#123;episode&#125;
                          </code>
                        </td>
                      </tr>

                      {/* Intro Skipping */}
                      <tr className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black text-foreground">Intro & Credit Skip</td>
                        <td className="p-4">
                          <span className="font-bold text-primary block">Various APIs</span>
                          <span className="text-[10px] text-muted-foreground">(TheIntroDB)</span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">Intro/outro start & end timestamps (s)</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black">
                            <Check className="h-3.5 w-3.5 text-green-400 shrink-0" /> FULLY SUPPORTED
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground leading-normal">
                          Query with AniList ID. If timestamps exist, display skipping button overlay to seek past credits automatically.
                        </td>
                      </tr>

                      {/* Subtitles */}
                      <tr className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black text-foreground">Subtitle Tracks</td>
                        <td className="p-4">
                          <span className="font-bold text-primary block">Various APIs</span>
                          <span className="text-[10px] text-muted-foreground">(Wyzie Subs, Libre Subs)</span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">SRT / VTT tracks file paths & languages</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black">
                            <Check className="h-3.5 w-3.5 text-green-400 shrink-0" /> FULLY SUPPORTED
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground leading-normal">
                          Fetch sub files, convert SRT to WebVTT, and inject dynamically as track nodes into video element.
                        </td>
                      </tr>

                      {/* Downloads */}
                      <tr className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black text-foreground">Downloads / Offline Files</td>
                        <td className="p-4">
                          <span className="font-bold text-primary block">Selfhosted APIs</span>
                          <span className="text-[10px] text-muted-foreground">(P-Stream, poprink nano)</span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">Direct media download link / index streams</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] font-black">
                            <HelpCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" /> PARTIAL
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground leading-normal">
                          Requires self-hosting media crawler files on your own cloud instance. Yields direct download paths.
                        </td>
                      </tr>

                      {/* Metadata */}
                      <tr className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black text-foreground">Hero Banner, Synopsis</td>
                        <td className="p-4 text-red-400 font-bold">
                          Not Provided in Rentry
                          <span className="text-[10px] text-muted-foreground block font-normal">(Needs Supplement)</span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">No artwork images, banners, or synopses returned</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black">
                            <X className="h-3.5 w-3.5 text-red-400 shrink-0" /> UNSUPPORTED
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground leading-normal">
                          <strong>Must supplement with AniList API</strong>. Query AniList to retrieve background drop images, logos and score ratings.
                        </td>
                      </tr>

                      {/* Episodes names */}
                      <tr className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black text-foreground">Episodes List, Thumbnails</td>
                        <td className="p-4 text-red-400 font-bold">
                          Not Provided in Rentry
                          <span className="text-[10px] text-muted-foreground block font-normal">(Needs Supplement)</span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">No episode counts, title lists, or air dates</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black">
                            <X className="h-3.5 w-3.5 text-red-400 shrink-0" /> UNSUPPORTED
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground leading-normal">
                          <strong>Must supplement with Sanka API</strong>. Fetch schedules, season logs, and episode titles from Sanka API, then request links.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lower Section: High-Fidelity Mock UI Preview Replica */}
              <div className="border-t border-white/5 pt-8 space-y-5">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-black uppercase tracking-wider text-foreground">UI Replica Preview (Generated from JSON)</h3>
                </div>

                {/* GORGEOUS HERO PREVIEW COMPONENT */}
                <div className="relative w-full rounded-[36px] overflow-hidden border border-white/5 shadow-2xl bg-[#090b11]">
                  {/* Hero Backdrop Backdrop Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 h-[480px]"
                    style={{ backgroundImage: `url(${activeBackdrop})` }}
                  />
                  {/* Radial/Linear Overlay Gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090b11] via-[#090b11]/75 to-transparent h-[480px] z-10" />
                  <div className="absolute inset-0 bg-[#090b11]/45 h-[480px] z-10" />

                  {/* Hero UI Content */}
                  <div className="relative z-20 pt-16 px-6 sm:px-12 pb-12 flex flex-col justify-end text-left h-[480px]">
                    {/* Back Arrow icon */}
                    <div className="absolute top-6 left-6 sm:left-12 h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-all">
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </div>

                    {/* Styled Calligraphy Logo / Text Title */}
                    <div className="space-y-4 max-w-2xl">
                      {selectedAnime.id === 1 ? (
                        <h2 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#b45309] font-serif select-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                          {selectedAnime.originalTitle}
                        </h2>
                      ) : (
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none uppercase select-none">
                          {selectedAnime.title}
                        </h2>
                      )}

                      {/* Series Meta Row */}
                      <div className="flex items-center gap-4 text-xs font-bold text-foreground/80 mt-2">
                        <span>{selectedAnime.year}</span>
                        <span>0h 25m</span>
                        <span className="flex items-center gap-1 text-[#fbbf24]">
                          <Star className="h-4 w-4 fill-current" />
                          {selectedAnime.rating}
                        </span>
                      </div>

                      {/* Genre chips row */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(selectedAnime.genres || [selectedAnime.genre]).map(genre => (
                          <span 
                            key={genre}
                            className="px-3.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-all"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>

                      {/* Synopsis description */}
                      <p className="text-xs sm:text-sm text-muted-foreground mt-4 leading-relaxed font-medium">
                        {selectedAnime.synopsis} <span className="text-foreground hover:underline font-black cursor-pointer ml-1">show more</span>
                      </p>

                      {/* Action buttons bar */}
                      <div className="flex flex-wrap items-center gap-3 pt-4">
                        <Button className="h-11 px-8 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                          <Play className="h-4 w-4 fill-current text-black" />
                          Resume
                        </Button>
                        <button className="h-11 w-11 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                          <Plus className="h-4 w-4 text-white" />
                        </button>
                        <button className="h-11 px-6 rounded-xl border border-white/15 bg-transparent hover:bg-white/5 text-white text-xs font-black uppercase tracking-wider transition-all">
                          Similars
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TABULAR LAYOUT - EPISODES */}
                  <div className="relative z-20 px-6 sm:px-12 pb-12 bg-[#090b11]">
                    
                    {/* Sections Title bar */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                      <h3 className="text-xl font-black uppercase tracking-wider text-foreground">Episodes</h3>
                    </div>

                    {/* Season Select & Search inputs row */}
                    <div className="flex flex-col sm:flex-row gap-3 p-3 bg-[#0d0f17] border border-white/5 rounded-2xl mb-6 items-center">
                      <select
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="w-full sm:w-[160px] h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-foreground font-black focus:outline-none"
                      >
                        <option value="Season 1">Season 1</option>
                        <option value="Season 2">Season 2</option>
                      </select>
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search episode..."
                          value={episodeSearchQuery}
                          onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                          className="w-full h-10 pl-10 pr-4 bg-black/40 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Episodes List Container */}
                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto scrollbar-thin pr-1.5">
                      {previewEpisodes.map(ep => (
                        <div 
                          key={ep.number}
                          className="p-3 bg-[#0d0f17]/80 hover:bg-[#121421]/90 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                            {/* Episode Thumbnail */}
                            <div className="relative aspect-video w-full sm:w-[150px] rounded-xl overflow-hidden shrink-0 bg-black border border-white/5">
                              <img 
                                src={ep.thumbnail} 
                                alt={ep.title} 
                                className="w-full h-full object-cover opacity-80"
                              />
                              {/* Number Overlay tag */}
                              <div className="absolute bottom-1.5 left-1.5 bg-black/80 px-2 py-0.5 rounded-md text-[9px] font-black text-white select-none">
                                {ep.number}
                              </div>
                            </div>

                            {/* Details text */}
                            <div className="space-y-1 text-left">
                              <h4 className="text-sm font-black text-foreground">{ep.title}</h4>
                              <p className="text-xs text-muted-foreground leading-normal max-w-xl font-medium">{ep.description}</p>
                              <span className="text-[10px] text-zinc-500 font-bold block">{ep.duration}</span>
                            </div>
                          </div>

                          {/* Action download button */}
                          <button className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center shrink-0 self-end sm:self-center transition-all">
                            <Download className="h-4 w-4 text-foreground" />
                          </button>
                        </div>
                      ))}

                      {previewEpisodes.length === 0 && (
                        <div className="py-12 text-center text-xs text-muted-foreground font-medium">
                          No episodes match your criteria.
                        </div>
                      )}
                    </div>

                    {/* TABULAR LAYOUT - ACTORS */}
                    <div className="border-t border-white/5 pt-12 mt-12 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase tracking-wider text-foreground">Actors</h3>
                      </div>

                      {/* Cast Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {castList.map((actor, idx) => (
                          <div 
                            key={idx}
                            className="p-3 bg-[#0d0f17] border border-white/5 rounded-2xl flex items-center gap-3 hover:border-white/15 transition-all text-left"
                          >
                            <div className="h-11 w-11 rounded-full overflow-hidden shrink-0 border border-white/10">
                              <img 
                                src={actor.avatar} 
                                alt={actor.name} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-foreground block truncate">{actor.name}</span>
                              <span className="text-[10px] text-muted-foreground block truncate">{actor.character}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TABULAR LAYOUT - SIMILAR SERIES */}
                    <div className="border-t border-white/5 pt-12 mt-12 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase tracking-wider text-foreground">Similar series</h3>
                      </div>

                      {/* Posters Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {previewSimilars.map(sim => (
                          <div 
                            key={sim.id}
                            onClick={() => {
                              setSelectedAnimeId(sim.id);
                            }}
                            className="group cursor-pointer space-y-2 text-left"
                          >
                            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/5 bg-[#0c0d12] shadow-md group-hover:border-primary/30 transition-all">
                              <img 
                                src={sim.image} 
                                alt={sim.title} 
                                className="h-full w-full object-cover group-hover:scale-105 transition-all duration-300"
                              />
                              <div className="absolute top-2 left-2 bg-primary px-1.5 py-0.5 rounded text-[8px] font-black text-primary-foreground uppercase select-none">
                                Series
                              </div>
                              <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-black text-[#fbbf24] uppercase flex items-center gap-0.5 select-none">
                                <Star className="h-2 w-2 fill-current" />
                                {Math.round(sim.rating * 10)}%
                              </div>
                            </div>
                            <h4 className="text-xs font-black text-foreground group-hover:text-primary truncate transition-colors leading-tight">
                              {sim.title}
                            </h4>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: EMBED PLAYGROUND */}
          {activeTab === "playground" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-reveal-up">
              {/* Left Column: Settings Panel */}
              <div className="space-y-5 bg-[#0c0d12]/90 border border-white/5 p-5 rounded-3xl backdrop-blur-2xl shadow-xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Settings className="h-4.5 w-4.5 text-primary" />
                  <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Configure Embed</h2>
                </div>

                {/* Player Source Mode Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Player Mode</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 border border-white/5 rounded-xl">
                    <button
                      onClick={() => setPlayerMode("demo")}
                      className={cn(
                        "py-1.5 text-[11px] font-bold rounded-lg transition-all",
                        playerMode === "demo" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Demo (Always Plays)
                    </button>
                    <button
                      onClick={() => setPlayerMode("live")}
                      className={cn(
                        "py-1.5 text-[11px] font-bold rounded-lg transition-all",
                        playerMode === "live" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Live API Embed
                    </button>
                  </div>
                </div>

                {/* Select Anime */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Target Donghua</label>
                  <select
                    value={selectedAnime.id}
                    onChange={(e) => {
                      setSelectedAnimeId(Number(e.target.value));
                    }}
                    className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    {activeCatalog.map(anime => (
                      <option key={anime.id} value={anime.id} className="bg-[#0f1015]">{anime.title}</option>
                    ))}
                  </select>
                </div>

                {/* Select API Provider */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Resolver API</label>
                  <select
                    value={selectedProvider.name}
                    onChange={(e) => {
                      const provider = API_PROVIDERS.find(p => p.name === e.target.value);
                      if (provider) setSelectedProvider(provider);
                    }}
                    className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    {API_PROVIDERS.filter(p => p.category === "Embed Player API").map(opt => (
                      <option key={opt.name} value={opt.name} className="bg-[#0f1015]">{opt.name}</option>
                    ))}
                  </select>
                </div>

                {/* Episode Number */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Episode Number (Max: {selectedAnime.episodes})</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedAnime.episodes}
                    value={episodeNum}
                    onChange={(e) => setEpisodeNum(Math.max(1, Number(e.target.value)))}
                    className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Optional IDs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">AniList ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 153518"
                      value={anilistId}
                      onChange={(e) => setAnilistId(e.target.value)}
                      className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-[11px] text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">TMDB ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 235123"
                      value={tmdbId}
                      onChange={(e) => setTmdbId(e.target.value)}
                      className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-[11px] text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Load Player Button */}
                <Button 
                  onClick={() => setShowPlayer(true)}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
                >
                  <Play className="h-4 w-4" />
                  Initialize Player
                </Button>
              </div>

              {/* Right Column: Player Window & Specs */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative aspect-video rounded-3xl border border-white/5 bg-black/80 overflow-hidden shadow-2xl flex flex-col justify-center items-center">
                  {showPlayer ? (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-none"
                      allowFullScreen
                      scrolling="no"
                      title="API Player Sandbox"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-4 max-w-sm">
                      <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-pulse">
                        <Terminal className="h-7 w-7" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Sandbox Terminal Offline</h3>
                        <p className="text-xs text-muted-foreground">Select a Donghua title and a resolver player API from the panel and click Initialize Player to construct the iframe.</p>
                      </div>
                      <Button onClick={() => setShowPlayer(true)} variant="outline" className="h-9 rounded-xl text-xs font-bold">
                        Quick Launch
                      </Button>
                    </div>
                  )}
                </div>

                {/* API Sandbox Details Panel */}
                <div className="bg-[#0c0d12]/60 border border-white/5 p-4.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Active Embed URL Target</span>
                    <code className="text-xs text-foreground font-mono bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 select-all break-all block">
                      {embedUrl}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-foreground transition-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Test URL
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: API DIRECTORY */}
          {activeTab === "directory" && (
            <div className="space-y-4 animate-reveal-up text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {API_PROVIDERS.map((provider) => (
                  <div 
                    key={provider.name}
                    className="p-5 bg-[#0c0d12]/90 border border-white/5 rounded-3xl flex flex-col justify-between hover:border-primary/20 transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {provider.category}
                        </span>
                        {provider.isAnimeSpecific && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] text-primary font-black uppercase tracking-wider">
                            Anime Only
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">{provider.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{provider.description}</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                      <code className="text-[10px] text-muted-foreground/60 font-mono">{provider.url.replace("https://", "").replace("http://", "").split("/")[0]}</code>
                      <a
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-black text-primary uppercase hover:underline"
                      >
                        Visit Site
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: AI CONSULTANT */}
          {activeTab === "chat" && (
            <div className="max-w-3xl mx-auto h-[600px] bg-[#0c0d12]/90 border border-white/5 rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-reveal-up text-left">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/5 bg-[#0c0d12] flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Qi-Guided API Advisor</h3>
                  <p className="text-[10px] text-muted-foreground">Expert insights on embed players, subtitle scraper APIs, & intro db skippers.</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                      msg.sender === "user" ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-primary"
                    )}>
                      {msg.sender === "user" ? "U" : "AI"}
                    </div>
                    <div className={cn(
                      "p-4.5 rounded-2xl text-xs leading-relaxed",
                      msg.sender === "user" 
                        ? "bg-primary/10 border border-primary/20 text-primary rounded-tr-none" 
                        : "bg-white/[0.02] border border-white/5 text-foreground rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/5 bg-[#0c0d12] flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about skipping intros, grabbing subtitles, or Yenime API..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  className="flex-1 h-11 bg-black/40 border border-white/10 rounded-xl px-4 text-xs text-foreground focus:outline-none focus:border-primary"
                />
                <Button onClick={handleSendChat} className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center p-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB: TRAKT EVALUATION */}
          {activeTab === "trakt" && (
            <div className="animate-reveal-up">
              <TraktEvalPanel />
            </div>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}
