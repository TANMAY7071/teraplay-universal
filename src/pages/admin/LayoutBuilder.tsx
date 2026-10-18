import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoveUp, MoveDown, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LayoutBuilder: React.FC = () => {
  const [modules, setModules] = useState([
    { id: "hero", label: "Hero Block", enabled: true },
    { id: "timeline", label: "Franchise Journey", enabled: true },
    { id: "episodes", label: "Episodes Playlist", enabled: true },
    { id: "overview", label: "Story Overview", enabled: true },
    { id: "cultivation", label: "Cultivation Guide", enabled: true },
    { id: "flames", label: "Heavenly Flames", enabled: true },
    { id: "characters", label: "Voice Cast & Codex", enabled: true },
    { id: "lore", label: "Franchise Lore Wiki", enabled: true },
    { id: "recommendations", label: "You May Also Like", enabled: true }
  ]);

  const move = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= modules.length) return;
    const updated = [...modules];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setModules(updated);
  };

  const toggleModule = (id: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  return (
    <div className="space-y-6 text-left text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Layout Builder</h1>
          <p className="text-xs text-muted-foreground mt-1">Drag, reorder, or toggle individual sections on the detail page.</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground gap-1.5 text-xs font-black uppercase rounded-xl">
          <Save className="h-4 w-4" /> Save Layout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">Detail Page Blocks Order</h3>
            <div className="space-y-2">
              {modules.map((mod, idx) => (
                <div 
                  key={mod.id} 
                  className={`flex items-center justify-between p-3 bg-black/40 border rounded-2xl transition-opacity ${
                    mod.enabled ? "border-white/10 opacity-100" : "border-white/5 opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => move(idx, "up")} disabled={idx === 0} className="text-zinc-500 hover:text-white disabled:opacity-30">
                        <MoveUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => move(idx, "down")} disabled={idx === modules.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-30">
                        <MoveDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-bold">{mod.label}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={mod.enabled} 
                      onChange={() => toggleModule(mod.id)} 
                      className="rounded border-white/10 bg-black/40 text-primary accent-primary" 
                    />
                    <span className="text-[10px] font-black uppercase text-zinc-400">
                      {mod.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-4">
          <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">Live Layout Info</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Order and settings are dynamically exported as a JSON array. Frontend components listen to this array to mount and sort blocks on rendering.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LayoutBuilder;
