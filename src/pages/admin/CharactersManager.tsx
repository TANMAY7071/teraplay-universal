import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, Edit, Trash2, Sparkles, Check, ExternalLink, ShieldCheck, UserCheck, RefreshCw, Image as ImageIcon, Star, X, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { resolveFandomSubdomain, DONGHUA_ALIASES, fetchFandomWikiCharacters, searchFandom, fetchFandomCharacterImages, ClassifiedCharacterImage, cleanAndProxyFandomUrl } from "@/services/fandomAnime";

interface CharacterItem {
  id: string;
  name: string;
  cnName?: string;
  role: "Main" | "Supporting" | "Antagonist";
  cultivation?: string;
  actor?: string;
  avatarUrl?: string;
  wikiPageId?: string;
  isWikiApproved?: boolean;
  featured?: boolean;
}

interface CharactersManagerProps {
  animeSlug?: string;
  animeTitle?: string;
}

// Preset fallback candidates
const DEFAULT_WIKI_CANDIDATES: Record<string, Array<{ name: string; page: string; image: string; role: string; realm: string }>> = {
  "battle-through-the-heavens": [
    { name: "Xiao Yan", page: "Xiao_Yan", image: "https://vignette.wikia.nocookie.net/battle-through-the-heavens/images/a/a2/Xiao_Yan.png/revision/latest", role: "Main", realm: "Dou Di / Flame Emperor" },
    { name: "Yao Chen (Yao Lao)", page: "Yao_Chen", image: "https://vignette.wikia.nocookie.net/battle-through-the-heavens/images/b/b3/Yao_Chen.png/revision/latest", role: "Main", realm: "Dou Zun / Medicine Venerate" },
    { name: "Cai Lin (Queen Medusa)", page: "Queen_Medusa", image: "https://vignette.wikia.nocookie.net/battle-through-the-heavens/images/c/c4/Queen_Medusa.png/revision/latest", role: "Main", realm: "Dou Sheng / Snake Queen" },
    { name: "Gu Xun'er", page: "Gu_Xun'er", image: "https://vignette.wikia.nocookie.net/battle-through-the-heavens/images/d/d5/Gu_Xun%27er.png/revision/latest", role: "Main", realm: "Dou Sheng / Gu Clan Princess" },
  ],
  "thegreatruler": [
    { name: "Mu Chen", page: "Mu_Chen", image: "https://static.wikia.nocookie.net/thegreatruler/images/a/a2/Mu_Chen.png/revision/latest", role: "Main", realm: "Great Ruler Sovereign" },
    { name: "Luo Li", page: "Luo_Li", image: "https://static.wikia.nocookie.net/thegreatruler/images/b/b3/Luo_Li.png/revision/latest", role: "Main", realm: "Luo Shen Clan Goddess" },
    { name: "Nine Nether", page: "Nine_Nether", image: "https://static.wikia.nocookie.net/thegreatruler/images/c/c4/Nine_Nether.png/revision/latest", role: "Main", realm: "Nine Netherbird Sovereign" },
    { name: "Mu Feng", page: "Mu_Feng", image: "https://static.wikia.nocookie.net/thegreatruler/images/d/d5/Mu_Feng.png/revision/latest", role: "Supporting", realm: "Mu Territory Lord" }
  ],
  "the-great-ruler": [
    { name: "Mu Chen", page: "Mu_Chen", image: "https://static.wikia.nocookie.net/thegreatruler/images/a/a2/Mu_Chen.png/revision/latest", role: "Main", realm: "Great Ruler Sovereign" },
    { name: "Luo Li", page: "Luo_Li", image: "https://static.wikia.nocookie.net/thegreatruler/images/b/b3/Luo_Li.png/revision/latest", role: "Main", realm: "Luo Shen Clan Goddess" },
    { name: "Nine Nether", page: "Nine_Nether", image: "https://static.wikia.nocookie.net/thegreatruler/images/c/c4/Nine_Nether.png/revision/latest", role: "Main", realm: "Nine Netherbird Sovereign" }
  ]
};

