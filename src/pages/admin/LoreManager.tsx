import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const LoreManager: React.FC = () => {
  const [articles, setArticles] = useState([
    { id: 1, title: "Dou Qi Continent", category: "Geography", status: "Published" },
    { id: 2, title: "Jia Nan Academy", category: "Factions", status: "Published" },
    { id: 3, title: "Black Corner Region", category: "Geography", status: "Draft" },
    { id: 4, title: "Soul Hall", category: "Factions", status: "Published" },
    { id: 5, title: "Alchemy", category: "Systems", status: "Published" }
  ]);

  const [activeArticle, setActiveArticle] = useState<any>(null);

  return (
    <div className="space-y-6 text-left text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Universe Articles (Lore Wiki)</h1>
          <p className="text-xs text-muted-foreground mt-1">Write and organize dynamic wiki articles for custom show lore tabs.</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground gap-1 text-xs font-black uppercase rounded-xl">
          <Plus className="h-3.5 w-3.5" /> New Article
        </Button>
      </div>

      {!activeArticle ? (
        <Card className="bg-[#11111a] border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              Lore Articles List
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/5 space-y-3">
            {articles.map((art) => (
              <div key={art.id} className="pt-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white hover:text-primary cursor-pointer" onClick={() => setActiveArticle(art)}>
                      {art.title}
                    </h3>
                    <Badge variant="outline" className="text-[9px] border-white/10 bg-white/5 text-zinc-400">
                      {art.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Status: {art.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => setActiveArticle(art)} className="h-8 w-8 hover:bg-white/5 text-zinc-400">
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
            <Button size="sm" onClick={() => setActiveArticle(null)} variant="outline" className="border-white/10 bg-white/5 text-white text-xs rounded-xl">
              ← Back to Articles
            </Button>
            <h2 className="text-lg font-black">Edit: {activeArticle.title}</h2>
          </div>

          <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">Content Editor</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Title</label>
                <input type="text" defaultValue={activeArticle.title} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Category</label>
                <input type="text" defaultValue={activeArticle.category} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Body Content</label>
              <textarea rows={6} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white leading-relaxed" placeholder="Type wiki markdown content here..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" onClick={() => setActiveArticle(null)} variant="outline" className="border-white/10 bg-white/5 text-white text-xs">
                Cancel
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground text-xs font-black uppercase">
                Save Draft
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LoreManager;
