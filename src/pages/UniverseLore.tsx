import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Compass, ArrowLeft, Search, Globe, 
  Users, Flag, BookOpen, Image, Activity, ShieldAlert, Award, Star, Flame, Sword, Gift, Hourglass, ExternalLink
} from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";
import { getFandomDetail } from "@/services/fandomAnime";
import { WikiImage } from "@/components/WikiImage";
import { useQuery } from "@tanstack/react-query";
// cachedLoreData dynamically queried at runtime
import { fetchMediaOverride, type MediaOverride } from "@/services/mediaOverrides";

// High-quality static fallbacks for BTTH cultivation ranks to prevent grey placeholders
const cultivationFallbacks: Record<string, string> = {
  "dou zhi qi": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/6/6d/Xiao_Yan_Origin_remake.png/revision/latest",
  "dou zhe": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/6/6f/Xiao_Yan_Origin.png/revision/latest",
  "dou shi": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/ab/Xiao_Yan_Donghua.png/revision/latest",
  "da dou shi": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/73/S5_Xiao_Yan.png/revision/latest",
  "dou ling": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/a2/Xiao_Yan_S4_Infobox.png/revision/latest",
  "dou wang": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/a5/IMG_0822.jpeg/revision/latest",
  "dou huang": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/e/e5/Yun_Yun.png/revision/latest",
  "dou zong": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/8/85/32.jpg/revision/latest",
  "dou zun": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/77/Yao_Lao_Origin_Infobox.png/revision/latest",
  "ban sheng": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/1/1d/IMG_0869.gif/revision/latest",
  "dou sheng": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/5/5e/Gu_Xun_Er_S5_Infobox.png/revision/latest",
  "dou di": "https://static.wikia.nocookie.net/battle-through-the-heavens/images/b/be/Xiao_Yan_End_Web.png/revision/latest"
};

// Fandom category matching map
const categoryFandomMap: Record<string, { label: string; fandomCat: string; icon: any }> = {
  "world": { label: "World & Locations", fandomCat: "Locations", icon: Globe },
  "characters": { label: "Characters", fandomCat: "Characters", icon: Users },
  "cultivation": { label: "Cultivation Realms", fandomCat: "Cultivation", icon: Flame },
  "techniques": { label: "Dou Techniques", fandomCat: "Dou_Techniques", icon: Sword },
  "artifacts": { label: "Items & Artifacts", fandomCat: "Items", icon: Gift },
  "clans": { label: "Clans & Factions", fandomCat: "Clans", icon: Flag },
  "gallery": { label: "Media Gallery", fandomCat: "Images", icon: Image },
  "timeline": { label: "Chronology Timeline", fandomCat: "Seasons", icon: Hourglass }
};

interface WikiItem {
  id: number;
  title: string;
  image: string;
  galleryImages?: string[];
}

// Staggered, hardware-accelerated crossfading card slideshow component
const CardSlideshow: React.FC<{ images: string[]; alt: string; icon: any }> = ({ images, alt, icon }) => {
  const [index, setIndex] = useState(0);

  const validImages = useMemo(() => {
    return (images || []).filter(img => img && img.startsWith('http') && !img.includes('placeholder'));
  }, [images]);

  useEffect(() => {
    if (validImages.length <= 1) return;

    // Randomize startup stagger so cards do not transition in unison
    const stagger = Math.random() * 2000;
    let intervalId: NodeJS.Timeout;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setIndex(prev => (prev + 1) % validImages.length);
      }, 4000);
    }, stagger);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [validImages]);

  if (validImages.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[#0f111a] to-[#030409]">
        {React.createElement(icon, { className: "h-10 w-10 text-zinc-800 opacity-40 group-hover:scale-105 transition-transform duration-500" })}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {validImages.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-1000",
            i === index ? "opacity-100 scale-102" : "opacity-0 scale-100"
          )}
          referrerPolicy="no-referrer"
        />
      ))}
    </div>
  );
};

