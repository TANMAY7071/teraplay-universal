import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, Activity, Clock, Server, CloudDownload, Film, ListVideo } from "lucide-react";
import { toast } from "sonner";
import { searchAniList, searchDonghuaApi, searchDonghubApi } from "@/services/syncService";

const SyncDashboard = () => {
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Fetch API Health Status
  const { data: apiHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['admin-api-health'],
    queryFn: async () => {
      const health = { anilist: false, donghua: false, donghub: false };
      
      try {
        await searchAniList("test");
        health.anilist = true;
      } catch (e) {}

      try {
        await searchDonghuaApi("test");
        health.donghua = true;
      } catch (e) {}

      try {
        await searchDonghubApi("test");
        health.donghub = true;
      } catch (e) {}

      return health;
    }
  });

  // Fetch Sync Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-sync-stats'],
    queryFn: async () => {
      const [animeRes, epRes] = await Promise.all([
        supabase.from('anime').select('id, anilist_id, donghua_api_slug, donghub_api_slug'),
        supabase.from('episodes').select('id, streams, downloads')
      ]);

      const animeList = animeRes.data || [];
      const epList = epRes.data || [];

      return {
        totalAnime: animeList.length,
        missingAniList: animeList.filter(a => !a.anilist_id).length,
        missingDonghua: animeList.filter(a => !a.donghua_api_slug).length,
        totalEpisodes: epList.length,
        missingStreams: epList.filter(e => !e.streams || e.streams.length === 0).length
      };
    }
  });

  const triggerSync = async (type: string) => {
    setIsSyncing(type);
    toast.info(`Triggering manual ${type} sync... (Edge Function)`);
    try {
      // In a real implementation, this would trigger the Supabase Edge Function via invoke
      /*
      const { data, error } = await supabase.functions.invoke('sync-donghua', {
        body: { type, manual: true }
      });
      if (error) throw error;
      */
      
      // Simulating a long-running sync
      await new Promise(r => setTimeout(r, 2000));
      toast.success(`${type} sync completed successfully.`);
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Smart CMS Sync Engine</h1>
        <p className="text-muted-foreground mt-1">Manage API integrations and background synchronization.</p>
      </div>

      {/* API Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#11111a] border border-white/5 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <Database className="w-4 h-4" /> AniList API
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {apiHealth?.anilist ? <span className="text-green-500">Online</span> : <span className="text-red-500">Offline</span>}
            </h3>
          </div>
          <div className={`p-3 rounded-full ${apiHealth?.anilist ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#11111a] border border-white/5 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <Server className="w-4 h-4" /> Donghua API
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {apiHealth?.donghua ? <span className="text-green-500">Online</span> : <span className="text-red-500">Offline</span>}
            </h3>
          </div>
          <div className={`p-3 rounded-full ${apiHealth?.donghua ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#11111a] border border-white/5 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <CloudDownload className="w-4 h-4" /> Donghub API
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {apiHealth?.donghub ? <span className="text-green-500">Online</span> : <span className="text-red-500">Offline</span>}
            </h3>
          </div>
          <div className={`p-3 rounded-full ${apiHealth?.donghub ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing Data Stats */}
        <div className="bg-[#11111a] border border-white/5 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white">Database Integrity</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div className="text-sm">
                <p className="text-white font-medium">Missing AniList Connections</p>
                <p className="text-muted-foreground">Anime not linked to AniList ID</p>
              </div>
              <span className="text-xl font-bold text-yellow-500">{stats?.missingAniList || 0}</span>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div className="text-sm">
                <p className="text-white font-medium">Missing Episode Providers</p>
                <p className="text-muted-foreground">Anime missing Donghua API Slug</p>
              </div>
              <span className="text-xl font-bold text-yellow-500">{stats?.missingDonghua || 0}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm">
                <p className="text-white font-medium">Missing Streams</p>
                <p className="text-muted-foreground">Episodes with no stream URLs</p>
              </div>
              <span className="text-xl font-bold text-red-500">{stats?.missingStreams || 0}</span>
            </div>
          </div>
        </div>

        {/* Manual Sync Controls */}
        <div className="bg-[#11111a] border border-white/5 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Manual Synchronization
          </h2>
          <p className="text-sm text-muted-foreground">
            The Edge Functions automatically run every 6 hours. Use these to trigger a sync manually.
          </p>
          
          <div className="space-y-3">
            <Button 
              className="w-full justify-between" 
              variant="outline"
              disabled={isSyncing !== null}
              onClick={() => triggerSync('Metadata')}
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" /> Sync All Metadata (AniList)
              </span>
              {isSyncing === 'Metadata' && <RefreshCw className="h-4 w-4 animate-spin" />}
            </Button>

            <Button 
              className="w-full justify-between" 
              variant="outline"
              disabled={isSyncing !== null}
              onClick={() => triggerSync('Episodes')}
            >
              <span className="flex items-center gap-2">
                <ListVideo className="h-4 w-4" /> Sync All Episodes (Donghua API)
              </span>
              {isSyncing === 'Episodes' && <RefreshCw className="h-4 w-4 animate-spin" />}
            </Button>

            <Button 
              className="w-full justify-between" 
              variant="outline"
              disabled={isSyncing !== null}
              onClick={() => triggerSync('Streams')}
            >
              <span className="flex items-center gap-2">
                <Film className="h-4 w-4" /> Sync All Streams (Donghub API)
              </span>
              {isSyncing === 'Streams' && <RefreshCw className="h-4 w-4 animate-spin" />}
            </Button>

            <div className="pt-4 mt-2 border-t border-white/10">
              <Button 
                className="w-full justify-center bg-primary hover:bg-primary/90" 
                disabled={isSyncing !== null}
                onClick={() => triggerSync('Full Library')}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing === 'Full Library' ? 'animate-spin' : ''}`} /> 
                Run Full Integrity Sync
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncDashboard;
