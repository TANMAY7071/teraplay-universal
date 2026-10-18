import React, { useState, useEffect } from "react";
import { X, Upload, Link2, Trash2, Save, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBrandingOverrides, saveBrandingOverrides, BrandingOverrides } from "@/lib/overrides";
import { toast } from "sonner";
import { Universe, Installment } from "@/types/universe";

interface BrandingEditModalProps {
  universe: Universe;
  selectedInstallment: Installment;
  onSave: () => void;
  onClose: () => void;
}

export const BrandingEditModal: React.FC<BrandingEditModalProps> = ({
  universe,
  selectedInstallment,
  onSave,
  onClose
}) => {
  const [logoLink, setLogoLink] = useState("");
  const [posterLink, setPosterLink] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  
  const [logoFileBase64, setLogoFileBase64] = useState("");
  const [posterFileBase64, setPosterFileBase64] = useState("");
  const [bannerFileBase64, setBannerFileBase64] = useState("");
  const [logoDisplayMode, setLogoDisplayMode] = useState<'desktop_only' | 'both' | 'none'>('desktop_only');

  // Load existing overrides on open
  useEffect(() => {
    const universeOverrides = getBrandingOverrides(universe.slug, "default");
    const installmentOverrides = getBrandingOverrides(universe.slug, selectedInstallment.id);
    
    // For Logo: it is franchise-wide (or can be override specific)
    const activeLogo = installmentOverrides.logo || universeOverrides.logo || "";
    if (activeLogo.startsWith("data:")) {
      setLogoFileBase64(activeLogo);
      setLogoLink("");
    } else {
      setLogoLink(activeLogo);
      setLogoFileBase64("");
    }

    const activeMode = installmentOverrides.logoDisplayMode || universeOverrides.logoDisplayMode || "desktop_only";
    setLogoDisplayMode(activeMode);

    // For Poster: specific to active installment
    const activePoster = installmentOverrides.poster || "";
    if (activePoster.startsWith("data:")) {
      setPosterFileBase64(activePoster);
      setPosterLink("");
    } else {
      setPosterLink(activePoster);
      setPosterFileBase64("");
    }

    // For Banner: specific to active installment
    const activeBanner = installmentOverrides.banner || "";
    if (activeBanner.startsWith("data:")) {
      setBannerFileBase64(activeBanner);
      setBannerLink("");
    } else {
      setBannerLink(activeBanner);
      setBannerFileBase64("");
    }
  }, [universe.slug, selectedInstallment.id]);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setBase64: (val: string) => void,
    setLink: (val: string) => void,
    label: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(`${label} file size should be less than 2MB`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64(reader.result as string);
      setLink(""); // Clear text link if file uploaded
      toast.success(`${label} uploaded and converted successfully!`);
    };
    reader.onerror = () => {
      toast.error(`Failed to read ${label} file`);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalLogo = logoFileBase64 || logoLink;
    const finalPoster = posterFileBase64 || posterLink;
    const finalBanner = bannerFileBase64 || bannerLink;

    // Save Logo at the default (universe-level) level
    saveBrandingOverrides(universe.slug, "default", {
      logo: finalLogo || undefined,
      logoDisplayMode: logoDisplayMode
    });

    // Save Poster & Banner at the specific installment level
    saveBrandingOverrides(universe.slug, selectedInstallment.id, {
      poster: finalPoster || undefined,
      banner: finalBanner || undefined,
      logo: finalLogo || undefined,
      logoDisplayMode: logoDisplayMode
    });

    toast.success("Branding configuration saved successfully!");
    onSave();
    onClose();
  };

  const handleClear = (type: "logo" | "poster" | "banner") => {
    if (type === "logo") {
      setLogoLink("");
      setLogoFileBase64("");
    } else if (type === "poster") {
      setPosterLink("");
      setPosterFileBase64("");
    } else if (type === "banner") {
      setBannerLink("");
      setBannerFileBase64("");
    }
    toast.info(`Cleared custom ${type}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0c0d12] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Branding & Media CMS
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                Customize Logo, Poster & Banner for {universe.title} - {selectedInstallment.title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          
          {/* LOGO CONFIG */}
          <div className="space-y-2 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Series Title Logo
            </span>
            <p className="text-[9px] text-zinc-400 leading-normal">
              Provide a transparent PNG logo. Replaces the text header on the hero slide/details page.
            </p>
            
            {/* Link Input */}
            <div className="relative">
              <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Paste Logo Image URL..."
                value={logoLink}
                onChange={(e) => {
                  setLogoLink(e.target.value);
                  setLogoFileBase64(""); // Clear file upload if URL is manually edited
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-primary/50"
              />
              {(logoLink || logoFileBase64) && (
                <button 
                  onClick={() => handleClear("logo")}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* File Upload / Base64 */}
            <div className="flex items-center gap-2 pt-1.5">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Logo File</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setLogoFileBase64, setLogoLink, "Logo")}
                  className="hidden"
                />
              </label>
              {logoFileBase64 && (
                <span className="text-[9px] text-green-400 font-bold truncate max-w-[200px]">
                  ✓ File uploaded (Base64 saved)
                </span>
              )}
            </div>

            {/* Logo Display Mode Selector */}
            <div className="pt-2 space-y-1">
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">
                Display Mode Preference:
              </span>
              <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setLogoDisplayMode("both")}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                    logoDisplayMode === "both" ? "bg-primary text-black font-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Both Screens
                </button>
                <button
                  type="button"
                  onClick={() => setLogoDisplayMode("desktop_only")}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                    logoDisplayMode === "desktop_only" ? "bg-primary text-black font-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Desktop Only
                </button>
                <button
                  type="button"
                  onClick={() => setLogoDisplayMode("none")}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                    logoDisplayMode === "none" ? "bg-primary text-black font-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Text Title Only
                </button>
              </div>
            </div>
          </div>

          {/* POSTER CONFIG */}
          <div className="space-y-2 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest block flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Season Poster (2:3 Aspect Ratio)
            </span>
            <p className="text-[9px] text-zinc-400 leading-normal">
              Customize the left poster image for this specific season.
            </p>
            
            {/* Link Input */}
            <div className="relative">
              <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Paste Poster Image URL..."
                value={posterLink}
                onChange={(e) => {
                  setPosterLink(e.target.value);
                  setPosterFileBase64("");
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-primary/50"
              />
              {(posterLink || posterFileBase64) && (
                <button 
                  onClick={() => handleClear("poster")}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* File Upload / Base64 */}
            <div className="flex items-center gap-2 pt-1.5">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Poster File</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setPosterFileBase64, setPosterLink, "Poster")}
                  className="hidden"
                />
              </label>
              {posterFileBase64 && (
                <span className="text-[9px] text-green-400 font-bold truncate max-w-[200px]">
                  ✓ File uploaded (Base64 saved)
                </span>
              )}
            </div>
          </div>

          {/* BANNER CONFIG */}
          <div className="space-y-2 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest block flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Hero Background Banner (16:9 Landscape)
            </span>
            <p className="text-[9px] text-zinc-400 leading-normal">
              Customize the background backdrop banner image for this season.
            </p>
            
            {/* Link Input */}
            <div className="relative">
              <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Paste Banner Image URL..."
                value={bannerLink}
                onChange={(e) => {
                  setBannerLink(e.target.value);
                  setBannerFileBase64("");
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-primary/50"
              />
              {(bannerLink || bannerFileBase64) && (
                <button 
                  onClick={() => handleClear("banner")}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* File Upload / Base64 */}
            <div className="flex items-center gap-2 pt-1.5">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Banner File</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setBannerFileBase64, setBannerLink, "Banner")}
                  className="hidden"
                />
              </label>
              {bannerFileBase64 && (
                <span className="text-[9px] text-green-400 font-bold truncate max-w-[200px]">
                  ✓ File uploaded (Base64 saved)
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-white/10 pt-4 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-11 border-white/10 bg-white/5 hover:bg-white/10 font-bold text-xs uppercase"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 rounded-xl h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-black uppercase tracking-wider"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
          </Button>
        </div>

      </div>
    </div>
  );
};
