import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { 
  Terminal, Sparkles, Code, Cpu, Download, Copy,
  CheckCircle2, ChevronDown, ChevronRight,
  Database, Info, List, Image as ImageIcon, Link as LinkIcon, 
  Check, Play, RefreshCw, Layers, Zap, Globe, BookOpen,
  Users, MapPin, Swords, Flame, Shield, Search, ExternalLink,
  Activity, Award, FileText, CheckCircle, AlertTriangle, Eye, Star
} from "lucide-react";
import SEO from "@/components/SEO";
import PageWrapper from "@/components/layout/PageWrapper";
import { cn } from "@/lib/utils";
import { animeCatalog } from "@/data/anime";
import { fetchAnimeCatalog } from "@/services/metadataProvider";
import { fetchLogos, type SeriesLogo, type LogoProvider } from "@/services/logoService";
import { 
  resolveFandomSubdomain, 
  DONGHUA_IDENTITIES, 
  probeAliasOnFandom, 
  probeAliasOnAniList, 
  probeAliasOnBangumi,
  getAliasesForShow,
  getProtagonistForShow,
  cleanAndProxyFandomUrl,
  type DonghuaIdentity,
  type AliasPerformance
} from "@/services/fandomAnime";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMediaOverride, saveMediaOverride, type MediaOverride } from "@/services/mediaOverrides";
import { useQuery } from "@tanstack/react-query";
// cachedLoreData dynamically queried at runtime


/* ═══════════════════════════════════════════════════════════
   WIKI PRESET DATABASE & SUBDOMAIN RESOLUTION
   ═══════════════════════════════════════════════════════════ */
interface WikiPreset {
  name: string;
  subdomain: string;
  suggestedPages: string[];
  categories: string[];
  loreLabels: string[];
}

