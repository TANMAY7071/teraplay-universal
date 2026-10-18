import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  FileSpreadsheet, 
  Sparkles,
  Keyboard
} from "lucide-react";
import { toast } from "sonner";

interface EpisodeRow {
  episode_number: number;
  title: string;
  chinese_title: string;
  thumbnail_url: string;
  servers: { server_name: string; video_url: string }[];
  release_date: string;
}

const BulkEpisodeUpload = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedAnimeId, setSelectedAnimeId] = useState("");
  const [seasonName, setSeasonName] = useState("Season 1");
  const [thumbnailPattern, setThumbnailPattern] = useState("");
  const [server1Name, setServer1Name] = useState("Vidstreaming");
  const [server2Name, setServer2Name] = useState("My Server");
  
  const [rows, setRows] = useState<EpisodeRow[]>([
    {
      episode_number: 1,
      title: "",
      chinese_title: "",
      thumbnail_url: "",
      servers: [
        { server_name: "Vidstreaming", video_url: "" },
        { server_name: "My Server", video_url: "" }
      ],
      release_date: new Date().toISOString().split('T')[0]
    }
  ]);

  // Fetch all anime for dropdown
  const { data: animes, isLoading: isLoadingAnimes } = useQuery({
    queryKey: ['admin-anime-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    }
  });

  // Hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter -> Add Row
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleAddRow();
      }
      // Ctrl + D -> Duplicate Last Row
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleDuplicateRow(rows.length - 1);
      }
      // Ctrl + S -> Save All
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, selectedAnimeId, seasonName]);

  const handleAddRow = () => {
    setRows(prev => {
      const lastRow = prev[prev.length - 1];
      const nextNum = lastRow ? lastRow.episode_number + 1 : 1;
      
      let nextThumb = "";
      if (thumbnailPattern) {
        nextThumb = thumbnailPattern.replace("{num}", nextNum.toString().padStart(2, '0'));
      }

      return [
        ...prev,
        {
          episode_number: nextNum,
          title: "",
          chinese_title: "",
          thumbnail_url: nextThumb,
          servers: [
            { server_name: server1Name, video_url: "" },
            { server_name: server2Name, video_url: "" }
          ],
          release_date: new Date().toISOString().split('T')[0]
        }
      ];
    });
  };

  const handleDuplicateRow = (index: number) => {
    if (index < 0 || index >= rows.length) return;
    setRows(prev => {
      const target = prev[index];
      const nextNum = target.episode_number + 1;
      
      let nextThumb = target.thumbnail_url;
      // If thumbnail has a number at the end, attempt to increment it
      if (nextThumb) {
        nextThumb = nextThumb.replace(/(\d+)(\.\w+)/, (match, numStr, ext) => {
          const num = parseInt(numStr, 10) + 1;
          return num.toString().padStart(numStr.length, '0') + ext;
        });
      }

      return [
        ...prev,
        {
          ...target,
          episode_number: nextNum,
          thumbnail_url: nextThumb,
          // deep copy servers
          servers: target.servers.map(s => ({ ...s, video_url: "" }))
        }
      ];
    });
    toast.info(`Duplicated Row as Episode ${rows[index].episode_number + 1}`);
  };

  const handleRowChange = (index: number, field: keyof EpisodeRow, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleServerUrlChange = (rowIndex: number, serverIndex: number, url: string) => {
    setRows(prev => {
      const updated = [...prev];
      const updatedServers = [...updated[rowIndex].servers];
      updatedServers[serverIndex] = { ...updatedServers[serverIndex], video_url: url };
      updated[rowIndex] = { ...updated[rowIndex], servers: updatedServers };
      return updated;
    });
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      toast.warning("Must keep at least one row");
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Auto Generate Thumbnails
  const applyThumbnailPattern = () => {
    if (!thumbnailPattern) {
      toast.error("Please enter a pattern first, e.g. https://domain.com/thumbs/ep-{num}.jpg");
      return;
    }
    setRows(prev => prev.map(row => ({
      ...row,
      thumbnail_url: thumbnailPattern.replace("{num}", row.episode_number.toString().padStart(2, '0'))
    })));
    toast.success("Thumbnail pattern applied to all rows!");
  };

  // CSV Parsing
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        
        // Simple CSV parser
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          toast.error("CSV file is empty or missing headers");
          return;
        }

        const newRows: EpisodeRow[] = [];
        // Header line: Episode, Title, ChineseTitle, Thumbnail, Embed1, Embed2, Date
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.replace(/(^"|"$)/g, "").trim());
          if (cols.length < 2) continue;
          
          const epNum = parseFloat(cols[0]) || i;
          newRows.push({
            episode_number: epNum,
            title: cols[1] || "",
            chinese_title: cols[2] || "",
            thumbnail_url: cols[3] || "",
            servers: [
              { server_name: server1Name, video_url: cols[4] || "" },
              { server_name: server2Name, video_url: cols[5] || "" }
            ],
            release_date: cols[6] || new Date().toISOString().split('T')[0]
          });
        }

        if (newRows.length > 0) {
          setRows(newRows);
          toast.success(`Successfully imported ${newRows.length} episodes from CSV!`);
        }
      };
      reader.readAsText(file);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAnimeId) throw new Error("Please select an Anime");
      
      const animeIdInt = parseInt(selectedAnimeId, 10);
      
      // Batch save
      for (const row of rows) {
        // 1. Insert Episode
        const { data: epData, error: epError } = await supabase
          .from('episodes')
          .insert([{
            anime_id: animeIdInt,
            episode_number: row.episode_number,
            title: row.title,
            chinese_title: row.chinese_title,
            thumbnail_url: row.thumbnail_url,
            season_name: seasonName,
            status: 'Published'
          }])
          .select('id')
          .single();

        if (epError) throw epError;
        
        // 2. Insert Servers
        if (epData) {
          const activeServers = row.servers.filter(s => s.video_url);
          if (activeServers.length > 0) {
            const serverPayloads = activeServers.map(s => ({
              episode_id: epData.id,
              server_name: s.server_name,
              video_url: s.video_url
            }));
            const { error: srvError } = await supabase
              .from('episode_servers')
              .insert(serverPayloads);
            if (srvError) throw srvError;
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(`Successfully saved ${rows.length} episodes!`);
      queryClient.invalidateQueries({ queryKey: ['admin-episode-list'] });
      navigate('/admin/episodes');
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save episodes");
    }
  });

  const handleSaveAll = () => {
    saveMutation.mutate();
  };

  if (isLoadingAnimes) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading setup...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[95vw] mx-auto text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/episodes')} className="rounded-full">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Bulk Episode Spreadsheet <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-sm text-muted-foreground">Upload and configure dozens of episodes simultaneously.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* CSV Import */}
          <label className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs bg-white/5 border border-white/10 text-muted-foreground hover:text-white cursor-pointer hover:bg-white/10 transition-colors">
            <FileSpreadsheet className="h-4 w-4 text-green-500" />
            <span>Import CSV</span>
            <input type="file" className="hidden" accept=".csv" onChange={handleCSVImport} />
          </label>

          <Button 
            onClick={handleSaveAll}
            disabled={saveMutation.isPending || !selectedAnimeId}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? `Saving ${rows.length}...` : `Save All (${rows.length})`}
          </Button>
        </div>
      </div>

      {/* Global Config Settings */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-[#11111a] border border-white/5 rounded-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Select Anime *</label>
          <select 
            value={selectedAnimeId}
            onChange={(e) => setSelectedAnimeId(e.target.value)}
            className="w-full h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="" disabled>-- Select Anime --</option>
            {animes?.map(anime => (
              <option key={anime.id} value={anime.id}>{anime.title}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Season / Part *</label>
          <Input 
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder="e.g. Season 2, Specials"
            className="h-9 text-xs bg-black/40 border-white/10"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
            <span>Thumbnail Pattern Generator</span>
            <button onClick={applyThumbnailPattern} className="text-[10px] text-primary lowercase hover:underline font-normal">Apply to all</button>
          </label>
          <div className="flex gap-2">
            <Input 
              value={thumbnailPattern}
              onChange={(e) => setThumbnailPattern(e.target.value)}
              placeholder="e.g. https://domain.com/thumbs/ep-{num}.jpg"
              className="h-9 text-xs bg-black/40 border-white/10 flex-1"
            />
          </div>
        </div>
      </div>

      {/* Main Spreadsheet Table */}
      <div className="bg-[#11111a] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-muted-foreground border-collapse">
            <thead>
              <tr className="bg-white/5 text-muted-foreground font-black uppercase text-[10px] border-b border-white/5">
                <th className="px-4 py-3.5 w-16">Ep #</th>
                <th className="px-4 py-3.5 min-w-[150px]">Episode Title</th>
                <th className="px-4 py-3.5 min-w-[150px]">Chinese Title</th>
                <th className="px-4 py-3.5 min-w-[200px]">Thumbnail URL</th>
                <th className="px-4 py-3.5 min-w-[200px]">Embed (Server 1)</th>
                <th className="px-4 py-3.5 min-w-[200px]">Embed (Server 2)</th>
                <th className="px-4 py-3.5 w-32">Release Date</th>
                <th className="px-4 py-3.5 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-3 py-2">
                    <Input 
                      type="number"
                      value={row.episode_number}
                      onChange={(e) => handleRowChange(index, 'episode_number', parseFloat(e.target.value) || 0)}
                      className="h-8 text-center bg-black/20 border-white/5 text-white font-bold"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={row.title}
                      onChange={(e) => handleRowChange(index, 'title', e.target.value)}
                      placeholder="Ep Title"
                      className="h-8 bg-black/20 border-white/5 text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={row.chinese_title}
                      onChange={(e) => handleRowChange(index, 'chinese_title', e.target.value)}
                      placeholder="中文标题"
                      className="h-8 bg-black/20 border-white/5 text-white font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={row.thumbnail_url}
                      onChange={(e) => handleRowChange(index, 'thumbnail_url', e.target.value)}
                      placeholder="https://..."
                      className="h-8 bg-black/20 border-white/5 text-white text-[10px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={row.servers[0]?.video_url || ""}
                      onChange={(e) => handleServerUrlChange(index, 0, e.target.value)}
                      placeholder="Embed URL 1"
                      className="h-8 bg-black/20 border-white/5 text-white text-[10px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      value={row.servers[1]?.video_url || ""}
                      onChange={(e) => handleServerUrlChange(index, 1, e.target.value)}
                      placeholder="Embed URL 2"
                      className="h-8 bg-black/20 border-white/5 text-white text-[10px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input 
                      type="date"
                      value={row.release_date}
                      onChange={(e) => handleRowChange(index, 'release_date', e.target.value)}
                      className="h-8 bg-black/20 border-white/5 text-white text-[10px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Duplicate Row (Ctrl+D)"
                        className="h-7 w-7 text-muted-foreground hover:text-white"
                        onClick={() => handleDuplicateRow(index)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleRemoveRow(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer actions inside table card */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Keyboard className="h-3.5 w-3.5 text-primary" /> Shortcuts:</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono">Ctrl + Enter</kbd> Add Row</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono">Ctrl + D</kbd> Duplicate Row</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono">Ctrl + S</kbd> Save All</span>
          </div>
          <Button onClick={handleAddRow} variant="outline" size="sm" className="h-8 border-white/10 hover:bg-white/5 text-white">
            <Plus className="h-4. w-4 mr-1.5" /> Add Row
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkEpisodeUpload;
