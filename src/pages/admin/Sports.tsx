import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Tv, Wifi, WifiOff, Database, AlertTriangle, Users, RefreshCw, 
  ShieldAlert, Clock, ChevronDown, BookOpen, Send, Sparkles, Pin,
  Star, CheckCircle2, Film, Building2, Calendar, Globe, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ContentCard from "@/components/ContentCard";
import { cn } from "@/lib/utils";
import watchBg from "@/assets/watch-bg.webp";
import { CharactersWidget } from "@/components/watch/CharactersWidget";

// Define TypeScript interfaces for our API payloads
interface StreamItem {
  name: string;
  category: string;
  league: string;
  stream_key: string;
  match_timestamp: number;
  embed_url: string;
  thumbnail_url: string;
  viewers?: number;
}

interface ChatMessage {
  id: string;
  username: string;
  rank: string;
  message: string;
  timestamp: string;
  avatarColor: string;
  isMod?: boolean;
}

interface SeriesContext {
  slug: string;
  synopsis: string;
  studio: string;
  director: string;
  genres: string[];
  rating: string;
  characters: {
    name: string;
    role: string;
    avatar: string;
    cultivation?: string;
    ability?: string;
    relationship?: string;
  }[];
  realms: { rank: string; description: string }[];
  lore: { title: string; content: string }[];
}

const CATEGORIES_EMOJI: Record<string, string> = {
  cultivation: "ðŸ§˜",
  fantasy: "âœ¨",
  "martial arts": "âš”ï¸",
  "sci-fi": "ðŸš€",
  historical: "ðŸ¯",
  adventure: "ðŸ—ºï¸"
};

// Donghua Title Templates for mapping sports streams dynamically
const DONGHUA_TEMPLATES = [
  { name: "Battle Through The Heavens - Xiao Yan vs Yun Shan", category: "cultivation", league: "Misty Cloud Sect Arc" },
  { name: "Soul Land - Shrek Seven Devils vs Spirit Temple", category: "martial arts", league: "Spirit Tournament" },
  { name: "Heaven Official's Blessing - Xie Lian's Ascension", category: "fantasy", league: "Heavenly Realm" },
  { name: "The Daily Life of the Immortal King - Wang Ling Marathon", category: "cultivation", league: "Faction Base" },
  { name: "Dragon Prince Yuan - Zhou Yuan's Domain Trial", category: "adventure", league: "Cangxuan Sect" },
  { name: "Swallowed Star - Luo Feng Space Travel", category: "sci-fi", league: "Virtual Universe" },
  { name: "Renegade Immortal - Wang Lin's Tribulation", category: "cultivation", league: "Heng Yue Sect" },
  { name: "A Will Eternal - Bai Xiaochun Sect Trial", category: "cultivation", league: "Spirit Stream Sect" }
];

// Fallback mockup streams
const MOCK_STREAMS: StreamItem[] = [
  {
    name: "Battle Through The Heavens - Xiao Yan vs Yun Shan",
    category: "cultivation",
    league: "Misty Cloud Sect Arc",
    stream_key: "btth-misty-cloud",
    match_timestamp: Math.floor(Date.now() / 1000) - 1200,
    embed_url: "https://streamfree.top/embed/basketball/storm-vs-mystics", 
    thumbnail_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
    viewers: 2450
  },
  {
    name: "Soul Land - Shrek Seven Devils vs Spirit Temple",
    category: "martial arts",
    league: "Spirit Tournament",
    stream_key: "soul-land-tournament",
    match_timestamp: Math.floor(Date.now() / 1000) - 600,
    embed_url: "https://streamfree.top/embed/basketball/suns-vs-pelicans",
    thumbnail_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
    viewers: 1820
  },
  {
    name: "Heaven Official's Blessing - Xie Lian's Ascension",
    category: "fantasy",
    league: "Heavenly Realm",
    stream_key: "hob-ascension",
    match_timestamp: Math.floor(Date.now() / 1000) + 1860,
    embed_url: "https://streamfree.top/embed/basketball/cavaliers-vs-pistons",
    thumbnail_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    viewers: 0
  },
  {
    name: "The Daily Life of the Immortal King - Wang Ling Marathon",
    category: "cultivation",
    league: "Faction Battle",
    stream_key: "immortal-king-marathon",
    match_timestamp: Math.floor(Date.now() / 1000) + 5460,
    embed_url: "https://streamfree.top/embed/basketball/hornets-vs-celtics",
    thumbnail_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80",
    viewers: 0
  },
  {
    name: "Dragon Prince Yuan - Zhou Yuan's Domain Trial",
    category: "adventure",
    league: "Cangxuan Sect",
    stream_key: "yuan-domain-trial",
    match_timestamp: Math.floor(Date.now() / 1000) + 9060,
    embed_url: "https://streamfree.top/embed/basketball/thunder-vs-warriors",
    thumbnail_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    viewers: 0
  },
  {
    name: "Swallowed Star - Luo Feng Space Travel",
    category: "sci-fi",
    league: "Virtual Universe",
    stream_key: "swallowed-star-trial",
    match_timestamp: Math.floor(Date.now() / 1000) - 2400,
    embed_url: "https://streamfree.top/embed/soccer/ghana-vs-england",
    thumbnail_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    viewers: 1290
  },
  {
    name: "Renegade Immortal - Wang Lin's Tribulation",
    category: "cultivation",
    league: "Heng Yue Sect Arc",
    stream_key: "renegade-tribulation",
    match_timestamp: Math.floor(Date.now() / 1000) + 7200,
    embed_url: "https://streamfree.top/embed/cricket/india-vs-australia",
    thumbnail_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    viewers: 0
  }
];

