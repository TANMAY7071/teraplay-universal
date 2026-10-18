import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EpisodeServers = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");

  // Fetch episode details
  const { data: episode, isLoading: isLoadingEpisode } = useQuery({
    queryKey: ['admin-episode', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('*, anime:anime_id(title)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch servers for this episode
  const { data: servers, isLoading: isLoadingServers } = useQuery({
    queryKey: ['admin-episode-servers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('episode_servers')
        .select('*')
        .eq('episode_id', id)
        .order('id');
      if (error) throw error;
      return data;
    }
  });

  const addServerMutation = useMutation({
    mutationFn: async () => {
      if (!newServerName || !newServerUrl) throw new Error("Please fill in both fields");
      
      const { error } = await supabase
        .from('episode_servers')
        .insert([{
          episode_id: id,
          server_name: newServerName,
          video_url: newServerUrl
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Server added successfully");
      setNewServerName("");
      setNewServerUrl("");
      queryClient.invalidateQueries({ queryKey: ['admin-episode-servers', id] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add server");
    }
  });

  const deleteServerMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const { error } = await supabase
        .from('episode_servers')
        .delete()
        .eq('id', serverId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Server deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-episode-servers', id] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete server");
    }
  });

  if (isLoadingEpisode || isLoadingServers) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading servers...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/episodes')} className="rounded-full">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Manage Video Servers
          </h1>
          <p className="text-sm text-muted-foreground">
            {episode?.anime?.title} - Episode {episode?.episode_number}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Add Server Form */}
        <div className="bg-[#11111a] border border-white/5 rounded-xl p-6 space-y-4 h-fit">
          <h2 className="text-lg font-semibold text-white">Add New Server</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Server Name</label>
              <Input 
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="e.g. Vidstreaming, Gogo server"
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Video / Iframe URL</label>
              <Input 
                value={newServerUrl}
                onChange={(e) => setNewServerUrl(e.target.value)}
                placeholder="https://..."
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
            
            <Button 
              onClick={() => addServerMutation.mutate()}
              disabled={addServerMutation.isPending || !newServerName || !newServerUrl}
              className="w-full bg-primary hover:bg-primary/90 text-white mt-2"
            >
              {addServerMutation.isPending ? 'Adding...' : (
                <><Plus className="h-4 w-4 mr-2" /> Add Server</>
              )}
            </Button>
          </div>
        </div>

        {/* Existing Servers List */}
        <div className="bg-[#11111a] border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Available Servers</h2>
          
          {servers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-black/10 rounded-lg border border-white/5 border-dashed">
              No servers added yet. Add one to make this episode watchable.
            </div>
          ) : (
            <div className="space-y-3">
              {servers?.map((server) => (
                <div key={server.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between group">
                  <div className="overflow-hidden">
                    <div className="font-medium text-white">{server.server_name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{server.video_url}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (window.confirm('Delete this server?')) {
                        deleteServerMutation.mutate(server.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodeServers;
