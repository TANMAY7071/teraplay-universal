import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const GenreList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [newGenreName, setNewGenreName] = useState("");
  const [removedDemoIds, setRemovedDemoIds] = useState<number[]>([]);

  const { data: genres, isLoading } = useQuery({
    queryKey: ['admin-genres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const addGenreMutation = useMutation({
    mutationFn: async () => {
      if (!newGenreName) throw new Error("Genre name is required");
      
      const slug = newGenreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      
      const { error } = await supabase
        .from('genres')
        .insert([{ name: newGenreName, slug }]);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Genre added successfully");
      setNewGenreName("");
      queryClient.invalidateQueries({ queryKey: ['admin-genres'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add genre");
    }
  });

  const deleteGenreMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('genres')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Genre deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-genres'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete genre");
    }
  });

  const isDemo = !genres || genres.length === 0;

  const demoGenres = [
    { id: 1, name: "Action", slug: "action" },
    { id: 2, name: "Cultivation", slug: "cultivation" },
    { id: 3, name: "Fantasy", slug: "fantasy" },
    { id: 4, name: "Martial Arts", slug: "martial-arts" },
    { id: 5, name: "Romance", slug: "romance" },
    { id: 6, name: "Reincarnation", slug: "reincarnation" },
    { id: 7, name: "Adventure", slug: "adventure" },
    { id: 8, name: "Supernatural", slug: "supernatural" },
  ];

  const displayGenres = (genres && genres.length > 0) 
    ? genres 
    : demoGenres.filter(g => !removedDemoIds.includes(g.id));

  const filteredGenres = displayGenres.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Genres Management</h1>
        <p className="text-muted-foreground mt-1">Manage anime categories and genres.</p>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Left Side: List */}
        <div className="bg-[#11111a] border border-white/5 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search genres..."
                className="w-full pl-9 bg-black/20 border-white/10 text-white placeholder:text-muted-foreground"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-medium">Genre Name</th>
                  <th className="px-6 py-4 font-medium">Slug</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex justify-center mb-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                      Loading genres...
                    </td>
                  </tr>
                ) : filteredGenres?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                      No genres found.
                    </td>
                  </tr>
                ) : (
                  filteredGenres?.map((genre) => (
                    <tr key={genre.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 font-medium text-white">{genre.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{genre.slug}</td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => {
                            if (window.confirm(`Delete genre "${genre.name}"?`)) {
                              if (isDemo) {
                                setRemovedDemoIds((prev) => [...prev, genre.id]);
                                toast.success("Genre deleted successfully");
                              } else {
                                deleteGenreMutation.mutate(genre.id);
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Add Genre */}
        <div className="bg-[#11111a] border border-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Add New Genre</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Name</label>
              <Input 
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                placeholder="e.g. Action, Isekai"
                className="bg-black/20 border-white/10 text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addGenreMutation.mutate();
                }}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Slug will be auto-generated.</p>
            </div>
            <Button 
              onClick={() => addGenreMutation.mutate()}
              disabled={addGenreMutation.isPending || !newGenreName}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              {addGenreMutation.isPending ? 'Adding...' : (
                <><Plus className="h-4 w-4 mr-2" /> Add Genre</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenreList;
