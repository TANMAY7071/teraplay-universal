import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Search, Shield, User, Crown, MoreHorizontal, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const UserList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // Rank tiers used across the app (see Watch.tsx / CommentSection.tsx)
  const CULTIVATION_RANKS = [
    "Mortal",
    "Qi Gathering",
    "Foundation Establishment",
    "Core Formation",
    "Nascent Soul",
    "Spirit Severing",
    "Dao Ancestor",
  ];

  // NOTE: DB trigger protect_user_privileged_columns only lets admins change
  // subscription_tier/xp/level — its raise surfaces via the toast below.
  const toggleTierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      try {
        const { error } = await supabase
          .from("users")
          .update({ subscription_tier: tier })
          .eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        toast.error(err?.message || "Failed to update subscription tier");
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Subscription tier updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
  });

  const updateRankMutation = useMutation({
    mutationFn: async ({ id, rank }: { id: string; rank: string }) => {
      try {
        const { error } = await supabase
          .from("users")
          .update({ cultivation_rank: rank })
          .eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        toast.error(err?.message || "Failed to update cultivation rank");
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Cultivation rank updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
  });

  const handleToggleTier = (u: any) => {
    const currentTier = u.subscription_tier || "free";
    const nextTier = currentTier === "admin" ? "free" : "admin";
    if (authUser && u.id === authUser.id && currentTier === "admin") {
      toast.warning("You are about to remove your own admin access — you may lock yourself out of the admin panel.");
    }
    if (window.confirm(`Change ${u.username || "this user"} to "${nextTier}" tier?`)) {
      toggleTierMutation.mutate({ id: u.id, tier: nextTier });
    }
  };

  const handleSetRank = (u: any, rank: string) => {
    updateRankMutation.mutate({ id: u.id, rank });
  };

  const rowActionsDropdown = (u: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-[#11111a] border-white/10 text-white">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">Actions</DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer text-xs font-bold gap-2"
          onClick={() => handleToggleTier(u)}
        >
          {u.subscription_tier === "admin" ? (
            <>
              <User className="mr-2 h-4 w-4" /> Demote to Free
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" /> Promote to Admin
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer text-xs font-bold gap-2">
            <Sparkles className="mr-2 h-4 w-4" /> Cultivation Rank
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52 bg-[#11111a] border-white/10 text-white">
            {CULTIVATION_RANKS.map((rank) => (
              <DropdownMenuItem
                key={rank}
                className="cursor-pointer text-xs font-bold"
                onClick={() => handleSetRank(u, rank)}
              >
                {rank}
                {u.cultivation_rank === rank && <Crown className="ml-auto h-3 w-3 text-amber-400" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    }
  });

  const userCatalog = users;
  const filteredUsers = userCatalog.filter(u => 
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">User Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">View registered users, roles, and cultivation tiers.</p>
      </div>

      <div className="bg-[#11111a] border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="w-full pl-9 bg-black/20 border-white/10 text-white placeholder:text-muted-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left text-muted-foreground">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Cultivation Rank</th>
                <th className="px-6 py-4 font-medium">Role / Tier</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {u.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{u.username || 'Anonymous Cultivator'}</div>
                      <div className="text-xs text-muted-foreground">{u.email || u.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-amber-400">
                    {u.cultivation_rank || 'Qi Condensation'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={u.subscription_tier === 'admin' ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' : 'border-primary/50 text-primary bg-primary/10'}>
                      {u.subscription_tier === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                      {u.subscription_tier || 'free'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(u.created_at || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {rowActionsDropdown(u)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List View */}
        <div className="block md:hidden divide-y divide-white/5">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs italic">
              No users found.
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {u.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 text-left">
                    <span className="font-extrabold text-xs text-white block truncate">{u.username || 'Anonymous Cultivator'}</span>
                    <span className="text-[10px] text-zinc-500 block truncate leading-none mt-0.5">{u.email || u.id}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span className="text-[9px] text-amber-400 font-bold block">{u.cultivation_rank || 'Qi Condensation'}</span>
                  <Badge variant="outline" className={u.subscription_tier === 'admin' ? 'border-purple-500/50 text-purple-400 bg-purple-500/10 text-[8px] py-0 px-1' : 'border-primary/50 text-primary bg-primary/10 text-[8px] py-0 px-1'}>
                    {u.subscription_tier || 'free'}
                  </Badge>
                  <div className="flex justify-end">
                    {rowActionsDropdown(u)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserList;
