import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, Image as ImageIcon, Film, Database, Layers, Eye, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export interface ArtworkCandidate {
  id: string;
  url: string;
  thumbnailUrl?: string;
  source: "AniList" | "TMDB" | "Simkl" | "Fandom Wiki" | "Catalog" | "Custom";
  type: "poster" | "banner" | "landscape" | "logo";
  width?: number;
  height?: number;
  label?: string;
  lang?: string;
}

interface MultiApiArtworkGalleryProps {
  candidates: ArtworkCandidate[];
  activePoster?: string;
  activeBanner?: string;
  activeLandscape?: string;
  activeLogo?: string;
  onSelectPoster: (url: string) => void;
  onSelectBanner: (url: string) => void;
  onSelectLandscape: (url: string) => void;
  onSelectLogo: (url: string) => void;
  onAutoBlend?: () => void;
  isLoading?: boolean;
}

export const MultiApiArtworkGallery: React.FC<MultiApiArtworkGalleryProps> = ({
  candidates,
  activePoster,
  activeBanner,
  activeLandscape,
  activeLogo,
  onSelectPoster,
  onSelectBanner,
  onSelectLandscape,
  onSelectLogo,
  onAutoBlend,
  isLoading
}) => {
  const [filterType, setFilterType] = useState<"all" | "poster" | "banner" | "logo">("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState<string>("");

  const filteredCandidates = candidates.filter(item => {
    if (filterType !== "all" && item.type !== filterType && !(filterType === "banner" && item.type === "landscape")) {
      return false;
    }
    if (filterSource !== "all" && item.source !== filterSource) {
      return false;
    }
    return true;
  });

  const getSourceBadgeStyle = (source: string) => {
    switch (source) {
      case "AniList":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "TMDB":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "Simkl":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "Fandom Wiki":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-white/10 text-zinc-300 border-white/20";
    }
  };

  const handleAddCustomImage = () => {
    if (!customUrl.trim() || !customUrl.startsWith("http")) {
      toast.error("Please enter a valid image URL (http/https)");
      return;
    }
    const lower = customUrl.toLowerCase();
    const isLogo = lower.includes("logo") || filterType === "logo";
    const isPoster = !isLogo && (lower.includes("poster") || lower.includes("cover") || filterType === "poster");
    
    const imageType: "poster" | "banner" | "logo" = isLogo ? "logo" : (isPoster ? "poster" : "banner");

    const newCandidate: ArtworkCandidate = {
      id: `custom-${Date.now()}`,
      url: customUrl.trim(),
      thumbnailUrl: customUrl.trim(),
      source: "Custom",
      type: imageType,
      label: "Custom Upload"
    };
    candidates.unshift(newCandidate);
    
    if (imageType === "logo") {
      onSelectLogo(customUrl.trim());
      toast.success("Custom logo added & assigned!");
    } else if (imageType === "poster") {
      onSelectPoster(customUrl.trim());
      toast.success("Custom poster added & assigned!");
    } else {
      onSelectBanner(customUrl.trim());
      toast.success("Custom banner added & assigned!");
    }
    setCustomUrl("");
  };

  return (
    <div className="space-y-4 bg-[#0d0e15] border border-white/10 p-5 rounded-2xl animate-in fade-in duration-300">
      {/* HEADER & AUTO-BLEND BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase">
              Multi-API Artwork Studio
            </Badge>
            <span className="text-[10px] font-mono text-zinc-400">
              {candidates.length} images harvested across AniList, TMDB & Simkl
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-2">
            Visual Media & Artwork Selector
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Compare posters, banners, and backdrops from all APIs side-by-side. 1-click to set poster or hero banner.
          </p>
        </div>

        {onAutoBlend && (
          <Button
            size="sm"
            onClick={onAutoBlend}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase rounded-xl gap-1.5 shadow-lg shadow-primary/25 h-9 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Blend Best Images
          </Button>
        )}
      </div>

      {/* CONTROLS & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Type Filters */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
              filterType === "all" ? "bg-primary text-primary-foreground shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            All ({candidates.length})
          </button>
          <button
            onClick={() => setFilterType("poster")}
            className={`px-3 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
              filterType === "poster" ? "bg-primary text-primary-foreground shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            Posters ({candidates.filter(c => c.type === "poster").length})
          </button>
          <button
            onClick={() => setFilterType("banner")}
            className={`px-3 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
              filterType === "banner" ? "bg-primary text-primary-foreground shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            Banners & Backdrops ({candidates.filter(c => c.type === "banner" || c.type === "landscape").length})
          </button>
          <button
            onClick={() => setFilterType("logo")}
            className={`px-3 py-1 rounded-lg font-black uppercase text-[10px] transition-all ${
              filterType === "logo" ? "bg-primary text-primary-foreground shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            Logos ({candidates.filter(c => c.type === "logo").length})
          </button>
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">API Source:</span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-black/60 border border-white/15 text-xs text-white rounded-xl px-2.5 py-1 focus:outline-none focus:border-primary"
          >
            <option value="all">All APIs</option>
            <option value="AniList">AniList</option>
            <option value="TMDB">TMDB</option>
            <option value="Simkl">Simkl</option>
            <option value="Catalog">Catalog</option>
          </select>
        </div>
      </div>

      {/* QUICK PASTE IMAGE INPUT */}
      <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5">
        <ImageIcon className="w-4 h-4 text-zinc-400 ml-1 shrink-0" />
        <Input
          placeholder="Paste image URL from browser (e.g. TMDB or Unsplash link)..."
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCustomImage()}
          className="bg-transparent border-none text-xs text-white h-7 focus-visible:ring-0"
        />
        <Button
          size="sm"
          onClick={handleAddCustomImage}
          className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase rounded-lg h-7 px-3 shrink-0"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Image
        </Button>
      </div>

      {/* ARTWORK CARDS GRID */}
      {filteredCandidates.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 text-xs bg-black/20 rounded-xl border border-dashed border-white/10">
          No images found matching selected filter. Click "Auto-Blend" or fetch metadata above to harvest images across APIs.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {filteredCandidates.map((item) => {
            const isPosterActive = activePoster === item.url;
            const isBannerActive = activeBanner === item.url || activeLandscape === item.url;
            const isLogoActive = activeLogo === item.url;

            return (
              <div
                key={item.id}
                className={`group relative bg-[#141522] border rounded-xl overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                  isPosterActive || isBannerActive || isLogoActive
                    ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* PREVIEW CONTAINER */}
                <div className="relative aspect-[3/4] w-full bg-black/60 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.label || item.source}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                    <Badge variant="outline" className={`text-[9px] font-black uppercase py-0.5 px-1.5 ${getSourceBadgeStyle(item.source)}`}>
                      {item.source}
                    </Badge>
                    {item.width && item.height && (
                      <span className="text-[8px] font-mono text-white bg-black/70 px-1 rounded backdrop-blur">
                        {item.width}×{item.height}
                      </span>
                    )}
                  </div>

                  {/* Active Indicator Pills */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 pointer-events-none">
                    {isPosterActive && (
                      <Badge className="bg-emerald-500 text-black font-black text-[9px] uppercase px-1.5 py-0.5 shadow-md">
                        <Check className="w-2.5 h-2.5 mr-0.5" /> Poster
                      </Badge>
                    )}
                    {isBannerActive && (
                      <Badge className="bg-primary text-black font-black text-[9px] uppercase px-1.5 py-0.5 shadow-md">
                        <Check className="w-2.5 h-2.5 mr-0.5" /> Banner
                      </Badge>
                    )}
                    {isLogoActive && (
                      <Badge className="bg-cyan-400 text-black font-black text-[9px] uppercase px-1.5 py-0.5 shadow-md">
                        <Check className="w-2.5 h-2.5 mr-0.5" /> Logo
                      </Badge>
                    )}
                  </div>

                  {/* Hover Overlay with Lightbox trigger */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      onClick={() => setPreviewImage(item.url)}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur transition-all"
                      title="Zoom Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur transition-all"
                      title="Open full resolution in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* CARD ACTIONS */}
                <div className="p-2 bg-[#11111a] border-t border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-400 font-bold truncate">
                    {item.label || `${item.type.toUpperCase()} (${item.source})`}
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <Button
                      size="sm"
                      variant={isPosterActive ? "default" : "outline"}
                      onClick={() => {
                        onSelectPoster(item.url);
                        toast.success(`Poster set from ${item.source}!`);
                      }}
                      className={`text-[9px] font-black uppercase h-6 px-1 ${
                        isPosterActive
                          ? "bg-emerald-500 text-black"
                          : "bg-black/40 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      Poster
                    </Button>

                    <Button
                      size="sm"
                      variant={isBannerActive ? "default" : "outline"}
                      onClick={() => {
                        onSelectBanner(item.url);
                        onSelectLandscape(item.url);
                        toast.success(`Hero Banner set from ${item.source}!`);
                      }}
                      className={`text-[9px] font-black uppercase h-6 px-1 ${
                        isBannerActive
                          ? "bg-primary text-black"
                          : "bg-black/40 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      Banner
                    </Button>

                    <Button
                      size="sm"
                      variant={isLogoActive ? "default" : "outline"}
                      onClick={() => {
                        onSelectLogo(item.url);
                        toast.success(`Title Logo set from ${item.source}!`);
                      }}
                      className={`text-[9px] font-black uppercase h-6 px-1 ${
                        isLogoActive
                          ? "bg-cyan-400 text-black"
                          : "bg-black/40 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      Logo
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULLSCREEN PREVIEW LIGHTBOX MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20 bg-[#11111a] p-2">
            <img src={previewImage} alt="Full resolution preview" className="max-h-[85vh] w-auto object-contain rounded-xl" />
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPoster(previewImage);
                  setPreviewImage(null);
                  toast.success("Assigned as Poster!");
                }}
                className="bg-emerald-500 text-black font-bold text-xs"
              >
                Use as Poster
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBanner(previewImage);
                  onSelectLandscape(previewImage);
                  setPreviewImage(null);
                  toast.success("Assigned as Hero Banner!");
                }}
                className="bg-primary text-black font-bold text-xs"
              >
                Use as Banner
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewImage(null)}
                className="text-white bg-black/60 hover:bg-black"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