// Cinematic, slow crossfading header background slideshow for places/entities
const HeroSlideshow: React.FC<{ 
  images: string[]; 
  alt: string;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
}> = ({ images, alt, activeIndex, onIndexChange }) => {
  const [localIndex, setLocalIndex] = useState(0);

  const index = activeIndex !== undefined ? activeIndex : localIndex;
  const setIndex = onIndexChange || setLocalIndex;

  const validImages = useMemo(() => {
    const unique = Array.from(new Set(images || []));
    return unique.filter(img => 
      img && 
      img.startsWith('http') && 
      !img.includes('No_Photo_Available') && 
      !img.includes('2015060816373561467') && 
      !img.includes('placeholder')
    );
  }, [images]);

  useEffect(() => {
    if (validImages.length <= 1 || onIndexChange) return; // Only auto-cycle if parent isn't managing it
    const interval = setInterval(() => {
      setIndex((index + 1) % validImages.length);
    }, 6000); // cycle slowly (every 6 seconds) to prevent visual spam
    return () => clearInterval(interval);
  }, [validImages, index, onIndexChange, setIndex]);

  if (validImages.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0f111a] to-[#030409]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#030409] via-black/45 to-transparent" />
      </div>
    );
  }

  // Slice top 8 unique illustrations for the backdrop
  const slideshowImages = validImages.slice(0, 8);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {slideshowImages.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-1500",
            i === index ? "opacity-95 scale-101" : "opacity-0 scale-100"
          )}
          referrerPolicy="no-referrer"
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030409] via-[#030409]/20 to-transparent" />
    </div>
  );
};

const getFandomSubdomain = (slugStr: string): string => {
  const mapping: Record<string, string> = {
    "soul-land": "soulland",
    "battle-through-the-heavens": "battle-through-the-heavens",
    "renegade-immortal": "xian-ni",
    "renegade-immortal-movie-battle-of-the-gods": "xian-ni",
    "perfect-world": "wanmei-shijie",
    "swallowed-star": "swallowed-star",
    "shrouding-the-heavens": "shrouding-the-heavens",
    "the-great-ruler": "thegreatruler",
    "the-great-ruler-3d": "thegreatruler",
    "stellar-transformations": "stellar-transformations",
    "stellar-transformation-final-season": "stellar-transformations",
    "martial-universe": "wu-dong-qian-kun",
  };
  const key = (slugStr || "").toLowerCase();
  if (mapping[key]) return mapping[key];
  if (key.includes("renegade") || key.includes("xian-ni")) return "xian-ni";
  if (key.includes("soul-land") || key.includes("douluo")) return "soulland";
  if (key.includes("perfect-world") || key.includes("wanmei")) return "wanmei-shijie";
  if (key.includes("swallowed-star")) return "swallowed-star";
  if (key.includes("shrouding")) return "shrouding-the-heavens";
  if (key.includes("great-ruler")) return "thegreatruler";
  if (key.includes("stellar")) return "stellar-transformations";
  if (key.includes("martial-universe") || key.includes("wu-dong")) return "wu-dong-qian-kun";
  return "battle-through-the-heavens";
};

