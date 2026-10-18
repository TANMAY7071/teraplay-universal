import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const FlamesManager: React.FC = () => {
  const [flames, setFlames] = useState([
    { rank: 11, name: "Bone Chilling Flame", owner: "Yao Lao", desc: "A cold white flame that can freeze items but burn souls." },
    { rank: 14, name: "Fallen Heart Flame", owner: "Jia Nan Academy", desc: "The Heart Fire that accelerates cultivation speed." },
    { rank: 19, name: "Green Lotus Core Flame", owner: "Xiao Yan", desc: "Born deep inside volcano cores, highly volatile." }
  ]);

  const [activeFlame, setActiveFlame] = useState<any>(null);

  return (
    <div className="space-y-6 text-left text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Heavenly Flames Registry</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage individual elemental flames and custom details properties.</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground gap-1 text-xs font-black uppercase rounded-xl">
          <Plus className="h-3.5 w-3.5" /> Add Flame
        </Button>
      </div>

      {!activeFlame ? (
        <Card className="bg-[#11111a] border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              Heavenly Flames Codex
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/5 space-y-3">
            {flames.map((f) => (
              <div key={f.name} className="pt-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white hover:text-primary cursor-pointer" onClick={() => setActiveFlame(f)}>
                      {f.name}
                    </h3>
                    <Badge variant="outline" className="text-[9px] font-black uppercase border-amber-500/20 bg-amber-500/10 text-amber-400">
                      Rank #{f.rank}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Owner: {f.owner} • {f.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => setActiveFlame(f)} className="h-8 w-8 hover:bg-white/5 text-zinc-400">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/5 text-zinc-400">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Button size="sm" onClick={() => setActiveFlame(null)} variant="outline" className="border-white/10 bg-white/5 text-white text-xs rounded-xl">
              ← Back to Codex
            </Button>
            <h2 className="text-lg font-black">{activeFlame.name} Editor</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-4">
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Flame Attributes</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Flame Name</label>
                    <input type="text" defaultValue={activeFlame.name} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Rank In Codex</label>
                    <input type="number" defaultValue={activeFlame.rank} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Owner / Master</label>
                  <input type="text" defaultValue={activeFlame.owner} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Description</label>
                  <textarea rows={3} defaultValue={activeFlame.desc} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                </div>
              </Card>
            </div>

            <div className="md:col-span-4">
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Appearances</h3>
                <div className="space-y-2 text-xs">
                  {["Season 1", "Season 3", "Season 5"].map((season) => (
                    <div key={season} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded accent-primary border-white/10" />
                      <span>{season}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlamesManager;
