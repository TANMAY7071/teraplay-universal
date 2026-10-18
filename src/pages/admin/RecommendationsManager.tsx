import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const RecommendationsManager: React.FC = () => {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manualList, setManualList] = useState(["Soul Land", "Perfect World", "Martial Universe"]);

  return (
    <div className="space-y-6 text-left text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommendations Engine</h1>
        <p className="text-xs text-muted-foreground mt-1">Configure auto-suggestion rules or manual matching filters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4">
          <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">Recommendation Mode</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input 
                  type="radio" 
                  name="recMode" 
                  checked={mode === "auto"} 
                  onChange={() => setMode("auto")} 
                  className="accent-primary" 
                />
                Automatic Matcher
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input 
                  type="radio" 
                  name="recMode" 
                  checked={mode === "manual"} 
                  onChange={() => setMode("manual")} 
                  className="accent-primary" 
                />
                Manual Matcher
              </label>
            </div>
          </Card>
        </div>

        <div className="md:col-span-8">
          {mode === "auto" ? (
            <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-primary">Automatic Matcher Rules</h3>
              <div className="space-y-3">
                {[
                  { label: "Match Genres", desc: "Cross-references matching genres in the registry." },
                  { label: "Match Themes & Tags", desc: "Compares studio and theme tag markers." },
                  { label: "Match Studio", desc: "Prioritizes titles produced by the same studio." }
                ].map((rule) => (
                  <div key={rule.label} className="flex items-start justify-between gap-4 p-3 bg-black/40 border border-white/5 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">{rule.label}</h4>
                      <p className="text-[10px] text-zinc-400">{rule.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded accent-primary border-white/10" />
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Manual Matcher Rules</h3>
                <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-[10px] rounded-lg">
                  + Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {manualList.map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-bold">
                    <span>{item}</span>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-500 hover:bg-red-500/10 text-[10px] h-7 rounded-lg">
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsManager;
