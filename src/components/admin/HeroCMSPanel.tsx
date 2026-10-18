import React, { useState } from "react";
import { HeroSlideConfig } from "../Hero/hero-config";
import { animeCatalog } from "@/data/anime";
import { 
  X, Save, Trash2, Plus, RefreshCw, Layout, Video, Image, Play, Star, Sparkles, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HeroCMSPanelProps {
  slides: HeroSlideConfig[];
  onSave: (updatedSlides: HeroSlideConfig[]) => void;
  onClose: () => void;
}

export const HeroCMSPanel: React.FC<HeroCMSPanelProps> = ({
  slides,
  onSave,
  onClose,
}) => {
  const [editedSlides, setEditedSlides] = useState<HeroSlideConfig[]>([...slides]);
  const [selectedSlideId, setSelectedSlideId] = useState<number | null>(
    slides.length > 0 ? slides[0].id : null
  );

  const currentSlide = editedSlides.find(s => s.id === selectedSlideId) || null;

  const updateCurrentSlide = (fields: Partial<HeroSlideConfig>) => {
    if (selectedSlideId === null) return;
    setEditedSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, ...fields } : s));
  };

  const extractYoutubeId = (str: string): string | null => {
    if (!str) return null;
    let url = str.trim();
    if (url.startsWith("<iframe")) {
      const match = url.match(/src="([^"]+)"/);
      if (match) url = match[1];
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    return null;
  };

  const extractIframeSrc = (str: string): string => {
    if (!str) return "";
    const trimmed = str.trim();
    if (trimmed.startsWith("<iframe")) {
      const match = trimmed.match(/src="([^"]+)"/);
      if (match) return match[1];
    }
    return trimmed;
  };

  const cleanSlideData = (slide: HeroSlideConfig): HeroSlideConfig => {
    const cleaned = { ...slide };
    
    cleaned.image = extractIframeSrc(cleaned.image);
    if (cleaned.mobileImage) {
      cleaned.mobileImage = extractIframeSrc(cleaned.mobileImage);
    }

    const ytIdFromTrailer = extractYoutubeId(cleaned.trailerUrl || "");
    if (ytIdFromTrailer) {
      cleaned.youtubeTrailerId = ytIdFromTrailer;
      cleaned.trailerUrl = "";
      cleaned.enableDesktopTrailer = true;
    } else {
      cleaned.trailerUrl = extractIframeSrc(cleaned.trailerUrl || "");
    }

    if (cleaned.youtubeTrailerId) {
      const cleanYtId = extractYoutubeId(cleaned.youtubeTrailerId);
      if (cleanYtId) {
        cleaned.youtubeTrailerId = cleanYtId;
        cleaned.trailerUrl = "";
      }
    }

    return cleaned;
  };

  const handleSave = () => {
    const cleaned = editedSlides.map(cleanSlideData);
    onSave(cleaned);
    setEditedSlides(cleaned);
    toast.success("Hero slider configurations updated successfully!");
  };

  const handleResetToDefault = () => {
    if (window.confirm("Are you sure you want to reset all Hero slides to defaults?")) {
      localStorage.removeItem("donghua-custom-hero-slides");
      window.location.reload();
    }
  };

  const handleDeleteSlide = (id: number) => {
    if (editedSlides.length <= 1) {
      toast.error("You must have at least one hero slide!");
      return;
    }
    const filtered = editedSlides.filter(s => s.id !== id);
    setEditedSlides(filtered);
    if (selectedSlideId === id) {
      setSelectedSlideId(filtered[0].id);
    }
    toast.success("Slide removed from slider queue.");
  };

  const handleAddSlideFromCatalog = (animeId: number) => {
    const selectedAnime = animeCatalog.find(a => a.id === animeId);
    if (!selectedAnime) return;

    // Check if already in slides
    if (editedSlides.some(s => s.slug === selectedAnime.slug)) {
      toast.error("This donghua is already in the hero slides!");
      return;
    }

    const newSlide: HeroSlideConfig = {
      id: Date.now(), // Unique ID
      title: selectedAnime.title,
      originalTitle: selectedAnime.originalTitle || "",
      slug: selectedAnime.slug,
      heroType: "single",
      image: selectedAnime.image,
      mobileImage: selectedAnime.image,
      overlay: "dark",
      focus: "center top",
      focusX: 50,
      focusY: 20,
      trailerUrl: "",
      youtubeTrailerId: "",
      enableDesktopTrailer: false,
      enableMobileTrailer: false,
      titleAlignment: "left",
      theme: "cyan",
      badge: "⭐ Featured",
      rating: selectedAnime.rating || 9.0,
      year: selectedAnime.year || new Date().getFullYear(),
      episodes: selectedAnime.episodes || 12,
      genres: selectedAnime.genres || [selectedAnime.genre || "Action"],
      description: selectedAnime.synopsis || "",
    };

    setEditedSlides(prev => [...prev, newSlide]);
    setSelectedSlideId(newSlide.id);
    toast.success(`Added "${selectedAnime.title}" to hero slides!`);
  };

  return (
    <div className="fixed right-0 bottom-0 sm:bottom-auto sm:right-6 sm:top-24 z-50 w-full max-w-md sm:w-[420px] bg-[#0c0d12]/98 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.65)] sm:shadow-[0_0_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl text-left animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 flex flex-col max-h-[85vh] sm:max-h-[75vh] overflow-y-auto scrollbar-thin">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
        <div>
          <h3 className="text-xs font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-primary animate-spin-slow" /> 🛠 Hero Slider CMS
          </h3>
          <span className="text-[10px] text-zinc-400 block mt-1 font-bold">Admin Console Mode</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs flex-1 scrollbar-none">
        
        {/* SLIDES LIST & ADD SLIDE */}
        <div>
          <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-2">Slides Queue</span>
          <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto mb-2 p-1 bg-black/40 rounded-xl border border-white/5">
            {editedSlides.map((slide, idx) => {
              const isSelected = slide.id === selectedSlideId;
              return (
                <div 
                  key={slide.id}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black cursor-pointer transition-all",
                    isSelected 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                  )}
                  onClick={() => setSelectedSlideId(slide.id)}
                >
                  <span>{idx + 1}. {slide.title.split(" ")[0]}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSlide(slide.id);
                    }}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddSlideFromCatalog(Number(e.target.value));
                  e.target.value = "";
                }
              }}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">➕ Add Slide From Catalog...</option>
              {animeCatalog.map(anime => (
                <option key={anime.id} value={anime.id}>{anime.title}</option>
              ))}
            </select>
            <button
              onClick={handleResetToDefault}
              title="Reset all settings to default config"
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-red-500/30 hover:text-red-400 rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* EDITING FORM FOR THE SELECTED SLIDE */}
        {currentSlide && (
          <div className="space-y-3 pt-3 border-t border-white/15">
            <div className="flex items-center gap-2 mb-2 bg-primary/5 p-2.5 rounded-xl border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="text-[8px] text-zinc-500 font-extrabold uppercase block tracking-wider">Editing Details</span>
                <h4 className="text-xs font-black text-white truncate">{currentSlide.title}</h4>
              </div>
            </div>

            {/* TEXT FIELDS */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Slider Title</label>
                <input 
                  type="text"
                  value={currentSlide.title}
                  onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                />
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Chinese Title</label>
                <input 
                  type="text"
                  value={currentSlide.originalTitle || ""}
                  onChange={(e) => updateCurrentSlide({ originalTitle: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Badge</label>
                <input 
                  type="text"
                  value={currentSlide.badge}
                  onChange={(e) => updateCurrentSlide({ badge: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                />
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Year</label>
                <input 
                  type="number"
                  value={currentSlide.year}
                  onChange={(e) => updateCurrentSlide({ year: Number(e.target.value) })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                />
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Episodes Count</label>
                <input 
                  type="number"
                  value={currentSlide.episodes}
                  onChange={(e) => updateCurrentSlide({ episodes: Number(e.target.value) })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Slide Description</label>
              <textarea
                value={currentSlide.description}
                rows={2}
                onChange={(e) => updateCurrentSlide({ description: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-[11px] text-white resize-none"
              />
            </div>

            {/* TRAILER PICS / POSTERS */}
            <div className="space-y-2 bg-white/3 p-2.5 rounded-xl border border-white/5">
              <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-wider block flex items-center gap-1">
                <Image className="w-3.5 h-3.5 text-primary" /> Poster / Trailer Pics
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] text-zinc-400 block mb-0.5">Desktop Image Path</label>
                  <input 
                    type="text"
                    value={currentSlide.image}
                    onChange={(e) => updateCurrentSlide({ image: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-zinc-400 block mb-0.5">Mobile Image Path</label>
                  <input 
                    type="text"
                    value={currentSlide.mobileImage || ""}
                    onChange={(e) => updateCurrentSlide({ mobileImage: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                  />
                </div>
              </div>

              {/* Slide Logo URL & File Upload */}
              <div className="pt-1 border-t border-white/5 mt-1">
                <label className="text-[8px] text-zinc-400 block mb-0.5">Logo Image Path / URL</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text"
                    placeholder="e.g. /logos/battle-through-the-heavens-logo.png"
                    value={currentSlide.logo || ""}
                    onChange={(e) => updateCurrentSlide({ logo: e.target.value })}
                    className="flex-1 bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                  />
                  <label className="flex items-center justify-center p-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer transition-all shrink-0">
                    <Upload className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error("Logo file size should be less than 2MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            updateCurrentSlide({ logo: reader.result as string });
                            toast.success("Logo uploaded successfully!");
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              
              {/* PINTEREST EMBED HINT & WARNING */}
              <div className="mt-1 p-2 bg-yellow-500/10 border border-yellow-500/25 rounded-lg text-[9px] text-zinc-300 leading-normal space-y-1">
                <span className="font-bold text-yellow-400 block">⚠️ PINTEREST BACKGROUND TIP:</span>
                <p>
                  Do <strong>NOT</strong> paste Pinterest "embed codes" or "iframes" as background images. They will not stretch correctly to fit your laptop screen.
                </p>
                <p className="text-zinc-400">
                  <strong>Solution:</strong> Open the Pin, right-click the image, select <strong>"Copy Image Link"</strong> (should look like <em>https://i.pinimg.com/...jpg</em>), and paste that instead!
                </p>
              </div>
            </div>

            {/* DONGHUA VIDEO TRAILER SETTINGS */}
            <div className="space-y-2 bg-white/3 p-2.5 rounded-xl border border-white/5">
              <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-wider block flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-primary" /> Donghua Trailer Config
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] text-zinc-400 block mb-0.5">YouTube Video ID</label>
                  <input 
                    type="text"
                    value={currentSlide.youtubeTrailerId || ""}
                    onChange={(e) => updateCurrentSlide({ youtubeTrailerId: e.target.value })}
                    placeholder="e.g. C-U2_gTjzhI"
                    className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-zinc-400 block mb-0.5">Direct Video File URL</label>
                  <input 
                    type="text"
                    value={currentSlide.trailerUrl || ""}
                    onChange={(e) => updateCurrentSlide({ trailerUrl: e.target.value })}
                    placeholder="e.g. /trailers/btth.mp4"
                    className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={currentSlide.enableDesktopTrailer || false}
                    onChange={(e) => updateCurrentSlide({ enableDesktopTrailer: e.target.checked })}
                    className="rounded border-white/10 bg-black/40 accent-primary cursor-pointer w-3 h-3"
                  />
                  <span className="text-[9px] font-bold text-zinc-300">Autoplay Desktop</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={currentSlide.enableMobileTrailer || false}
                    onChange={(e) => updateCurrentSlide({ enableMobileTrailer: e.target.checked })}
                    className="rounded border-white/10 bg-black/40 accent-primary cursor-pointer w-3 h-3"
                  />
                  <span className="text-[9px] font-bold text-zinc-300">Autoplay Mobile</span>
                </label>
              </div>
            </div>

            {/* DESIGN CUSTOMIZATIONS */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Theme Color</label>
                <select
                  value={currentSlide.theme}
                  onChange={(e) => updateCurrentSlide({ theme: e.target.value as any })}
                  className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-sans"
                >
                  {["gold", "red", "blue", "orange", "cyan"].map(theme => (
                    <option key={theme} value={theme} className="bg-[#0c0d12]">{theme.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Overlay Blend</label>
                <select
                  value={currentSlide.overlay}
                  onChange={(e) => updateCurrentSlide({ overlay: e.target.value as any })}
                  className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-sans"
                >
                  {["dark", "cinema", "soft", "gradient"].map(overlay => (
                    <option key={overlay} value={overlay} className="bg-[#0c0d12]">{overlay.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Hero Layout</label>
                <select
                  value={currentSlide.heroType}
                  onChange={(e) => updateCurrentSlide({ heroType: e.target.value as any })}
                  className="w-full bg-black/50 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-sans"
                >
                  {["action", "single", "dual", "landscape", "romance"].map(t => (
                    <option key={t} value={t} className="bg-[#0c0d12]">{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        )}

        {/* CMS PANEL CONTROL ACTIONS */}
        <div className="pt-4 border-t border-white/15 flex gap-2 shrink-0">
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-3 bg-primary hover:bg-primary/95 active:scale-98 rounded-xl text-white font-black uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};

function Sliders({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}


