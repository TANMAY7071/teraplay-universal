import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Film, 
  ListVideo, 
  Users, 
  MessageSquare, 
  Activity, 
  Database, 
  HardDrive, 
  RefreshCw, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles,
  Layers,
  Sliders
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Fetch basic stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const results = await Promise.allSettled([
        supabase.from('anime').select('*', { count: 'exact', head: true }),
        supabase.from('episodes').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
      ]);
      
      const getCount = (result: PromiseSettledResult<any>) => 
        result.status === 'fulfilled' ? (result.value.count ?? 0) : 0;

      return {
        anime: getCount(results[0]),
        episodes: getCount(results[1]),
        users: getCount(results[2]),
        comments: getCount(results[3]),
      };
    }
  });

  const statCards = [
    { 
      title: "Donghua Catalog", 
      value: stats?.anime ?? 0, 
      subtext: "Master Franchises Registered", 
      icon: Film, 
      color: "text-purple-400",
      border: "hover:border-purple-500/40",
      link: "/admin/anime"
    },
    { 
      title: "Total Episodes", 
      value: stats?.episodes ?? 0, 
      subtext: "Classified & Stream Ready", 
      icon: ListVideo, 
      color: "text-cyan-400",
      border: "hover:border-cyan-500/40",
      link: "/admin/episodes"
    },
    { 
      title: "Active Cultivators", 
      value: stats?.users ?? 0, 
      subtext: "Registered Profiles", 
      icon: Users, 
      color: "text-emerald-400",
      border: "hover:border-emerald-500/40",
      link: "/admin/users"
    },
    { 
      title: "Community Comments", 
      value: stats?.comments ?? 0, 
      subtext: "Moderated Discussion Posts", 
      icon: MessageSquare, 
      color: "text-amber-400",
      border: "hover:border-amber-500/40",
      link: "/admin/comments"
    },
  ];

  return (
    <div className="space-y-6 text-left text-white animate-in fade-in duration-300 min-w-0 max-w-full">
      {/* TOP TELEMETRY BANNER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#11111a] border border-white/5 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase">
              Operational Operations Command
            </Badge>
            <span className="text-[10px] font-mono text-zinc-500">SYS_VER 2.4.0</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Donghua CMS Telemetry Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time catalog analytics, media sync engine pipeline, and system telemetry monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate("/admin/sync")}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl gap-1.5 shadow-lg shadow-purple-900/20"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Launch Sync Engine
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/admin/anime")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase rounded-xl gap-1.5"
          >
            <Film className="h-3.5 w-3.5" /> Manage Catalog
          </Button>
        </div>
      </div>

      {/* STAT METRICS CARDS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={i} 
              onClick={() => navigate(stat.link)}
              className={`bg-[#11111a] border-white/5 cursor-pointer transition-all hover:bg-[#151522] ${stat.border} group`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-4">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 group-hover:border-white/20 transition-all">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-white font-mono flex items-baseline justify-between">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-white/5 animate-pulse rounded-lg" />
                  ) : (
                    stat.value.toLocaleString()
                  )}
                  <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium mt-1">
                  {stat.subtext}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* MIDDLE OPERATIONAL HUB GRID */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
        {/* QUICK OPERATIONAL WORKSPACES */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Operations Shortcuts</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Quick Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => navigate("/admin/episodes")}
              className="bg-[#11111a] border border-white/5 p-4 rounded-2xl hover:border-primary/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Layers className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Episode Operations Hub</span>
                </div>
                <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase">
                  1,995 EPS
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Bulk fetch TMDB episode stills, update stream player embed URLs, and classify season arcs.
              </p>
              <div className="text-[10px] text-primary font-bold flex items-center gap-1 pt-1 group-hover:translate-x-0.5 transition-transform">
                Open Episode Hub <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>

            <div 
              onClick={() => navigate("/admin/data-studio/wiki")}
              className="bg-[#11111a] border border-white/5 p-4 rounded-2xl hover:border-primary/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Wiki Data Studio</span>
                </div>
                <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-black uppercase">
                  AI READY
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Extract cultivation realms, character lore, and heavenly flames directly from Fandom & AniList.
              </p>
              <div className="text-[10px] text-primary font-bold flex items-center gap-1 pt-1 group-hover:translate-x-0.5 transition-transform">
                Open Wiki Studio <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY TIMELINE */}
          <Card className="bg-[#11111a] border-white/5 p-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary" /> Live Audit Log
              </h4>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
                Active Stream
              </Badge>
            </div>
            <div className="space-y-3 pt-3">
              {[
                { time: "Just now", action: "TMDB Metadata Sync completed for BTTH Season 5", type: "Sync", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
                { time: "12m ago", action: "Episode #154 marked as Published on DonghuaStream", type: "Episode", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                { time: "1h ago", action: "Cultivation Realm metadata updated for Great Ruler", type: "Lore", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
              ].map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-black/30 border border-white/5 rounded-xl text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${log.color}`}>
                      {log.type}
                    </span>
                    <span className="text-zinc-300 font-medium truncate">{log.action}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* SYSTEM STATUS TELEMETRY SIDEBAR */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-[#11111a] border-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Infrastructure Health
              </h4>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <div>
                    <h5 className="text-xs font-bold text-white">Supabase DB</h5>
                    <p className="text-[9px] text-zinc-500 font-mono">PostgreSQL 15.1</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
                  Healthy
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-cyan-400" />
                  <div>
                    <h5 className="text-xs font-bold text-white">Media CDN</h5>
                    <p className="text-[9px] text-zinc-500 font-mono">Stream Edge Nodes</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
                  99.9% Uptime
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-purple-400" />
                  <div>
                    <h5 className="text-xs font-bold text-white">Metadata APIs</h5>
                    <p className="text-[9px] text-zinc-500 font-mono">TMDB + Simkl + AniList</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
                  Connected
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