const UniverseLore = () => {
  const { slug, category = "world", id } = useParams<{ slug: string; category: string; id?: string }>();
  const sub = useMemo(() => getFandomSubdomain(slug || ""), [slug]);
  const { data: cachedLore } = useQuery({
    queryKey: ["cachedLoreData", sub],
    queryFn: async () => {
      try {
        const res = await fetch(`/data/lore/${sub}.json`);
        if (!res.ok) return {};
        const json = await res.json();
        return { [sub]: json };
      } catch {
        return {};
      }
    },
    staleTime: Infinity,
  });
  const cachedLoreData = cachedLore || {};
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<WikiItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [override, setOverride] = useState<MediaOverride | null>(null);

  useEffect(() => {
    if (!id) {
      setOverride(null);
      return;
    }
    let active = true;
    async function loadOverride() {
      const slugKey = id.replace(/ /g, "_");
      const res = await fetchMediaOverride(category, slugKey);
      if (active) {
        setOverride(res);
      }
    }
    loadOverride();
    return () => {
      active = false;
    };
  }, [category, id]);

  useEffect(() => {
    setActiveHeroIndex(0);
  }, [id]);

  // Compute a single deduplicated list of valid images, sorted by Donghua preference (Donghua > neutral > Manhua/Novel)
  const approvedMedia = useMemo<string[]>(() => {
    if (!detailData) return [];
    const rawList = [
      detailData.infoboxImage || detailData.image,
      ...(detailData.gallery || []),
      ...(detailData.allImages || [])
    ];
    
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const rawUrl of rawList) {
      if (!rawUrl) continue;
      let url = rawUrl.replace(/\/scale-to-width-down\/\d+/, "");
      let normalized = url;
      if (normalized.includes("/revision/latest")) {
        normalized = normalized.split("/revision/latest")[0];
      }
      const isPlaceholder = normalized.includes("2015060816373561467") || normalized.includes("No_Photo_Available") || normalized.includes("placeholder");
      if (isPlaceholder) continue;

      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniq.push(url);
      }
    }

    const getScore = (url: string) => {
      const lower = url.toLowerCase();
      // Scoring prioritizing Donghua keyart and stills over Manhua/Novel drawings
      if (lower.includes("donghua") || lower.includes("episode") || lower.includes("season") || /s\d+/.test(lower) || /ep\d+/.test(lower)) {
        return 100;
      }
      if (lower.includes("manhua") || lower.includes("novel") || lower.includes("comic") || lower.includes("manga")) {
        return -50;
      }
      return 0;
    };

    return uniq.sort((a, b) => getScore(b) - getScore(a));
  }, [detailData]);

  // Determine if a URL is landscape-oriented (heuristic)
  const isLandscape = (url: string) => {
    const lower = url.toLowerCase();
    const isInfobox = detailData?.infoboxImage && url === detailData.infoboxImage;
    if (isInfobox) return false; // Infobox is always character portrait
    
    const landscapeKeywords = ["panorama", "landscape", "wide", "banner", "bg", "island", "forest", "scene", "background", "environment", "screenshot"];
    if (landscapeKeywords.some(keyword => lower.includes(keyword))) {
      return true;
    }
    const portraitKeywords = ["portrait", "profile", "face", "character", "infobox", "avatar"];
    if (portraitKeywords.some(keyword => lower.includes(keyword))) {
      return false;
    }
    if (category === "world") {
      return true;
    }
    return false;
  };

  // Hero Images: Use manually selected hero overrides if present, otherwise calculate automatically
  const heroImages = useMemo<string[]>(() => {
    if (override?.hero_images && override.hero_images.length > 0) {
      return override.hero_images;
    }
    
    // Automatically select the best 3-5 landscape images from approvedMedia
    const landscapes = approvedMedia.filter(url => isLandscape(url));
    if (landscapes.length > 0) {
      return landscapes.slice(0, 5); // Use best landscape candidates (up to 5)
    }
    
    // If no landscapes exist, fallback to the default primary/gallery image
    const defaultHero = detailData?.gallery?.[0] || detailData?.image || "";
    return defaultHero ? [defaultHero] : [];
  }, [override?.hero_images, approvedMedia, detailData]);

  // Overview Image: Use manually selected overview override if present, otherwise calculate automatically
  const overviewImage = useMemo<string>(() => {
    if (override?.overview_image) {
      return override.overview_image;
    }
    if (approvedMedia.length === 0) return "";
    
    // If we have selected overrides for hero, don't overlap unless necessary
    const firstHeroImage = heroImages[0] || "";
    const portrait = approvedMedia.find(url => url !== firstHeroImage && !isLandscape(url));
    if (portrait) return portrait;
    const fallback = approvedMedia.find(url => url !== firstHeroImage);
    return fallback || firstHeroImage;
  }, [override?.overview_image, approvedMedia, heroImages]);

  const gallery = useMemo<string[]>(() => {
    const heroSet = new Set(heroImages);
    return approvedMedia.filter(url => !heroSet.has(url) && url !== overviewImage);
  }, [approvedMedia, heroImages, overviewImage]);

  const categoryMeta = categoryFandomMap[category] || categoryFandomMap["world"];

  // Heuristic to dynamically link infobox text values to category items
  const renderLinkedValue = (value: string) => {
    if (!value) return null;
    
    const parts = value.split(/(?:,|\band\b|;)\s*/);
    if (parts.length <= 1) {
      const trimmed = value.trim();
      const categoriesToSearch = ["characters", "clans", "world", "techniques", "artifacts"];
      for (const cat of categoriesToSearch) {
        const list = (cachedLoreData as any)[sub]?.[cat] || [];
        const found = list.find((item: any) => {
          const itemTitle = item.title.toLowerCase().trim();
          const t = trimmed.toLowerCase();
          return itemTitle === t || t === itemTitle + "s" || (t.length >= 4 && (itemTitle.includes(t) || t.includes(itemTitle)));
        });
        if (found) {
          const matchedId = found.title.replace(/ /g, "_");
          return (
            <span 
              onClick={() => navigate(`/series/${slug}/lore/${cat}/${matchedId}`)}
              className="text-primary hover:text-white cursor-pointer underline transition-colors"
            >
              {value}
            </span>
          );
        }
      }
      return <span>{value}</span>;
    }

    return (
      <span className="space-x-1">
        {parts.map((part, index) => {
          const trimmed = part.trim();
          if (!trimmed) return null;

          let matchedCategory = "";
          let matchedId = "";

          const categoriesToSearch = ["characters", "clans", "world", "techniques", "artifacts"];
          for (const cat of categoriesToSearch) {
            const list = (cachedLoreData as any)[sub]?.[cat] || [];
            const found = list.find((item: any) => {
              const itemTitle = item.title.toLowerCase().trim();
              const t = trimmed.toLowerCase();
              return itemTitle === t || t === itemTitle + "s" || (t.length >= 4 && (itemTitle.includes(t) || t.includes(itemTitle)));
            });
            if (found) {
              matchedCategory = cat;
              matchedId = found.title.replace(/ /g, "_");
              break;
            }
          }

          const separator = index < parts.length - 1 ? ", " : "";

          if (matchedCategory && matchedId) {
            return (
              <span key={index}>
                <span 
                  onClick={() => navigate(`/series/${slug}/lore/${matchedCategory}/${matchedId}`)}
                  className="text-primary hover:text-white cursor-pointer underline transition-colors"
                >
                  {trimmed}
                </span>
                {separator}
              </span>
            );
          }

          return (
            <span key={index}>
              {trimmed}
              {separator}
            </span>
          );
        })}
      </span>
    );
  };

  // Fetch list of published items for active category from Unified Lore Registry
  useEffect(() => {
    const fetchCategoryItems = async () => {
      setIsLoading(true);
      setItems([]);
      try {
        const { getAllEntities } = await import("@/services/loreRegistryService");
        const all = await getAllEntities(sub);
        
        const catTypeMap: Record<string, string> = {
          world: "location",
          characters: "character",
          cultivation: "cultivation",
          techniques: "technique",
          artifacts: "artifact",
          clans: "clan"
        };
        const targetType = catTypeMap[category] || "location";
        const categoryEntities = all.filter(e => e.type === targetType && e.status === "published");

        if (categoryEntities.length > 0) {
          const resolvedItems: WikiItem[] = categoryEntities.map(e => ({
            id: e.id as any,
            title: e.name,
            image: e.avatarUrl || e.bannerUrl || "",
            galleryImages: e.gallery || []
          }));
          setItems(resolvedItems);
          setIsLoading(false);
          return;
        }

        // Fallback to static cached JSON
        const cachedList = (cachedLoreData as any)[sub]?.[category];
        if (cachedList && cachedList.length > 0) {
          const seen = new Set<string>();
          const resolvedItems: WikiItem[] = [];

          for (const item of cachedList) {
            const titleLower = item.title.toLowerCase().trim();
            if (
              titleLower === "locations" ||
              titleLower === "characters" ||
              titleLower === "dou techniques" ||
              titleLower === "clans" ||
              titleLower === "items" ||
              titleLower === "cultivation" ||
              titleLower === "realms" ||
              seen.has(titleLower)
            ) {
              continue;
            }
            seen.add(titleLower);

            let primaryImg = item.logoImage || "";
            if (!primaryImg && item.galleryImages && item.galleryImages.length > 0) {
              primaryImg = item.galleryImages[0];
            }
            resolvedItems.push({
              id: item.id,
              title: item.title,
              image: primaryImg,
              galleryImages: item.galleryImages || []
            });
          }
          setItems(resolvedItems);
        }
      } catch (err) {
        console.error("Failed fetching category items", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategoryItems();
  }, [category, sub, categoryMeta.fandomCat]);

  // Fetch detail info from Central Lore Registry
  useEffect(() => {
    if (!id) {
      setDetailData(null);
      return;
    }
    const fetchEntityDetail = async () => {
      setIsDetailLoading(true);
      setDetailData(null);
      try {
        const { getEntityBySlug, getEntityRelationships } = await import("@/services/loreRegistryService");
        const entity = await getEntityBySlug(id, sub);
        const rels = await getEntityRelationships(id, sub);

        if (entity) {
          const primaryImg = entity.avatarUrl || entity.bannerUrl || "";
          const galleryImgs = entity.gallery && entity.gallery.length > 0 ? entity.gallery : (primaryImg ? [primaryImg] : []);

          setDetailData({
            title: entity.name,
            image: primaryImg,
            infoboxImage: primaryImg,
            overview: entity.overview || entity.description || "",
            appearance: entity.appearance || "",
            personality: entity.personality || "",
            history: entity.history || "",
            trivia: entity.trivia || "",
            quotes: entity.quotes || "",
            url: entity.wikiUrl || "",
            infobox: entity.attributes || {},
            sections: [],
            gallery: galleryImgs,
            relationships: rels
          });
          setIsDetailLoading(false);
          return;
        }

        const titleStr = id.replace(/_/g, " ");
        const titleLower = titleStr.toLowerCase().trim();

        // Fallback static JSON
        const cachedList = (cachedLoreData as any)[sub]?.[category];
        const cachedItem = cachedList?.find((item: any) => item.title.toLowerCase() === titleStr.toLowerCase());

        if (cachedItem) {
          let primaryImg = cachedItem.logoImage || "";
          setDetailData({
            title: cachedItem.title || titleStr,
            image: primaryImg,
            infoboxImage: primaryImg,
            overview: cachedItem.introText || "",
            appearance: cachedItem.appearance || "",
            personality: cachedItem.personality || "",
            history: cachedItem.history || "",
            trivia: cachedItem.trivia || "",
            quotes: cachedItem.quotes || "",
            url: cachedItem.url || "",
            infobox: cachedItem.infobox || {},
            sections: [],
            gallery: cachedItem.galleryImages || []
          });
        }
      } catch (err) {
        console.error("Failed fetching entity detail", err);
      } finally {
        setIsDetailLoading(false);
      }
    };
    fetchEntityDetail();
  }, [id, sub, category]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const fallbackBackground = "bg-gradient-to-tr from-[#0f111a] to-[#030409]";

  if (id) {
    const defaultHero = detailData?.gallery?.[0] || detailData?.image || "";

    return (
      <div className="min-h-screen bg-[#030409] text-foreground pb-24 text-left">
        <SEO 
          title={`${id.replace(/_/g, " ")} - ${categoryMeta.label} | DonghuaStream`} 
          description={detailData?.overview}
        />
        
        {/* Cinematic Header Banner with places slideshow (Role: hero) */}
        <div className="relative min-h-[55vh] md:min-h-[75vh] lg:min-h-[85vh] flex items-end overflow-hidden group pb-8">
          <HeroSlideshow 
            images={heroImages} 
            alt={id}
          />
          
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 relative z-10 pt-24">
            <button 
              onClick={() => navigate(`/series/${slug}/lore/${category}`)}
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to {categoryMeta.label}
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md inline-block">
                {categoryMeta.label}
              </span>
              <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-wider">
                {detailData?.title || id.replace(/_/g, " ")}
              </h1>
            </div>
          </div>
        </div>

        {isDetailLoading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest font-mono">Syncing Lore Records...</span>
          </div>
        ) : detailData ? (
          <PageWrapper withTopPadding={false} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-8 space-y-8">
              {/* Flex block combining overview and media (Role: media) */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {overviewImage && category !== "world" && (
                  <div className="w-full md:w-56 shrink-0">
                    <div className="rounded-2xl overflow-hidden bg-black/60 border border-white/[0.06] flex items-center justify-center relative group p-2 aspect-[3/4]">
                      <img
                        src={overviewImage}
                        alt={detailData.title}
                        className="max-h-full max-w-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-102"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <BookOpen className="h-4.5 w-4.5 text-primary" /> Record Overview
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-line">
                    {detailData.overview || "Overview documentation currently being translated from original manuscripts."}
                  </p>
                </div>
              </div>

              {/* ── Narrative Sections (extracted from Wiki) ── */}
              {detailData.appearance && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Star className="h-4.5 w-4.5 text-primary" /> Appearance
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-line">{detailData.appearance}</p>
                </div>
              )}

              {detailData.personality && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4.5 w-4.5 text-primary" /> Personality
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-line">{detailData.personality}</p>
                </div>
              )}

              {detailData.history && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-primary" /> History & Background
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-line max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700">{detailData.history}</p>
                </div>
              )}

              {detailData.trivia && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Flame className="h-4.5 w-4.5 text-primary" /> Trivia
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-line">{detailData.trivia}</p>
                </div>
              )}

              {detailData.quotes && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <BookOpen className="h-4.5 w-4.5 text-amber-400" /> Quotes
                  </h3>
                  <div className="text-sm text-zinc-400 leading-relaxed font-medium whitespace-pre-line italic border-l-2 border-primary/30 pl-4">{detailData.quotes}</div>
                </div>
              )}

              {/* Dynamic uniquely deduplicated gallery */}
              {gallery.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Image className="h-4.5 w-4.5 text-primary" /> Media & Illustrations
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {gallery
                      .slice(0, 12)
                      .map((imgUrl: string, idx: number) => (
                        <div 
                          key={idx}
                          onClick={() => setLightboxImage(imgUrl)}
                          className="cursor-pointer"
                        >
                          <WikiImage src={imgUrl} role="gallery" alt={`Illustration #${idx + 1}`} />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Information Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Infobox fields parsed dynamically — show ALL fields */}
              {Object.keys(detailData.infobox).length > 0 && (
                <div className="p-6 rounded-3xl border border-white/[0.06] bg-[#0c0d12]/30 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Identity & Details
                  </h4>
                  <div className="space-y-3.5 text-xs">
                    {Object.entries(detailData.infobox).map(([label, value]) => (
                      <div key={label}>
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">{label}</span>
                        {renderLinkedValue(value as string)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Knowledge Graph Connected Relationships */}
              {detailData.relationships && detailData.relationships.length > 0 && (
                <div className="p-6 rounded-3xl border border-white/[0.06] bg-[#0c0d12]/30 space-y-3">
                  <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-400" /> Graph Connections ({detailData.relationships.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detailData.relationships.map((rel: any, idx: number) => {
                      const catTypeMap: Record<string, string> = {
                        character: "characters",
                        location: "world",
                        clan: "clans",
                        technique: "techniques",
                        artifact: "artifacts",
                        cultivation: "cultivation"
                      };
                      const catPath = catTypeMap[rel.toEntityType] || "world";
                      return (
                        <span
                          key={idx}
                          onClick={() => navigate(`/series/${slug}/lore/${catPath}/${rel.toEntitySlug}`)}
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg hover:bg-purple-500/20 cursor-pointer transition-colors"
                        >
                          <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-mono">{rel.relationshipType.replace("_", " ")}</span>
                          <span className="text-white underline">{rel.toEntityName}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Wiki Section Outline (compact, for navigation context) */}
              {detailData.sections && detailData.sections.filter((s: any) => s.level === "2").length > 0 && (
                <div className="p-6 rounded-3xl border border-white/[0.06] bg-[#0c0d12]/30 space-y-3">
                  <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" /> Page Outline
                  </h4>
                  <ul className="space-y-1.5">
                    {detailData.sections.filter((s: any) => s.level === "2").map((sec: any, index: number) => (
                      <li key={index} className="text-[11px] text-zinc-400 font-bold flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {sec.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* External Link */}
              <div className="p-6 rounded-3xl border border-white/[0.06] bg-[#0c0d12]/30 text-center space-y-2">
                <p className="text-[10px] font-bold text-zinc-500">Need deeper research? View full raw page on source wiki.</p>
                <a 
                  href={detailData.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:text-white uppercase tracking-widest transition-colors"
                >
                  Fandom Wiki Link <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </PageWrapper>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 text-center text-xs text-zinc-500 font-bold italic">
            This lore entry is missing dynamic records.
          </div>
        )}

        {/* Dynamic Lightbox Modal for Gallery Illustration (Role: gallery click) */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
            onClick={() => setLightboxImage(null)}
          >
            <div className="max-w-4xl max-h-[85vh] relative flex items-center justify-center">
              <img 
                src={lightboxImage} 
                alt="Full Preview Illustration" 
                className="max-h-[80vh] max-w-full object-contain rounded-lg border border-white/10"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-full mt-3 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Click anywhere to close</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Index Page: list items of selected category
  return (
    <div className="min-h-screen bg-[#030409] text-foreground pb-24 text-left">
      <SEO 
        title={`Explore ${categoryMeta.label} | DonghuaStream`} 
        description={`Explore dynamic entities, realms, and locations from Battle Through the Heavens.`}
      />

      <PageWrapper className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="space-y-2">
            <Link 
              to={`/anime/${slug}`}
              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to series page
            </Link>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              {React.createElement(categoryMeta.icon, { className: "h-7 w-7 text-primary" })}
              {categoryMeta.label}
            </h1>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder={`Search ${categoryMeta.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c0d12]/40 border border-white/[0.06] focus:border-primary/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none placeholder-zinc-500 transition-colors"
            />
          </div>
        </div>

        {/* Content list Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-3xl bg-white/3 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 font-bold italic">
            No live entries parsed for this category.
          </div>
        ) : (
          <div className={cn(
            "grid gap-6",
            category === "world" 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          )}>
            {filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => navigate(`/series/${slug}/lore/${category}/${item.title.replace(/ /g, "_")}`)}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0c0d12]/35 hover:border-primary/30 transition-all duration-350 cursor-pointer flex flex-col justify-between shadow-md active:scale-98",
                  category === "world" ? "aspect-[16/10] w-full" : "aspect-[3/4] w-full"
                )}
              >
                {/* Static background image (no slideshow, scaling on hover) */}
                <div className="absolute inset-0 overflow-hidden">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={cn("absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[#0f111a] to-[#030409]")}>
                      {React.createElement(categoryMeta.icon, { className: "h-10 w-10 text-zinc-800 opacity-40 group-hover:scale-105 transition-transform duration-500" })}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />
                  <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </div>
                
                <div className="relative p-4 z-10">
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-[#C084FC] bg-[#C084FC]/10 border border-[#C084FC]/25 px-2 py-0.5 rounded">
                    {categoryMeta.label}
                  </span>
                </div>

                <div className="relative p-4 z-10">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}

      </PageWrapper>
    </div>
  );
};

export default UniverseLore;