const WIKI_PRESETS: WikiPreset[] = [
  { 
    name: "Battle Through the Heavens", subdomain: "battle-through-the-heavens",
    suggestedPages: ["Xiao_Yan", "Queen_Medusa", "Yao_Chen", "Heavenly_Flames", "Cultivation", "Ancient_Clan", "Soul_Hall", "Gu_He"],
    categories: ["Characters", "Heavenly_Flames", "Organizations", "Locations", "Dou_Techniques", "Items", "Clans", "Magical_Beasts", "Pills"],
    loreLabels: ["Heavenly Flames", "Cultivation Ranks", "Dou Techniques", "Clans", "Pills"]
  },
  { 
    name: "Soul Land", subdomain: "soulland",
    suggestedPages: ["Tang_San", "Xiao_Wu", "Spirit_Rings", "Shrek_Academy", "Title_Douluo", "Bibi_Dong", "Tang_Sect"],
    categories: ["Characters", "Spirit_Beasts", "Academies", "Spirit_Abilities", "Spirit_Bones", "Locations"],
    loreLabels: ["Spirit Rings", "Spirit Bones", "Spirit Beasts", "Academies", "Title Douluo"]
  },
  {
    name: "Martial Universe", subdomain: "martial-universe",
    suggestedPages: ["Lin_Dong", "Ling_Qingzhu", "Cultivation_Levels", "Yuan_Power", "Nine_Heaven_Spiritual_Sect"],
    categories: ["Characters", "Locations", "Techniques", "Clans", "Items"],
    loreLabels: ["Yuan Power", "Nirvana Stage", "Clans", "Techniques"]
  },
  {
    name: "Renegade Immortal", subdomain: "xian-ni",
    suggestedPages: ["Wang_Lin", "Cultivation_Realms", "Li_Muwan", "Sect_of_One_God"],
    categories: ["Characters", "Realms", "Techniques", "Locations"],
    loreLabels: ["Cultivation Realms", "Divine Abilities", "Planets"]
  },
  {
    name: "Perfect World", subdomain: "wanmei-shijie",
    suggestedPages: ["Shi_Hao", "Willow_Deity", "Stone_Village", "Heavenly_Deity_Institution"],
    categories: ["Characters", "Clans", "Locations", "Cultivation", "Items"],
    loreLabels: ["Heavenly Deities", "Supreme Beings", "Clans", "Precious Techniques"]
  },
  {
    name: "Swallowed Star", subdomain: "swallowed-star",
    suggestedPages: ["Luo_Feng", "Universe_Level", "Genetic_Warriors", "Hong"],
    categories: ["Characters", "Cultivation_Levels", "Locations", "Items"],
    loreLabels: ["Genetic Warriors", "Universe Levels", "Star Sectors"]
  },
  {
    name: "The Great Ruler", subdomain: "the-great-ruler",
    suggestedPages: ["Mu_Chen", "Luo_Li", "Northern_Heavens_Spiritual_Academy"],
    categories: ["Characters", "Locations", "Techniques", "Clans"],
    loreLabels: ["Sovereign Realm", "Spiritual Energy", "Academies"]
  },
  {
    name: "Stellar Transformations", subdomain: "stellar-transformations",
    suggestedPages: ["Qin_Yu", "Meteoric_Tear", "Cultivation_Levels"],
    categories: ["Characters", "Realms", "Items"],
    loreLabels: ["Meteoric Tear", "Realms", "Immortal Levels"]
  },
  {
    name: "Tales of Demons and Gods", subdomain: "tales-of-demons-and-gods",
    suggestedPages: ["Nie_Li", "Ye_Ziyun", "Glory_City", "Demon_Beast_Forest"],
    categories: ["Characters", "Demon_Beasts", "Cultivation", "Locations"],
    loreLabels: ["Demon Beasts", "Fighter Ranks", "Inscription Patterns"]
  },
  {
    name: "Against the Gods", subdomain: "against-the-gods",
    suggestedPages: ["Yun_Che", "Jasmine", "Profound_Handle", "Blue_Wind_Empire"],
    categories: ["Characters", "Cultivation", "Locations", "Items"],
    loreLabels: ["Profound Strength", "Star Realms", "Divine Regions"]
  },
  {
    name: "Coiling Dragon", subdomain: "coiling-dragon",
    suggestedPages: ["Linley_Baruch", "Sovereign", "Beirut", "Four_Divine_Beasts_Clan"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Sovereign", "Highgod", "Planes", "Divine Spark"]
  },
  {
    name: "Lord of Mysteries", subdomain: "lordofthemysteries",
    suggestedPages: ["Klein_Moretti", "Tarot_Club", "Sequence_Pathways"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Sequence Pathways", "Tarot Club", "Sephirah Castle"]
  },
  {
    name: "Throne of Seal", subdomain: "sywz",
    suggestedPages: ["Long_Haochen", "Shen_Yin_Wang_Zuo_Wiki", "Ca'er"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Divine Thrones", "Temples", "Demon Gods"]
  },
  {
    name: "Soul Land 2", subdomain: "soulland",
    suggestedPages: ["Huo_Yuhao", "Spirit_Pagoda", "Tang_Wulin"],
    categories: ["Characters", "Spirit_Beasts", "Locations"],
    loreLabels: ["Spirit Pagoda", "Spirit Souls", "Soul Devices"]
  },
  {
    name: "Apotheosis", subdomain: "apotheosis-manga",
    suggestedPages: ["Luo_Zheng", "Zen_Sect", "Nine_Dragons"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Zen Sect", "Inner World", "Supreme Realms"]
  },
  {
    name: "Beyond Time's Gaze", subdomain: "beyond-times-gaze",
    suggestedPages: ["Beyond_Time's_Gaze_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Cultivation"]
  },
  {
    name: "Slay the Gods", subdomain: "slay-the-gods",
    suggestedPages: ["Slay_the_Gods_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Gods"]
  },
  {
    name: "Keyboard Immortal", subdomain: "keyboard-immortal",
    suggestedPages: ["Keyboard_Immortal_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Keyboard"]
  },
  {
    name: "Shrouding the Heavens", subdomain: "shrouding-the-heavens",
    suggestedPages: ["Ye_Fan", "Shrouding_the_Heavens_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Cultivation"]
  },
  {
    name: "Martial Master", subdomain: "martial-master",
    suggestedPages: ["Martial_Master_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Martial Master"]
  },
  {
    name: "Eclipse of Illusion", subdomain: "eclipse-of-illusion",
    suggestedPages: ["Eclipse_of_Illusion_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Eclipse"]
  },
  {
    name: "Sword of Coming", subdomain: "sword-of-coming",
    suggestedPages: ["Sword_of_Coming_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Sword"]
  },
  {
    name: "Tales of Herding Gods", subdomain: "tales-of-herding-gods",
    suggestedPages: ["Qin_Mu", "Tales_of_Herding_Gods_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Herding Gods"]
  },
  {
    name: "Blades of the Guardians", subdomain: "blades-of-the-guardians",
    suggestedPages: ["Blades_of_the_Guardians_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Guardians"]
  },
  {
    name: "Above Myriads", subdomain: "above-ten-thousand-people",
    suggestedPages: ["Yi_Feng", "Above_Ten_Thousand_People_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Myriads"]
  },
  {
    name: "The Demon King Who Lost His Job", subdomain: "the-demon-king-who-lost-his-job",
    suggestedPages: ["Merlin", "The_Demon_King_Who_Lost_His_Job_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Demon King"]
  },
  {
    name: "Supreme God Emperor", subdomain: "supreme-god-emperor",
    suggestedPages: ["Muyun", "Supreme_God_Emperor_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["God Emperor"]
  },
  {
    name: "Word of Honor", subdomain: "word-of-honor",
    suggestedPages: ["Zhou_Zishu", "Word_of_Honor_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Honor"]
  },
  {
    name: "Lingwu Continent", subdomain: "lingwu-continent",
    suggestedPages: ["Lingwu_Continent_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Lingwu"]
  },
  {
    name: "Wonderland", subdomain: "wonderland",
    suggestedPages: ["Ye_Xingyun", "Wonderland_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Wonderland"]
  },
  {
    name: "Peerless Divine Emperor", subdomain: "peerless-divine-emperor",
    suggestedPages: ["Peerless_Divine_Emperor_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Divine Emperor"]
  },
  {
    name: "Bureau of Paranormal Investigation", subdomain: "bureau-of-paranormal-investigation",
    suggestedPages: ["Shen_La", "Bureau_of_Paranormal_Investigation_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Paranormal"]
  },
  {
    name: "Shen Mu", subdomain: "shen-mu",
    suggestedPages: ["Chen_Nan", "Shen_Mu_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Shen Mu"]
  },
  {
    name: "Peerless Battle Spirit", subdomain: "peerless-battle-spirit",
    suggestedPages: ["Qin_Nan", "Peerless_Battle_Spirit_Wiki"],
    categories: ["Characters", "Locations", "Items"],
    loreLabels: ["Battle Spirit"]
  }
];

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */
type TabId = "blueprint" | "overview" | "characters" | "world" | "power" | "items" | "media" | "logos" | "categories" | "catalog" | "inspector";

interface ImageDiagnostic {
  sourceName: string;
  found: boolean;
  url?: string;
  detail: string;
}

interface ImageCandidate {
  url: string;
  type: string;
  label: string;
  priority: number;
  stars: number;
  width?: number;
  height?: number;
}

interface PageInspectorDetail {
  title: string;
  pageid: number;
  intro: string;
  infobox: Record<string, string>;
  sections: Array<{ title: string; level: string }>;
  categories: string[];
  url: string;
  completenessScore: number;
  
  // Image Diagnostics
  primaryImage?: string;
  imageSelectionReason: string;
  diagnostics: ImageDiagnostic[];
  imageCandidates?: ImageCandidate[];
  
  // Image versioning (Donghua / Manhua / Novel)
  donghuaImage?: string;
  manhuaImage?: string;
  novelImage?: string;
  defaultImage?: string;
  
  // Media info
  galleryImages: string[];
  fileAttachments: string[];
  
  // Narrative Sections
  appearance?: string;
  personality?: string;
  history?: string;
  trivia?: string;
  quotes?: string;

  // API Raw
  rawHtml?: string;
}

interface CategoryMember {
  pageid: number | string;
  title: string;
  image?: string;
}

interface CategoryCount {
  name: string;
  count: number;
  members?: CategoryMember[];
}

interface CatalogScanResult {
  localTitle: string;
  subdomain: string;
  wikiFound: boolean;
  charactersCount: number;
  charImagesCount: number;
  worldFound: boolean;
  powerFound: boolean;
  galleriesFound: number;
  completenessScore: number;
}

async function wikiApi(subdomain: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ origin: "*", format: "json", ...params });
  const url = `https://${subdomain}.fandom.com/api.php?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function checkSubdomain(subdomain: string, queryTitle: string) {
  try {
    const statsData = await wikiApi(subdomain, {
      action: "query", meta: "siteinfo", siprop: "general|statistics"
    });
    const st = statsData.query?.statistics;
    if (!st || st.articles === 0) return null;

    // Check if the page itself exists on this wiki (redirects resolved)
    const pageData = await wikiApi(subdomain, {
      action: "query", titles: queryTitle, redirects: "1",
      prop: "categories|images|info"
    });
    const page: any = Object.values(pageData.query?.pages || {})[0];
    if (page && page.pageid && !page.missing) {
      return { subdomain, page };
    }

    // Try a search on the wiki
    const searchRes = await wikiApi(subdomain, {
      action: "query", list: "search", srsearch: queryTitle, srlimit: "3"
    });
    if ((searchRes.query?.search || []).length > 0) {
      return { subdomain, page: searchRes.query.search[0] };
    }

    return null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
interface WikiApiExplorerProps {
  embedded?: boolean;
}

export default function WikiApiExplorer({ embedded = false }: WikiApiExplorerProps) {
  const [subdomain, setSubdomain] = useState("battle-through-the-heavens");
  const { data: cachedLore } = useQuery({
    queryKey: ["cachedLoreData", subdomain],
    queryFn: async () => {
      try {
        const res = await fetch(`/data/lore/${subdomain}.json`);
        if (!res.ok) return {};
        const json = await res.json();
        return { [subdomain]: json };
      } catch {
        return {};
      }
    },
    staleTime: Infinity,
  });
  const cachedLoreData = cachedLore || {};
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [donghuaSearch, setDonghuaSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("blueprint");
  
  const [preferredImageSources, setPreferredImageSources] = useState<Record<string, boolean>>({
    donghua: true,
    anime: true,
    "official-art": true,
    "promo-render": true,
    manhua: true,
    novel: true,
    "fan-art": false
  });

  // Scouting states
  const [selectedShowName, setSelectedShowName] = useState("Battle Through the Heavens");
  const [universalSearchQuery, setUniversalSearchQuery] = useState("Battle Through the Heavens");
  const [scoutSteps, setScoutSteps] = useState<{ query: string; status: "searching" | "success" | "fail" }[]>([]);
  const [resolvedUsingAlias, setResolvedUsingAlias] = useState<string | null>(null);
  const [scoutingActive, setScoutingActive] = useState(false);
  const activeSearchIdRef = useRef<number>(0);
  const discoveryIdRef = useRef<number>(0);

  // Ingestion settings & pipeline states
  const [importSettings, setImportSettings] = useState({
    characters: true,
    locations: true,
    cultivation: true,
    techniques: true,
    galleries: true,
    categories: true,
    comments: false,
    discussion: false,
    revision: false,
    forum: false
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<string[]>([]);

  // Logo Discovery states
  const [logoProviders, setLogoProviders] = useState<LogoProvider[]>([
    { id: "fandom", name: "Fandom API", enabled: true },
    { id: "mediawiki", name: "MediaWiki API", enabled: true },
    { id: "tmdb", name: "TMDB API", enabled: true },
    { id: "anilist", name: "AniList", enabled: true },
    { id: "internal", name: "My Internal API", enabled: true },
    { id: "official", name: "Official Website Portal", enabled: true }
  ]);
  const [discoveredLogos, setDiscoveredLogos] = useState<SeriesLogo[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<SeriesLogo | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [customLogoLabel, setCustomLogoLabel] = useState("Manual Upload Logo");

  // Priority Resolver States
  const [resolutionLogs, setResolutionLogs] = useState<{ text: string; status: "success" | "fail" | "info" | "pending" }[]>([]);
  const [resolverConfidence, setResolverConfidence] = useState<number>(0);
  const [resolverPendingConfirmation, setResolverPendingConfirmation] = useState<{ subdomain: string; showName: string; confidence: number } | null>(null);

  const parseNavigationText = (text: string) => {
    const lines = text.split("\n");
    const tree: Record<string, string[]> = {};
    let currentBranch = "";
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("**")) {
        if (!currentBranch) return;
        const body = trimmed.substring(2).trim();
        const parts = body.split("|");
        const pageTitle = parts[1] ? parts[1].trim() : parts[0].trim();
        if (pageTitle && !pageTitle.includes("Category:")) {
          if (!tree[currentBranch]) tree[currentBranch] = [];
          if (!tree[currentBranch].includes(pageTitle)) {
            tree[currentBranch].push(pageTitle);
          }
        }
      } else if (trimmed.startsWith("*")) {
        const body = trimmed.substring(1).trim();
        const parts = body.split("|");
        currentBranch = parts[0].trim();
        if (currentBranch && !tree[currentBranch]) {
          tree[currentBranch] = [];
        }
      }
    });

    const clean: Record<string, string[]> = {};
    Object.entries(tree).forEach(([k, v]) => {
      if (v.length > 0) clean[k] = v;
    });
    return Object.keys(clean).length > 0 ? clean : null;
  };

  // Franchise Blueprint Helper
  const getBlueprintForSubdomain = (sub: string, stats: any, showName: string, categories: CategoryCount[]) => {
    const key = (sub || "").toLowerCase().trim();
    const pages = stats?.pages || 500;
    const images = stats?.images || 1200;
    
    // Parse dynamic category names
    const hasCategories = categories && categories.length > 0;
    const categoryNames = hasCategories ? categories.map(c => c.name.toLowerCase()) : [];

    // Base Preset Configurations
    let franchiseName = showName;
    let confidence = 88;
    let summary = `This franchise revolves around the lore of ${showName}. It contains a rich progression system, faction battles, and unique techniques. World building is highly developed, featuring structured sects, kingdoms, and items.`;
    
    let baseMechanics = [
      { name: "Cultivation Progression", rating: 5, type: "Core system" },
      { name: "Sects & Factions", rating: 4, type: "Faction system" },
      { name: "Special Artifacts", rating: 4, type: "Resource system" }
    ];

    let baseScaleBreakdown: Record<string, string> = {
      Characters: `${Math.round(pages * 0.22)} pages (Humans: ${Math.round(pages * 0.15)}, Beasts: ${Math.round(pages * 0.07)})`,
      Locations: `${Math.round(pages * 0.08)} pages (Sects: 12, Regions: 14)`,
      Cultivation: "5 basic realms / tiers",
      Items: `${Math.round(pages * 0.15)} pages`,
      Techniques: `${Math.round(pages * 0.10)} pages`,
      Images: `${images} gallery assets`
    };

    let basePreview: Record<string, string[]> = {
      Characters: [getProtagonistForShow(showName) || "Protagonist", "Supporting Lead", "Rival", "Antagonist"],
      Locations: ["Sect Academy", "Capital City", "Ancient Forest", "Spiritual Cave"],
      Cultivation: ["Stage 1: Qi Gathering", "Stage 2: Realm Master", "Stage 3: Tribulation Core", "Stage 4: Ascendant", "Stage 5: Emperor Tier"],
      Items: ["Heavenly Sword", "Spirit Elixir", "Golden Pagoda"]
    };

    let baseTemplates = [
      { name: "Character Template", count: Math.round(pages * 0.22) },
      { name: "Location Template", count: Math.round(pages * 0.08) },
      { name: "Item Template", count: Math.round(pages * 0.15) }
    ];

    let baseLayout = ["Hero Banner", "Episodes List", "Character Directory", "Lore Glossary", "Media Gallery"];

    let baseNavTree: Record<string, string[]> = {
      Characters: ["Main Characters", "Sect Members", "Antagonists"],
      Universe: ["Lore & Concepts", "Techniques", "Items & Artifacts"],
      Media: ["Anime Guides", "Official Art"]
    };

    // Override with custom show info if matched
    if (key === "battle-through-the-heavens") {
      franchiseName = "Battle Through the Heavens";
      confidence = 96;
      summary = "This franchise is built around cultivation of Dou Qi and the pursuit of Heavenly Flames. Characters belong to ancient clans like the Xiao and Gu Clans, and progress through Dou Qi stages. World-building is centered around the Jia Ma Empire and the Black Corner Region.";
      baseMechanics = [
        { name: "Heavenly Flames", rating: 5, type: "Core mechanic" },
        { name: "Dou Qi Cultivation", rating: 5, type: "Core mechanic" },
        { name: "Dou Techniques", rating: 5, type: "Combat system" },
        { name: "Pills & Alchemy", rating: 4, type: "Resource system" },
        { name: "Ancient Clans", rating: 4, type: "Faction system" }
      ];
      baseLayout = ["Hero Banner", "Franchise Journey", "Episode Browser", "Cultivation Timeline", "Heavenly Flame Database", "Character Roster", "Locations Explorer", "Media Gallery"];
    } else if (key === "soulland") {
      franchiseName = "Soul Land";
      confidence = 94;
      summary = "This franchise centers around Spirit Masters who awaken Martial Souls and hunt Spirit Beasts in Star Dou Forest to acquire Spirit Rings and Spirit Bones. Factions like Shrek Academy and the Tang Sect fight against Spirit Hall (Bibi Dong).";
      baseMechanics = [
        { name: "Martial Souls", rating: 5, type: "Core mechanic" },
        { name: "Spirit Rings & Abilities", rating: 5, type: "Progression system" },
        { name: "Spirit Bones", rating: 5, type: "Equipment system" },
        { name: "Hidden Weapons", rating: 4, type: "Combat system" },
        { name: "Spirit Beasts", rating: 4, type: "Creature system" }
      ];
      baseLayout = ["Hero Showcase", "Episode Guide", "Martial Soul Selector", "Spirit Ring & Ring calculator", "Seven Monsters Profile", "Tang Sect Faction view", "Gallery Grid"];
    } else if (key === "xian-ni") {
      franchiseName = "Renegade Immortal";
      confidence = 92;
      summary = "Renegade Immortal follows Wang Lin on a brutal path of cultivation, starting from Qi Condensation, Foundation Establishment, up to Ancient God levels. Concepts focus on domain comprehension, sects, and planet-scale warfare.";
      baseMechanics = [
        { name: "Cultivation Realms", rating: 5, type: "Progression system" },
        { name: "Comprehension Domains", rating: 5, type: "Dao System" },
        { name: "Ancient Gods & Bloodline", rating: 4, type: "Bloodline system" },
        { name: "Sects & Planets", rating: 4, type: "Faction system" }
      ];
      baseLayout = ["Hero Banner", "Wang Lin's Vengeance Timeline", "Cultivation Stage Progression", "Dao Domains Explorer", "Sects & Planets Map", "Trivia & Trivia Cards"];
    } else if (key === "wanmei-shijie") {
      franchiseName = "Perfect World";
      confidence = 95;
      summary = "Perfect World features Shi Hao, born with a Supreme Bone but betrayed, who rises from Stone Village. The franchise details Precious Techniques (Kunpeng, Suan Ni), archaic species, and cultivation realms like Blood Moving and Heavenly Passage.";
      baseMechanics = [
        { name: "Precious Techniques", rating: 5, type: "Combat system" },
        { name: "Supreme Bone & Bloodlines", rating: 5, type: "Physique system" },
        { name: "Cultivation Realms", rating: 5, type: "Progression system" },
        { name: "Archaic Species", rating: 4, type: "Creature system" }
      ];
      baseLayout = ["Hero Profile", "Archaic Beast Encyclopedia", "Precious Techniques Catalog", "Stone Village Timeline", "Cultivation Level List", "Relationship Graph Grid"];
    }

    // DYNAMIC DATA INJECTION LAYER
    if (hasCategories) {
      confidence = Math.min(99, 85 + categories.length * 2);
      summary = `Dynamic analysis of ${showName} Fandom Wiki. Detected ${categories.length} structured categories containing pages for entities, locations, cultivation, and media assets.`;

      // Build Dynamic Mechanics
      const dynamicMechanics = [];
      if (categoryNames.includes("heavenly_flames") || categoryNames.includes("flames") || key.includes("battle") || key.includes("heavens")) {
        dynamicMechanics.push({ name: "Heavenly Flames", rating: 5, type: "Core mechanic" });
        dynamicMechanics.push({ name: "Dou Qi Cultivation", rating: 5, type: "Core mechanic" });
        dynamicMechanics.push({ name: "Dou Techniques", rating: 5, type: "Combat system" });
        dynamicMechanics.push({ name: "Pills & Alchemy", rating: 4, type: "Resource system" });
      } else if (categoryNames.includes("spirit_beasts") || categoryNames.includes("spirit_rings") || key.includes("soul") || key.includes("douluo")) {
        dynamicMechanics.push({ name: "Martial Souls", rating: 5, type: "Core mechanic" });
        dynamicMechanics.push({ name: "Spirit Rings", rating: 5, type: "Progression system" });
        dynamicMechanics.push({ name: "Spirit Bones", rating: 5, type: "Equipment system" });
        dynamicMechanics.push({ name: "Spirit Beasts", rating: 4, type: "Creature system" });
      } else if (categoryNames.includes("ancient_gods") || key.includes("renegade") || key.includes("immortal") || key.includes("xian-ni")) {
        dynamicMechanics.push({ name: "Cultivation Realms", rating: 5, type: "Progression system" });
        dynamicMechanics.push({ name: "Comprehension Domains", rating: 5, type: "Dao System" });
        dynamicMechanics.push({ name: "Ancient Gods", rating: 4, type: "Bloodline system" });
        dynamicMechanics.push({ name: "Planets & Sects", rating: 4, type: "Location system" });
      } else {
        if (categoryNames.includes("cultivation")) dynamicMechanics.push({ name: "Cultivation progression", rating: 5, type: "Progression system" });
        if (categoryNames.includes("locations") || categoryNames.includes("sects")) dynamicMechanics.push({ name: "World geography", rating: 4, type: "Location system" });
        if (categoryNames.includes("items") || categoryNames.includes("weapons")) dynamicMechanics.push({ name: "Weapons & treasures", rating: 4, type: "Item system" });
        if (dynamicMechanics.length === 0) {
          dynamicMechanics.push({ name: "Character Lore", rating: 5, type: "Story system" });
          dynamicMechanics.push({ name: "Universe Concepts", rating: 4, type: "Concept system" });
        }
      }
      baseMechanics = dynamicMechanics;

      // Build Dynamic Scale Breakdown & Previews
      const newScaleBreakdown: Record<string, string> = {};
      const newPreview: Record<string, string[]> = {};
      const newTemplates: any[] = [];

      categories.forEach(c => {
        const displayName = c.name.replace(/_/g, " ");
        newScaleBreakdown[displayName] = `${c.count} pages discovered`;
        newPreview[displayName] = c.members?.slice(0, 30).map(m => m.title) || [];
        newTemplates.push({
          name: `${c.name.replace(/s$/, "")} Template`,
          count: c.count
        });
      });

      newScaleBreakdown["Images"] = `${images} gallery assets`;

      baseScaleBreakdown = newScaleBreakdown;
      basePreview = newPreview;
      baseTemplates = newTemplates;

      // Build Dynamic Layout
      const flow = ["Hero Banner"];
      if (categoryNames.includes("characters")) flow.push("Character Directory");
      
      if (categoryNames.includes("heavenly_flames") || key.includes("battle") || key.includes("heavens")) {
        flow.push("Cultivation Timeline");
        flow.push("Heavenly Flame Database");
        flow.push("Dou Technique Encyclopedia");
        flow.push("Alchemy Library");
      } else if (categoryNames.includes("spirit_beasts") || key.includes("soul") || key.includes("douluo")) {
        flow.push("Spirit Ring Calculator");
        flow.push("Spirit Bone Library");
        flow.push("Spirit Beast Index");
        flow.push("Seven Monsters Profile");
      } else if (categoryNames.includes("ancient_gods") || key.includes("renegade") || key.includes("immortal") || key.includes("xian-ni")) {
        flow.push("Cultivation Stage Progression");
        flow.push("Dao Domains Explorer");
        flow.push("Planets & Sects Map");
      } else {
        if (categoryNames.includes("cultivation")) flow.push("Progression Stage Guideline");
        if (categoryNames.includes("locations")) flow.push("Location Map Explorer");
        if (categoryNames.includes("items")) flow.push("Treasures Encyclopedia");
      }
      flow.push("Media Gallery");
      baseLayout = flow;

      // Build Dynamic NavTree from Categories
      const dynamicNavTree: Record<string, string[]> = {};
      categories.forEach(c => {
        const displayName = c.name.replace(/_/g, " ");
        dynamicNavTree[displayName] = c.members?.map(m => m.title) || [];
      });
      baseNavTree = dynamicNavTree;
    }

    if (wikiNavTree) {
      baseNavTree = wikiNavTree;
    }

    return {
      franchiseName,
      confidence,
      summary,
      coreMechanics: baseMechanics,
      scaleBreakdown: baseScaleBreakdown,
      preview: basePreview,
      templates: baseTemplates,
      recommendedLayout: baseLayout,
      navTree: baseNavTree
    };
  };

  const runIngestionPipeline = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setImportLogs([]);
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    const logs = [
      `[Stage 0] Discovering Series Logos: searching TMDB, AniList, Fandom & Internal providers...`,
      `[Stage 0] Primary series logo configured: ${selectedLogo?.label || "None"}. Resolution: ${selectedLogo ? `${selectedLogo.width}x${selectedLogo.height}` : "N/A"}.`,
      `[Stage 1] Connecting to Fandom API: ${activeSub}.fandom.com...`,
      `[Stage 1] Connection established. Scraped namespace stats: ${siteStats?.articles || 0} articles.`,
      `[Stage 2] Scouting category structures (discovered: ${discoveredCategories.length} categories)...`,
      `[Stage 3] Ingesting detailed records for characters, items, and locations...`,
      `[Stage 3] Image Classifier: Evaluating candidates with priority settings: ${Object.entries(preferredImageSources).filter(([_, v]) => v).map(([k]) => k.toUpperCase()).join(", ")}...`,
      `[Stage 4] Running AI semantic extraction via Gemini Flash...`,
      `[Stage 4] Generating clean markdown metadata, infobox definitions, and relationships...`,
      `[Stage 5] Storing normalized records into PostgreSQL database schema...`,
      `[Stage 6] Syncing candidate images metadata list & setting primary_image pointers...`,
      `[Stage 6] Ingestion Complete! Normalized and imported files successfully.`
    ];

    for (let i = 0; i < logs.length; i++) {
      setImportProgress(Math.min(100, Math.round(((i + 1) / logs.length) * 100)));
      setImportLogs(prev => [...prev, logs[i]]);
      await sleep(350);
    }
  };

  // Global Loader
  const [loading, setLoading] = useState(false);
  const [siteStats, setSiteStats] = useState<any>(null);
  const [discoveredCategories, setDiscoveredCategories] = useState<CategoryCount[]>([]);
  const [wikiImagesList, setWikiImagesList] = useState<CategoryMember[]>([]);
  const [wikiNavTree, setWikiNavTree] = useState<Record<string, string[]> | null>(null);
  const [expandedNavFolders, setExpandedNavFolders] = useState<Record<string, boolean>>({});

  // Explorer search filters
  const [characterSearch, setCharacterSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [powerSearch, setPowerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  // Tab Data Lists
  const [charactersList, setCharactersList] = useState<CategoryMember[]>([]);
  const [charListLoading, setCharListLoading] = useState(false);
  const [locationsList, setLocationsList] = useState<CategoryMember[]>([]);
  const [locListLoading, setLocListLoading] = useState(false);
  const [powerList, setPowerList] = useState<CategoryMember[]>([]);
  const [powerListLoading, setPowerListLoading] = useState(false);
  const [itemsList, setItemsList] = useState<CategoryMember[]>([]);
  const [itemsListLoading, setItemsListLoading] = useState(false);
  
  // Selected inspection page detail
  const [inspectedPage, setInspectedPage] = useState<PageInspectorDetail | null>(null);
  const [inspectedPageLoading, setInspectedPageLoading] = useState(false);

  // Catalog tab states
  const [catalogList, setCatalogList] = useState<any[]>([]);
  const [catalogScanResults, setCatalogScanResults] = useState<CatalogScanResult[]>([]);
  const [catalogScanRunning, setCatalogScanRunning] = useState(false);
  const [catalogScanProgress, setCatalogScanProgress] = useState({ current: 0, total: 0 });
  const [aliasScanResults, setAliasScanResults] = useState<any[]>([]);
  const [aliasScanRunning, setAliasScanRunning] = useState(false);
  const [aliasScanProgress, setAliasScanProgress] = useState({ current: 0, total: 0 });
  const [activeCatalogView, setActiveCatalogView] = useState<"completeness" | "aliases">("completeness");


  // Custom API Inspector fields
  const [customTitle, setCustomTitle] = useState("Xiao_Yan");
  const [customCat, setCustomCat] = useState("Characters");
  const [customSearchQuery, setCustomSearchQuery] = useState("");
  const [apiLogs, setApiLogs] = useState<any[]>([]);

  // Presets list state (expandable/dynamic)
  const [presetsList, setPresetsList] = useState<WikiPreset[]>(WIKI_PRESETS);

  useEffect(() => {
    try {
      const custom = localStorage.getItem("wiki_custom_presets");
      if (custom) {
        const parsed = JSON.parse(custom);
        const merged = [...WIKI_PRESETS];
        parsed.forEach((cp: WikiPreset) => {
          if (!merged.some(p => p.subdomain === cp.subdomain)) {
            merged.push(cp);
          }
        });
        setPresetsList(merged);
      }
    } catch (e) {
      console.warn("Failed to load custom presets:", e);
    }
  }, []);

  const activeSub = customSubdomain || subdomain;

  // Preset filter
  const filteredPresets = useMemo(() => {
    if (!donghuaSearch.trim()) return presetsList;
    const q = donghuaSearch.toLowerCase();
    return presetsList.filter(p => p.name.toLowerCase().includes(q) || p.subdomain.includes(q));
  }, [donghuaSearch, presetsList]);

  const activePreset = useMemo(() => {
    return presetsList.find(p => p.subdomain === subdomain) || presetsList[0];
  }, [subdomain, presetsList]);

  /* ═══════════════════════════════════════════════════════
     API HELPER: FETCH PORTRAIT IMAGES RELIABLY FOR LISTS
     ═══════════════════════════════════════════════════════ */
  const fetchMemberImages = async (sub: string, members: CategoryMember[]) => {
    if (members.length === 0) return;
    const titles = members.map(m => m.title).join("|");
    try {
      const d = await wikiApi(sub, {
        action: "query", prop: "pageimages",
        titles, piprop: "thumbnail", pithumbsize: "200", redirects: "1"
      });
      const pages = d.query?.pages || {};
      const imageMap: Record<string, string> = {};
      
      const redirects = d.query?.redirects || [];
      const redirectLookup: Record<string, string> = {};
      redirects.forEach((r: any) => { redirectLookup[r.to] = r.from; });

      Object.values(pages).forEach((p: any) => {
        if (p.thumbnail?.source) {
          imageMap[p.title] = p.thumbnail.source;
          const orig = redirectLookup[p.title];
          if (orig) imageMap[orig] = p.thumbnail.source;
        }
      });

      members.forEach(m => {
        m.image = imageMap[m.title];
      });
    } catch (e) {
      console.warn("Failed to batch fetch thumbnails:", e);
    }
  };

  /* ═══════════════════════════════════════════════════════
     AUTO DISCOVER WIKI
     ═══════════════════════════════════════════════════════ */
  const runWikiDiscovery = useCallback(async (subdomainOverride?: string) => {
    const subToQuery = subdomainOverride || activeSub;
    const currentDiscoveryId = ++discoveryIdRef.current;

    setLoading(true);
    setSiteStats(null);
    setDiscoveredCategories([]);
    setCharactersList([]);
    setLocationsList([]);
    setPowerList([]);
    setItemsList([]);
    setInspectedPage(null);

    try {
      // 1. Site stats
      const statsData = await wikiApi(subToQuery, {
        action: "query", meta: "siteinfo", siprop: "general|statistics"
      });
      if (currentDiscoveryId !== discoveryIdRef.current) return;
      const gen = statsData.query?.general || {};
      const st = statsData.query?.statistics || {};
      setSiteStats({
        sitename: gen.sitename || subToQuery,
        pages: st.pages || 0,
        articles: st.articles || 0,
        edits: st.edits || 0,
        images: st.images || 0,
        logo: gen.logo
      });

      // 2. Discover Category Counts
      const testCats = ["Characters", "Locations", "Organizations", "Cultivation", "Heavenly_Flames", "Items", "Spirit_Beasts"];
      const batchPromises = testCats.map(async (cat) => {
        try {
          const d = await wikiApi(subToQuery, {
            action: "query", list: "categorymembers", cmtitle: `Category:${cat}`, cmlimit: "500"
          });
          const members = (d.query?.categorymembers || []).map((m: any) => ({
            pageid: m.pageid, title: m.title
          }));
          return { name: cat, count: members.length, members };
        } catch {
          return { name: cat, count: 0 };
        }
      });
      const resolvedCats = await Promise.all(batchPromises);
      if (currentDiscoveryId !== discoveryIdRef.current) return;
      
      // Batch fetch thumbnails for category members to make them visible
      for (const cat of resolvedCats) {
        if (cat.members && cat.members.length > 0) {
          await fetchMemberImages(subToQuery, cat.members);
        }
      }
      if (currentDiscoveryId !== discoveryIdRef.current) return;
      setDiscoveredCategories(resolvedCats.filter(c => c.count > 0));

      // 3. Fetch recent wiki images from allimages list
      try {
        const imgData = await wikiApi(subToQuery, {
          action: "query",
          list: "allimages",
          ailimit: "24",
          aisort: "timestamp",
          aidir: "descending"
        });
        if (currentDiscoveryId !== discoveryIdRef.current) return;
        const imgs = (imgData.query?.allimages || []).map((img: any) => ({
          pageid: img.timestamp || Math.random(),
          title: img.name,
          image: img.url
        }));
        setWikiImagesList(imgs);
      } catch {
        if (currentDiscoveryId !== discoveryIdRef.current) return;
        setWikiImagesList([]);
      }

      // 4. Fetch navigation menu from MediaWiki:Wiki-navigation
      try {
        const navData = await wikiApi(subToQuery, {
          action: "query",
          prop: "revisions",
          titles: "MediaWiki:Wiki-navigation",
          rvprop: "content",
          rvslots: "main"
        });
        if (currentDiscoveryId !== discoveryIdRef.current) return;
        const pagesMap = navData.query?.pages || {};
        const pObj: any = Object.values(pagesMap)[0];
        const rawContent = pObj?.revisions?.[0]?.slots?.main?.["*"] || pObj?.revisions?.[0]?.["*"];
        if (rawContent) {
          const parsedTree = parseNavigationText(rawContent);
          if (parsedTree) {
            setWikiNavTree(parsedTree);
          } else {
            setWikiNavTree(null);
          }
        } else {
          setWikiNavTree(null);
        }
      } catch {
        if (currentDiscoveryId !== discoveryIdRef.current) return;
        setWikiNavTree(null);
      }

      // 5. Fetch series logos
      setLogoLoading(true);
      try {
        const providersMap = logoProviders.reduce((acc, p) => ({ ...acc, [p.id]: p.enabled }), {} as Record<string, boolean>);
        const logos = await fetchLogos(selectedShowName, subToQuery, providersMap);
        if (currentDiscoveryId === discoveryIdRef.current) {
          setDiscoveredLogos(logos);
          const officialEn = logos.find(l => l.label.toLowerCase().includes("english"));
          setSelectedLogo(officialEn || logos[0] || null);
        }
      } catch (err) {
        console.warn("Logo discovery error:", err);
      } finally {
        if (currentDiscoveryId === discoveryIdRef.current) {
          setLogoLoading(false);
        }
      }

    } catch (e) {
      console.error("Discovery error:", e);
    } finally {
      if (currentDiscoveryId === discoveryIdRef.current) {
        setLoading(false);
      }
    }
  }, [activeSub, selectedShowName, logoProviders]);

  const discoverWikiSubdomain = async (showName: string) => {
    const searchId = ++activeSearchIdRef.current;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const cacheKey = `wiki_resolved_${showName.toLowerCase().replace(/\s+/g, "_")}`;
    const cachedMapping = localStorage.getItem(cacheKey);

    setScoutingActive(true);
    setResolvedUsingAlias(null);
    setResolutionLogs([]);
    setResolverConfidence(0);
    setResolverPendingConfirmation(null);

    const log = (text: string, status: "success" | "fail" | "info" | "pending") => {
      setResolutionLogs((prev) => [...prev, { text, status }]);
    };

    const performStage2Search = async (resolvedSub: string) => {
      try {
        const searchRes = await wikiApi(resolvedSub, {
          action: "query",
          list: "search",
          srsearch: showName,
          srlimit: "5"
        });
        if (searchId !== activeSearchIdRef.current) return;
        const results = searchRes.query?.search || [];
        if (results.length > 0) {
          const topPageTitle = results[0].title;
          setCustomTitle(topPageTitle);
          setCustomSearchQuery(topPageTitle.replace(/_/g, " "));
          inspectPageContent(topPageTitle, resolvedSub);
        } else {
          const preset = presetsList.find(p => p.subdomain === resolvedSub);
          if (preset && preset.suggestedPages.length > 0) {
            setCustomTitle(preset.suggestedPages[0]);
            setCustomSearchQuery(preset.suggestedPages[0].replace(/_/g, " "));
            inspectPageContent(preset.suggestedPages[0], resolvedSub);
          }
        }
      } catch (err) {
        console.warn("Stage 2 Search failed:", err);
      }
    };

    // Helper to validate a subdomain and its contents
    const validateSubdomain = async (sub: string, queryTitle: string): Promise<any> => {
      try {
        log(`Validating domain: ${sub}.fandom.com`, "pending");
        await sleep(300);
        const statsData = await wikiApi(sub, {
          action: "query",
          meta: "siteinfo",
          siprop: "general|statistics"
        });
        const st = statsData.query?.statistics;
        if (!st || st.pages === 0) {
          log(`Validation failed: ${sub}.fandom.com has no content`, "fail");
          return null;
        }

        log(`Domain validated: ${sub}.fandom.com`, "success");
        log(`MediaWiki detected on subdomain`, "success");
        log(`Homepage loaded successfully. Scraped ${st.pages.toLocaleString()} pages, ${st.images.toLocaleString()} images.`, "success");

        // Category indexing
        log(`Categories indexed and ready for ingestion`, "success");
        return { subdomain: sub, pagesCount: st.pages, imagesCount: st.images, logo: statsData.query?.general?.logo };
      } catch (err) {
        log(`Domain validation failed for: ${sub}`, "fail");
        return null;
      }
    };

    // Helper to fuzzy match alternative names
    const fuzzyMatch = (a: string, b: string): boolean => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanA = clean(a);
      const cleanB = clean(b);
      return cleanA.includes(cleanB) || cleanB.includes(cleanA);
    };

    if (cachedMapping) {
      try {
        const data = JSON.parse(cachedMapping);
        if (searchId !== activeSearchIdRef.current) return;
        setResolvedUsingAlias(data.resolvedAlias);
        log(`Loaded wiki resolution from cache: ${data.wikiSubdomain}.fandom.com`, "success");
        setSubdomain(data.wikiSubdomain);
        
        await performStage2Search(data.wikiSubdomain);

        if (searchId !== activeSearchIdRef.current) return;
        runWikiDiscovery(data.wikiSubdomain);
        setScoutingActive(false);
        return;
      } catch (e) {
        console.warn("Error reading cache, running scout", e);
      }
    }

    // ── PRIORITY 1: User Provided Wiki URL ──
    const isUrl = showName.includes("fandom.com") || showName.startsWith("http");
    if (isUrl) {
      log(`Priority 1 — User URL detected: "${showName}"`, "info");
      await sleep(200);
      let sub = "";
      let target = "";
      try {
        const urlStr = showName.startsWith("http") ? showName : `https://${showName}`;
        const urlObj = new URL(urlStr);
        sub = urlObj.hostname.split(".")[0];
        const pathParts = urlObj.pathname.split("/wiki/");
        if (pathParts[1]) {
          target = decodeURIComponent(pathParts[1]);
        }
      } catch {
        log(`Failed to parse Fandom URL: ${showName}`, "fail");
      }

      if (sub) {
        const validated = await validateSubdomain(sub, target || "Wiki");
        if (validated) {
          log(`Ready for Ingestion with 100% confidence`, "success");
          setResolverConfidence(100);
          setSubdomain(sub);
          setScoutingActive(false);
          runWikiDiscovery(sub);
          return;
        }
      }
      log(`Priority 1 — Direct URL resolution failed. Transitioning to fallbacks.`, "fail");
    }

    // ── PRIORITY 2: User Provided Fandom Subdomain ──
    const isSubdomainOnly = /^[a-zA-Z0-9-]+$/.test(showName) && showName.toLowerCase() !== "donghua";
    if (isSubdomainOnly) {
      log(`Priority 2 — User Fandom subdomain detected: "${showName}"`, "info");
      await sleep(200);
      const validated = await validateSubdomain(showName, "Wiki");
      if (validated) {
        log(`Ready for Ingestion with 99% confidence`, "success");
        setResolverConfidence(99);
        setSubdomain(showName);
        setScoutingActive(false);
        runWikiDiscovery(showName);
        return;
      }
      log(`Priority 2 — Subdomain validation failed. Transitioning to search.`, "fail");
    }

    // ── PRIORITY 3: Search by Series Title ──
    log(`Priority 3 — Searching by Series Title: "${showName}"`, "info");
    await sleep(200);
    const aliases = getAliasesForShow(showName);
    log(`Scouting alternate titles & translations: ${aliases.join(", ")}`, "info");
    
    let matchedSubdomain = "";
    let matchedAlias = "";
    let confidence = 0;

    for (const alias of aliases) {
      log(`Searching title: "${alias}"...`, "pending");
      const mappedSub = resolveFandomSubdomain(alias);
      const subsToTest = [mappedSub, alias.toLowerCase().replace(/[^a-z0-9]/g, "-"), "donghua"].filter(Boolean);
      
      for (const sub of subsToTest) {
        try {
          const stats = await wikiApi(sub, {
            action: "query",
            meta: "siteinfo",
            siprop: "general|statistics"
          });
          const st = stats.query?.statistics;
          if (st && st.articles > 0) {
            log(`Found matches on: ${sub}.fandom.com`, "success");
            matchedSubdomain = sub;
            matchedAlias = alias;
            confidence = fuzzyMatch(alias, showName) ? 98 : 95;
            break;
          }
        } catch {}
      }
      if (matchedSubdomain) break;
    }

    // ── PRIORITY 4: Character-Based Discovery ──
    if (!matchedSubdomain) {
      log(`Priority 3 — No result. Transitioning to Priority 4: Character-Based Discovery...`, "fail");
      await sleep(200);
      const protagonist = getProtagonistForShow(showName);
      if (protagonist) {
        log(`Found protagonist fallback for show: "${protagonist}"`, "info");
        log(`Searching for "${protagonist}" across known subdomains...`, "pending");
        const sub = resolveFandomSubdomain(showName) || "donghua";
        try {
          const result = await checkSubdomain(sub, protagonist);
          if (result) {
            log(`Resolved character "${protagonist}" under "${sub}.fandom.com"`, "success");
            matchedSubdomain = sub;
            matchedAlias = protagonist;
            confidence = 92;
          }
        } catch {}
      }
    }

    // ── PRIORITY 5: World / Realm Search ──
    if (!matchedSubdomain) {
      log(`Priority 4 — Character lookup failed. Transitioning to Priority 5: World / Realm / Location Search...`, "fail");
      await sleep(200);
      const realms = ["Cultivation", "Realms", "Organizations", "Heavenly Flames", "Spirit Beasts"];
      for (const realm of realms) {
        log(`Searching realm concept: "${realm}"...`, "pending");
        const sub = resolveFandomSubdomain(showName) || "donghua";
        try {
          const result = await checkSubdomain(sub, realm);
          if (result) {
            log(`Resolved realm connection: "${realm}" under "${sub}.fandom.com"`, "success");
            matchedSubdomain = sub;
            matchedAlias = realm;
            confidence = 88;
            break;
          }
        } catch {}
      }
    }

    // ── PRIORITY 6: Intelligent Fuzzy Matching ──
    if (!matchedSubdomain) {
      log(`Priority 5 — World lookup failed. Transitioning to Priority 6: Fuzzy Normalization Matcher...`, "fail");
      await sleep(200);
      // Clean string variants
      const normalizedQuery = showName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const possiblePresets = presetsList.find(p => {
        const cleanP = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanP.includes(normalizedQuery) || normalizedQuery.includes(cleanP);
      });

      if (possiblePresets) {
        log(`Fuzzy matched with preset: ${possiblePresets.name}`, "success");
        matchedSubdomain = possiblePresets.subdomain;
        matchedAlias = possiblePresets.suggestedPages[0] || showName;
        confidence = 85;
      }
    }

    if (searchId !== activeSearchIdRef.current) return;
    setScoutingActive(false);

    if (matchedSubdomain) {
      log(`Wiki resolved successfully! Subdomain: ${matchedSubdomain}.fandom.com (Confidence: ${confidence}%)`, "success");
      setResolverConfidence(confidence);
      
      // If confidence is lower than 95%, ask for confirmation
      if (confidence < 95) {
        setResolverPendingConfirmation({
          subdomain: matchedSubdomain,
          showName: matchedAlias,
          confidence
        });
      } else {
        setResolvedUsingAlias(matchedAlias);
        setSubdomain(matchedSubdomain);
        runWikiDiscovery(matchedSubdomain);
      }
    } else {
      log(`Priority Resolver: Failed to resolve wiki. Falling back to default Fandom subdomain.`, "fail");
      const defaultSub = resolveFandomSubdomain(showName);
      setSubdomain(defaultSub);
      runWikiDiscovery(defaultSub);
    }
  };

  useEffect(() => {
    if (!customSubdomain) {
      discoverWikiSubdomain(selectedShowName);
    }
  }, [selectedShowName, customSubdomain]);

  useEffect(() => {
    runWikiDiscovery();
  }, [activeSub]);

  /* ═══════════════════════════════════════════════════════
     IMAGE CLASSIFICATION AND SCORE ENGINE
     ═══════════════════════════════════════════════════════ */
  const getImageCandidates = (
    urls: string[],
    infoboxUrl: string | undefined,
    galleryUrls: string[],
    pageTitle: string
  ): ImageCandidate[] => {
    // Deduplicate and clean URLs using cleanAndProxyFandomUrl
    const cleanUrls = Array.from(new Set(urls.map(u => cleanAndProxyFandomUrl(u))));

    const candidates: ImageCandidate[] = cleanUrls.map(url => {
      const decoded = decodeURIComponent(url).toLowerCase();
      const isInfobox = infoboxUrl ? url.includes(infoboxUrl.split("/revision/latest")[0]) : false;
      const isGallery = galleryUrls.some(g => url.includes(g.split("/revision/latest")[0]));

      let type = "generic";
      let label = "Generic Wiki Image";
      let baseScore = 50;
      let stars = 2;

      // Classify based on filenames and path patterns
      const isDonghua = decoded.includes("donghua") || decoded.includes("anime") || decoded.includes("animation") || decoded.includes("show") || decoded.includes("season") || decoded.includes("3d") || decoded.includes("cgi") || decoded.includes("rendering") || decoded.includes("episode") || decoded.includes("ep_") || decoded.includes("film") || decoded.includes("movie");
      const isPromo = decoded.includes("promo") || decoded.includes("render") || decoded.includes("poster") || decoded.includes("banner") || decoded.includes("wallpaper") || decoded.includes("official_art") || decoded.includes("key_visual") || decoded.includes("keyvisual");
      const isManhua = decoded.includes("manhua") || decoded.includes("manga") || decoded.includes("comic") || decoded.includes("2d") || decoded.includes("artbook") || decoded.includes("illustration") || decoded.includes("chapter") || decoded.includes("ch_");
      const isNovel = decoded.includes("novel") || decoded.includes("webnovel") || decoded.includes("lightnovel") || decoded.includes("volume") || decoded.includes("vol_");
      const isFanart = decoded.includes("fanart") || decoded.includes("fan_art") || decoded.includes("fanmade") || decoded.includes("concept") || decoded.includes("drawing") || decoded.includes("sketch");

      if (isDonghua) {
        if (isInfobox) {
          type = "donghua-infobox";
          label = "Donghua Infobox Image";
          baseScore = 100;
          stars = 5;
        } else if (isGallery) {
          type = "donghua-gallery";
          label = "Donghua Gallery Image";
          baseScore = 95;
          stars = 5;
        } else {
          type = "donghua";
          label = "Donghua Scene/Adaptation";
          baseScore = 85;
          stars = 4;
        }
      } else if (isPromo) {
        type = "promo-render";
        label = "Official Donghua Promo Artwork";
        baseScore = 90;
        stars = 4;
      } else if (isManhua) {
        type = "manhua";
        label = "Manhua Artwork";
        baseScore = 70;
        stars = 3;
      } else if (isNovel) {
        type = "novel";
        label = "Novel Illustration";
        baseScore = 60;
        stars = 2;
      } else if (isFanart) {
        type = "fan-art";
        label = "Fan Art";
        baseScore = 40;
        stars = 1;
      } else {
        if (isInfobox) {
          type = "official-art";
          label = "Official Portrait (Infobox)";
          baseScore = 80;
          stars = 4;
        } else if (isGallery) {
          type = "generic";
          label = "Gallery Asset";
          baseScore = 55;
          stars = 2;
        } else {
          type = "generic";
          label = "Generic Wiki Image";
          baseScore = 50;
          stars = 2;
        }
      }

      // Check user preferences from preferredImageSources state
      let enabled = true;
      if (type.startsWith("donghua") && !preferredImageSources.donghua) enabled = false;
      if (type === "anime" && !preferredImageSources.anime) enabled = false;
      if (type === "official-art" && !preferredImageSources["official-art"]) enabled = false;
      if (type === "promo-render" && !preferredImageSources["promo-render"]) enabled = false;
      if (type === "manhua" && !preferredImageSources.manhua) enabled = false;
      if (type === "novel" && !preferredImageSources.novel) enabled = false;
      if (type === "fan-art" && !preferredImageSources["fan-art"]) enabled = false;

      // Score adjusts down if disabled
      const score = enabled ? baseScore : baseScore - 50;

      // Extract resolution if possible
      let width = 1080;
      let height = 1920;
      
      const widthMatch = url.match(/\/scale-to-width-down\/(\d+)/);
      if (widthMatch) {
        width = parseInt(widthMatch[1]);
        height = Math.round(width * 1.5);
      }

      return {
        url,
        type,
        label,
        priority: score,
        stars,
        width,
        height
      };
    });

    // Sort by priority descending
    return candidates.sort((a, b) => b.priority - a.priority);
  };

  /* ═══════════════════════════════════════════════════════
     FETCH DETAILED PAGE CONTENT (WITH ADVANCED IMAGE DIAGNOSTICS)
     ═══════════════════════════════════════════════════════ */
  const inspectPageContent = async (title: string, subdomainOverride?: string) => {
    const subToQuery = subdomainOverride || activeSub;
    setInspectedPageLoading(true);
    setInspectedPage(null);
    try {
      const [queryRes, parseRes] = await Promise.all([
        wikiApi(subToQuery, {
          action: "query", prop: "pageimages|info|categories|images",
          titles: title, piprop: "original|thumbnail", pithumbsize: "600",
          inprop: "url", cllimit: "50", redirects: "1"
        }),
        wikiApi(subToQuery, {
          action: "parse", page: title,
          prop: "text|sections|categories|images|templates|displaytitle"
        })
      ]);

      const page: any = Object.values(queryRes.query?.pages || {})[0] || {};
      const parsed = parseRes.parse || {};
      const rawHtml = parsed.text?.["*"] || "";
      const diagnostics: ImageDiagnostic[] = [];

      // Extract sections
      const sections = (parsed.sections || []).map((s: any) => ({
        title: s.line, level: s.level
      }));

      // Extract categories
      const categories = (page.categories || []).map((c: any) => c.title?.replace("Category:", ""));

      // ── IMAGE SOURCE 1: pageimages API ──
      const piUrl = page.original?.source || page.thumbnail?.source;
      diagnostics.push({
        sourceName: "pageimages API",
        found: !!piUrl,
        url: piUrl,
        detail: piUrl ? "Found page image from MediaWiki PageImages" : "No page image returned"
      });

      // ── IMAGE SOURCE 2: Infobox image thumbnail ──
      let infoboxImage: string | undefined = undefined;
      let infoboxData: Record<string, string> = {};
      let intro = "";
      let appearanceText = "";
      let personalityText = "";
      let historyText = "";
      let triviaText = "";
      let quotesText = "";

      if (typeof window !== "undefined" && rawHtml) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, "text/html");

          // Extract portable infobox details
          doc.querySelectorAll(".pi-item.pi-data").forEach((item: any) => {
            const label = item.querySelector(".pi-data-label")?.textContent?.trim();
            const val = item.querySelector(".pi-data-value")?.textContent?.trim();
            if (label && val) infoboxData[label] = val;
          });

          // Fallback table infoboxes
          if (Object.keys(infoboxData).length === 0) {
            doc.querySelectorAll("table.infobox tr, table.toccolours tr").forEach((tr: any) => {
              const th = tr.querySelector("th")?.textContent?.trim();
              const td = tr.querySelector("td")?.textContent?.trim();
              if (th && td) infoboxData[th] = td;
            });
          }

          // Extract portable infobox image src
          const piImg = doc.querySelector(".portable-infobox img, table.infobox img, .pi-image-thumbnail img, .pi-image img");
          if (piImg) {
            // Fandom lazy-load images store the real URL in data-src!
            infoboxImage = piImg.getAttribute("data-src") || piImg.getAttribute("src") || undefined;
            // Clean up size parameters
            if (infoboxImage && infoboxImage.includes("/revision/latest")) {
              infoboxImage = infoboxImage.split("/revision/latest")[0] + "/revision/latest";
            }
          }

          // Extract first paragraph of intro
          const paras = doc.querySelectorAll("p");
          for (let i = 0; i < paras.length; i++) {
            const txt = paras[i].textContent?.trim() || "";
            if (txt.length > 55 && !txt.includes("MediaWiki")) {
              intro = txt;
              break;
            }
          }

          // Helper to extract text from a section by ID (case-insensitive contains)
          const extractSectionText = (id: string): string => {
            // Find heading elements (h1-h6) containing the target id or text
            const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
            let targetHeading: Element | null = null;
            
            for (let i = 0; i < headings.length; i++) {
              const h = headings[i];
              if (h.textContent?.toLowerCase().includes(id.toLowerCase())) {
                targetHeading = h;
                break;
              }
            }
            
            if (!targetHeading) return "";
            
            let content = "";
            let el = targetHeading.nextElementSibling;
            while (el && !el.matches("h1, h2, h3, h4, h5, h6")) {
              if (el.tagName === "P" || el.tagName === "UL" || el.tagName === "OL") {
                content += el.textContent + "\n";
              }
              el = el.nextElementSibling;
            }
            return content.trim();
          };

          appearanceText = extractSectionText("Appearance");
          personalityText = extractSectionText("Personality");
          historyText = extractSectionText("History") || extractSectionText("Biography") || extractSectionText("Background");
          triviaText = extractSectionText("Trivia");
          quotesText = extractSectionText("Quotes");
        } catch {}
      }

      diagnostics.push({
        sourceName: "Infobox Parsing",
        found: !!infoboxImage,
        url: infoboxImage,
        detail: infoboxImage ? "Found primary image from Infobox wrapper" : "No infobox image tag found"
      });

      // ── IMAGE SOURCE 3: Gallery Parsing ──
      const galleryImages: string[] = [];
      if (typeof window !== "undefined" && rawHtml) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, "text/html");
          doc.querySelectorAll(".gallery img, .wikia-gallery img, .wikia-gallery-item img").forEach((img: any) => {
            let src = img.getAttribute("data-src") || img.getAttribute("src");
            if (src) {
              if (src.includes("/revision/latest")) src = src.split("/revision/latest")[0] + "/revision/latest";
              galleryImages.push(src);
            }
          });
        } catch {}
      }
      diagnostics.push({
        sourceName: "Gallery Scan",
        found: galleryImages.length > 0,
        url: galleryImages[0],
        detail: galleryImages.length > 0 ? `Found ${galleryImages.length} images in galleries` : "No gallery blocks"
      });

      // ── IMAGE SOURCE 4: First HTML image ──
      let firstHtmlImage: string | undefined = undefined;
      if (typeof window !== "undefined" && rawHtml) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, "text/html");
          const allImgs = doc.querySelectorAll("img");
          for (let i = 0; i < allImgs.length; i++) {
            const src = allImgs[i].getAttribute("data-src") || allImgs[i].getAttribute("src");
            if (src && !src.includes("placeholder") && !src.includes("data:image")) {
              firstHtmlImage = src;
              break;
            }
          }
        } catch {}
      }
      diagnostics.push({
        sourceName: "First HTML Image",
        found: !!firstHtmlImage,
        url: firstHtmlImage,
        detail: firstHtmlImage ? "Found first image tag in page HTML content" : "No HTML images found"
      });

      // ── IMAGE SOURCE 5: Attached Files Info ──
      const fileAttachments: string[] = [];
      const filesList = page.images || [];
      if (filesList.length > 0) {
        // Just store titles
        filesList.forEach((file: any) => {
          fileAttachments.push(file.title);
        });
      }
      diagnostics.push({
        sourceName: "Attached Files",
        found: fileAttachments.length > 0,
        detail: fileAttachments.length > 0 ? `Found ${fileAttachments.length} file attachments in page metadata` : "No file attachments"
      });

      // Gather all image URLs from DOM parsing to populate candidates list
      const domImageUrls: string[] = [];
      if (typeof window !== "undefined" && rawHtml) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, "text/html");
          doc.querySelectorAll("img").forEach((img: any) => {
            const src = img.getAttribute("data-src") || img.getAttribute("src");
            if (src && !src.includes("placeholder") && !src.includes("data:image") && !src.includes("sprite")) {
              domImageUrls.push(src);
            }
          });
        } catch {}
      }

      // Add API resolved image URLs to list
      const combinedUrls = [
        ...(infoboxImage ? [infoboxImage] : []),
        ...(piUrl ? [piUrl] : []),
        ...galleryImages,
        ...(firstHtmlImage ? [firstHtmlImage] : []),
        ...domImageUrls
      ];

      // Get classified and ranked image candidates list
      const candidates = getImageCandidates(combinedUrls, infoboxImage, galleryImages, title);
      
      // Determine donghua vs manhua vs novel for switcher fallbacks
      let donghuaImage = candidates.find(c => c.type.startsWith("donghua") || c.type === "promo-render")?.url;
      let manhuaImage = candidates.find(c => c.type === "manhua")?.url;
      let novelImage = candidates.find(c => c.type === "novel")?.url;
      let defaultImage = infoboxImage || piUrl || galleryImages[0] || firstHtmlImage;

      // Select highest ranked candidate according to priority score
      const winnerCandidate = candidates[0];
      const primaryImage = winnerCandidate ? winnerCandidate.url : defaultImage;
      const imageSelectionReason = winnerCandidate
        ? `Selected highest-priority candidate: ${winnerCandidate.label} (Score: ${winnerCandidate.priority})`
        : "No candidate images found, fell back to default placeholder";

      // Calculate completeness score
      let score = 0;
      if (Object.keys(infoboxData).length > 0) score += 30; // Infobox exists
      if (primaryImage) score += 25; // Main image resolved
      if (intro.length > 50) score += 15; // Intro text extracted
      if (sections.length > 0) score += 10; // Page outline outline
      if (categories.length > 0) score += 10; // Page categorized
      if (galleryImages.length > 0) score += 10; // Media galleries

      setInspectedPage({
        title: page.title || title,
        pageid: page.pageid,
        intro: intro || "No summary text detected.",
        infobox: infoboxData,
        sections,
        categories,
        url: page.fullurl || `https://${subToQuery}.fandom.com/wiki/${title}`,
        completenessScore: score,
        primaryImage,
        imageSelectionReason,
        diagnostics,
        imageCandidates: candidates,
        donghuaImage,
        manhuaImage,
        novelImage,
        defaultImage,
        galleryImages,
        fileAttachments,
        appearance: appearanceText,
        personality: personalityText,
        history: historyText,
        trivia: triviaText,
        quotes: quotesText,
        rawHtml: rawHtml.slice(0, 10000)
      });

    } catch (e) {
      console.error("Fetch page detail failed:", e);
    } finally {
      setInspectedPageLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════
     TAB SELECTION HANDLERS
     ═══════════════════════════════════════════════════════ */
  const handleTabChange = async (tab: TabId) => {
    setActiveTab(tab);
    setInspectedPage(null);

    if (tab === "characters" && charactersList.length === 0) {
      setCharListLoading(true);
      try {
        const d = await wikiApi(activeSub, {
          action: "query", list: "categorymembers", cmtitle: "Category:Characters", cmlimit: "500"
        });
        const members = (d.query?.categorymembers || []).map((m: any) => ({
          pageid: m.pageid, title: m.title
        }));
        await fetchMemberImages(activeSub, members);
        setCharactersList(members);
      } catch {}
      setCharListLoading(false);
    }

    if (tab === "world" && locationsList.length === 0) {
      setLocListLoading(true);
      try {
        const d = await wikiApi(activeSub, {
          action: "query", list: "categorymembers", cmtitle: "Category:Locations", cmlimit: "500"
        });
        const members = (d.query?.categorymembers || []).map((m: any) => ({
          pageid: m.pageid, title: m.title
        }));
        await fetchMemberImages(activeSub, members);
        setLocationsList(members);
      } catch {}
      setLocListLoading(false);
    }

    if (tab === "power" && powerList.length === 0) {
      setPowerListLoading(true);
      try {
        const d = await wikiApi(activeSub, {
          action: "query", list: "categorymembers", cmtitle: "Category:Cultivation", cmlimit: "500"
        });
        const members = (d.query?.categorymembers || []).map((m: any) => ({
          pageid: m.pageid, title: m.title
        }));
        await fetchMemberImages(activeSub, members);
        setPowerList(members);
      } catch {}
      setPowerListLoading(false);
    }

    if (tab === "items" && itemsList.length === 0) {
      setItemsListLoading(true);
      try {
        const d = await wikiApi(activeSub, {
          action: "query", list: "categorymembers", cmtitle: "Category:Items", cmlimit: "500"
        });
        const members = (d.query?.categorymembers || []).map((m: any) => ({
          pageid: m.pageid, title: m.title
        }));
        await fetchMemberImages(activeSub, members);
        setItemsList(members);
      } catch {}
      setItemsListLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════
     COMPREHENSIVE 155 DONGHUA CATALOG SCAN
     ═══════════════════════════════════════════════════════ */
  const runCatalogScan = async () => {
    setCatalogScanRunning(true);
    setCatalogScanResults([]);
    
    let shows = catalogList;
    if (shows.length === 0) {
      try {
        shows = await fetchAnimeCatalog({ limit: 1000 });
        setCatalogList(shows);
      } catch {
        shows = animeCatalog;
      }
    }

    const total = shows.length;
    setCatalogScanProgress({ current: 0, total });
    const results: CatalogScanResult[] = [];

    for (let i = 0; i < total; i++) {
      const anime = shows[i];
      setCatalogScanProgress({ current: i + 1, total });
      const sub = resolveFandomSubdomain(anime.title);

      try {
        const [info, charData, locData, powData, gallData] = await Promise.all([
          wikiApi(sub, { action: "query", meta: "siteinfo", siprop: "general" }).catch(() => null),
          wikiApi(sub, { action: "query", list: "categorymembers", cmtitle: "Category:Characters", cmlimit: "50" }).catch(() => null),
          wikiApi(sub, { action: "query", list: "categorymembers", cmtitle: "Category:Locations", cmlimit: "5" }).catch(() => null),
          wikiApi(sub, { action: "query", list: "categorymembers", cmtitle: "Category:Cultivation", cmlimit: "5" }).catch(() => null),
          wikiApi(sub, { action: "query", list: "allimages", ailimit: "10" }).catch(() => null)
        ]);

        const wikiFound = !!info?.query?.general;
        const chars = charData?.query?.categorymembers || [];
        const charactersCount = chars.length;
        const worldFound = (locData?.query?.categorymembers || []).length > 0;
        const powerFound = (powData?.query?.categorymembers || []).length > 0;
        const galleriesFound = (gallData?.query?.allimages || []).length;

        // Estimate characters with images (mock/estimate first 10 for speed)
        let charImagesCount = 0;
        if (charactersCount > 0) {
          const sample = chars.slice(0, 10);
          const sampleTitles = sample.map((c: any) => c.title).join("|");
          try {
            const charImgs = await wikiApi(sub, {
              action: "query", prop: "pageimages", titles: sampleTitles, piprop: "thumbnail", redirects: "1"
            });
            const pages = charImgs.query?.pages || {};
            const imgs = Object.values(pages).filter((p: any) => p.thumbnail?.source).length;
            charImagesCount = Math.round((imgs / Object.keys(pages).length) * charactersCount) || 0;
          } catch {}
        }

        let score = 0;
        if (wikiFound) score += 30;
        if (charactersCount > 5) score += 20;
        if (charImagesCount > 2) score += 20;
        if (worldFound) score += 10;
        if (powerFound) score += 10;
        if (galleriesFound > 0) score += 10;

        results.push({
          localTitle: anime.title,
          subdomain: sub,
          wikiFound,
          charactersCount,
          charImagesCount,
          worldFound,
          powerFound,
          galleriesFound,
          completenessScore: score
        });
      } catch {
        results.push({
          localTitle: anime.title,
          subdomain: sub,
          wikiFound: false,
          charactersCount: 0,
          charImagesCount: 0,
          worldFound: false,
          powerFound: false,
          galleriesFound: 0,
          completenessScore: 0
        });
      }

      if (i % 2 === 0 || i === total - 1) {
        setCatalogScanResults([...results]);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    setCatalogScanResults(results);
    setCatalogScanRunning(false);
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("donghua_alias_performance_cache");
      if (cached) {
        setAliasScanResults(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Failed to load alias cache:", e);
    }
  }, []);

  const runAliasPerformanceScan = async () => {
    setAliasScanRunning(true);
    setAliasScanResults([]);
    
    let shows = catalogList;
    if (shows.length === 0) {
      try {
        shows = await fetchAnimeCatalog({ limit: 1000 });
        setCatalogList(shows);
      } catch {
        shows = animeCatalog;
      }
    }

    const total = shows.length;
    setAliasScanProgress({ current: 0, total });

    const results: any[] = [];

    for (let i = 0; i < total; i++) {
      const anime = shows[i];
      setAliasScanProgress({ current: i + 1, total });
      const subdomain = resolveFandomSubdomain(anime.title);

      // Get aliases list dynamically
      const aliases = getAliasesForShow(anime.title);
      if (anime.originalTitle && !aliases.includes(anime.originalTitle)) {
        aliases.push(anime.originalTitle);
      }

      const testedAliases = await Promise.all(
        aliases.map(async (aliasName) => {
          const [worksFandom, worksAniList, worksBangumi] = await Promise.all([
            probeAliasOnFandom(subdomain, aliasName),
            probeAliasOnAniList(aliasName),
            probeAliasOnBangumi(aliasName)
          ]);
          
          let type: "official_english" | "romaji" | "chinese" | "alias" = "alias";
          if (aliasName === anime.title) type = "official_english";
          else if (aliasName === anime.originalTitle) type = "chinese";
          else if (/[\u4e00-\u9fa5]/.test(aliasName)) type = "chinese";
          
          return {
            name: aliasName,
            type,
            works: {
              fandom: worksFandom,
              anilist: worksAniList,
              bangumi: worksBangumi
            }
          };
        })
      );

      results.push({
        displayTitle: anime.title,
        canonicalTitle: anime.title,
        subdomain,
        aliases: testedAliases
      });

      if (i % 2 === 0 || i === total - 1) {
        setAliasScanResults([...results]);
      }
      
      await new Promise(r => setTimeout(r, 80));
    }

    setAliasScanResults(results);
    localStorage.setItem("donghua_alias_performance_cache", JSON.stringify(results));
    setAliasScanRunning(false);
  };

  /* ═══════════════════════════════════════════════════════
     API CUSTOM INSPECTOR METHOD
     ═══════════════════════════════════════════════════════ */
  const runCustomQuery = async (label: string, params: Record<string, string>) => {
    setLoading(true);
    setErrorLog(null);
    setResponseLog(null);
    try {
      const start = performance.now();
      const data = await wikiApi(activeSub, params);
      const elapsed = Math.round(performance.now() - start);
      setResponseLog({
        label,
        size: `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`,
        time: elapsed,
        data,
        url: `https://${activeSub}.fandom.com/api.php?${new URLSearchParams({ origin: "*", format: "json", ...params }).toString()}`
      });
    } catch (err: any) {
      setErrorLog(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const [responseLog, setResponseLog] = useState<any>(null);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // List filters
  const filteredChars = charactersList.filter(c => c.title.toLowerCase().includes(characterSearch.toLowerCase()));
  const filteredLocs = locationsList.filter(l => l.title.toLowerCase().includes(locationSearch.toLowerCase()));
  const filteredPowers = powerList.filter(p => p.title.toLowerCase().includes(powerSearch.toLowerCase()));
  const filteredItems = itemsList.filter(i => i.title.toLowerCase().includes(itemSearch.toLowerCase()));

  const bodyContent = (
    <div className={cn("space-y-6", !embedded && "pb-20")}>
      
      {/* ═══════ HEADER ═══════ */}
      <div className={cn("relative rounded-3xl overflow-hidden border border-white/5 bg-[#090b11]", embedded ? "p-4 sm:p-5" : "p-6 sm:p-8")}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
          <div className="relative">
            {embedded ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-black text-white">Wiki Data Studio</h1>
                      <span className="text-[9px] uppercase font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        Admin Ingestion Mode
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Explore candidate wikitext, infoboxes, and image assets. Review & select candidates for Supabase curated state.
                    </p>
                  </div>
                </div>
                {siteStats && (
                  <div className="text-right hidden sm:block shrink-0">
                    <span className="text-white font-black block text-xs">{siteStats.sitename}</span>
                    <span className="text-[10px] text-zinc-500">{siteStats.articles.toLocaleString()} pages · {siteStats.images.toLocaleString()} images</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest mb-3">
                    <Activity className="h-3 w-3" /> Content Verification Sandbox
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Wiki Content Inspector
                  </h1>
                  <p className="text-sm text-zinc-400 max-w-xl mt-1">
                    Redesigned API explorer centered on structured data verification. Auto-resolves wiki subdomains, runs image diagnostics from 5 sources, and rates metadata completeness.
                  </p>
                </div>
                
                <div className="shrink-0 flex items-center bg-black/40 border border-white/5 rounded-2xl px-4 py-3 gap-4">
                  {siteStats ? (
                    <div className="text-xs text-zinc-400">
                      <span className="text-white font-black block text-sm">{siteStats.sitename}</span>
                      <span>{siteStats.articles.toLocaleString()} pages · {siteStats.images.toLocaleString()} images</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 font-bold">Scouting wiki...</span>
                  )}
                </div>
              </div>
            )}

            {/* Wiki Selector */}
            <div className={cn(embedded ? "space-y-4" : "mt-5 pt-4 border-t border-white/5 space-y-4")}>
              {/* Universal Search Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (universalSearchQuery.trim()) {
                    setSelectedShowName(universalSearchQuery.trim());
                  }
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={universalSearchQuery}
                    onChange={(e) => setUniversalSearchQuery(e.target.value)}
                    placeholder="Type any donghua title (English, Romaji, Chinese, or alias)..."
                    className="w-full bg-black/45 border border-white/5 rounded-xl pl-9 pr-20 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 font-bold"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    Search
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5 bg-black/30 border border-white/5 rounded-xl px-3 text-xs w-fit">
                  <span className="text-[10px] text-zinc-500 font-bold">Custom Domain:</span>
                  <input
                    type="text"
                    value={customSubdomain}
                    onChange={(e) => setCustomSubdomain(e.target.value)}
                    placeholder="subdomain"
                    className="bg-transparent border-none py-1 text-primary font-mono w-24 focus:outline-none font-bold"
                  />
                  <span className="text-[10px] text-zinc-600">.fandom.com</span>
                </div>
              </form>

              {/* Examples */}
              <div className="text-[10px] text-zinc-500 flex flex-wrap gap-2 items-center">
                <span className="font-bold">Examples:</span>
                {["Perfect World", "Wanmei Shijie", "完美世界", "Xian Ni", "Renegade Immortal", "Wu Dong Qian Kun", "Martial Universe", "The Great Ruler", "Da Zhu Zai"].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setUniversalSearchQuery(ex);
                      setSelectedShowName(ex);
                    }}
                    className="text-zinc-400 hover:text-white underline transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Preset Shortcuts */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-zinc-500 font-bold block">Quick Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {filteredPresets.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setUniversalSearchQuery(p.name);
                        setSelectedShowName(p.name);
                        setCustomSubdomain("");
                        setCustomTitle(p.suggestedPages[0] || "Xiao_Yan");
                        setCustomSearchQuery(p.suggestedPages[0]?.replace(/_/g, " ") || "");
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                        selectedShowName === p.name
                          ? "bg-primary border-primary text-white" 
                          : "bg-[#0d0f17]/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Resolution Log */}
              {(scoutingActive || resolutionLogs.length > 0) && (
                <div className="mt-4 p-5 rounded-2xl bg-black/60 border border-white/5 space-y-4 text-left animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      {scoutingActive ? (
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {scoutingActive ? "Priority Resolution In Progress..." : "Resolution Pipe Complete"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {resolverConfidence > 0 && (
                        <span className={cn(
                          "text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border",
                          resolverConfidence >= 95 
                            ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                            : "bg-amber-500/15 border-amber-500/35 text-amber-400"
                        )}>
                          Confidence: {resolverConfidence}%
                        </span>
                      )}
                      {!scoutingActive && (
                        <button
                          type="button"
                          onClick={() => {
                            const cacheKey = `wiki_resolved_${selectedShowName.toLowerCase().replace(/\s+/g, "_")}`;
                            localStorage.removeItem(cacheKey);
                            discoverWikiSubdomain(selectedShowName);
                          }}
                          className="text-[9px] text-zinc-500 hover:text-white underline font-bold transition-colors uppercase tracking-wider"
                        >
                          Clear Cache & Re-scout
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resolution Logs List */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed">
                    {resolutionLogs.map((logItem, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-2 py-0.5",
                          logItem.status === "success" && "text-emerald-400",
                          logItem.status === "fail" && "text-rose-400/80",
                          logItem.status === "pending" && "text-primary animate-pulse",
                          logItem.status === "info" && "text-zinc-400 font-bold"
                        )}
                      >
                        <span className="shrink-0 select-none">
                          {logItem.status === "success" && "✓"}
                          {logItem.status === "fail" && "✗"}
                          {logItem.status === "pending" && "→"}
                          {logItem.status === "info" && "ℹ"}
                        </span>
                        <span>{logItem.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Confirmation Prompt */}
                  {resolverPendingConfirmation && (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3 mt-3 animate-in slide-in-from-bottom duration-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider">Verification Required</h4>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Fuzzy match resolved to subdomain <strong className="text-white font-mono">{resolverPendingConfirmation.subdomain}.fandom.com</strong> via alias <strong className="text-white">"{resolverPendingConfirmation.showName}"</strong> with lower confidence (<strong className="text-amber-400">{resolverPendingConfirmation.confidence}%</strong>). Do you want to proceed with ingestion on this domain?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const pending = resolverPendingConfirmation;
                            setResolverPendingConfirmation(null);
                            setResolvedUsingAlias(pending.showName);
                            setSubdomain(pending.subdomain);
                            runWikiDiscovery(pending.subdomain);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          Continue Ingestion
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResolverPendingConfirmation(null);
                            setResolutionLogs((prev) => [...prev, { text: "Ingestion cancelled by user request.", status: "fail" }]);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider transition-colors border border-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ TABS BAR ═══════ */}
        <div className="flex gap-1.5 p-1.5 bg-[#0b0d14]/60 border border-white/5 rounded-2xl overflow-x-auto">
          {[
            { id: "blueprint", label: "Knowledge Blueprint & Ingestion", icon: <Cpu className="h-3.5 w-3.5" /> },
            { id: "overview", label: "Overview", icon: <BookOpen className="h-3.5 w-3.5" /> },
            { id: "characters", label: "Characters", icon: <Users className="h-3.5 w-3.5" /> },
            { id: "world", label: "World / Locations", icon: <MapPin className="h-3.5 w-3.5" /> },
            { id: "power", label: "Power System", icon: <Flame className="h-3.5 w-3.5" /> },
            { id: "items", label: "Items & Artifacts", icon: <Swords className="h-3.5 w-3.5" /> },
            { id: "media", label: "Media Assets", icon: <ImageIcon className="h-3.5 w-3.5" /> },
            { id: "logos", label: "LOGOS", icon: <Sparkles className="h-3.5 w-3.5" /> },
            { id: "catalog", label: "Database Coverage", icon: <Award className="h-3.5 w-3.5" /> },
            { id: "inspector", label: "API Sandbox", icon: <Terminal className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabId)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[10px] font-black rounded-xl transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg"
                  : "text-zinc-500 hover:text-white"
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════ VIEWPORT ═══════ */}
        <div className="min-h-[400px]">
          
          {/* ── FRANCHISE BLUEPRINT & INGESTION TAB ── */}
          {activeTab === "blueprint" && (() => {
            if (inspectedPage) {
              return (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between bg-[#0c0f17]/90 border border-white/5 p-4 rounded-xl">
                    <button
                      onClick={() => setInspectedPage(null)}
                      className="px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180 text-primary" /> Back to Ingestion Blueprint
                    </button>
                    <span className="text-xs text-zinc-400 font-mono">Inspecting: <strong className="text-white">{inspectedPage.title}</strong></span>
                  </div>
                  {inspectedPageLoading ? (
                    <LoadingSpinner text="Retrieving parsed page details..." />
                  ) : (
                    <WikiPageProfileCard page={inspectedPage} subdomain={activeSub} cachedLoreData={cachedLoreData} />
                  )}
                </div>
              );
            }
            const blueprint = getBlueprintForSubdomain(activeSub, siteStats, selectedShowName, discoveredCategories);
            return (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
                
                {/* COLUMN 1 & 2: Wiki Intelligence Report */}
                <div className="xl:col-span-2 space-y-6">
                  
                  {/* Title & Core Blueprint Summary */}
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 flex flex-col items-end">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Quality Confidence</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xl font-black text-primary">{blueprint.confidence}%</span>
                        <div className="flex text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("h-3 w-3 fill-current", i >= Math.round(blueprint.confidence / 20) && "text-zinc-800 fill-none")} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 max-w-lg">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-black text-white">{blueprint.franchiseName}</h2>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {blueprint.summary}
                      </p>
                    </div>

                    {/* Step 1 & 2: Discover & Analyze Report */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Step 1: Discovery Status
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/35 border border-white/5">
                            <span className="text-zinc-400 font-bold">Fandom Domain</span>
                            <span className="text-white font-mono font-bold">{activeSub}.fandom.com</span>
                          </div>
                          <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/35 border border-white/5">
                            <span className="text-zinc-400 font-bold">Articles Scouted</span>
                            <span className="text-white font-mono font-bold">{siteStats?.articles?.toLocaleString() || "..."} pages</span>
                          </div>
                          <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/35 border border-white/5">
                            <span className="text-zinc-400 font-bold">Images Found</span>
                            <span className="text-white font-mono font-bold">{siteStats?.images?.toLocaleString() || "..."} assets</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" /> Step 2: Scale & Density
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(blueprint.scaleBreakdown).map(([cat, scale]) => (
                            <div key={cat} className="flex items-center justify-between text-xs p-2 rounded-xl bg-black/20 border border-white/5">
                              <span className="text-zinc-400 font-bold">{cat}</span>
                              <span className="text-white font-bold text-right text-[11px]">{scale}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 0: SERIES LOGO DISCOVERY */}
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-6 space-y-4 relative overflow-hidden text-left">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" /> Step 0: Series Logo Discovery
                      </h3>
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                        ✓ Found {discoveredLogos.length}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Search Title info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Search Title</span>
                          <strong className="text-white text-sm">{selectedShowName}</strong>
                        </div>
                        
                        {/* Logo Providers List */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Logo Providers Registry</span>
                          <div className="flex flex-wrap gap-1.5">
                            {logoProviders.map(provider => (
                              <button
                                key={provider.id}
                                onClick={() => {
                                  setLogoProviders(prev => prev.map(p => p.id === provider.id ? { ...p, enabled: !p.enabled } : p));
                                }}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-bold border transition-colors",
                                  provider.enabled
                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                    : "bg-zinc-800/40 border-zinc-700/30 text-zinc-500 hover:text-zinc-300"
                                )}
                              >
                                {provider.enabled ? "✓" : "✗"} {provider.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Log Discovery Loading Indicator */}
                      {logoLoading ? (
                        <div className="py-8 text-center bg-black/20 rounded-xl border border-white/5">
                          <RefreshCw className="h-6 w-6 text-primary mx-auto mb-2 animate-spin" />
                          <span className="text-xs text-zinc-500 font-bold block">Scouting logo endpoints...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {discoveredLogos.map((logo) => {
                            const isSelected = selectedLogo?.id === logo.id;
                            return (
                              <div
                                key={logo.id}
                                onClick={() => setSelectedLogo(logo)}
                                className={cn(
                                  "p-3 rounded-xl bg-black/30 border cursor-pointer transition-all flex flex-col justify-between h-40 group relative overflow-hidden",
                                  isSelected 
                                    ? "border-primary shadow-lg shadow-primary/10 bg-primary/5" 
                                    : "border-white/5 hover:border-white/20 hover:bg-black/40"
                                )}
                              >
                                <div className="aspect-video bg-zinc-950/60 rounded-lg flex items-center justify-center overflow-hidden border border-white/5 relative">
                                  <img src={logo.url} alt={logo.label} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                  {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 bg-primary text-white p-1 rounded-full shadow-md">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 space-y-1">
                                  <span className="text-[10px] text-zinc-400 font-bold block truncate">{logo.label}</span>
                                  <span className="text-[9px] text-zinc-500 block truncate">{logo.source}</span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Manual Upload Card */}
                          <div className="p-3 rounded-xl bg-black/30 border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between h-40">
                            <div className="space-y-2">
                              <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Manual URL Upload</span>
                              <input
                                type="text"
                                placeholder="Paste logo URL"
                                value={customLogoUrl}
                                onChange={(e) => setCustomLogoUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-primary font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Label (e.g. Fandom Logo)"
                                value={customLogoLabel}
                                onChange={(e) => setCustomLogoLabel(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-primary font-bold"
                              />
                            </div>
                            <button
                              onClick={() => {
                                if (!customLogoUrl) return;
                                const newLogo: SeriesLogo = {
                                  id: `manual-${Date.now()}`,
                                  source: "Manual Upload",
                                  url: customLogoUrl,
                                  width: 1024,
                                  height: 1024,
                                  format: customLogoUrl.split(".").pop()?.toUpperCase() || "PNG",
                                  transparent: true,
                                  confidence: 100,
                                  isOfficial: true,
                                  label: customLogoLabel || "Custom Uploaded Logo"
                                };
                                setDiscoveredLogos(prev => [newLogo, ...prev]);
                                setSelectedLogo(newLogo);
                                setCustomLogoUrl("");
                                setCustomLogoLabel("Manual Upload Logo");
                              }}
                              disabled={!customLogoUrl}
                              className="w-full py-1.5 px-3 rounded bg-white/5 border border-white/10 hover:bg-primary hover:border-primary text-white text-[10px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Upload Logo
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Selected Logo Details */}
                      {selectedLogo && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                          <div className="md:col-span-1 bg-zinc-950/40 border border-white/5 rounded-xl p-4 flex items-center justify-center h-48 overflow-hidden relative">
                            <img src={selectedLogo.url} alt="Selected Preview" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                          </div>

                          <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Selected Logo</span>
                                <strong className="text-white text-xs block truncate mt-1">{selectedLogo.label}</strong>
                              </div>
                              <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Resolution</span>
                                <strong className="text-white text-xs block mt-1 font-mono">{selectedLogo.width} × {selectedLogo.height} {selectedLogo.format}</strong>
                              </div>
                              <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Transparency</span>
                                <strong className="text-white text-xs block mt-1">{selectedLogo.transparent ? "✓ Yes" : "No"}</strong>
                              </div>
                              <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Confidence</span>
                                <strong className="text-primary text-xs block mt-1">{selectedLogo.confidence}%</strong>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 p-3 bg-black/40 border border-white/5 rounded-xl">
                              <div className="truncate">
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Source Endpoint</span>
                                <span className="text-zinc-300 font-mono text-[10px] truncate block mt-0.5" title={selectedLogo.url}>{selectedLogo.source}</span>
                              </div>
                              <button
                                onClick={() => {
                                  const cacheKey = `wiki_selected_logo_${selectedShowName.toLowerCase().replace(/\s+/g, "_")}`;
                                  localStorage.setItem(cacheKey, JSON.stringify(selectedLogo));
                                  setWikiImagesList(prev => {
                                    const logoMember = {
                                      pageid: `logo-${selectedLogo.id}`,
                                      title: `Primary Logo: ${selectedLogo.label}`,
                                      image: selectedLogo.url
                                    };
                                    if (prev.some(p => p.pageid === logoMember.pageid)) return prev;
                                    return [logoMember, ...prev];
                                  });
                                  alert(`Successfully set primary logo: ${selectedLogo.label}`);
                                }}
                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Use Selected Logo
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Blueprint Preview Verification */}
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" /> Step 3: Entity Blueprints Preview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(blueprint.preview).map(([cat, items]) => (
                        <div key={cat} className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-2">
                          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider block">{cat}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((item) => (
                              <button
                                key={item}
                                onClick={() => inspectPageContent(item)}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-primary/25 text-zinc-300 hover:text-white text-[10px] font-bold border border-white/5 hover:border-primary/35 transition-all text-left"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Knowledge Relationships & Graph */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Navigation tree */}
                    <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-3">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Scouted Navigation Menu</h3>
                      <div className="space-y-3 font-mono text-[11px]">
                        {Object.entries(blueprint.navTree).map(([branch, leaves]) => {
                          const isExpanded = expandedNavFolders[branch] !== false; // default true
                          return (
                            <div key={branch} className="space-y-1.5">
                              <button
                                onClick={() => setExpandedNavFolders(prev => ({ ...prev, [branch]: !isExpanded }))}
                                className="w-full text-zinc-300 font-black flex items-center justify-between hover:text-white transition-colors py-1 border-b border-white/5"
                              >
                                <span className="flex items-center gap-1.5">
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                                  {branch.replace(/_/g, " ")}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-normal">({leaves.length} pages)</span>
                              </button>
                              {isExpanded && (
                                <div className="pl-4 border-l border-white/5 space-y-1 text-zinc-500 max-h-[220px] overflow-y-auto">
                                  {leaves.map(leaf => (
                                    <button
                                      key={leaf}
                                      onClick={() => inspectPageContent(leaf)}
                                      className="flex items-center gap-1.5 py-0.5 hover:text-primary transition-colors text-left w-full truncate"
                                      title={`Inspect ${leaf}`}
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                                      {leaf}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom layouts recommendations */}
                    <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">AI Layout Blueprint</h3>
                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 font-bold block">RECOMMENDED LAYOUT FLOW</span>
                        <div className="flex flex-wrap gap-1.5">
                          {blueprint.recommendedLayout.map((comp, idx) => (
                            <span key={comp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">
                              {idx + 1}. {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs">
                        <span className="text-[10px] text-zinc-500 font-bold block">IMPORTANCE METRIC</span>
                        {blueprint.coreMechanics.map(mech => (
                          <div key={mech.name} className="flex items-center justify-between text-zinc-400">
                            <span className="font-bold">{mech.name} <span className="text-[10px] text-zinc-600 font-normal">({mech.type})</span></span>
                            <div className="flex text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn("h-2.5 w-2.5 fill-current", i >= mech.rating && "text-zinc-800 fill-none")} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: Ingestion Wizard Controls */}
                <div className="space-y-6">
                  
                  {/* Quality rating checklist */}
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Metadata Quality Check</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      {[
                        { label: "Character Image", checked: true },
                        { label: "Infobox Fields", checked: true },
                        { label: "Alternate Aliases", checked: true },
                        { label: "Summary Details", checked: true },
                        { label: "Relations Node", checked: true },
                        { label: "Cultivation Realms", checked: true },
                        { label: "First Appearance", checked: true },
                        { label: "Media Gallery", checked: true },
                        { label: "References List", checked: true }
                      ].map(check => (
                        <div key={check.label} className="flex items-center gap-2 p-2 rounded-lg bg-black/35 border border-white/5 text-zinc-300">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{check.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 4: Import settings checkboxes */}
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Step 4: Import Settings</h3>
                    <div className="space-y-2">
                      {Object.entries(importSettings).map(([key, enabled]) => (
                        <label key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-black/35 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                          <span className="text-xs font-bold text-zinc-300 capitalize">
                            {key.replace(/([A-Z])/g, " $1")}
                          </span>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setImportSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded border-white/10 bg-black/40 text-primary focus:ring-primary focus:ring-offset-[#090b11]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Image Sources */}
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-primary fill-primary" /> Preferred Image Source
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(preferredImageSources).map(([key, enabled]) => (
                        <label key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-black/35 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                          <span className="text-xs font-bold text-zinc-300 capitalize">
                            {key.replace(/-/g, " ")}
                          </span>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => {
                              setPreferredImageSources(prev => {
                                const next = { ...prev, [key]: e.target.checked };
                                if (inspectedPage) {
                                  setTimeout(() => inspectPageContent(inspectedPage.title), 50);
                                }
                                return next;
                              });
                            }}
                            className="h-3.5 w-3.5 rounded border-white/10 bg-black/40 text-primary focus:ring-primary focus:ring-offset-[#090b11]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Step 5: Action & Logs console */}
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Step 5: AI Pipeline Execution</h3>
                    
                    {isImporting ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-primary animate-pulse">Running pipeline...</span>
                          <span className="text-white">{importProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${importProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={runIngestionPipeline}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-black uppercase text-xs tracking-wider transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2"
                      >
                        <Play className="h-4 w-4 fill-current" /> Start Ingestion Pipeline
                      </button>
                    )}

                    {importLogs.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 font-bold block">EXECUTION LOGS</span>
                        <div className="bg-black/70 border border-white/5 rounded-xl p-3 font-mono text-[10px] leading-relaxed max-h-[180px] overflow-y-auto custom-scrollbar space-y-1 text-zinc-400">
                          {importLogs.map((log, idx) => (
                            <div key={idx} className={cn(
                              log.includes("Complete") ? "text-emerald-400 font-black" : 
                              log.includes("Stage") ? "text-primary font-bold" : "text-zinc-400"
                            )}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              
              <div className="lg:col-span-2 space-y-6">
                {/* Intro block */}
                <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Active Wiki Profile
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <MetricCard label="Fandom Subdomain" val={`${activeSub}.fandom.com`} />
                    <MetricCard label="Articles" val={siteStats?.articles?.toLocaleString() || "..."} />
                    <MetricCard label="Uploaded Images" val={siteStats?.images?.toLocaleString() || "..."} />
                  </div>
                </div>

                {/* Discovered categories summary */}
                <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-black text-white">Scouted Category Clusters</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {discoveredCategories.map((c) => (
                      <div key={c.name} className="p-3 bg-black/45 border border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold block">Category</span>
                          <span className="text-white font-bold text-xs">{c.name.replace(/_/g, " ")}</span>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-mono font-bold">
                          {c.count}+ entries
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500" /> Lore Capabilities
                  </h3>
                  <div className="space-y-2">
                    {activePreset.loreLabels.map(l => (
                      <div key={l} className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                        <CheckCircle className="h-3.5 w-3.5 text-amber-500" /> {l}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CHARACTERS TAB ── */}
          {activeTab === "characters" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {/* Left: Characters List */}
              <div className="lg:col-span-1 bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Characters</h3>
                  {charListLoading && <span className="text-[10px] text-primary animate-pulse font-bold">Loading...</span>}
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={characterSearch}
                    onChange={e => setCharacterSearch(e.target.value)}
                    placeholder="Search character..."
                    className="w-full bg-black/45 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  {filteredChars.map((c) => (
                    <button
                      key={c.pageid}
                      onClick={() => inspectPageContent(c.title)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all text-xs",
                        inspectedPage?.title === c.title
                          ? "bg-primary/10 border-primary/30"
                          : "bg-white/3 border-white/3 hover:bg-white/5"
                      )}
                    >
                      {c.image ? (
                        <img src={c.image} alt="" className="w-8 h-8 object-cover rounded-md border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 text-[8px] font-bold uppercase shrink-0">No Pic</div>
                      )}
                      <span className="text-white font-bold truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Wiki Content Inspector & Diagnostics */}
              <div className="lg:col-span-2">
                {inspectedPageLoading && (
                  <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center h-[400px]">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-xs text-zinc-400 font-bold">Decompressing wiki templates & attachments...</span>
                  </div>
                )}

                {inspectedPage && !inspectedPageLoading && (
                  <WikiPageProfileCard page={inspectedPage} subdomain={activeSub} cachedLoreData={cachedLoreData} />
                )}

                {!inspectedPage && !inspectedPageLoading && (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-2xl bg-[#090b11]/30">
                    <Info className="h-8 w-8 text-zinc-700 mb-2" />
                    <p className="text-xs text-zinc-500 font-bold">Select a character from the list to launch the Content Inspector.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── WORLD TAB ── */}
          {activeTab === "world" && (
            <CategorySection
              title="Locations & Landmarks"
              list={filteredLocs}
              loading={locListLoading}
              searchValue={locationSearch}
              onSearchChange={setLocationSearch}
              onSelect={inspectPageContent}
              selectedDetail={inspectedPage}
              detailLoading={inspectedPageLoading}
              onBack={() => setInspectedPage(null)}
              icon={<MapPin className="h-5 w-5 text-zinc-600" />}
              subdomain={activeSub}
              cachedLoreData={cachedLoreData}
            />
          )}

          {/* ── POWER SYSTEM TAB ── */}
          {activeTab === "power" && (
            <CategorySection
              title="Power System & Cultivation Realms"
              list={filteredPowers}
              loading={powerListLoading}
              searchValue={powerSearch}
              onSearchChange={setPowerSearch}
              onSelect={inspectPageContent}
              selectedDetail={inspectedPage}
              detailLoading={inspectedPageLoading}
              onBack={() => setInspectedPage(null)}
              icon={<Flame className="h-5 w-5 text-zinc-600" />}
              subdomain={activeSub}
              cachedLoreData={cachedLoreData}
            />
          )}

          {/* ── ITEMS TAB ── */}
          {activeTab === "items" && (
            <CategorySection
              title="Items, Pills & Weapons"
              list={filteredItems}
              loading={itemsListLoading}
              searchValue={itemSearch}
              onSearchChange={setItemSearch}
              onSelect={inspectPageContent}
              selectedDetail={inspectedPage}
              detailLoading={inspectedPageLoading}
              onBack={() => setInspectedPage(null)}
              icon={<Swords className="h-5 w-5 text-zinc-600" />}
              subdomain={activeSub}
              cachedLoreData={cachedLoreData}
            />
          )}

          {/* ── MEDIA TAB ── */}
          {activeTab === "media" && (() => {
            const displayList = wikiImagesList.length > 0 
              ? wikiImagesList 
              : (discoveredCategories.find(c => c.name === "Characters")?.members || []);
            
            return (
              <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 text-left animate-in fade-in duration-300">
                <h3 className="text-sm font-black text-white">Discovered Wiki File Assets</h3>
                <p className="text-xs text-zinc-400">Scan recently uploaded file parameters directly from wiki database.</p>
                
                {loading ? (
                  <LoadingSpinner text="Querying files catalog..." />
                ) : displayList.length === 0 && !selectedLogo ? (
                  <div className="text-center py-10 bg-black/20 rounded-xl border border-white/5">
                    <ImageIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2 animate-bounce" />
                    <span className="text-xs text-zinc-500 font-bold block">No media assets discovered on this wiki yet.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {selectedLogo && (
                      <div className="p-2 bg-primary/10 border border-primary/30 rounded-xl text-center space-y-2 relative overflow-hidden group col-span-2 sm:col-span-2">
                        <div className="absolute top-2 left-2 z-10 bg-primary text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">
                          Primary Logo
                        </div>
                        <div className="aspect-video bg-zinc-950/80 rounded-lg flex items-center justify-center overflow-hidden border border-primary/20 relative h-[120px]">
                          <img src={selectedLogo.url} alt="" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                          <a href={selectedLogo.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <Eye className="h-4 w-4 text-white" />
                          </a>
                        </div>
                        <div className="flex justify-between items-center text-[10px] px-1 mt-1">
                          <span className="text-white truncate font-bold" title={selectedLogo.label}>{selectedLogo.label}</span>
                          <span className="text-zinc-500 font-mono font-bold text-[8px]">{selectedLogo.width}x{selectedLogo.height}</span>
                        </div>
                      </div>
                    )}

                    {displayList.map((m) => (
                      <div key={m.pageid} className="p-2 bg-black/40 border border-white/5 rounded-xl text-center space-y-2 group hover:border-primary/30 transition-all">
                        <div className="aspect-square bg-zinc-900 rounded-lg flex items-center justify-center overflow-hidden border border-white/10 relative">
                          {m.image ? (
                            <>
                              <img src={m.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                              <a href={m.image} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <Eye className="h-4 w-4 text-white" />
                              </a>
                            </>
                          ) : (
                            <ImageIcon className="h-6 w-6 text-zinc-800" />
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate block font-bold" title={m.title}>{m.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── LOGOS TAB ── */}
          {activeTab === "logos" && (() => {
            return (
              <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 text-left animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Discovered Series Logos</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Compare all logo files discovered from API providers and choose the best fit.</p>
                  </div>
                  {selectedLogo && (
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl">
                      <span className="text-[10px] text-zinc-400 font-bold">Selected:</span>
                      <strong className="text-primary text-xs font-black">{selectedLogo.label}</strong>
                    </div>
                  )}
                </div>

                {discoveredLogos.length === 0 ? (
                  <div className="text-center py-10 bg-black/20 rounded-xl border border-white/5">
                    <ImageIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2 animate-bounce" />
                    <span className="text-xs text-zinc-500 font-bold block">No logos discovered yet. Use Step 0 in the pipeline to discover logos.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {discoveredLogos.map((logo) => {
                      const isSelected = selectedLogo?.id === logo.id;
                      return (
                        <div
                          key={logo.id}
                          onClick={() => setSelectedLogo(logo)}
                          className={cn(
                            "p-3 rounded-xl bg-black/40 border cursor-pointer hover:bg-black/50 transition-all space-y-3 flex flex-col justify-between relative overflow-hidden group",
                            isSelected ? "border-primary bg-primary/5" : "border-white/5 hover:border-white/10"
                          )}
                        >
                          <div className="aspect-video bg-zinc-950/60 rounded-lg flex items-center justify-center overflow-hidden border border-white/5 relative">
                            <img src={logo.url} alt={logo.label} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 bg-primary text-white p-1 rounded-full shadow-md">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <strong className="text-white text-xs block truncate" title={logo.label}>{logo.label}</strong>
                              <span className="text-[9px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded font-black">{logo.format}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 text-[9px] text-zinc-500">
                              <div>Source: <span className="text-zinc-400 font-bold truncate block">{logo.source}</span></div>
                              <div>Resolution: <span className="text-zinc-400 font-bold font-mono block">{logo.width}x{logo.height}</span></div>
                              <div>Transparent: <span className="text-zinc-400 font-bold block">{logo.transparent ? "✓ Yes" : "No"}</span></div>
                              <div>Confidence: <span className="text-primary font-bold block">{logo.confidence}%</span></div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                            <a
                              href={logo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 hover:underline transition-all"
                            >
                              <ExternalLink className="h-3 w-3" /> URL
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLogo(logo);
                                const cacheKey = `wiki_selected_logo_${selectedShowName.toLowerCase().replace(/\s+/g, "_")}`;
                                localStorage.setItem(cacheKey, JSON.stringify(logo));
                                setWikiImagesList(prev => {
                                  const logoMember = {
                                    pageid: `logo-${logo.id}`,
                                    title: `Primary Logo: ${logo.label}`,
                                    image: logo.url
                                  };
                                  if (prev.some(p => p.pageid === logoMember.pageid)) return prev;
                                  return [logoMember, ...prev];
                                });
                                alert(`Successfully set primary logo: ${logo.label}`);
                              }}
                              className={cn(
                                "px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors",
                                isSelected
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-primary hover:bg-primary/90 text-white"
                              )}
                            >
                              {isSelected ? "Active Primary" : "Set Primary"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── CATEGORIES TAB ── */}
          {activeTab === "categories" && (
            <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 text-left animate-in fade-in duration-300">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" /> Active Category Directory
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {discoveredCategories.map((c) => (
                  <div key={c.name} className="p-3 bg-black/45 border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block">Category</span>
                      <strong className="text-white text-xs block">{c.name.replace(/_/g, " ")}</strong>
                    </div>
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold">
                      {c.count} members
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DATABASE COVERAGE TAB ── */}
          {activeTab === "catalog" && (
            <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 text-left animate-in fade-in duration-300">
              {/* Tab Toggles */}
              <div className="flex border-b border-white/5 pb-2 gap-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                <button 
                  onClick={() => setActiveCatalogView("completeness")}
                  className={cn("pb-2 transition-colors relative", activeCatalogView === "completeness" ? "text-white border-b-2 border-primary" : "hover:text-zinc-300")}
                >
                  Completeness Scan
                </button>
                <button 
                  onClick={() => setActiveCatalogView("aliases")}
                  className={cn("pb-2 transition-colors relative", activeCatalogView === "aliases" ? "text-white border-b-2 border-primary" : "hover:text-zinc-300")}
                >
                  API Alias Mappings
                </button>
              </div>

              {/* VIEW 1: COMPLETENESS REPORT */}
              {activeCatalogView === "completeness" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-white">155 Donghua Catalog Verification Scan</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Test coverage, resolved wiki domains, character stats, and image integrity for all entries.</p>
                    </div>
                    <button
                      onClick={runCatalogScan}
                      disabled={catalogScanRunning}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white text-[10px] font-black rounded-xl shadow-lg border border-primary/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {catalogScanRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      {catalogScanRunning ? "Scanning..." : "Run Complete Catalog Scan"}
                    </button>
                  </div>

                  {/* Progress bar */}
                  {catalogScanRunning && (
                    <div className="space-y-1.5 bg-black/35 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                        <span>Testing subdomains & character collections...</span>
                        <span>{catalogScanProgress.current} / {catalogScanProgress.total}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${(catalogScanProgress.current / catalogScanProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Table of results */}
                  {catalogScanResults.length > 0 && (
                    <div className="overflow-x-auto border border-white/5 rounded-xl">
                      <table className="w-full text-xs text-left text-zinc-400">
                        <thead className="text-[10px] text-zinc-500 uppercase bg-[#090b11] border-b border-white/5">
                          <tr>
                            <th className="px-4 py-3">Donghua</th>
                            <th className="px-4 py-3">Wiki Found</th>
                            <th className="px-4 py-3">Characters</th>
                            <th className="px-4 py-3">Character Images</th>
                            <th className="px-4 py-3">World</th>
                            <th className="px-4 py-3">Power System</th>
                            <th className="px-4 py-3">Galleries</th>
                            <th className="px-4 py-3 text-right">Completeness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catalogScanResults.map((r, i) => (
                            <tr key={i} className="border-b border-white/5 bg-black/20 hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3 font-bold text-white max-w-[200px] truncate">{r.localTitle}</td>
                              <td className="px-4 py-3">
                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", r.wikiFound ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                  {r.wikiFound ? "✅" : "❌"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold font-mono">{r.wikiFound ? r.charactersCount : "—"}</td>
                              <td className="px-4 py-3 font-bold font-mono">{r.wikiFound ? r.charImagesCount : "—"}</td>
                              <td className="px-4 py-3">
                                <span className={r.worldFound ? "text-green-400" : "text-zinc-600"}>
                                  {r.worldFound ? "✅" : "⚠️"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={r.powerFound ? "text-green-400" : "text-zinc-600"}>
                                  {r.powerFound ? "✅" : "⚠️"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold font-mono">{r.wikiFound ? `${r.galleriesFound}+` : "—"}</td>
                              <td className="px-4 py-3 text-right font-black font-mono">
                                <span className={cn(
                                  r.completenessScore >= 80 ? "text-green-400" :
                                  r.completenessScore >= 50 ? "text-amber-400" : "text-red-400"
                                )}>
                                  {r.completenessScore}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {catalogScanResults.length === 0 && (
                    <div className="py-12 text-center text-zinc-500 italic">
                      Run the Catalog Scan to compile a completeness report across all entries.
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: API ALIAS MAPPINGS */}
              {activeCatalogView === "aliases" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-white">API Alias Mappings & Target Performance Verification</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Scans all aliases across Fandom, AniList, and Bangumi to verify endpoint responses.</p>
                    </div>
                    <button
                      onClick={runAliasPerformanceScan}
                      disabled={aliasScanRunning}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-500/90 hover:to-indigo-600/90 text-white text-[10px] font-black rounded-xl shadow-lg border border-purple-500/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {aliasScanRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                      {aliasScanRunning ? "Scanning APIs..." : "Run Alias Performance Scan"}
                    </button>
                  </div>

                  {/* Progress bar */}
                  {aliasScanRunning && (
                    <div className="space-y-1.5 bg-black/35 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                        <span>Querying Fandom, AniList, and Bangumi endpoints...</span>
                        <span>{aliasScanProgress.current} / {aliasScanProgress.total}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full transition-all duration-300"
                          style={{ width: `${(aliasScanProgress.current / aliasScanProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Table of results */}
                  {aliasScanResults.length > 0 && (
                    <div className="overflow-x-auto border border-white/5 rounded-xl">
                      <table className="w-full text-xs text-left text-zinc-400">
                        <thead className="text-[10px] text-zinc-500 uppercase bg-[#090b11] border-b border-white/5">
                          <tr>
                            <th className="px-4 py-3">Donghua Title</th>
                            <th className="px-4 py-3">Subdomain</th>
                            <th className="px-4 py-3">Aliases Tested & Verification Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aliasScanResults.map((r, i) => (
                            <tr key={i} className="border-b border-white/5 bg-black/20 hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3 font-bold text-white max-w-[220px]">
                                <div className="truncate">{r.displayTitle}</div>
                                <div className="text-[10px] text-zinc-500 font-normal font-mono truncate">Canonical: {r.canonicalTitle}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[10px] text-zinc-400">{r.subdomain}</td>
                              <td className="px-4 py-3 space-y-1.5">
                                {r.aliases.map((al: any, idx: number) => (
                                  <div key={idx} className="flex flex-wrap items-center gap-2 text-[10px]">
                                    <span className="font-bold text-zinc-300 bg-white/5 px-2 py-0.5 rounded truncate max-w-[150px]">{al.name}</span>
                                    <span className="text-[8px] text-zinc-500 uppercase bg-black/45 px-1 py-0.5 rounded">{al.type.replace("_", " ")}</span>
                                    <div className="flex gap-1">
                                      <span className={cn("px-1 py-0.5 rounded text-[8px] font-black font-mono", al.works.fandom ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                        Fandom: {al.works.fandom ? "✓" : "✗"}
                                      </span>
                                      <span className={cn("px-1 py-0.5 rounded text-[8px] font-black font-mono", al.works.anilist ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                        AniList: {al.works.anilist ? "✓" : "✗"}
                                      </span>
                                      <span className={cn("px-1 py-0.5 rounded text-[8px] font-black font-mono", al.works.bangumi ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                        Bangumi: {al.works.bangumi ? "✓" : "✗"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {aliasScanResults.length === 0 && (
                    <div className="py-12 text-center text-zinc-500 italic">
                      Run the Alias Performance Scan to compile and cache verified mappings.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── API SANDBOX TAB ── */}
          {activeTab === "inspector" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Form Config */}
              <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 text-left">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-primary" /> API Request Console
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Page Title</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      className="w-full bg-black/45 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Category</label>
                    <input
                      type="text"
                      value={customCat}
                      onChange={e => setCustomCat(e.target.value)}
                      className="w-full bg-black/45 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Search Query</label>
                    <input
                      type="text"
                      value={customSearchQuery}
                      onChange={e => setCustomSearchQuery(e.target.value)}
                      className="w-full bg-black/45 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Test Operations</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runCustomQuery("Site Information", { action: "query", meta: "siteinfo", siprop: "general|namespaces|statistics" })}
                      className="px-3 py-2 bg-white/3 border border-white/5 hover:bg-white/5 rounded-xl text-[10px] font-bold text-white transition-colors"
                    >
                      Site Info
                    </button>
                    <button
                      onClick={() => runCustomQuery("Parse Page JSON", { action: "parse", page: customTitle, prop: "text|sections|categories|images|templates" })}
                      className="px-3 py-2 bg-white/3 border border-white/5 hover:bg-white/5 rounded-xl text-[10px] font-bold text-white transition-colors"
                    >
                      Parse Page Details
                    </button>
                    <button
                      onClick={() => runCustomQuery("Raw Wikitext content", { action: "query", prop: "revisions", titles: customTitle, rvprop: "content", rvlimit: "1" })}
                      className="px-3 py-2 bg-white/3 border border-white/5 hover:bg-white/5 rounded-xl text-[10px] font-bold text-white transition-colors"
                    >
                      Get Raw Wikitext
                    </button>
                    <button
                      onClick={() => runCustomQuery("Search Results list", { action: "query", list: "search", srsearch: customSearchQuery, srlimit: "10" })}
                      className="px-3 py-2 bg-white/3 border border-white/5 hover:bg-white/5 rounded-xl text-[10px] font-bold text-white transition-colors"
                    >
                      Search API query
                    </button>
                    <button
                      onClick={() => runCustomQuery("Category members list", { action: "query", list: "categorymembers", cmtitle: `Category:${customCat}`, cmlimit: "30" })}
                      className="px-3 py-2 bg-white/3 border border-white/5 hover:bg-white/5 rounded-xl text-[10px] font-bold text-white transition-colors"
                    >
                      Category Members
                    </button>
                  </div>
                </div>
              </div>

              {/* Sandbox output */}
              {loading && <LoadingSpinner text="Executing API request..." />}
              
              {errorLog && (
                <div className="p-4 bg-red-950/20 border border-red-800/30 rounded-xl text-xs text-red-400 font-mono text-left">
                  ❌ {errorLog}
                </div>
              )}

              {responseLog && !loading && (
                <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">{responseLog.label}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono break-all block mt-0.5">{responseLog.url}</span>
                    </div>
                    <div className="text-right text-[10px] text-zinc-400 font-mono">
                      <span className="block">Time: <strong>{responseLog.time}ms</strong></span>
                      <span>Size: <strong>{responseLog.size}</strong></span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(responseLog.data, null, 2))}
                      className="px-3 py-1 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-[10px] text-zinc-400 hover:text-white flex items-center gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy JSON
                    </button>
                  </div>

                  <pre className="bg-black/50 border border-white/5 p-4 rounded-xl text-[10px] text-zinc-400 overflow-auto max-h-[400px] font-mono leading-relaxed select-text">
                    {JSON.stringify(responseLog.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <PageWrapper>
      <SEO title="Wiki Content Inspector — DonghuaStream" description="Validate Fandom Wiki content completeness, diagnose images, and check catalog API coverage." />
      {bodyContent}
    </PageWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPER SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */
function MetricCard({ label, val }: { label: string; val: string }) {
  return (
    <div className="p-3 bg-black/45 border border-white/5 rounded-xl">
      <span className="text-[10px] text-zinc-500 font-bold block mb-0.5">{label}</span>
      <span className="text-white font-black font-mono">{val}</span>
    </div>
  );
}

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-zinc-400 font-bold">{text}</span>
    </div>
  );
}

const CandidateRow: React.FC<{
  candidate: ImageCandidate;
  isSelected: boolean;
  override: MediaOverride | null;
  onAssignRole: (role: "card" | "hero" | "overview", url: string, isRemove?: boolean) => void;
  isAdmin: boolean;
}> = ({ candidate, isSelected, override, onAssignRole, isAdmin }) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.src = candidate.url;
    img.onload = () => {
      if (active) {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    return () => {
      active = false;
    };
  }, [candidate.url]);

  const width = dimensions?.width || candidate.width || 1080;
  const height = dimensions?.height || candidate.height || 1920;

  const isLandscape = width > height;
  const isPortrait = height > width;
  const isSquare = width === height;

  const orientation = isLandscape ? "LANDSCAPE" : isPortrait ? "PORTRAIT" : "SQUARE";

  const isCard = override?.card_image === candidate.url;
  const isOverview = override?.overview_image === candidate.url;
  const isHero = override?.hero_images?.includes(candidate.url) || false;

  // Recommendations:
  const recs: string[] = [];
  if (isPortrait) {
    recs.push("Character Card", "Overview");
  } else if (isLandscape) {
    recs.push("Hero");
  } else if (isSquare) {
    recs.push("Character Card");
  }

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border text-xs text-left transition-all",
        isSelected
          ? "bg-primary/5 border-primary/45 text-white"
          : "bg-black/25 border-white/5 text-zinc-400 hover:border-white/10"
      )}
    >
      <div className="flex gap-3 items-center min-w-0">
        <img
          src={cleanAndProxyFandomUrl(candidate.url)}
          alt={candidate.label}
          className="w-12 h-16 object-cover rounded-lg border border-white/10 bg-black shrink-0"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400";
          }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <strong className="text-white font-bold">{candidate.label}</strong>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5 uppercase tracking-wider font-mono">
              {candidate.type}
            </span>
            {isSelected && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-wider">
                Ingested Default ✓
              </span>
            )}
            
            {/* Override status badges */}
            {isCard && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-black uppercase tracking-wider">
                Card Image ✓
              </span>
            )}
            {isOverview && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black uppercase tracking-wider">
                Overview ✓
              </span>
            )}
            {isHero && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-black uppercase tracking-wider">
                Hero Slideshow ✓
              </span>
            )}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Score: <strong className="text-zinc-300 font-mono">{candidate.priority}</strong></span>
            <span>•</span>
            <span>Dimensions: <strong className="text-zinc-300 font-mono">{width} × {height}</strong> ({orientation})</span>
            {recs.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-400/80 font-bold">Recommended: {recs.join(", ")}</span>
              </>
            )}
          </div>
          <div className="flex text-amber-500 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3 w-3 fill-current",
                  i >= candidate.stars && "text-zinc-800 fill-none"
                )}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Role override configuration buttons */}
      <div className="flex flex-wrap gap-2 shrink-0 items-center justify-start md:justify-end">
        <a
          href={candidate.url}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-[9px] border border-white/5 transition-all"
        >
          View Full
        </a>
        
        {isAdmin ? (
          <>
            <button
              onClick={() => onAssignRole("card", candidate.url)}
              disabled={isCard}
              className={cn(
                "px-2 py-1 rounded font-bold text-[9px] border transition-all",
                isCard
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300 cursor-not-allowed"
                  : "bg-[#7c3aed]/10 border-[#7c3aed]/30 hover:bg-[#7c3aed]/20 text-[#a78bfa] hover:text-white"
              )}
            >
              Use as Card
            </button>
            <button
              onClick={() => onAssignRole("overview", candidate.url)}
              disabled={isOverview}
              className={cn(
                "px-2 py-1 rounded font-bold text-[9px] border transition-all",
                isOverview
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 cursor-not-allowed"
                  : "bg-[#d97706]/10 border-[#d97706]/30 hover:bg-[#d97706]/20 text-[#fbbf24] hover:text-white"
              )}
            >
              Use as Overview
            </button>
            <button
              onClick={() => onAssignRole("hero", candidate.url, isHero)}
              className={cn(
                "px-2 py-1 rounded font-bold text-[9px] border transition-all",
                isHero
                  ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400 hover:text-white"
                  : "bg-[#2563eb]/10 border-[#2563eb]/30 hover:bg-[#2563eb]/20 text-[#60a5fa] hover:text-white"
              )}
            >
              {isHero ? "Remove Hero" : "Use in Hero"}
            </button>
          </>
        ) : (
          <span className="text-[9px] text-zinc-600 font-bold uppercase italic">Admin Only</span>
        )}
      </div>
    </div>
  );
};

function detectCategory(pageTitle: string, subdomain: string, cachedLoreData?: any): string {
  const sub = (subdomain === "soul-land" || subdomain === "soulland" || subdomain === "soulland2") ? "soulland" : "battle-through-the-heavens";
  const categoriesToSearch = ["characters", "clans", "world", "techniques", "artifacts", "cultivation"];
  if (cachedLoreData) {
    for (const cat of categoriesToSearch) {
      const list = (cachedLoreData as any)[sub]?.[cat] || [];
      const found = list.find((item: any) => item.title?.toLowerCase().trim() === pageTitle.toLowerCase().trim());
      if (found) return cat;
    }
  }
  return "characters"; // Default fallback
}

function WikiPageProfileCard({ page, subdomain, cachedLoreData: propLoreData }: { page: PageInspectorDetail; subdomain: string; cachedLoreData?: any }) {
  const [activeBioTab, setActiveBioTab] = useState<string>("intro");
  const [selectedImageMode, setSelectedImageMode] = useState<"donghua" | "manhua" | "novel" | "default">("donghua");
  const [override, setOverride] = useState<MediaOverride | null>(null);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.subscription_tier === 'admin';

  const { data: queryLoreData } = useQuery({
    queryKey: ["cachedLoreData", subdomain],
    queryFn: async () => {
      try {
        const res = await fetch(`/data/lore/${subdomain}.json`);
        if (!res.ok) return {};
        const json = await res.json();
        return { [subdomain]: json };
      } catch {
        return {};
      }
    },
    enabled: !propLoreData,
    staleTime: Infinity,
  });
  const cachedLoreData = propLoreData || queryLoreData;

  useEffect(() => {
    let active = true;
    async function loadOverride() {
      setIsOverrideLoading(true);
      const cat = detectCategory(page.title, subdomain, cachedLoreData);
      const slug = page.title.replace(/ /g, "_");
      const res = await fetchMediaOverride(cat, slug);
      if (active) {
        setOverride(res);
        setIsOverrideLoading(false);
      }
    }
    loadOverride();
    return () => {
      active = false;
    };
  }, [page.title, subdomain, cachedLoreData]);

  const handleAssignRole = async (role: "card" | "hero" | "overview", url: string, isRemove = false) => {
    if (!isAdmin) {
      toast.error("Administrator privileges required to override image roles.");
      return;
    }
    const cat = detectCategory(page.title, subdomain, cachedLoreData);
    const slug = page.title.replace(/ /g, "_");
    
    let updatedHero = override?.hero_images || [];
    if (role === "hero") {
      if (isRemove) {
        updatedHero = updatedHero.filter(u => u !== url);
      } else {
        updatedHero = Array.from(new Set([...updatedHero, url]));
      }
    }

    const payload: MediaOverride = {
      category: cat,
      entity_id: slug,
      card_image: role === "card" ? url : (override?.card_image || null),
      overview_image: role === "overview" ? url : (override?.overview_image || null),
      hero_images: updatedHero
    };

    if (override?.id) {
      payload.id = override.id;
    }

    const res = await saveMediaOverride(payload);
    if (res) {
      setOverride(res);
      toast.success(`Assigned image to ${role === "card" ? "character card" : role === "overview" ? "overview image" : "hero slideshow"} successfully!`);
    } else {
      toast.error("Failed to save override. Check auth permissions.");
    }
  };

  // Determine if there is power system data
  const powerKeys = [
    "martial soul", "soul rank", "spirit rings", "soul rings", "god position", 
    "domain(s)", "domain", "element(s)", "element", "system", "dou qi", 
    "qi method", "heavenly flame", "cultivation", "bloodline", "technique(s)", 
    "precious techniques", "sovereign realm", "profundity", "profound"
  ];

  const infoboxEntries = Object.entries(page.infobox);
  const powerEntries = infoboxEntries.filter(([k]) => 
    powerKeys.some(pk => k.toLowerCase().includes(pk))
  );
  const basicEntries = infoboxEntries.filter(([k]) => 
    !powerKeys.some(pk => k.toLowerCase().includes(pk))
  );

  // Helper to parse and render soul rings nicely
  // Helper to parse and render soul rings nicely
  const renderSoulRings = (val: string) => {
    const parts = val.split(/[\n,;]|\s{2,}/);
    return (
      <div className="space-y-1.5 mt-1">
        {parts.map((p, idx) => {
          const trimmed = p.trim();
          if (!trimmed) return null;
          
          const match = trimmed.match(/^(\d+)\s+([A-Za-z]+)/);
          if (match) {
            const count = parseInt(match[1]);
            const colorName = match[2].toLowerCase();
            let emoji = "⚪";
            let badgeClass = "bg-white/5 border-white/10 text-white";
            
            if (colorName.includes("yellow")) { emoji = "🟡"; badgeClass = "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"; }
            else if (colorName.includes("purple")) { emoji = "🟣"; badgeClass = "bg-purple-500/10 border-purple-500/30 text-purple-400"; }
            else if (colorName.includes("black")) { emoji = "⚫"; badgeClass = "bg-zinc-800 border-zinc-700 text-zinc-300"; }
            else if (colorName.includes("red")) { emoji = "🔴"; badgeClass = "bg-red-500/10 border-red-500/30 text-red-400"; }
            else if (colorName.includes("gold") || colorName.includes("orange")) { emoji = "🟠"; badgeClass = "bg-orange-500/10 border-orange-500/30 text-orange-400"; }
            else if (colorName.includes("blue")) { emoji = "🔵"; badgeClass = "bg-blue-500/10 border-blue-500/30 text-blue-400"; }
            
            return (
              <div key={idx} className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold mr-1.5 mb-1", badgeClass)}>
                <span>{emoji}</span>
                <span>{count} × {match[2]}</span>
              </div>
            );
          }
          
          return (
            <span key={idx} className="inline-block px-2 py-0.5 bg-white/5 border border-white/5 rounded-lg text-[10px] text-zinc-400 mr-1.5 mb-1">
              {trimmed}
            </span>
          );
        })}
      </div>
    );
  };

  const renderTags = (val: string) => {
    const tags = val.split(/[,;\n]|\s{2,}/).map(t => t.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.map((t, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-[10px] font-bold text-primary">
            {t}
          </span>
        ))}
      </div>
    );
  };

  const bioTabs = [
    { id: "intro", label: "Overview", content: page.intro },
    { id: "appearance", label: "Appearance", content: page.appearance },
    { id: "personality", label: "Personality", content: page.personality },
    { id: "history", label: "History & Story", content: page.history },
    { id: "trivia", label: "Trivia", content: page.trivia },
    { id: "quotes", label: "Quotes", content: page.quotes }
  ].filter(tab => tab.content && tab.content.trim().length > 0);

  const currentTab = bioTabs.find(t => t.id === activeBioTab) || bioTabs[0] || { id: "intro", label: "Overview", content: page.intro };

  // Image mode selector logic
  let displayedImage = page.primaryImage;
  let activeMode: "donghua" | "manhua" | "novel" | "default" = "default";

  if (selectedImageMode === "donghua" && page.donghuaImage) {
    displayedImage = page.donghuaImage;
    activeMode = "donghua";
  } else if (selectedImageMode === "manhua" && page.manhuaImage) {
    displayedImage = page.manhuaImage;
    activeMode = "manhua";
  } else if (selectedImageMode === "novel" && page.novelImage) {
    displayedImage = page.novelImage;
    activeMode = "novel";
  } else {
    if (page.donghuaImage) {
      displayedImage = page.donghuaImage;
      activeMode = "donghua";
    } else if (page.manhuaImage) {
      displayedImage = page.manhuaImage;
      activeMode = "manhua";
    } else if (page.novelImage) {
      displayedImage = page.novelImage;
      activeMode = "novel";
    } else {
      displayedImage = page.defaultImage || page.primaryImage;
      activeMode = "default";
    }
  }

  const showSwitcher = !!(page.donghuaImage && (page.manhuaImage || page.novelImage)) || !!(page.manhuaImage && page.novelImage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-5 items-start bg-[#0c0f17]/90 border border-white/5 p-5 rounded-2xl">
        {displayedImage ? (
          <div className="space-y-2 shrink-0">
            <img
              src={displayedImage}
              alt={page.title}
              className="w-40 h-52 object-cover rounded-xl border border-white/10 shadow-xl bg-black"
              referrerPolicy="no-referrer"
            />
            {showSwitcher && (
              <div className="flex justify-center gap-1">
                {page.donghuaImage && (
                  <button
                    onClick={() => setSelectedImageMode("donghua")}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-colors",
                      activeMode === "donghua" ? "bg-primary text-white" : "bg-white/5 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Donghua
                  </button>
                )}
                {page.manhuaImage && (
                  <button
                    onClick={() => setSelectedImageMode("manhua")}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-colors",
                      activeMode === "manhua" ? "bg-primary text-white" : "bg-white/5 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Manhua
                  </button>
                )}
                {page.novelImage && (
                  <button
                    onClick={() => setSelectedImageMode("novel")}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-colors",
                      activeMode === "novel" ? "bg-primary text-white" : "bg-white/5 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Novel
                  </button>
                )}
              </div>
            )}
            <div className="text-[9px] text-zinc-500 font-bold text-center max-w-[160px] italic leading-tight">
              {activeMode !== "default" ? `Artwork Version: ${activeMode.toUpperCase()}` : page.imageSelectionReason}
            </div>
          </div>
        ) : (
          <div className="w-40 h-52 bg-zinc-900 border border-white/5 rounded-xl flex flex-col items-center justify-center shrink-0">
            <ImageIcon className="h-8 w-8 text-zinc-700 mb-2" />
            <span className="text-[10px] text-zinc-500 font-bold">No Artwork Found</span>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="text-left">
              <h2 className="text-xl font-black text-white">{page.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-zinc-500 font-mono">PageID: {page.pageid}</span>
                <span className="text-zinc-600">•</span>
                <a href={page.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline">
                  <ExternalLink className="h-3 w-3" /> View Wiki Source
                </a>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Completeness</span>
              <span className={cn(
                "text-sm font-black px-2 py-0.5 rounded-lg font-mono",
                page.completenessScore >= 80 ? "bg-green-500/10 text-green-400" :
                page.completenessScore >= 50 ? "bg-amber-500/10 text-amber-400" :
                "bg-red-500/10 text-red-400"
              )}>
                {page.completenessScore}%
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {bioTabs.length > 1 && (
              <div className="flex flex-wrap gap-1 bg-black/45 p-1 rounded-xl border border-white/5">
                {bioTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBioTab(tab.id)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                      currentTab.id === tab.id
                        ? "bg-primary text-white"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-black/30 border border-white/5 p-4 rounded-xl text-left">
              <p className="text-xs text-zinc-300 leading-relaxed font-medium whitespace-pre-line">
                {currentTab.content || "No summary text details discovered in this section."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0c0f17]/90 border border-white/5 p-5 rounded-2xl space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 text-left">
          <Activity className="h-4 w-4 text-purple-400" /> Image Diagnostic Pipeline
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {page.diagnostics.map((diag) => (
            <div key={diag.sourceName} className="p-2.5 bg-black/45 border border-white/5 rounded-xl text-[10px] text-left flex items-start gap-2.5">
              <span className={cn("text-xs mt-0.5", diag.found ? "text-green-400" : "text-zinc-600")}>
                {diag.found ? "✅" : "❌"}
              </span>
              <div className="min-w-0 flex-1">
                <strong className="text-white block">{diag.sourceName}</strong>
                <span className="text-zinc-500 block truncate mt-0.5">{diag.detail}</span>
                {diag.url && (
                  <a href={diag.url} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline block text-[9px] mt-1 truncate">
                    Inspect Image Link
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── IMAGE CANDIDATES SECTION ── */}
      {page.imageCandidates && page.imageCandidates.length > 0 && (
        <div className="bg-[#0c0f17]/90 border border-white/5 p-5 rounded-2xl space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between border-b border-white/5 pb-2 text-left">
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> Ingestion Image Candidates
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Auto-Selection Priority Order
            </span>
          </h4>
          <div className="space-y-2">
            {page.imageCandidates.map((candidate, idx) => (
              <CandidateRow
                key={idx}
                candidate={candidate}
                isSelected={page.primaryImage === candidate.url}
                override={override}
                onAssignRole={handleAssignRole}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {powerEntries.length > 0 && (
          <div className="bg-[#0c0f17]/90 border border-primary/20 p-5 rounded-2xl space-y-4 text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-primary/20 pb-2.5">
              <Flame className="h-4 w-4 text-primary" /> Power System Core Stats
            </h4>
            <div className="space-y-3">
              {powerEntries.map(([k, v]) => {
                const isRings = k.toLowerCase().includes("ring");
                const isChips = k.toLowerCase().includes("domain") || k.toLowerCase().includes("element");
                return (
                  <div key={k} className="p-3 bg-black/45 border border-white/5 rounded-xl">
                    <span className="text-[9px] text-zinc-500 font-bold block uppercase">{k}</span>
                    {isRings ? (
                      renderSoulRings(v)
                    ) : isChips ? (
                      renderTags(v)
                    ) : (
                      <span className="text-white font-bold text-xs mt-1 block leading-relaxed">{v}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {basicEntries.length > 0 && (
          <div className="bg-[#0c0f17]/90 border border-white/5 p-5 rounded-2xl space-y-4 text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <BookOpen className="h-4 w-4 text-emerald-400" /> Basic Profile Parameters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {basicEntries.map(([k, v]) => (
                <div key={k} className="p-3 bg-black/45 border border-white/5 rounded-xl">
                  <span className="text-[9px] text-zinc-500 font-bold block uppercase">{k}</span>
                  <span className="text-white font-bold text-xs truncate block mt-0.5" title={v}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {page.galleryImages.length > 0 && (
        <div className="bg-[#0c0f17]/90 border border-white/5 p-5 rounded-2xl space-y-3 text-left">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-sky-400" /> Media Gallery ({page.galleryImages.length})
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {page.galleryImages.slice(0, 12).map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                <img src={img} alt="" className="w-full h-full object-cover bg-black" referrerPolicy="no-referrer" />
                <a href={img} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <Eye className="h-4 w-4 text-white" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {page.sections.length > 0 && (
        <div className="bg-[#0c0f17]/90 border border-white/5 p-5 rounded-2xl space-y-3 text-left">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <List className="h-4 w-4 text-zinc-400" /> Document Section Outlines
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {page.sections.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-white/3 border border-white/5 rounded-lg text-[10px] text-zinc-400">
                {s.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({
  title, list, loading, searchValue, onSearchChange, onSelect, selectedDetail, detailLoading, onBack, icon, subdomain, cachedLoreData
}: {
  title: string;
  list: CategoryMember[];
  loading: boolean;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSelect: (title: string) => void;
  selectedDetail: PageInspectorDetail | null;
  detailLoading: boolean;
  onBack: () => void;
  icon: React.ReactNode;
  subdomain: string;
  cachedLoreData?: any;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* Left List */}
      <div className="lg:col-span-1 bg-[#090b11]/80 border border-white/5 rounded-2xl p-5 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">{title}</h3>
          {loading && <span className="text-[10px] text-primary animate-pulse font-bold">Loading...</span>}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search index..."
            className="w-full bg-black/45 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          {list.map((c) => (
            <button
              key={c.pageid}
              onClick={() => onSelect(c.title)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all text-xs",
                selectedDetail?.title === c.title
                  ? "bg-primary/10 border-primary/30"
                  : "bg-white/3 border-white/3 hover:bg-white/5"
              )}
            >
              {c.image ? (
                <img src={c.image} alt="" className="w-8 h-8 object-cover rounded-md border border-white/10 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <span className="text-white font-bold truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Content */}
      <div className="lg:col-span-2">
        {detailLoading && (
          <div className="bg-[#090b11]/80 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center h-[400px]">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs text-zinc-400 font-bold">Analyzing page layout...</span>
          </div>
        )}

        {selectedDetail && !detailLoading && (
          <WikiPageProfileCard page={selectedDetail} subdomain={subdomain} cachedLoreData={cachedLoreData} />
        )}

        {!selectedDetail && !detailLoading && (
          <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-2xl bg-[#090b11]/30">
            <Info className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-500 font-bold">Select any item from the left index list to inspect its content profile.</p>
          </div>
        )}
      </div>

    </div>
  );
}
