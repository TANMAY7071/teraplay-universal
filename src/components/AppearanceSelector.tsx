import { useState } from "react";
import { Check, Sparkles, Layout, Sliders, Maximize2 } from "lucide-react";
import { useTheme, accentThemes } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const AppearanceSelector = () => {
  const { accentTheme, setAccentTheme } = useTheme();
  
  // Future setting placeholders
  const [compactLayout, setCompactLayout] = useState(false);
  const [posterSize, setPosterSize] = useState([80]);
  const [cinemaMode, setCinemaMode] = useState(false);

  return (
    <div className="space-y-6">
      {/* Accent Theme Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Accent Theme
        </h4>
        <p className="text-xs text-muted-foreground">
          Select your preferred highlight and glow color accents across the app
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {accentThemes.map((theme) => {
            const isSelected = accentTheme === theme.id;
            
            // Generate visual gradient for button backgrounds
            let themeGradient = "from-purple-500 to-cyan-500";
            if (theme.id === "blue") themeGradient = "from-blue-500 to-teal-400";
            if (theme.id === "crimson") themeGradient = "from-red-600 to-orange-500";
            if (theme.id === "emerald") themeGradient = "from-emerald-500 to-lime-400";
            if (theme.id === "amoled") themeGradient = "from-zinc-900 to-black";

            return (
              <button
                key={theme.id}
                onClick={() => setAccentTheme(theme.id)}
                className={`group relative p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-24 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="font-extrabold text-xs sm:text-sm text-foreground">
                    {theme.name}
                  </span>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>

                {/* Micro gradient preview bar */}
                <div className={`h-2.5 w-full rounded-full bg-gradient-to-r mt-2 ${themeGradient}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Display Controls */}
      <div className="border-t border-white/5 pt-6 space-y-5">
        <h4 className="text-sm font-extrabold text-foreground tracking-tight">
          Display & Viewing Options
        </h4>

        {/* Compact Layout Toggle */}
        <div className="flex items-center justify-between gap-4 p-3.5 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <Layout className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground truncate">Compact Layout</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                Reduces grid margins and image sizes to fit more content on screen
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <Switch 
              id="compact-layout" 
              checked={compactLayout} 
              onCheckedChange={setCompactLayout}
            />
          </div>
        </div>

        {/* Poster Size Slider */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Sliders className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground truncate">Poster Scale</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  Adjust image sizes for show posters in catalog grids
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground shrink-0">{posterSize}%</span>
          </div>
          <Slider 
            value={posterSize} 
            onValueChange={setPosterSize} 
            max={120} 
            min={60} 
            step={5} 
            className="py-2"
          />
        </div>

        {/* Cinema Mode Toggle */}
        <div className="flex items-center justify-between gap-4 p-3.5 bg-white/5 rounded-2xl border border-white/5 opacity-60 relative overflow-hidden group">
          <div className="flex items-center gap-3 min-w-0">
            <Maximize2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="truncate">Cinema Mode</span>
                <span className="text-[9px] bg-primary/20 text-primary border border-primary/20 rounded-full px-2 py-0.5 uppercase tracking-wider font-extrabold shrink-0">
                  Soon
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                Expands the player window to borderless theatrical view
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <Switch 
              id="cinema-mode" 
              checked={cinemaMode} 
              onCheckedChange={setCinemaMode}
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSelector;
