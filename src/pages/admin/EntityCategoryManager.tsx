import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Search, MapPin, RefreshCw, Sparkles, ExternalLink, Filter, Image as ImageIcon, Database, Layers, CheckCircle, X, BookOpen, Star } from "lucide-react";
import { toast } from "sonner";
import { getFandomDetail, fetchFandomCharacterImages, ClassifiedCharacterImage, cleanAndProxyFandomUrl, resolveFandomSubdomain } from "@/services/fandomAnime";
import { slugifyEntityTitle } from "@/services/loreRegistryService";

import { EntityType } from "@/types/universe";

export interface UniverseEntity {
  id: string;
  name: string;
  chineseName?: string;
  category: string; // e.g. "Sect", "City", "Battle Skill", "Pill", "Familial Clan"
  image?: string;
  description: string;
  status: "Published" | "Draft";
  source: "Main Site Canon" | "Newly Synced" | "Custom Admin";
  isNew?: boolean;
  createdAt?: string;
  attributes?: Record<string, string>;
  overview?: string;
  appearance?: string;
  history?: string;
  galleryImages?: string[];
}

interface EntityCategoryManagerProps {
  categoryKey: "locations" | "techniques" | "artifacts" | "clans";
  title: string;
  description: string;
  animeSlug?: string;
  icon?: React.ElementType;
}

// Category-based high-quality xianxia landscape art pool to prevent single-image monotony
const CATEGORY_ART_POOL: Record<string, string[]> = {
  locations: [
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&fit=crop",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&fit=crop",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&fit=crop",
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&fit=crop"
  ],
  techniques: [
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&fit=crop"
  ],
  artifacts: [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&fit=crop"
  ],
  clans: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&fit=crop",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&fit=crop",
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&fit=crop"
  ]
};