const SERIES_METADATA: Record<string, SeriesContext> = {
  btth: {
    slug: "battle-through-the-heavens",
    synopsis: "Xiao Yan, a young cultivation genius who lost his powers, makes a promise to fight the Misty Cloud Sect and restore his family honor.",
    studio: "Yuewen Animation",
    director: "Gu Zhenjie",
    genres: ["Cultivation", "Action", "Fantasy"],
    rating: "9.2/10",
    characters: [
      { name: "Xiao Yan", role: "Protagonist", avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80", cultivation: "Dou Zong", ability: "Heavy Ruler", relationship: "Xiao Clan" },
      { name: "Medusa", role: "Queen", avatar: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80", cultivation: "Dou Zong", ability: "Heaven Swallowing Python", relationship: "Snake Tribe" },
      { name: "Yao Lao", role: "Mentor", avatar: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80", cultivation: "Dou Zun", ability: "Bone Chilling Flame", relationship: "Alchemist Pavilion" },
      { name: "Xun Er", role: "Heroine", avatar: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=300&q=80", cultivation: "Dou Huang", ability: "Golden Emperor Flame", relationship: "Gu Clan" }
    ],
    realms: [
      { rank: "Dou Zhe", description: "First major realm where Dou Qi forms a vortex in the dantian." },
      { rank: "Dou Shi", description: "Dou Qi solidifies into a liquid state." },
      { rank: "Dou Ling", description: "Dou Qi forms a physical crystal armor." },
      { rank: "Dou Huang", description: "Allows flight without wings using natural spatial energy." },
      { rank: "Dou Zong", description: "Can manipulate space and freeze flight paths." }
    ],
    lore: [
      { title: "Heavenly Flames", content: "Extremely rare flames formed from the essence of nature, granting unmatched power to Alchemists." }
    ]
  },
  soul_land: {
    slug: "soul-land",
    synopsis: "Tang San, reincarnated into the martial world of Soul Land, trains his twin spirits to avenge his mother and protect his friends.",
    studio: "Sparkly Key Animation",
    director: "Shen Leping",
    genres: ["Martial Arts", "Fantasy", "Action"],
    rating: "9.0/10",
    characters: [
      { name: "Tang San", role: "Protagonist", avatar: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80", cultivation: "Title Douluo", ability: "Clear Sky Hammer", relationship: "Tang Sect" },
      { name: "Xiao Wu", role: "Companion", avatar: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80", cultivation: "Title Douluo", ability: "Soft Bone Rabbit", relationship: "Shrek Seven Devils" },
      { name: "Dai Mubai", role: "Captain", avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80", cultivation: "Title Douluo", ability: "White Tiger", relationship: "Shrek Seven Devils" }
    ],
    realms: [
      { rank: "Spirit Scholar", description: "Levels 1 to 10. The foundation of soul power." },
      { rank: "Spirit Grandmaster", description: "Levels 21 to 30. Standard combatant rank." },
      { rank: "Spirit Sage", description: "Levels 71 to 80. Unlocks the Spirit Avatar." },
      { rank: "Title Douluo", description: "Levels 91 to 99. The peak of power in Soul Land." }
    ],
    lore: [
      { title: "Spirit Rings", content: "Obtained by hunting Soul Beasts. The age of the beast determines the power and color of the ring." }
    ]
  },
  hob: {
    slug: "heaven-officials-blessing",
    synopsis: "Xie Lian, the crown prince of Xianle who ascended to heaven for the third time, meets a mysterious ghost king named Hua Cheng.",
    studio: "Haoliners Animation",
    director: "Li Haoling",
    genres: ["Fantasy", "Historical", "Romance"],
    rating: "9.5/10",
    characters: [
      { name: "Xie Lian", role: "Crown Prince", avatar: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80", cultivation: "Ascended God", ability: "Ruoye Silk Band", relationship: "Heavenly Court" },
      { name: "Hua Cheng", role: "Ghost King", avatar: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80", cultivation: "Devastation Rank", ability: "Wraiths / Saber", relationship: "Ghost City" }
    ],
    realms: [
      { rank: "Heavenly God", description: "Ascended beings who receive worship and spiritual power from mortals." },
      { rank: "Fierce Ghost", description: "Standard vengeful spirit seeking rest or chaos." },
      { rank: "Wrath Ghost", description: "Highly dangerous entities capable of destroying cities." },
      { rank: "Devastation Ghost", description: "The ultimate tier of demon kings capable of challenging heaven." }
    ],
    lore: [
      { title: "Ascension", content: "A heavenly tribulation triggered when a mortal reaches high spiritual enlightenment, granting godhood." }
    ]
  },
  immortal_king: {
    slug: "the-daily-life-of-the-immortal-king",
    synopsis: "Wang Ling is a high school student with incomprehensible immortal powers that he must suppress to live a normal life.",
    studio: "Haoliners Animation",
    director: "Li Haoling",
    genres: ["Cultivation", "Comedy", "Fantasy"],
    rating: "8.9/10",
    characters: [
      { name: "Wang Ling", role: "Protagonist", avatar: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80", cultivation: "Immortal King", ability: "Jingke Sword", relationship: "Sixty-Core High" },
      { name: "Sun Rong", role: "Heroine", avatar: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=300&q=80", cultivation: "Heavenly Realm", ability: "Water Sword", relationship: "Sun Group" }
    ],
    realms: [
      { rank: "Foundation Stage", description: "Standard high school cultivator level." },
      { rank: "Immortal Realm", description: "Peak cosmic cultivation rank." }
    ],
    lore: [
      { title: "Talisman Seal", content: "Paper talisman attached to Wang Ling to seal his universe-destroying spiritual aura." }
    ]
  },
  swallowed_star: {
    slug: "swallowed-star",
    synopsis: "Luo Feng awakens spiritual reader powers after a monster invasion, embarking on a cosmic journey across galaxies.",
    studio: "Sparkly Key Animation",
    director: "Shen Leping",
    genres: ["Sci-Fi", "Action", "Cultivation"],
    rating: "9.3/10",
    characters: [
      { name: "Luo Feng", role: "Protagonist", avatar: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80", cultivation: "Sector Lord", ability: "Nine Yuans Shuttle", relationship: "Virtual Universe" },
      { name: "Xu Xin", role: "Heroine", avatar: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80", cultivation: "Stellar Realm", ability: "Business Genius", relationship: "HR Alliance" },
      { name: "Hong", role: "Founder", avatar: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80", cultivation: "Domain Lord", ability: "Spear God", relationship: "Dojo of Limits" }
    ],
    realms: [
      { rank: "Star Traveller", description: "First interstellar realm capable of surviving in vacuum." },
      { rank: "Sector Lord", description: "Controls an entire world realm in internal space." }
    ],
    lore: [
      { title: "Virtual Universe", content: "Quantum virtual network spanning galaxies for martial training and commerce." }
    ]
  },
  renegade_immortal: {
    slug: "renegade-immortal",
    synopsis: "Wang Lin, an ordinary youth with mediocre aptitude, walks the brutal path of ruthless cultivation to defy fate itself.",
    studio: "Foch Film",
    director: "An Tingting",
    genres: ["Cultivation", "Action", "Dark Fantasy"],
    rating: "9.5/10",
    characters: [
      { name: "Wang Lin", role: "Protagonist", avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80", cultivation: "Ascendant God", ability: "Ji Realm Lightning", relationship: "Heng Yue Sect" },
      { name: "Li Muwan", role: "Heroine", avatar: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80", cultivation: "Alchemist Master", ability: "Soul Pill", relationship: "Yun Tian Sect" },
      { name: "Situ Nan", role: "Mentor", avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80", cultivation: "Spirit Sovereign", ability: "Heavenly Bead", relationship: "Su Kingdom" },
      { name: "Liu Mei", role: "Rival", avatar: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=300&q=80", cultivation: "Daoist Maiden", ability: "Nine Illusion Soul", relationship: "Huan Zhen Sect" }
    ],
    realms: [
      { rank: "Qi Condensation", description: "Initial 15 levels of purifying spiritual energy." },
      { rank: "Foundation Establishment", description: "Condensing spiritual liquid into liquid core." },
      { rank: "Nascent Soul", description: "Forming immortal infant in dantian." },
      { rank: "Ascendant God", description: "Dominating spatial laws and soul reincarnation." }
    ],
    lore: [
      { title: "Ji Realm", content: "An extremely lethal mutated domain where one stroke of lightning destroys the target's soul instantly." }
    ]
  }
};

const CHAT_USERNAMES = [
  "QiMaster99", "DonghuaFan", "MartialKing", "SpiritDaoist", "CultivatorX", "LuoFeng_ST", "XiaoYan_Fire"
];

const CHAT_RANKS = [
  "Qi Condensation I", "Qi Condensation VII", "Foundation Establishment", "Golden Core III", "Nascent Soul"
];

const CHAT_COLORS = [
  "text-pink-400", "text-purple-400", "text-cyan-400", "text-emerald-400", "text-amber-400", "text-blue-400"
];

const MOCK_CHAT_MESSAGES = [
  "Xiao Yan is holding back his powers again! Misty Cloud Sect is toast!",
  "wtf is this episode, the animation is 10/10 ðŸ”¥",
  "Will Tang San ascend to godhood this episode? What do you think?",
  "Xie Lian and Hua Cheng are so wholesome",
  "Is the stream free? Yes, no subscription needed!",
  "Anyone online from the Golden Core faction?",
  "That's the Tang San we know and love",
  "WHAT A FIGHT!!! The CGI is insane!",
  "Did he just use the Buddha Fury Fire Lotus? OMG",
  "Wang Ling just wanted to eat his crispy noodles in peace ðŸ˜‚",
  "This live marathon is the best thing ever.",
  "Which cultivation stage are you guys on? I'm currently at Qi Condensation VII."
];

export default function Sports() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([
    "cultivation", "fantasy", "martial arts", "sci-fi", "historical", "adventure"
  ]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiMode, setApiMode] = useState<"live" | "demo">("live");
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Custom states
  const [quality, setQuality] = useState<string>("1080p");
  const [server, setServer] = useState<string>("Server 1");
  const [isTheater, setIsTheater] = useState<boolean>(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<"overview" | "characters" | "world" | "discussion" | "related">("overview");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Messages
  useEffect(() => {
    const initialChats: ChatMessage[] = Array.from({ length: 8 }).map((_, idx) => {
      const uIdx = Math.floor(Math.random() * CHAT_USERNAMES.length);
      const rIdx = Math.floor(Math.random() * CHAT_RANKS.length);
      const cIdx = Math.floor(Math.random() * CHAT_COLORS.length);
      const mIdx = Math.floor(Math.random() * MOCK_CHAT_MESSAGES.length);
      return {
        id: `chat-init-${idx}`,
        username: CHAT_USERNAMES[uIdx],
        rank: CHAT_RANKS[rIdx],
        message: MOCK_CHAT_MESSAGES[mIdx],
        timestamp: new Date(Date.now() - (8 - idx) * 10000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatarColor: CHAT_COLORS[cIdx],
        isMod: idx === 2
      };
    });
    setChatMessages(initialChats);
  }, []);

  // Simulate Live Chat updates
  useEffect(() => {
    const interval = setInterval(() => {
      const uIdx = Math.floor(Math.random() * CHAT_USERNAMES.length);
      const rIdx = Math.floor(Math.random() * CHAT_RANKS.length);
      const cIdx = Math.floor(Math.random() * CHAT_COLORS.length);
      const mIdx = Math.floor(Math.random() * MOCK_CHAT_MESSAGES.length);
      
      const newChat: ChatMessage = {
        id: `chat-live-${Date.now()}`,
        username: CHAT_USERNAMES[uIdx],
        rank: CHAT_RANKS[rIdx],
        message: MOCK_CHAT_MESSAGES[mIdx],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatarColor: CHAT_COLORS[cIdx],
        isMod: Math.random() > 0.95
      };
      
      setChatMessages(prev => [...prev.slice(-30), newChat]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat only if user is already near the bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isAtBottom || chatMessages.length <= 9) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const mapSportCategory = (sportCat: string): string => {
    const mapping: Record<string, string> = {
      soccer: "cultivation",
      basketball: "fantasy",
      hockey: "martial arts",
      combat: "historical",
      baseball: "adventure",
      football: "cultivation",
      racing: "sci-fi",
      tennis: "fantasy",
      cricket: "martial arts"
    };
    return mapping[sportCat] || "adventure";
  };

  const mapSportsToDonghua = (sportStream: StreamItem, index: number): StreamItem => {
    const template = DONGHUA_TEMPLATES[index % DONGHUA_TEMPLATES.length];
    const streamName = sportStream?.name || "Live Channel";
    const originalShort = streamName.split(" vs ")[0] || "Live";
    const displayName = `${template.name} [Live Stream Feed: ${originalShort}]`;
    
    return {
      ...sportStream,
      name: displayName,
      category: template.category || "cultivation",
      league: template.league || "Tournament"
    };
  };

  // Fetch from StreamFree API
  const fetchApiData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const catRes = await fetch("https://streamfree.top/api/v1/categories");
      if (!catRes.ok) throw new Error(`HTTP Error: ${catRes.status}`);
      const catData = await catRes.json();
      if (catData && Array.isArray(catData.categories)) {
        const mappedCats = Array.from(new Set(catData.categories.map(mapSportCategory))) as string[];
        setCategories(mappedCats);
      }

      const streamRes = await fetch("https://streamfree.top/api/v1/streams");
      if (!streamRes.ok) throw new Error(`HTTP Error: ${streamRes.status}`);
      const streamData = await streamRes.json();
      
      if (streamData && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
        const mappedStreams = streamData.streams.map((s: StreamItem, idx: number) => {
          const mapped = mapSportsToDonghua(s, idx);
          return {
            ...mapped,
            viewers: s?.viewers ?? Math.floor(Math.random() * 400) + 12
          };
        });

        let filtered = mappedStreams;
        if (activeCategory !== "all") {
          filtered = mappedStreams.filter((s: StreamItem) => s && s.category === activeCategory);
        }

        setStreams(filtered);
        if (filtered.length > 0) {
          setSelectedStream(filtered[0]);
        } else {
          setSelectedStream(null);
        }
      } else {
        setStreams(MOCK_STREAMS);
        setSelectedStream(MOCK_STREAMS[0]);
        setApiError("No live sports streams online. Switched to simulated channels.");
        setApiMode("demo");
      }
    } catch (err: any) {
      setApiError(`StreamFree API connection offline: ${err.message}. Operating in Simulated Demo mode.`);
      setApiMode("demo");
      
      let filtered = MOCK_STREAMS;
      if (activeCategory !== "all") {
        filtered = MOCK_STREAMS.filter(s => s && s.category === activeCategory);
      }
      setStreams(filtered);
      if (filtered.length > 0) {
        setSelectedStream(filtered[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiMode === "live") {
      fetchApiData();
    } else {
      let filtered = MOCK_STREAMS;
      if (activeCategory !== "all") {
        filtered = MOCK_STREAMS.filter(s => s && s.category === activeCategory);
      }
      setStreams(filtered);
      if (filtered.length > 0) {
        setSelectedStream(filtered[0]);
      } else {
        setSelectedStream(null);
      }
      setApiError(null);
    }
  }, [apiMode, activeCategory]);

  const selectPreviousStream = () => {
    if (!selectedStream) return;
    const idx = streams.findIndex(s => s && s.stream_key === selectedStream.stream_key);
    if (idx > 0) {
      setSelectedStream(streams[idx - 1]);
    }
  };

  const selectNextStream = () => {
    if (!selectedStream) return;
    const idx = streams.findIndex(s => s && s.stream_key === selectedStream.stream_key);
    if (idx < streams.length - 1) {
      setSelectedStream(streams[idx + 1]);
    }
  };

  // Determine current playing series metadata safely
  const currentSeriesMeta = useMemo(() => {
    if (!selectedStream || !selectedStream.name) return SERIES_METADATA.btth;
    const name = selectedStream.name;
    if (name.includes("Soul Land")) return SERIES_METADATA.soul_land;
    if (name.includes("Blessing") || name.includes("Heaven")) return SERIES_METADATA.hob;
    return SERIES_METADATA.btth;
  }, [selectedStream]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground transition-all duration-300">
      
      {/* Fixed backdrop (handles cover sizing relative to viewport, preventing tall-page zoom-in bugs) */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 animate-fade-in pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 10, 0.45), rgba(5, 6, 10, 0.9)), url(${watchBg})`,
        }}
      />
      {/* Bottom transition blend overlay (sits at bottom of scrollable page to fade background into footer) */}
      <div className="absolute bottom-0 left-0 right-0 h-[150px] md:h-[200px] bg-gradient-to-t from-background via-background/70 to-transparent z-0 pointer-events-none" />

      <div className="relative z-10 min-h-screen pt-24 pb-16 px-5 md:px-8 lg:px-12 max-w-[1440px] mx-auto flex flex-col gap-6 reveal-up">
      
      {/* Level 1: Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-white/5 select-none">
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
            <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
              Donghua Live Hub
            </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-black uppercase tracking-wider mt-1">
            <span>Live Broadcasts</span>
            <span>â€¢</span>
            <span className="text-primary">{selectedStream ? selectedStream.category : "Cultivation"}</span>
            <span>â€¢</span>
            <span>{quality}</span>
          </div>
        </div>

        {/* Source Configuration Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1">Relay Source:</span>
          <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-[12px]">
            <button
              onClick={() => setApiMode("live")}
              className={cn(
                "px-2.5 py-1 rounded-[8px] text-[9px] font-black uppercase tracking-wider transition-all",
                apiMode === "live" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Live API
            </button>
            <button
              onClick={() => setApiMode("demo")}
              className={cn(
                "px-2.5 py-1 rounded-[8px] text-[9px] font-black uppercase tracking-wider transition-all",
                apiMode === "demo" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Demo Mode
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchApiData}
            className="h-7 w-7 rounded-[12px] bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="bg-[#A855F7]/10 border border-[#A855F7]/25 text-[#A855F7] p-3 rounded-[12px] flex items-center gap-2.5 text-[11px] font-semibold text-left">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Main Workspace (Player + Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* PLAYER COLUMN (Spans 2 columns normally, or 3 columns in theater mode) */}
        <div className={cn(
          "flex flex-col gap-6 transition-all duration-300",
          isTheater ? "lg:col-span-3" : "lg:col-span-2"
        )}>
          {selectedStream ? (
            <div className="flex flex-col gap-4">
              
              {/* Responsive Iframe Video Player */}
              <div className="relative aspect-video rounded-[20px] overflow-hidden bg-black border border-white/5 shadow-2xl">
                <iframe
                  src={selectedStream.embed_url || ""}
                  className="absolute inset-0 w-full h-full"
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                  frameBorder="0"
                />
              </div>

              {/* Level 2: Playback Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-white/5 text-xs font-semibold text-muted-foreground select-none">
                
                {/* Previous/Next channels buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={selectPreviousStream}
                    className="rounded-[12px] h-9 px-4 text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-foreground"
                  >
                    â—€ Prev Channel
                  </Button>
                  <Button
                    onClick={selectNextStream}
                    className="rounded-[12px] h-9 px-4 text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-foreground"
                  >
                    Next Channel â–¶
                  </Button>
                </div>

                {/* Server Selector Crunchyroll-style */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-1">Server</span>
                  <div className="flex items-center bg-black/45 border border-white/5 p-1 rounded-[12px]">
                    {["Primary HLS", "Mirror 1", "Mirror 2"].map((servName) => (
                      <button
                        key={servName}
                        onClick={() => setServer(servName)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-[8px] text-[9px] font-black uppercase tracking-wider transition-all",
                          server === servName 
                            ? "bg-primary text-primary-foreground shadow" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {servName === "Primary HLS" ? "â— Primary HLS" : servName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theater & Picture in Picture controls */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const videoEl = document.querySelector("video");
                      if (videoEl && document.pictureInPictureEnabled) {
                        videoEl.requestPictureInPicture().catch(console.error);
                      }
                    }}
                    className="rounded-[12px] h-9 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-foreground text-[10px] font-black uppercase"
                  >
                    PiP
                  </Button>
                  <Button
                    onClick={() => setIsTheater(!isTheater)}
                    className={cn(
                      "rounded-[12px] h-9 px-3 text-[10px] font-black uppercase tracking-wider transition-all border",
                      isTheater 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-foreground"
                    )}
                  >
                    Theater
                  </Button>
                </div>

              </div>

            </div>
          ) : (
            <div className="aspect-video rounded-[20px] border border-white/5 bg-card/20 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm">
              <Tv className="h-12 w-12 text-muted-foreground/40 mb-2.5" />
              <h3 className="text-sm font-extrabold text-foreground">No Live Broadcast Selected</h3>
            </div>
          )}

          {/* Level 3: Understand What You're Watching (Tabs) */}
          <div className="space-y-6 pt-2">
            
            {/* Tabs Header */}
            <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
              {[
                { id: "overview", label: "Overview" },
                { id: "characters", label: "Characters" },
                { id: "world", label: "World Guide" },
                { id: "discussion", label: "Discussion" },
                { id: "related", label: "Related" }
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "px-5 pb-3 text-xs font-black uppercase tracking-widest border-b-2 border-transparent transition-all whitespace-nowrap",
                      active 
                        ? "text-primary border-primary" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}              {/* Overview panel */}
              {activeTab === "overview" && (
                <div className="bg-[#0c0d12]/60 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-left hover:border-primary/30 transition-all duration-300 animate-reveal-up">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-2.5">
                    OVERVIEW
                  </h3>

                  {/* Poster + Header Info Row */}
                  <div className="flex gap-4 sm:gap-5 items-start">
                    {/* Left Poster */}
                    <div className="w-24 sm:w-32 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-white/15 shadow-[0_10px_28px_rgba(0,0,0,0.45)] bg-[#0a0c14] relative group transition-all duration-500 hover:scale-[1.02]">
                      <img 
                        src={selectedStream?.thumbnail_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80"} 
                        alt={selectedStream?.name || "Series Poster"}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider border border-white/10">
                        SEASON
                      </div>
                    </div>

                    {/* Right Header Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <h4 className="text-base sm:text-xl font-black text-white leading-snug line-clamp-2">
                        {selectedStream?.name || "Donghua Series"}
                      </h4>

                      <span className="text-[10px] sm:text-xs text-primary font-black uppercase tracking-wider block">
                        {(currentSeriesMeta.slug || "DONGHUA LIVE").replaceAll("-", " ")}
                      </span>

                      <div className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 rounded-xl">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-black text-white">{currentSeriesMeta.rating || "9.3/10"}</span>
                        <span className="text-[9px] text-zinc-500 font-bold">| (125K)</span>
                      </div>
                    </div>
                  </div>

                  {/* Synopsis Paragraph */}
                  <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
                    {currentSeriesMeta.synopsis || "An epic cultivation donghua series filled with martial prowess, ancient secrets, and transcendent battles."}
                  </p>

                  <hr className="border-white/[0.06]" />

                  {/* 6 Metadata Items with Circular Icons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-3 py-0.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Status</span>
                        <span className="text-xs text-white font-extrabold truncate block leading-none">Ongoing</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Film className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Episodes</span>
                        <span className="text-xs text-white font-extrabold truncate block leading-none">12</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Duration</span>
                        <span className="text-xs text-white font-extrabold truncate block leading-none">24 min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Studio</span>
                        <span className="text-xs text-white font-extrabold truncate block leading-none">
                          {currentSeriesMeta.studio || "Tencent / Motion Magic"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Release</span>
                        <span className="text-xs text-white font-extrabold truncate block leading-none">2024</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] text-zinc-500 font-bold block uppercase leading-none mb-1">Country</span>
                        <span className="text-xs text-white font-extrabold truncate block leading-none">China</span>
                      </div>
                    </div>
                  </div>

                  {/* Genre Pills */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(currentSeriesMeta.genres || ["Fantasy", "Action", "Cultivation"]).map((genre) => (
                      <span 
                        key={genre} 
                        className="text-[10px] font-bold text-zinc-300 bg-white/[0.03] border border-white/[0.08] px-3 py-1 rounded-full hover:border-primary/40 hover:text-white transition-all cursor-default"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  {/* View Full Details Link */}
                  <button
                    onClick={() => navigate("/series/" + (currentSeriesMeta.slug || "battle-through-the-heavens"))}
                    className="text-xs font-black text-primary hover:text-purple-300 uppercase tracking-wider flex items-center gap-1.5 pt-1 transition-colors cursor-pointer group"
                  >
                    <span>VIEW FULL DETAILS</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {/* Characters panel */}
              {activeTab === "characters" && (
                <div className="animate-reveal-up">
                  <CharactersWidget
                    seriesSlug={currentSeriesMeta.slug || "battle-through-the-heavens"}
                    characters={currentSeriesMeta.characters ? currentSeriesMeta.characters.map((char) => ({
                      id: char.name.toLowerCase().split(" ").join("-"),
                      name: char.name,
                      role: char.role,
                      avatar: char.avatar,
                      image: char.avatar,
                      realmName: char.cultivation,
                      cultivation: char.cultivation,
                      alias: char.role,
                      faction: char.relationship,
                    })) : []}
                  />
                </div>
              )}

              {/* World Guide panel */}
              {activeTab === "world" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left py-1 animate-reveal-up">
                  <div className="border border-white/5 bg-white/[0.01] rounded-[16px] p-5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Cultivation Realms
                    </h3>
                    <div className="relative border-l border-white/10 ml-3 pl-4 space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin text-xs font-semibold">
                      {currentSeriesMeta.realms && currentSeriesMeta.realms.map((realm, idx) => (
                        <div key={realm.rank} className="relative group">
                          <span className={cn(
                            "absolute -left-[22px] top-1.5 w-2 h-2 rounded-full border border-white/20 bg-background transition-colors",
                            idx === 0 && "bg-emerald-500",
                            idx === 3 && "bg-primary"
                          )} />
                          <h5 className="font-bold text-foreground group-hover:text-primary transition-colors">{realm.rank}</h5>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{realm.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {currentSeriesMeta.lore && currentSeriesMeta.lore.map((sect) => (
                      <div key={sect.title} className="border border-white/5 bg-white/[0.01] rounded-[16px] p-5 space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 border-b border-white/5 pb-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          {sect.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-semibold">
                          {sect.content || ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussion (Simulated Live Chat inside Tab) */}
              {activeTab === "discussion" && (
                <div className="flex flex-col gap-4 h-[350px] border border-white/5 bg-white/[0.01] rounded-[16px] p-4 text-left animate-reveal-up">
                  {/* Chat header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 shrink-0 select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-400">
                        {selectedStream?.viewers ?? "1.4K"} Watching
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground font-mono">
                      LIVE CHAT
                    </span>
                  </div>

                  {/* Pinned admin banner */}
                  <div className="bg-[#A855F7]/10 border border-[#A855F7]/25 p-2 rounded-[12px] shrink-0 flex items-start gap-2">
                    <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="text-[9px] font-bold text-primary leading-normal uppercase tracking-wider">
                      <span className="font-black">Admin Pin:</span> Stay friendly and discuss realms and fights!
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin [scrollbar-width:thin]"
                  >
                    {chatMessages.map(msg => (
                      <div key={msg.id} className="text-[10.5px] leading-relaxed">
                        <div className="flex items-center flex-wrap gap-x-1.5">
                          <span className="text-[7.5px] bg-[#A855F7]/20 border border-[#A855F7]/30 text-primary px-1 py-0.5 rounded font-black uppercase tracking-wider scale-90">
                            {msg.rank}
                          </span>
                          <span className={cn("font-black hover:underline cursor-pointer", msg.avatarColor)}>
                            {msg.username}
                          </span>
                        </div>
                        <p className="text-slate-300 font-medium mt-0.5">{msg.message}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </div>
              )}

              {/* Related list */}
              {activeTab === "related" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 py-2 animate-reveal-up">
                  {streams.map((item, idx) => (
                    <div 
                      key={item?.stream_key || ("rel-stream-" + idx)}
                      onClick={() => setSelectedStream(item)}
                      className="group flex flex-col gap-2 cursor-pointer text-left"
                    >
                      <div className="aspect-[3/4] rounded-[16px] overflow-hidden border border-white/5 bg-black relative">
                        <img 
                          src={item?.thumbnail_url || ""} 
                          alt={item?.name || "Channel"} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute top-2.5 left-2.5 text-[8px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Live
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-foreground truncate mt-1 group-hover:text-primary transition-all">
                        {(item?.name || "Channel").split(" - ")[0]}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase">{item?.category || ""}</p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: EPISODES/CHANNELS SIDEBAR (Desktop Only, hidden in theater mode) */}
        <div className={cn(
          "lg:col-span-1 space-y-5 transition-all duration-300 select-none",
          isTheater ? "hidden" : "hidden lg:block"
        )}>
          <div className="border border-white/5 bg-white/[0.01] rounded-[24px] p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-black tracking-wide text-foreground uppercase">
                Channels
              </h3>
              {/* Season Switcher */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-semibold">Broadcaster</span>
                <button className="flex items-center gap-1.5 font-bold text-foreground bg-white/5 border border-white/10 px-3 py-1 rounded-[12px] hover:bg-white/10 transition-all">
                  <span>Live</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Scrollable Channels List */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-2 scrollbar-thin">
              {streams.map((stream, idx) => {
                const isActive = selectedStream?.stream_key === stream?.stream_key;
                return (
                  <div
                    key={stream?.stream_key || ("sidebar-stream-" + idx)}
                    onClick={() => setSelectedStream(stream)}
                    className={cn(
                      "flex gap-3.5 py-3 border-b border-white/5 transition-all duration-200 cursor-pointer relative group",
                      isActive ? "opacity-100" : "opacity-75 hover:opacity-100"
                    )}
                  >
                    {/* Thumbnail Container */}
                    <div className="relative w-28 h-16 rounded-[12px] overflow-hidden flex-shrink-0 bg-black border border-white/5">
                      <img 
                        src={stream?.thumbnail_url || ""} 
                        alt={stream?.name || "Channel"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs font-black uppercase tracking-wider", isActive ? "text-primary animate-pulse" : "text-muted-foreground")}>
                          Channel {idx + 1}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          Live
                        </span>
                      </div>
                      <h4 className={cn("text-xs font-bold truncate mt-1 transition-colors", isActive ? "text-primary" : "text-foreground group-hover:text-primary")}>
                        {(stream?.name || "Channel").split(" [")[0].split(" - ")[0]}
                      </h4>
                      
                      {/* Active tag */}
                      {isActive && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[9px] font-black uppercase text-primary">Watching</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

      {/* Level 4: Discover (Recommendations at the bottom of the page) */}
      <div className="space-y-6 pt-12 pb-10 border-t border-white/5 mt-12 text-left select-none">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-lg font-black uppercase tracking-wide text-foreground">
            More Live Broadcasts
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">
            Trending Cultivation marathons
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {streams.slice(0, 5).map((item, idx) => (
            <div 
              key={"bottom-rec-" + (item?.stream_key || idx)}
              onClick={() => setSelectedStream(item)}
              className="group flex flex-col gap-2 cursor-pointer"
            >
              <div className="aspect-[3/4] rounded-[16px] overflow-hidden border border-white/5 bg-black relative">
                <img 
                  src={item?.thumbnail_url || ""} 
                  alt={item?.name || "Channel"} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute top-2.5 left-2.5 text-[8px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Live
                </span>
              </div>
              <h4 className="text-xs font-black text-foreground truncate mt-1 group-hover:text-primary transition-all">
                {(item?.name || "Channel").split(" - ")[0]}
              </h4>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">{item?.category || ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Developer API Response Code Inspector */}
      {selectedStream && (
        <div className="border border-white/5 bg-white/[0.01] rounded-[16px] p-5 flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground font-mono">
                API Response Inspector
              </h3>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono bg-white/5 px-2.5 py-1 rounded border border-white/5">
              {"GET /api/v1/streams/" + selectedStream.stream_key}
            </div>
          </div>
          <pre className="bg-black/60 text-emerald-400 font-mono text-[10px] p-4 rounded-xl overflow-x-auto border border-white/5 max-h-[160px] scrollbar-thin scrollbar-thumb-white/10 font-bold">
            {JSON.stringify(selectedStream, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="bg-[#0b0c16]/80 border border-white/5 p-4 rounded-[12px] flex items-start gap-3 text-xs text-muted-foreground font-semibold text-left select-none">
        <ShieldAlert className="h-5 w-5 text-[#A855F7] shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-black text-foreground mr-1 uppercase text-[10px] tracking-wider text-[#A855F7]">Copyright Note:</span>
          Before deploying streams to your public website, ensure you have the broadcast rights. StreamFree is an external player host.
        </div>
      </div>

      </div>
    </div>
  );
}
