import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const CultivationManager: React.FC = () => {
  const [systems, setSystems] = useState([
    { id: 1, name: "Dou Qi System", realms: 9, description: "World of Dou Qi cultivation (Battle Through the Heavens)." },
    { id: 2, name: "Soul Power System", realms: 10, description: "Martial Soul rings levels system (Soul Land)." },
    { id: 3, name: "Immortal Cultivation System", realms: 12, description: "Qi Condensation, Foundation Establishment, Gold Core (Renegade Immortal)." }
  ]);

  const [activeSystem, setActiveSystem] = useState<any>(null);

  const realmsMockList = [
    { level: 1, name: "Dou Zhi Qi", desc: "Foundation Qi training" },
    { level: 2, name: "Dou Zhe", desc: "Forming Dou Qi cyclone" },
    { level: 3, name: "Dou Shi", desc: "Dou Qi armor manifestation" },
    { level: 4, name: "Da Dou Shi", desc: "Dou Qi solidification" },
    { level: 5, name: "Dou Ling", desc: "Dou Qi weapon manifestation" },
    { level: 6, name: "Dou Wang (King)", desc: "Wings of Dou Qi flight" },
    { level: 7, name: "Dou Huang (Emperor)", desc: "Spatial Alteration" }
  ];

  return (
    <div className="space-y-6 text-left text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cultivation Systems</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure global, reusable power scale progression grids.</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground gap-1 text-xs font-black uppercase rounded-xl">
          <Plus className="h-3.5 w-3.5" /> Add System
        </Button>
      </div>

      {!activeSystem ? (
        <Card className="bg-[#11111a] border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              Cultivation Scales Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/5 space-y-3">
            {systems.map((s) => (
              <div key={s.id} className="pt-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-white hover:text-primary cursor-pointer" onClick={() => setActiveSystem(s)}>
                    {s.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.realms} Realms configured • {s.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => setActiveSystem(s)} className="h-8 w-8 hover:bg-white/5 text-zinc-400">
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
            <Button size="sm" onClick={() => setActiveSystem(null)} variant="outline" className="border-white/10 bg-white/5 text-white text-xs rounded-xl">
              ← Back to Scales
            </Button>
            <h2 className="text-lg font-black">{activeSystem.name} Editor</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">System Config</h3>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">System Name</label>
                  <input type="text" defaultValue={activeSystem.name} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Description</label>
                  <textarea rows={3} defaultValue={activeSystem.description} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                </div>
              </Card>
            </div>

            <div className="lg:col-span-8">
              <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">Realm Progression Path</h3>
                  <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-[10px] rounded-lg">
                    + Add Realm
                  </Button>
                </div>

                <div className="space-y-2">
                  {realmsMockList.map((realm) => (
                    <div key={realm.level} className="flex items-center justify-between gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl text-xs">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-zinc-500">#{realm.level}</span>
                        <div>
                          <h4 className="font-black text-white">{realm.name}</h4>
                          <p className="text-[10px] text-zinc-400">{realm.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-white">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

export default CultivationManager;