// Strips Fandom disclaimer preambles and footnote references from raw lore text
function sanitizeLoreText(text?: string): string {
  if (!text) return "";
  let cleaned = text
    .replace(/^This article is based on the Official Translations of the Web Novel series!\s*The information and terminology in the article will be based on the source material rather than the Donghua \(Anime\) or Manhua\.\s*/gi, "")
    .replace(/^This article is about\s+[^.]+\.\s*/gi, "")
    .replace(/Imported from Fandom Wiki article[^.]*\./gi, "")
    .replace(/&#91;\d+&#93;/g, "")
    .replace(/\[\d+\]/g, "")
    .trim();
  return cleaned;
}

// Generates a clean, informative description using sanitized lore text or smart category fallback
function getCleanDescription(entityName: string, category: string, rawDesc?: string, fallbackText?: string): string {
  const sanitized = sanitizeLoreText(rawDesc || fallbackText);
  if (sanitized && sanitized.length > 5) {
    return sanitized.length > 180 ? sanitized.slice(0, 180) + "..." : sanitized;
  }
  const nameLower = entityName.toLowerCase();
  const catLower = (category || "").toLowerCase();

  if (catLower.includes("sect") || nameLower.includes("sect") || nameLower.includes("gate")) {
    return `Prominent sect grounds and cultivation territory in the Dou Qi Continent.`;
  }
  if (catLower.includes("city") || nameLower.includes("city")) {
    return `Major city and commerce center for cultivators and local clans.`;
  }
  if (nameLower.includes("army") || nameLower.includes("tribe") || catLower.includes("clan")) {
    return `Formidable military faction and armed cultivation force.`;
  }
  if (catLower.includes("region") || catLower.includes("realm") || nameLower.includes("island") || nameLower.includes("range")) {
    return `Special spatial domain with rich elemental energy and hidden treasures.`;
  }
  if (catLower.includes("technique") || catLower.includes("skill")) {
    return `Powerful battle skill and Qi manipulation technique.`;
  }
  if (catLower.includes("pill") || catLower.includes("artifact")) {
    return `Rare alchemical item and spatial cultivation treasure.`;
  }
  return `Canonical world element and lore record from the series universe.`;
}

// Deterministic image validator - purges Unsplash and placeholder images
function getVariedArt(entityId: string, categoryKey: string, customImage?: string): string {
  if (
    customImage && 
    !customImage.includes("avatar") && 
    !customImage.includes("chibi") && 
    !customImage.includes("placeholder") &&
    !customImage.includes("2015060816373561467") &&
    !customImage.includes("No_Photo_Available") &&
    !customImage.includes("unsplash.com")
  ) {
    return customImage;
  }
  return "";
}

export const EntityCategoryManager: React.FC<EntityCategoryManagerProps> = ({
  categoryKey,
  title,
  description,
  animeSlug = "battle-through-the-heavens",
  icon: CategoryIcon = MapPin
}) => {
  const storageKey = `cms_universe_${categoryKey}_${animeSlug}`;

  const [entities, setEntities] = useState<UniverseEntity[]>([]);
  const [isLoadingLore, setIsLoadingLore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("All");
  const [isSyncing, setIsSyncing] = useState(false);

  const [editingEntity, setEditingEntity] = useState<UniverseEntity | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [imageModalEntity, setImageModalEntity] = useState<UniverseEntity | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [chineseName, setChineseName] = useState("");
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [appearance, setAppearance] = useState("");
  const [history, setHistory] = useState("");

  // Dedicated Wiki Image Swap Modal State for universal entity poster fetching
  const [imageSwapEntity, setImageSwapEntity] = useState<UniverseEntity | null>(null);
  const [isFetchingImages, setIsFetchingImages] = useState(false);
  const [imageCandidates, setImageCandidates] = useState<ClassifiedCharacterImage[]>([]);

  // Open Image Swap Modal & harvest live Fandom Wiki candidate images
  const handleOpenImageSwapper = async (entity: UniverseEntity) => {
    setImageSwapEntity(entity);
    setIsFetchingImages(true);
    setImageCandidates([]);

    const sub = animeSlug.includes("soul-land") ? "soulland" : resolveFandomSubdomain(animeSlug) || "battle-through-the-heavens";

    try {
      const candidates = await fetchFandomCharacterImages(sub, entity.name);
      
      // If entity has pre-loaded galleryImages, merge any missing ones as candidates
      if ((entity as any).galleryImages && (entity as any).galleryImages.length > 0) {
        const existingUrls = new Set(candidates.map(c => c.url));
        const extra: ClassifiedCharacterImage[] = (entity as any).galleryImages
          .filter((url: string) => !existingUrls.has(url))
          .map((url: string, i: number) => ({
            url,
            score: 85 - i * 5,
            label: `Gallery Image ${i + 1}`,
            stars: 4
          }));
        setImageCandidates([...extra, ...candidates]);
      } else {
        setImageCandidates(candidates);
      }
    } catch (err: any) {
      toast.error(`Failed fetching wiki images for "${entity.name}": ${err.message || "Network error"}`);
    } finally {
      setIsFetchingImages(false);
    }
  };

  // Set selected image as entity primary artwork poster & save to loreRegistryService
  const handleSelectEntityAvatar = async (url: string) => {
    if (!imageSwapEntity) return;

    const sub = resolveFandomSubdomain(animeSlug) || animeSlug;
    const typeTargetMap: Record<string, EntityType> = {
      locations: "location",
      techniques: "technique",
      artifacts: "artifact",
      clans: "clan"
    };
    const entityType: EntityType = typeTargetMap[categoryKey] || "location";

    // 1. Update local entities state immediately
    setEntities(prev => prev.map(e => e.id === imageSwapEntity.id ? { ...e, image: url } : e));

    // 2. If editing in the drawer right now, update form field too
    if (editingEntity && editingEntity.id === imageSwapEntity.id) {
      setImageUrl(url);
    }

    // 3. Persist to central loreRegistryService so live site updates automatically
    try {
      const { saveEntity } = await import("@/services/loreRegistryService");
      await saveEntity({
        id: imageSwapEntity.id,
        slug: (imageSwapEntity as any).slug || slugifyEntityTitle(imageSwapEntity.name),
        animeSlug: animeSlug,
        type: entityType,
        name: imageSwapEntity.name,
        cnName: imageSwapEntity.chineseName,
        category: imageSwapEntity.category,
        description: imageSwapEntity.description,
        overview: imageSwapEntity.description,
        avatarUrl: url,
        bannerUrl: url,
        status: "published",
        source: imageSwapEntity.source === "Main Site Canon" ? "custom_admin" : "wiki_synced"
      }, animeSlug);
    } catch (e) {
      console.warn("Error saving updated entity image to loreRegistryService:", e);
    }

    toast.success(`Updated primary artwork poster for "${imageSwapEntity.name}"!`);
    setImageSwapEntity(null);
  };

  // Load Lore Entities from Central Lore Registry service
  useEffect(() => {
    let active = true;

    async function loadLoreEntities() {
      setIsLoadingLore(true);
      try {
        const { getAllEntities } = await import("@/services/loreRegistryService");
        const all = await getAllEntities(animeSlug);

        const typeTargetMap: Record<string, string> = {
          locations: "location",
          techniques: "technique",
          artifacts: "artifact",
          clans: "clan"
        };
        const targetType = typeTargetMap[categoryKey] || "location";
        const categoryEntities = all.filter(e => e.type === targetType);

        if (active) {
          const mappedEntities: UniverseEntity[] = categoryEntities.map(e => ({
            id: e.slug || e.id,
            slug: e.slug,
            animeSlug: e.animeSlug,
            type: e.type,
            name: e.name,
            chineseName: e.cnName,
            category: e.category,
            description: e.description || e.overview || "",
            overview: e.overview,
            appearance: e.appearance,
            history: e.history,
            image: e.avatarUrl || e.bannerUrl,
            status: e.status === "draft" ? "Draft" : "Published",
            source: e.source === "custom_admin" ? "Custom Admin" : e.source === "wiki_synced" ? "Newly Synced" : "Main Site Canon"
          }));
          setEntities(mappedEntities);
        }
      } catch (err) {
        console.warn("Error loading lore entities from service:", err);
      } finally {
        if (active) setIsLoadingLore(false);
      }
    }

    loadLoreEntities();

    return () => {
      active = false;
    };
  }, [animeSlug, categoryKey]);

  // Persist edits to local storage & broadcast live storage event
  useEffect(() => {
    if (isLoadingLore) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(entities));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error(e);
    }
  }, [entities, storageKey, isLoadingLore]);

  // Source Stats Counts
  const sourceStats = useMemo(() => {
    let mainSiteCanon = 0;
    let newlySynced = 0;
    let customAdmin = 0;

    entities.forEach(e => {
      if (e.source === "Newly Synced" || e.isNew) newlySynced++;
      else if (e.source === "Custom Admin") customAdmin++;
      else mainSiteCanon++;
    });

    return { mainSiteCanon, newlySynced, customAdmin, total: entities.length };
  }, [entities]);

  // Unique category filter tags
  const availableTags = useMemo(() => {
    return ["All", ...Array.from(new Set(entities.map(e => e.category)))];
  }, [entities]);

  // Filtered List
  const filteredEntities = useMemo(() => {
    return entities.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.chineseName && item.chineseName.includes(searchQuery)) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = selectedTag === "All" || item.category === selectedTag;

      let matchesSource = true;
      if (selectedSourceFilter === "Main Site Canon") {
        matchesSource = item.source === "Main Site Canon";
      } else if (selectedSourceFilter === "Newly Synced") {
        matchesSource = item.source === "Newly Synced" || !!item.isNew;
      } else if (selectedSourceFilter === "Custom Admin") {
        matchesSource = item.source === "Custom Admin";
      }

      return matchesSearch && matchesTag && matchesSource;
    });
  }, [entities, searchQuery, selectedTag, selectedSourceFilter]);

  // Fandom Wiki Auto Ingestion for New Items
  const handleSyncFromFandom = async () => {
    setIsSyncing(true);
    toast.info(`Scanning Fandom Wiki for new ${title.toLowerCase()}...`);

    const wikiCategoryMap: Record<string, string[]> = {
      locations: ["Locations", "Places", "Regions", "Sects"],
      techniques: ["Dou_Techniques", "Techniques", "Skills"],
      artifacts: ["Items", "Pills", "Weapons", "Artifacts"],
      clans: ["Clans", "Factions", "Organizations", "Sects"]
    };

    const targetCategories = wikiCategoryMap[categoryKey] || ["Locations"];
    const wikiSubdomain = animeSlug.includes("soul-land") ? "soulland" : "battle-through-the-heavens";

    let addedCount = 0;

    try {
      for (const catName of targetCategories) {
        const url = `https://${wikiSubdomain}.fandom.com/api.php?action=query&generator=categorymembers&gcmtitle=Category:${catName}&gcmlimit=40&prop=pageimages|info&piprop=thumbnail&pithumbsize=500&inprop=url&format=json&origin=*`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const pages: any[] = data.query?.pages ? Object.values(data.query.pages) : [];

          for (const page of pages) {
            if (!page.title || page.title.startsWith("Category:")) continue;

            const entityId = page.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const alreadyExists = entities.some(e => e.id === entityId || e.name.toLowerCase() === page.title.toLowerCase());

            if (!alreadyExists) {
              const cleanCat = catName.replace("_", " ");
              const newEntry: UniverseEntity = {
                id: entityId,
                name: page.title,
                category: cleanCat,
                description: getCleanDescription(page.title, cleanCat),
                image: page.thumbnail?.source || undefined,
                status: "Published",
                source: "Newly Synced",
                isNew: true,
                createdAt: new Date().toISOString()
              };
              setEntities(prev => [newEntry, ...prev]);
              addedCount++;
            }
          }
        }
      }

      if (addedCount > 0) {
        toast.success(`Sync complete: ${addedCount} newly discovered ${title.toLowerCase()} added to live list!`);
        setSelectedSourceFilter("Newly Synced");
      } else {
        toast.success(`All Fandom ${title.toLowerCase()} entries match the Main Site Canon dataset!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to Fandom MediaWiki API.");
    } finally {
      setIsSyncing(false);
    }
  };

  const [isFetchingFandom, setIsFetchingFandom] = useState(false);

  const handleFetchFandomForEntity = async (targetName?: string) => {
    const nameToFetch = targetName || name;
    if (!nameToFetch.trim()) {
      toast.error("Please enter entity name first.");
      return;
    }
    setIsFetchingFandom(true);
    toast.info(`Fetching live Fandom Wiki lore for "${nameToFetch}"...`);
    try {
      const wikiSub = animeSlug.includes("soul-land") ? "soulland" : "battle-through-the-heavens";
      const detail = await getFandomDetail(wikiSub, nameToFetch);
      if (detail) {
        if (detail.infoboxImage || detail.logoImage) {
          const freshImg = detail.infoboxImage || detail.logoImage;
          if (!freshImg.includes("2015060816373561467") && !freshImg.includes("No_Photo_Available") && !freshImg.includes("placeholder")) {
            setImageUrl(freshImg);
          }
        }
        if (detail.introText && !detail.introText.includes("No intro preview")) {
          setDesc(sanitizeLoreText(detail.introText));
        }
        if (detail.appearance) {
          setAppearance(sanitizeLoreText(detail.appearance));
        }
        if (detail.history) {
          setHistory(sanitizeLoreText(detail.history));
        }
        if (detail.galleryImages && detail.galleryImages.length > 0) {
          if (editingEntity) {
            editingEntity.galleryImages = detail.galleryImages;
          }
        }
        toast.success(`Successfully fetched live Fandom Wiki lore for "${nameToFetch}"!`);
      } else {
        toast.error(`No Fandom Wiki article found for "${nameToFetch}".`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch from Fandom MediaWiki API.");
    } finally {
      setIsFetchingFandom(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingEntity(null);
    setName("");
    setChineseName("");
    setCategory(categoryKey === "locations" ? "City" : categoryKey === "techniques" ? "Battle Skill" : categoryKey === "artifacts" ? "Treasure" : "Sect");
    setDesc("");
    setImageUrl("");
    setAppearance("");
    setHistory("");
    setIsAdding(true);
  };

  const handleOpenEdit = (item: UniverseEntity) => {
    setEditingEntity(item);
    setName(item.name);
    setChineseName(item.chineseName || "");
    setCategory(item.category);
    setDesc(item.description);

    let cleanImg = item.image;
    if (cleanImg && (cleanImg.includes("unsplash.com") || cleanImg.includes("photo-1509198397868") || cleanImg.includes("2015060816373561467") || cleanImg.includes("placeholder"))) {
      cleanImg = "";
    }
    setImageUrl(cleanImg || "");
    setAppearance(item.appearance || "");
    setHistory(item.history || "");
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const typeTargetMap: Record<string, any> = {
      locations: "location",
      techniques: "technique",
      artifacts: "artifact",
      clans: "clan"
    };
    const entityType = typeTargetMap[categoryKey] || "location";
    const entitySlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const sub = animeSlug.includes("soul-land") ? "soulland" : "battle-through-the-heavens";

    const targetEntity: any = {
      id: editingEntity ? editingEntity.id : entitySlug,
      slug: entitySlug,
      animeSlug: sub,
      type: entityType,
      name,
      cnName: chineseName,
      category,
      description: desc,
      overview: desc,
      appearance: appearance || undefined,
      history: history || undefined,
      avatarUrl: imageUrl || undefined,
      bannerUrl: imageUrl || undefined,
      status: "published",
      source: "custom_admin"
    };

    try {
      const { saveEntity } = await import("@/services/loreRegistryService");
      await saveEntity(targetEntity, sub);
    } catch (e) {
      console.warn("Failed saving entity to registry service:", e);
    }

    if (editingEntity) {
      setEntities(prev => prev.map(e => e.id === editingEntity.id ? {
        ...e,
        name,
        chineseName,
        category,
        description: desc,
        overview: desc,
        appearance: appearance || undefined,
        history: history || undefined,
        image: imageUrl || undefined,
        source: e.source === "Main Site Canon" ? "Custom Admin" : e.source
      } : e));
      toast.success(`Updated ${name}`);
    } else {
      const newItem: UniverseEntity = {
        id: entitySlug,
        name,
        chineseName,
        category,
        description: desc || getCleanDescription(name, category),
        overview: desc || getCleanDescription(name, category),
        appearance: appearance || undefined,
        history: history || undefined,
        status: "Published",
        source: "Custom Admin",
        isNew: true,
        createdAt: new Date().toISOString(),
        image: imageUrl || undefined
      };
      setEntities(prev => [newItem, ...prev]);
      toast.success(`Created new ${title.slice(0, -1)}: ${name}`);
    }

    setIsAdding(false);
    setEditingEntity(null);
  };

  const handleDelete = async (id: string) => {
    const sub = animeSlug.includes("soul-land") ? "soulland" : "battle-through-the-heavens";
    try {
      const { deleteEntity } = await import("@/services/loreRegistryService");
      await deleteEntity(id, sub);
    } catch (e) {}

    setEntities(prev => prev.filter(e => e.id !== id));
    toast.success("Item removed from CMS list");
  };

  return (
    <div className="space-y-6 text-left text-white">
      {/* HEADER BAR WITH CLEAR DATA SOURCE BREAKDOWN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#11111a] border border-white/5 p-5 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <CategoryIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight">{title}</h1>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 bg-primary/10 text-primary">
                {sourceStats.total} Live Items
              </Badge>
              <Badge variant="outline" className="text-[9px] font-bold border-blue-500/30 bg-blue-500/10 text-blue-400">
                🔵 {sourceStats.mainSiteCanon} Main Site Canon
              </Badge>
              {sourceStats.newlySynced > 0 && (
                <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-400 animate-pulse">
                  🟢 +{sourceStats.newlySynced} Newly Synced
                </Badge>
              )}
              {sourceStats.customAdmin > 0 && (
                <Badge variant="outline" className="text-[9px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-400">
                  ⚡ {sourceStats.customAdmin} Custom Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSyncFromFandom}
            disabled={isSyncing}
            className="border-white/10 hover:border-primary/40 bg-white/5 text-xs text-zinc-300 hover:text-white gap-1.5 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
            {isSyncing ? "Scanning Wiki..." : "Sync Fandom"}
          </Button>

          <Button 
            size="sm" 
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs font-black uppercase rounded-xl shadow-lg shadow-primary/10"
          >
            <Plus className="h-4 w-4" /> Add {title.slice(0, -1)}
          </Button>
        </div>
      </div>

      {/* CONTROLS: SEARCH & SOURCE + CATEGORY PILLS */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#11111a] border-white/5 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:border-primary/50"
            />
          </div>

          {/* SOURCE ORIGIN FILTER TABS */}
          <div className="flex items-center gap-1.5 bg-[#11111a] border border-white/5 p-1 rounded-xl shrink-0">
            {[
              { id: "All", label: "All Items" },
              { id: "Main Site Canon", label: "🔵 Main Site" },
              { id: "Newly Synced", label: "🟢 Wiki Synced" },
              { id: "Custom Admin", label: "⚡ Custom" }
            ].map(srcTab => (
              <button
                key={srcTab.id}
                type="button"
                onClick={() => setSelectedSourceFilter(srcTab.id)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedSourceFilter === srcTab.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {srcTab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAG FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <Filter className="h-3.5 w-3.5 text-zinc-500 shrink-0 ml-1" />
          {availableTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all shrink-0 ${
                selectedTag === tag 
                  ? "bg-primary/20 border-primary/50 text-white shadow-md shadow-primary/10" 
                  : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* SLIDE-OVER EDIT / CREATE DRAWER MODAL OVERLAY */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
          {/* Click Backdrop to Close */}
          <div className="absolute inset-0" onClick={() => setIsAdding(false)} />

          {/* Drawer Content */}
          <div className="relative w-full max-w-xl h-full bg-[#12131c] border-l border-white/10 shadow-2xl flex flex-col justify-between z-10 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 bg-[#161724] flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-md">
                    {editingEntity ? (editingEntity.source || "CMS Entity") : "New Record"}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                    {title}
                  </span>
                </div>
                <h2 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                  {editingEntity ? `Edit ${editingEntity.name}` : `Create New ${title.slice(0, -1)}`}
                </h2>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsAdding(false)} 
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Body (Scrollable Form Sections) */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-zinc-700">
              
              {/* IMAGE & VISUALS CARD */}
              <div className="space-y-3 bg-[#181926] border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Visual Artwork & Image URL
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">Hero & Card Backdrop</span>
                </div>

                <Input 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)} 
                  placeholder="Paste image URL (https://...)" 
                  className="bg-[#11111a] border-white/10 text-xs text-white"
                />

                {/* Live Preview & Presets */}
                <div className="space-y-2 pt-1">
                  <div className="h-32 w-full rounded-xl overflow-hidden border border-white/10 relative bg-black/60 group">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 space-y-1">
                        <ImageIcon className="h-8 w-8 opacity-40" />
                        <span className="text-[10px] uppercase tracking-wider">No Custom Image URL</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                    <span className="absolute bottom-2 left-3 text-[10px] font-bold text-white uppercase tracking-wider">
                      Live Backdrop Preview
                    </span>
                  </div>

                  {/* Quick Fandom Wiki Image Selector */}
                  {editingEntity?.galleryImages && editingEntity.galleryImages.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Available Fandom Wiki Artwork ({editingEntity.galleryImages.length}):</span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {editingEntity.galleryImages.map((presetUrl, idx) => (
                          <button
                            key={presetUrl}
                            type="button"
                            onClick={() => setImageUrl(presetUrl)}
                            className={`h-10 w-16 rounded-lg overflow-hidden border transition-all shrink-0 relative bg-black/40 ${
                              imageUrl === presetUrl ? "border-primary ring-2 ring-primary/40 scale-105" : "border-white/10 hover:border-white/40 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img src={presetUrl} alt={`Wiki Image ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BASIC ENTITY METADATA */}
              <div className="space-y-3 bg-[#181926] border border-white/10 p-4 rounded-2xl">
                <label className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Entity Metadata
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Entity Name *</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Jia Nan Academy" 
                      className="bg-[#11111a] border-white/10 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Chinese Name (Optional)</label>
                    <Input 
                      value={chineseName} 
                      onChange={(e) => setChineseName(e.target.value)} 
                      placeholder="e.g. 迦南学院" 
                      className="bg-[#11111a] border-white/10 text-xs text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Category / Sub-Type Tag</label>
                    <Input 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)} 
                      placeholder="e.g. Academy, Sect, Tier 9 Pill, Floating Realm" 
                      className="bg-[#11111a] border-white/10 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* LORE OVERVIEW & NARRATIVE TEXTAREAS */}
              <div className="space-y-3 bg-[#181926] border border-white/10 p-4 rounded-2xl">
                <label className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Record Overview & Narrative Documentation
                </label>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Record Overview / Main Description</label>
                    <textarea 
                      value={desc} 
                      onChange={(e) => setDesc(e.target.value)} 
                      rows={4}
                      placeholder="Write summary details, history, power level or territory overview..." 
                      className="w-full bg-[#11111a] border border-white/10 text-xs p-3 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Appearance Details (Optional)</label>
                    <textarea 
                      value={appearance} 
                      onChange={(e) => setAppearance(e.target.value)} 
                      rows={3}
                      placeholder="Describe physical appearance, architecture, atmosphere or visual traits..." 
                      className="w-full bg-[#11111a] border border-white/10 text-xs p-3 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">History & Origin Background (Optional)</label>
                    <textarea 
                      value={history} 
                      onChange={(e) => setHistory(e.target.value)} 
                      rows={4}
                      placeholder="Detail historical events, founding lore, ancestral lineage or battle history..." 
                      className="w-full bg-[#11111a] border border-white/10 text-xs p-3 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-white/10 bg-[#161724] flex items-center justify-between shrink-0">
              {name ? (
                <a
                  href={`/series/${animeSlug}/lore/${categoryKey === "locations" ? "world" : categoryKey}/${encodeURIComponent(name.replace(/ /g, "_"))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Inspect Live Page
                </a>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="text-xs text-zinc-400">
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  className="bg-primary text-black font-black uppercase text-xs rounded-xl px-5 shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                  Save Record
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARDS GRID WITH DISTINCT SOURCE BADGES */}
      {isLoadingLore ? (
        <div className="p-12 text-center bg-[#11111a] border border-white/5 rounded-2xl text-zinc-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Loading Main Site Canon & CMS Dataset...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntities.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#11111a] border border-white/5 rounded-2xl text-zinc-500 text-xs">
              No {title.toLowerCase()} found matching your filters. Click "Sync Fandom" to discover new items!
            </div>
          ) : (
            filteredEntities.map((item) => {
              const cardBg = getVariedArt(item.id, categoryKey, item.image);

              return (
                <div 
                  key={item.id} 
                  className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c0d12]/60 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between h-[230px] shadow-lg hover:-translate-y-1 hover:shadow-primary/10"
                >
                  {/* Landscape Backdrop Image */}
                  {cardBg ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-85" 
                      style={{ backgroundImage: `url('${cardBg}')` }} 
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#161726] via-[#0d0e19] to-[#080910] border border-white/5 flex items-center justify-center">
                      <CategoryIcon className="h-10 w-10 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Top Badges Bar */}
                  <div className="relative p-4 z-10 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#C084FC] bg-[#C084FC]/10 border border-[#C084FC]/25 px-2.5 py-0.5 rounded-md backdrop-blur-md">
                        {item.category}
                      </span>
                      {item.source === "Main Site Canon" && (
                        <span className="text-[8px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-md backdrop-blur-md">
                          Main Site
                        </span>
                      )}
                      {(item.source === "Newly Synced" || item.isNew) && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md animate-pulse">
                          NEW SYNC
                        </span>
                      )}
                      {item.source === "Custom Admin" && (
                        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md backdrop-blur-md">
                          Custom
                        </span>
                      )}
                    </div>

                    {item.chineseName && (
                      <span className="text-[9.5px] text-zinc-400 font-serif bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">
                        {item.chineseName}
                      </span>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="relative p-4 z-10 space-y-2">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-black text-white uppercase tracking-wider group-hover:text-primary transition-colors truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-2">
                      <span className="text-[8.5px] font-mono text-zinc-500 truncate max-w-[110px]">
                        {item.id}
                      </span>
                      <div className="flex items-center gap-1">
                        <a 
                          href={`/series/${animeSlug}/lore/${categoryKey === "locations" ? "world" : categoryKey}/${encodeURIComponent(item.name.replace(/ /g, "_"))}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-white/10 rounded-lg transition-colors"
                          title="Inspect Live on Main Site Detail Page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleOpenImageSwapper(item)}
                          className="h-7 text-[10px] font-bold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg gap-1 border border-purple-500/20 px-2"
                          title="Change poster image live from Fandom Wiki"
                        >
                          <ImageIcon className="h-3 w-3 text-purple-400" /> Change Pic
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleOpenEdit(item)} 
                          className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                          title="Edit Details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDelete(item.id)} 
                          className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* UNIVERSAL ENTITY ARTWORK / POSTER SELECTION MODAL */}
      {imageSwapEntity && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-[#11111a] border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 p-4">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" /> Choose Artwork Poster for {imageSwapEntity.name}
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px] font-mono ml-2">
                    {imageCandidates.length} Images Discovered
                  </Badge>
                </CardTitle>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Harvested from main article, gallery subpages & file search on <strong className="text-zinc-200">{animeSlug.includes("soul-land") ? "soulland" : resolveFandomSubdomain(animeSlug) || "battle-through-the-heavens"}.fandom.com</strong>
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setImageSwapEntity(null)}
                className="h-8 w-8 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 overflow-y-auto flex-1 space-y-4">
              {isFetchingImages ? (
                <div className="p-12 text-center text-zinc-400 text-xs space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  <p>Harvesting & scoring image candidates from MediaWiki diagnostic pipeline...</p>
                </div>
              ) : imageCandidates.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No wiki image candidates found for "{imageSwapEntity.name}". You can paste a custom URL in the Edit drawer.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {imageCandidates.map((candidate, idx) => {
                    const isSelected = imageSwapEntity.image === candidate.url;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectEntityAvatar(candidate.url)}
                        className={`group relative rounded-xl border p-2 bg-black/40 hover:border-purple-500 cursor-pointer transition-all flex flex-col items-center justify-between text-center ${
                          isSelected ? "border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/10" : "border-white/10"
                        }`}
                      >
                        <div className="relative w-full aspect-square rounded-lg bg-black/60 overflow-hidden mb-2">
                          <img
                            src={cleanAndProxyFandomUrl(candidate.url)}
                            alt={candidate.label}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400";
                            }}
                          />
                          {isSelected && (
                            <Badge className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-[9px] font-bold">
                              ACTIVE
                            </Badge>
                          )}
                        </div>

                        <div className="w-full space-y-1">
                          <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: candidate.stars }).map((_, s) => (
                              <Star key={s} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <p className="text-[10px] font-bold text-white truncate">{candidate.label}</p>
                          <Badge variant="outline" className="text-[8px] bg-white/5 border-white/10 text-zinc-400 uppercase">
                            Score {candidate.score}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