export const CharactersManager: React.FC<CharactersManagerProps> = ({ animeSlug, animeTitle = "Battle Through the Heavens" }) => {
  const [searchCurated, setSearchCurated] = useState("");
  const [searchWikiQuery, setSearchWikiQuery] = useState("");
  const [wikiSubdomain, setWikiSubdomain] = useState("battle-through-the-heavens");
  const [isFetchingWiki, setIsFetchingWiki] = useState(false);

  // Pagination Continuation Token
  const [continueToken, setContinueToken] = useState<string | undefined>(undefined);

  // Curated Registry State
  const [curatedCharacters, setCuratedCharacters] = useState<CharacterItem[]>([]);

  // Wiki Candidates Stream State
  const [wikiCandidates, setWikiCandidates] = useState<Array<{ name: string; page: string; image: string; role: string; realm: string }>>([]);

  // Image Swapper Modal State
  const [imageSwapCharacter, setImageSwapCharacter] = useState<CharacterItem | null>(null);
  const [imageCandidates, setImageCandidates] = useState<ClassifiedCharacterImage[]>([]);
  const [isFetchingImages, setIsFetchingImages] = useState(false);

  const loadWikiCandidates = async (subdomain: string, isLoadMore = false, token?: string) => {
    setIsFetchingWiki(true);
    try {
      const res = await fetchFandomWikiCharacters(subdomain, token);
      if (res.candidates && res.candidates.length > 0) {
        if (isLoadMore) {
          setWikiCandidates(prev => [...prev, ...res.candidates]);
        } else {
          setWikiCandidates(res.candidates);
        }
        setContinueToken(res.continueToken);
      } else if (!isLoadMore) {
        setWikiCandidates(DEFAULT_WIKI_CANDIDATES[subdomain] || []);
        setContinueToken(undefined);
      }
    } catch {
      if (!isLoadMore) {
        setWikiCandidates(DEFAULT_WIKI_CANDIDATES[subdomain] || []);
      }
    } finally {
      setIsFetchingWiki(false);
    }
  };

  // Search MediaWiki API directly on query submission
  const handleLiveWikiSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchWikiQuery.trim()) {
      loadWikiCandidates(wikiSubdomain);
      return;
    }

    setIsFetchingWiki(true);
    toast.info(`Searching MediaWiki for "${searchWikiQuery}" on ${wikiSubdomain}.fandom.com...`);

    try {
      const results = await searchFandom(wikiSubdomain, searchWikiQuery.trim());
      if (results && results.length > 0) {
        const mapped = results.map((item: any) => ({
          name: item.title,
          page: item.title.replace(/\s+/g, "_"),
          image: item.image || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
          role: "Search Candidate",
          realm: `${wikiSubdomain}.fandom.com`
        }));
        setWikiCandidates(mapped);
        setContinueToken(undefined);
        toast.success(`Found ${mapped.length} character candidates on ${wikiSubdomain}.fandom.com!`);
      } else {
        toast.error(`No character results found on ${wikiSubdomain}.fandom.com for "${searchWikiQuery}".`);
      }
    } catch (err: any) {
      toast.error(`Wiki search error: ${err.message || "Failed search"}`);
    } finally {
      setIsFetchingWiki(false);
    }
  };

  // Open Image Swap Modal for a character
  const handleOpenImageSwapper = async (char: CharacterItem) => {
    setImageSwapCharacter(char);
    setIsFetchingImages(true);
    setImageCandidates([]);

    try {
      const candidates = await fetchFandomCharacterImages(wikiSubdomain, char.name);
      setImageCandidates(candidates);
    } catch (err: any) {
      toast.error(`Failed to fetch images for ${char.name}: ${err.message}`);
    } finally {
      setIsFetchingImages(false);
    }
  };

  // Set selected image as character's primary avatar
  const handleSelectAvatar = (url: string) => {
    if (!imageSwapCharacter) return;

    setCuratedCharacters(prev =>
      prev.map(c => c.id === imageSwapCharacter.id ? { ...c, avatarUrl: url } : c)
    );

    toast.success(`Updated primary avatar portrait for ${imageSwapCharacter.name}!`);
    setImageSwapCharacter(null);
  };

  // Resolve subdomain & fetch live candidates from Fandom API & Unified Lore Registry
  useEffect(() => {
    const titleKey = (animeTitle || animeSlug || "Battle Through the Heavens").toLowerCase();
    const resolvedDomain = resolveFandomSubdomain(titleKey) || "battle-through-the-heavens";
    setWikiSubdomain(resolvedDomain);
    loadWikiCandidates(resolvedDomain);

    let active = true;
    async function syncRegistryCharacters() {
      try {
        const { getAllEntities } = await import("@/services/loreRegistryService");
        const targetSlug = animeSlug || resolvedDomain;
        const allEntities = await getAllEntities(targetSlug);
        if (!active) return;
        const charEntities = allEntities.filter(e => e.type === "character");
        if (charEntities.length > 0) {
          const mapped: CharacterItem[] = charEntities.map(c => ({
            id: c.slug || c.id,
            name: c.name,
            cnName: c.cnName,
            role: c.featured ? "Main" : "Supporting",
            cultivation: c.attributes?.["Realm"] || c.attributes?.["Cultivation Stage"] || c.category || "Cultivator",
            avatarUrl: c.avatarUrl,
            isWikiApproved: true,
            featured: c.featured
          }));
          setCuratedCharacters(mapped);
        } else {
          setCuratedCharacters([]);
        }
      } catch (e) {
        console.warn("Failed syncing registry characters:", e);
      }
    }
    syncRegistryCharacters();

    return () => { active = false; };
  }, [animeTitle, animeSlug]);

  const handleToggleFeatured = async (char: CharacterItem) => {
    try {
      const { toggleFeaturedCharacter } = await import("@/services/loreRegistryService");
      const isNowFeatured = await toggleFeaturedCharacter(char.id, wikiSubdomain);
      setCuratedCharacters(prev =>
        prev.map(c => c.id === char.id ? { ...c, featured: isNowFeatured, role: isNowFeatured ? "Main" : "Supporting" } : c)
      );
      toast.success(isNowFeatured ? `"${char.name}" is now featured on Main Characters!` : `"${char.name}" removed from Main Characters roster.`);
    } catch (e) {
      toast.error("Failed toggling featured status");
    }
  };

  const handleApproveWikiCharacter = async (candidate: { name: string; page: string; image: string; role: string; realm: string }) => {
    if (curatedCharacters.some(c => c.name.toLowerCase() === candidate.name.toLowerCase())) {
      toast.info(`"${candidate.name}" is already in your Curated Registry!`);
      return;
    }

    const primaryAvatar = candidate.image && candidate.image.startsWith("http") 
      ? candidate.image 
      : `https://vignette.wikia.nocookie.net/${wikiSubdomain}/images/a/a2/${candidate.page}.png/revision/latest`;

    const charSlug = candidate.page.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newItem: CharacterItem = {
      id: charSlug,
      name: candidate.name,
      role: candidate.role === 'Main' ? "Main" : "Supporting",
      cultivation: candidate.realm.includes("fandom.com") ? "Cultivator" : candidate.realm,
      avatarUrl: primaryAvatar,
      isWikiApproved: true,
      featured: candidate.role === 'Main'
    };

    try {
      const { saveEntity } = await import("@/services/loreRegistryService");
      await saveEntity({
        id: charSlug,
        slug: charSlug,
        animeSlug: wikiSubdomain,
        type: "character",
        name: candidate.name,
        category: candidate.realm,
        avatarUrl: primaryAvatar,
        featured: candidate.role === 'Main',
        status: "published",
        source: "wiki_synced"
      }, wikiSubdomain);
    } catch (e) {}

    setCuratedCharacters(prev => [newItem, ...prev]);
    toast.success(`"${candidate.name}" approved into Central Lore Registry!`);
  };

  const handleRemoveCharacter = async (id: string, name: string) => {
    try {
      const { deleteEntity } = await import("@/services/loreRegistryService");
      await deleteEntity(id, wikiSubdomain);
    } catch (e) {}
    setCuratedCharacters(prev => prev.filter(c => c.id !== id));
    toast.success(`Removed "${name}" from Curated Registry.`);
  };

  const filteredCurated = curatedCharacters.filter(c =>
    c.name.toLowerCase().includes(searchCurated.toLowerCase()) || (c.cnName && c.cnName.includes(searchCurated))
  );

  const filteredCandidates = wikiCandidates.filter(c =>
    c.name.toLowerCase().includes(searchWikiQuery.toLowerCase()) ||
    c.page.toLowerCase().includes(searchWikiQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left text-white animate-in fade-in duration-300 relative">
      {/* 1. HEADER & WIKI BINDING STATUS BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#11111a] border border-white/10 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
              <ShieldCheck className="w-3 h-3 mr-1" /> Bound Wiki Knowledge Base
            </Badge>
            <span className="text-[10px] font-mono text-zinc-400">
              subdomain: <strong className="text-white">{wikiSubdomain}.fandom.com</strong>
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            {animeTitle} — Character Registry & Wiki Stream
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Curate approved characters for DonghuaStream while streaming live MediaWiki candidates from the linked Fandom wiki.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadWikiCandidates(wikiSubdomain)}
            disabled={isFetchingWiki}
            className="border-white/10 bg-black/40 text-xs font-bold uppercase rounded-xl gap-1 text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingWiki ? 'animate-spin' : ''}`} /> Refresh Stream
          </Button>
          <a
            href={`https://${wikiSubdomain}.fandom.com/wiki/Category:Characters`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Wiki Category
          </a>
        </div>
      </div>

      {/* 2. SPLIT SCREEN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: CURATED CHARACTER REGISTRY (CMS APPROVED) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-[#11111a] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Curated Character Registry ({curatedCharacters.length})
                </CardTitle>
                <p className="text-[10px] text-zinc-400 mt-0.5">Official character profiles published on DonghuaStream.</p>
              </div>

              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  type="text"
                  value={searchCurated}
                  onChange={(e) => setSearchCurated(e.target.value)}
                  placeholder="Search Registry..."
                  className="bg-black/40 border-white/10 rounded-xl pl-8 text-xs text-white h-8"
                />
              </div>
            </CardHeader>

            <CardContent className="divide-y divide-white/5 p-4 space-y-3 max-h-[580px] overflow-y-auto scrollbar-thin">
              {filteredCurated.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No curated characters match search filter. Click "+ Add to Registry" from the Wiki stream on the right.
                </div>
              ) : (
                filteredCurated.map((char) => (
                  <div key={char.id} className="pt-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Character Avatar with Image Swapper Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenImageSwapper(char)}
                        title="Click to swap character portrait image"
                        className="relative h-12 w-12 rounded-xl bg-black/60 border border-white/10 overflow-hidden shrink-0 group/avatar hover:border-purple-500/50 transition-all cursor-pointer"
                      >
                        {char.avatarUrl ? (
                          <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-black text-primary text-sm flex items-center justify-center h-full">
                            {char.name.charAt(0)}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-[8px] font-bold text-purple-300 transition-opacity">
                          <ImageIcon className="w-4 h-4 mb-0.5 text-purple-400" />
                          <span>SWAP</span>
                        </div>
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white truncate">{char.name}</h4>
                          {char.cnName && <span className="text-[10px] font-bold text-zinc-400">({char.cnName})</span>}
                          <Badge className={`text-[8px] font-black uppercase py-0 px-1.5 ${
                            char.role === 'Main' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-zinc-400 border-white/10'
                          }`}>
                            {char.role}
                          </Badge>
                          {char.isWikiApproved && (
                            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                              ✓ Wiki Bound
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                          Realm: <span className="text-zinc-200 font-semibold">{char.cultivation || "N/A"}</span>
                          {char.actor && <span className="ml-2 text-zinc-500">• VA: {char.actor}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleFeatured(char)}
                        className={`h-7 text-[10px] font-bold rounded-lg gap-1 border ${
                          char.featured
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                            : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                        }`}
                        title="Toggle Main Character status on Series page"
                      >
                        <Star className={`h-3 w-3 ${char.featured ? "fill-amber-400 text-amber-400" : ""}`} />
                        {char.featured ? "Featured" : "Feature"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenImageSwapper(char)}
                        className="h-7 text-[10px] font-bold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg gap-1 border border-purple-500/20"
                      >
                        <ImageIcon className="h-3 w-3" /> Change Pic
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveCharacter(char.id, char.name)} className="h-7 w-7 text-zinc-400 hover:text-rose-400 hover:bg-white/5 rounded-lg">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: WIKI CANDIDATES STREAM ([subdomain].fandom.com) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-[#11111a] border-white/5">
            <CardHeader className="pb-3 border-b border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" /> Wiki Candidate Stream
                </CardTitle>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px] font-mono">
                  {filteredCandidates.length} Candidates
                </Badge>
              </div>

              {/* LIVE WIKI SEARCH FORM */}
              <form onSubmit={handleLiveWikiSearch} className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  type="text"
                  value={searchWikiQuery}
                  onChange={(e) => setSearchWikiQuery(e.target.value)}
                  placeholder={`Search ${wikiSubdomain}.fandom.com character name...`}
                  className="bg-black/50 border-white/15 rounded-xl pl-8 text-xs text-white h-8 focus-visible:ring-purple-500"
                />
              </form>
            </CardHeader>

            <CardContent className="p-3 space-y-2.5 max-h-[540px] overflow-y-auto scrollbar-thin">
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">
                  No wiki candidates match search. Press Enter to search live MediaWiki API on {wikiSubdomain}.fandom.com
                </div>
              ) : (
                <>
                  {filteredCandidates.map((candidate) => {
                    const isApproved = curatedCharacters.some(c => c.name.toLowerCase() === candidate.name.toLowerCase());

                    return (
                      <div
                        key={candidate.page}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all gap-3 ${
                          isApproved
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-black/40 border-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={candidate.image}
                            alt={candidate.name}
                            className="h-10 w-10 rounded-lg object-cover bg-black/60 shrink-0 border border-white/10"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h5 className="text-xs font-bold text-white truncate">{candidate.name}</h5>
                              <a
                                href={`https://${wikiSubdomain}.fandom.com/wiki/${candidate.page}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-500 hover:text-white shrink-0"
                                title="Open Wiki page"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">{candidate.realm}</p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          disabled={isApproved}
                          onClick={() => handleApproveWikiCharacter(candidate)}
                          className={`text-[9px] font-black uppercase rounded-lg h-7 px-2.5 shrink-0 ${
                            isApproved
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                              : "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                          }`}
                        >
                          {isApproved ? (
                            <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Approved</span>
                          ) : (
                            <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add to Registry</span>
                          )}
                        </Button>
                      </div>
                    );
                  })}

                  {/* MediaWiki Continuation Pagination Button */}
                  {continueToken && (
                    <div className="pt-2 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadWikiCandidates(wikiSubdomain, true, continueToken)}
                        disabled={isFetchingWiki}
                        className="w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs font-bold uppercase rounded-xl py-2"
                      >
                        {isFetchingWiki ? (
                          <span className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading Next Candidates...
                          </span>
                        ) : (
                          "Load More Candidates from MediaWiki"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. CHARACTER AVATAR IMAGE SELECTION MODAL */}
      {imageSwapCharacter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-[#11111a] border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 p-4">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" /> Choose Primary Portrait for {imageSwapCharacter.name}
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px] font-mono ml-2">
                    {imageCandidates.length} Images Discovered
                  </Badge>
                </CardTitle>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Harvested from main article, gallery subpages & file search on <strong className="text-zinc-200">{wikiSubdomain}.fandom.com</strong>
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setImageSwapCharacter(null)}
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
                  No images found on MediaWiki for this character.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {imageCandidates.map((candidate, idx) => {
                    const isSelected = imageSwapCharacter.avatarUrl === candidate.url;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectAvatar(candidate.url)}
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

export default CharactersManager;

