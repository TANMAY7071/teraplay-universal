import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Compass, ArrowLeft, Search, Globe, MapPin, 
  Users, Flag, BookOpen, Filter, ExternalLink, Activity
} from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getCharactersList, getClanById } from "@/data/mock";
import { btthLocations } from "@/data/lore/btth-lore";
import { UniverseEntity } from "./admin/EntityCategoryManager";

const UniverseWorld = () => {
  const { slug = "battle-through-the-heavens", id } = useParams<{ slug: string; id?: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");

  // Load locations dynamically from CMS local storage + btth-lore presets
  const locations = useMemo(() => {
    const storageKey = `cms_universe_locations_${slug}`;
    let cmsItems: UniverseEntity[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        cmsItems = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to read CMS locations:", e);
    }

    // Convert CMS entities to location format
    const formattedCmsItems = cmsItems.map(item => {
      let image = item.image;
      if (image && (image.includes("avatar") || image.includes("chibi") || image.includes("placeholder") || image.includes("unsplash.com") || image.includes("2015060816373561467"))) {
        image = undefined;
      }

      return {
        id: item.id,
        name: item.name,
        chineseName: item.chineseName,
        type: item.category || "Location",
        description: item.description,
        image: image,
        continent: "Dou Qi Continent",
        completeness: 85
      };
    });

    // Merge with preset locations, avoiding duplicate IDs
    const mergedMap = new Map<string, any>();
    formattedCmsItems.forEach(loc => mergedMap.set(loc.id, loc));

    btthLocations.forEach(loc => {
      if (!mergedMap.has(loc.id)) {
        mergedMap.set(loc.id, {
          ...loc,
          type: loc.type || "Location"
        });
      }
    });

    return Array.from(mergedMap.values());
  }, [slug]);

  // Selected Location (if id parameter is provided)
  const selectedLocation = useMemo(() => {
    if (!id) return null;
    return locations.find(loc => loc.id === id) || null;
  }, [id, locations]);

  // Available Category Filter Tags
  const availableTags = useMemo(() => {
    return ["All", ...Array.from(new Set(locations.map(loc => loc.type)))];
  }, [locations]);

  // Filtered Locations (for index search & category tag)
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = 
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.chineseName && loc.chineseName.includes(searchQuery)) ||
        (loc.description && loc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag === "All" || loc.type === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [locations, searchQuery, selectedTag]);

  // Related characters mapping
  const relatedCharacters = useMemo(() => {
    if (!selectedLocation) return [];
    return getCharactersList().filter(char => 
      char.affiliationIds?.some(clanId => {
        const clan = getClanById(clanId);
        return clan?.locationId === selectedLocation.id;
      }) || 
      char.description?.toLowerCase().includes(selectedLocation.name.toLowerCase())
    );
  }, [selectedLocation]);

  const getFallbackBackground = (type: string) => {
    if (type.includes("Empire")) return "bg-gradient-to-tr from-[#1a1230] to-[#0c0d12]";
    if (type.includes("Sect")) return "bg-gradient-to-tr from-[#122030] to-[#0c0d12]";
    return "bg-gradient-to-tr from-[#221230] to-[#0c0d12]";
  };

  if (selectedLocation) {
    const fallbackBg = getFallbackBackground(selectedLocation.type);
    return (
      <div className="min-h-screen bg-[#030409] text-foreground pb-24 text-left">
        <SEO 
          title={`${selectedLocation.name} - Lore & World | DonghuaStream`} 
          description={selectedLocation.description}
        />
        
        {/* Cinematic Header Banner */}
        <div className="relative h-[320px] md:h-[440px] overflow-hidden">
          {selectedLocation.image ? (
            <img 
              src={selectedLocation.image} 
              alt={selectedLocation.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center", fallbackBg)}>
              <Globe className="h-16 w-16 text-zinc-700 animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030409] via-black/50 to-transparent" />
          
          <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-3">
            <button 
              onClick={() => navigate(`/series/${slug}/world`)}
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to locations index
            </button>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                  {selectedLocation.type}
                </span>
                {selectedLocation.chineseName && (
                  <span className="text-sm text-zinc-400 font-serif">{selectedLocation.chineseName}</span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider">
                {selectedLocation.name}
              </h1>
            </div>
          </div>
        </div>

        <PageWrapper className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-primary" /> Overview & Territory History
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed font-medium bg-[#0c0d12]/30 border border-white/[0.06] p-5 rounded-2xl">
                {selectedLocation.description || "No overview documentation available for this territory. Master this realm to reveal hidden records."}
              </p>
            </div>

            {/* Lore Sections */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 border-b border-white/[0.06] pb-3 flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-primary" /> Region Records & Exploration Stats
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0d12]/30 space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Geography & Qi Density</span>
                  <p className="text-xs text-zinc-300 font-medium">Located within primary continent coordinates, characterized by high elemental Qi density.</p>
                </div>
                <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0d12]/30 space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Territory Exploration</span>
                  <p className="text-xs text-zinc-300 font-medium">Indexed at {selectedLocation.completeness || 85}% exploration completeness.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl border border-white/[0.06] bg-[#0c0d12]/30 space-y-4">
              <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/[0.06] pb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> World Coordinates
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Continent</span>
                  <span className="text-zinc-300 font-bold">{selectedLocation.continent || "Dou Qi Continent"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Domain Type</span>
                  <span className="text-primary font-bold">{selectedLocation.type}</span>
                </div>
              </div>
            </div>

            {/* Related Figures */}
            {relatedCharacters.length > 0 && (
              <div className="p-6 rounded-3xl border border-white/[0.06] bg-[#0c0d12]/30 space-y-4">
                <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/[0.06] pb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Associated Figures
                </h4>
                <div className="space-y-3">
                  {relatedCharacters.map(char => (
                    <div key={char.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <img src={char.image} alt={char.name} className="w-9 h-9 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <span className="text-xs font-black text-zinc-200 block leading-tight">{char.name}</span>
                        <span className="text-[9px] font-bold text-zinc-500 block leading-none mt-0.5">{char.aliases?.[0] || "Cultivator"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PageWrapper>
      </div>
    );
  }

  // Index Page: Browse Locations
  return (
    <div className="min-h-screen bg-[#030409] text-foreground pb-24 text-left">
      <SEO 
        title="Explore World & Locations | DonghuaStream" 
        description="Browse sects, landmarks, regions, and cities from Battle Through the Heavens."
      />

      <PageWrapper className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="space-y-2">
            <Link 
              to={`/anime/${slug}`}
              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to series page
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                <Compass className="h-7 w-7 text-primary" /> World & Locations
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 bg-primary/10 text-primary">
                {locations.length} Territories
              </Badge>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search location by name, sect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c0d12]/40 border border-white/[0.06] focus:border-primary/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none placeholder-zinc-500 transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <Filter className="h-3.5 w-3.5 text-zinc-500 shrink-0 ml-1" />
          {availableTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                selectedTag === tag 
                  ? "bg-primary/20 border-primary/50 text-white shadow-md shadow-primary/10" 
                  : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map(loc => {
            const fallbackBg = getFallbackBackground(loc.type);
            return (
              <div 
                key={loc.id}
                onClick={() => navigate(`/series/${slug}/world/${loc.id}`)}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0c0d12]/40 hover:border-primary/40 transition-all duration-300 cursor-pointer flex flex-col justify-between h-[250px] shadow-lg hover:-translate-y-1 hover:shadow-primary/5 active:scale-[0.98]"
              >
                {loc.image ? (
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url('${loc.image}')` }} />
                ) : (
                  <div className={cn("absolute inset-0 flex items-center justify-center", fallbackBg)}>
                    <Globe className="h-12 w-12 text-zinc-800 opacity-60 group-hover:scale-105 transition-transform" />
                  </div>
                )}
                {/* Dark gradient mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative p-5 z-10 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#C084FC] bg-[#C084FC]/10 border border-[#C084FC]/25 px-2.5 py-1 rounded-md">
                    {loc.type}
                  </span>
                  {loc.chineseName && (
                    <span className="text-[10px] text-zinc-400 font-serif bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                      {loc.chineseName}
                    </span>
                  )}
                </div>

                <div className="relative p-5 z-10 space-y-1">
                  <h3 className="text-base font-black text-white uppercase tracking-wider group-hover:text-primary transition-colors">
                    {loc.name}
                  </h3>
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                    {loc.description || "Enter the details page to explore the geography, chronicles, and entities linked to this territory."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </PageWrapper>
    </div>
  );
};

export default UniverseWorld;
