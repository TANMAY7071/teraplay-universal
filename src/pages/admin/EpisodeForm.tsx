import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const episodeSchema = z.object({
  anime_id: z.string().min(1, "Anime is required"),
  episode_number: z.number().min(0, "Episode number must be 0 or greater"),
  title: z.string().optional(),
  thumbnail_url: z.string().optional(),
  is_published: z.boolean().default(true),
});

type EpisodeFormValues = z.infer<typeof episodeSchema>;

const EpisodeForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<EpisodeFormValues>({
    anime_id: "",
    episode_number: 1,
    title: "",
    thumbnail_url: "",
    is_published: true,
  });

  // Fetch all anime for the dropdown
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

  // Fetch episode data if in edit mode
  const { isLoading: isFetching } = useQuery({
    queryKey: ['admin-episode', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setFormData({
          anime_id: String(data.anime_id),
          episode_number: data.episode_number,
          title: data.title || "",
          thumbnail_url: data.thumbnail_url || "",
          is_published: data.is_published !== false,
        });
      }
      return data;
    },
    enabled: isEditMode
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseFloat(value) || 0 : value 
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: EpisodeFormValues) => {
      // Validate
      episodeSchema.parse(data);
      
      const payload = {
        ...data,
        anime_id: parseInt(data.anime_id, 10),
      };
      
      if (isEditMode) {
        const { error } = await supabase
          .from('episodes')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('episodes')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Episode ${isEditMode ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-episode-list'] });
      // Redirect to the servers page if new, or back to list if edit
      if (!isEditMode) {
        // Need to wait slightly for query invalidation or just route to list
        navigate('/admin/episodes'); 
      } else {
        navigate('/admin/episodes');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save episode");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isFetching || isLoadingAnimes) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading data...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/episodes')} className="rounded-full">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isEditMode ? 'Edit Episode' : 'Add New Episode'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? 'Update episode details' : 'Create a new episode entry.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#11111a] border border-white/5 rounded-xl p-6 space-y-6">
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Select Anime *</label>
            <select 
              name="anime_id"
              value={formData.anime_id}
              onChange={handleInputChange}
              required
              className="w-full h-10 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>-- Select Anime --</option>
              {animes?.map(anime => (
                <option key={anime.id} value={anime.id}>{anime.title}</option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Episode Number *</label>
              <Input 
                type="number"
                step="0.1"
                min="0"
                name="episode_number"
                value={formData.episode_number}
                onChange={handleInputChange}
                required
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Episode Title (Optional)</label>
              <Input 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="bg-black/20 border-white/10 text-white"
                placeholder="e.g. The Boy Who Ascended"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-sm font-medium text-white">Thumbnail URL (Optional)</label>
               <Input 
                 name="thumbnail_url"
                 value={formData.thumbnail_url}
                 onChange={handleInputChange}
                 className="bg-black/20 border-white/10 text-white"
                 placeholder="https://..."
               />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Publication Status</label>
              <select
                name="is_published"
                value={formData.is_published ? "true" : "false"}
                onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.value === "true" }))}
                className="w-full h-10 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="true" className="bg-zinc-900 text-white">Published (Visible on site)</option>
                <option value="false" className="bg-zinc-900 text-amber-400">Draft (Hidden from public)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-white/5">
          <Button 
            type="button" 
            variant="ghost" 
            className="mr-4 text-muted-foreground hover:text-white"
            onClick={() => navigate('/admin/episodes')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
          >
            {saveMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Saving...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isEditMode ? 'Update Episode' : 'Save Episode'}
              </div>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default EpisodeForm;
