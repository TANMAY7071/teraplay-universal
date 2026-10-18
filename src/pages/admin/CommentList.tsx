import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  MessageSquare, 
  Trash2, 
  Search, 
  ExternalLink, 
  Tv, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  ThumbsUp, 
  RefreshCw,
  Film,
  UserCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface AdminCommentItem {
  id: number;
  user_id: string;
  username?: string;
  avatar_url?: string;
  cultivation_rank?: string;
  episode_id: number;
  content: string;
  is_spoiler: boolean;
  is_danmaku: boolean;
  timestamp_seconds?: number | null;
  danmaku_color?: string;
  danmaku_position?: string;
  likes_count: number;
  created_at: string;
  episode?: {
    id: number;
    episode_number: number;
    title: string;
    season_id?: number | null;
    anime?: {
      id: number;
      title: string;
      original_title?: string;
      slug: string;
      poster_url?: string;
    };
  } | null;
}

const CommentList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "regular" | "danmaku" | "spoiler">("all");
  const [removedDemoIds, setRemovedDemoIds] = useState<number[]>([]);

  // Query real comments joined with episodes and anime from Supabase
  const { data: realComments = [], isLoading, isRefetching, refetch } = useQuery<AdminCommentItem[]>({
    queryKey: ['admin-comments-list'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            episode:episodes(
              id,
              episode_number,
              title,
              season_id,
              anime:anime(
                id,
                title,
                original_title,
                slug,
                poster_url
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error || !data) {
          console.warn("[CommentList] Supabase comments query error:", error);
          return [];
        }
        return data as AdminCommentItem[];
      } catch (err) {
        console.warn("[CommentList] Query exception:", err);
        return [];
      }
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment deleted from database");
      queryClient.invalidateQueries({ queryKey: ['admin-comments-list'] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete comment")
  });

  const isDemo = realComments.length === 0;

  // Realistic mock data linking to active database Donghua when table is empty
  const demoComments: AdminCommentItem[] = [
    {
      id: 1001,
      user_id: "demo-u1",
      username: "XiaoYan_Soul",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      cultivation_rank: "Dou Di Master",
      content: "This fight choreography is peak Chinese 3D animation! The Heavenly Flame blast had me on the edge of my seat.",
      is_spoiler: false,
      is_danmaku: false,
      likes_count: 48,
      created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      episode_id: 2,
      episode: {
        id: 2,
        episode_number: 59,
        title: "Twin Martial Souls Episode 59",
        season_id: 1,
        anime: {
          id: 208,
          title: "Twin Martial Souls",
          original_title: "双生武魂",
          slug: "twin-martial-souls",
          poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx166422-ZYIuplGjlwbk.jpg"
        }
      }
    },
    {
      id: 1002,
      user_id: "demo-u2",
      username: "MonkeyKing99",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      cultivation_rank: "Heavenly General",
      content: "BRO DON'T GO INTO THE TEMPLE YET! Huge trap waiting inside the inner courtyard!",
      is_spoiler: true,
      is_danmaku: true,
      timestamp_seconds: 482,
      danmaku_color: "#ef4444",
      danmaku_position: "scroll",
      likes_count: 19,
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      episode_id: 1216,
      episode: {
        id: 1216,
        episode_number: 12,
        title: "WUKONG EPISODE 12 TAMAT SUBTITLE IDONESIA",
        season_id: 1,
        anime: {
          id: 226,
          title: "WUKONG",
          original_title: "悟空传",
          slug: "wukong",
          poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx137681-JAAyM4sjezdo.png"
        }
      }
    },
    {
      id: 1003,
      user_id: "demo-u3",
      username: "SwordDao_Immortal",
      avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      cultivation_rank: "Nascent Soul",
      content: "Wait, the novel had 2 extra elders appearing here, did the studio compress their storyline?",
      is_spoiler: true,
      is_danmaku: false,
      likes_count: 7,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      episode_id: 3,
      episode: {
        id: 3,
        episode_number: 58,
        title: "Twin Martial Souls Episode 58",
        season_id: 1,
        anime: {
          id: 208,
          title: "Twin Martial Souls",
          original_title: "双生武魂",
          slug: "twin-martial-souls",
          poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx166422-ZYIuplGjlwbk.jpg"
        }
      }
    }
  ];

  const commentCatalog = realComments.length > 0 
    ? realComments 
    : demoComments.filter(c => !removedDemoIds.includes(c.id));

  const handleDelete = (id: number) => {
    if (isDemo) {
      setRemovedDemoIds((prev) => [...prev, id]);
      toast.success("Demo comment removed from view");
    } else {
      deleteCommentMutation.mutate(id);
    }
  };

  // Filter by search and type
  const filteredComments = commentCatalog.filter((c) => {
    const animeTitle = c.episode?.anime?.title || "";
    const animeOriginal = c.episode?.anime?.original_title || "";
    const epNum = c.episode?.episode_number ? `ep ${c.episode.episode_number}` : "";
    const author = c.username || "";
    const content = c.content || "";

    const matchesSearch = 
      animeTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animeOriginal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === "danmaku") return c.is_danmaku;
    if (typeFilter === "spoiler") return c.is_spoiler;
    if (typeFilter === "regular") return !c.is_danmaku && !c.is_spoiler;
    return true;
  });

  const danmakuCount = commentCatalog.filter(c => c.is_danmaku).length;
  const spoilerCount = commentCatalog.filter(c => c.is_spoiler).length;

  const formatVideoTimestamp = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getWatchUrl = (c: AdminCommentItem) => {
    const slug = c.episode?.anime?.slug;
    const epNum = c.episode?.episode_number;
    if (slug && epNum) {
      return `/watch/${slug}/${epNum}`;
    }
    if (slug) {
      return `/watch/${slug}`;
    }
    return `/watch/${c.episode_id}`;
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" />
              Comment Moderation
            </h1>
            {isDemo && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                Preview Mode (0 DB comments)
              </Badge>
            )}
          </div>
          <p className="text-zinc-400 text-sm mt-1.5">
            Monitor community discussions, Danmaku bullet chats, and jump directly to the exact Donghua episode in playback.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 self-start md:self-auto gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* METRIC HIGHLIGHT CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#12121e] border border-white/5 flex flex-col">
          <span className="text-xs text-zinc-400 font-medium">Total Comments</span>
          <span className="text-2xl font-black text-white mt-1">{commentCatalog.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12121e] border border-white/5 flex flex-col">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Danmaku Bullets
          </span>
          <span className="text-2xl font-black text-cyan-400 mt-1">{danmakuCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12121e] border border-white/5 flex flex-col">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Spoilers Flagged
          </span>
          <span className="text-2xl font-black text-amber-400 mt-1">{spoilerCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12121e] border border-white/5 flex flex-col">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-primary" /> Active In DB
          </span>
          <span className="text-2xl font-black text-primary mt-1">{realComments.length}</span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="bg-[#11111a] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* TOOLBAR */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-black/20">
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              type="search"
              placeholder="Filter by Donghua, Episode, User, or Content..."
              className="w-full pl-9 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 h-10 rounded-xl focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Button
              variant={typeFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter("all")}
              className={`rounded-lg text-xs h-8 px-3 font-semibold ${
                typeFilter === "all" ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-white"
              }`}
            >
              All ({commentCatalog.length})
            </Button>
            <Button
              variant={typeFilter === "regular" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter("regular")}
              className={`rounded-lg text-xs h-8 px-3 font-semibold ${
                typeFilter === "regular" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Standard
            </Button>
            <Button
              variant={typeFilter === "danmaku" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter("danmaku")}
              className={`rounded-lg text-xs h-8 px-3 font-semibold ${
                typeFilter === "danmaku" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-zinc-400 hover:text-cyan-400"
              }`}
            >
              ⚡ Danmaku ({danmakuCount})
            </Button>
            <Button
              variant={typeFilter === "spoiler" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter("spoiler")}
              className={`rounded-lg text-xs h-8 px-3 font-semibold ${
                typeFilter === "spoiler" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400 hover:text-amber-400"
              }`}
            >
              ⚠️ Spoilers ({spoilerCount})
            </Button>
          </div>
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-zinc-400 uppercase tracking-wider bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Donghua & Episode</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Comment & Type</th>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <MessageSquare className="h-8 w-8 text-zinc-600" />
                      <p className="text-sm font-medium">No comments matched your filter criteria.</p>
                      {searchTerm && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setSearchTerm(""); setTypeFilter("all"); }}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          Clear search and filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredComments.map((c) => {
                  const watchUrl = getWatchUrl(c);
                  const anime = c.episode?.anime;
                  const epNum = c.episode?.episode_number;

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* DONGHUA & EPISODE */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5 max-w-xs">
                          {anime?.poster_url ? (
                            <img
                              src={anime.poster_url}
                              alt={anime.title}
                              className="w-11 h-16 object-cover rounded-lg border border-white/10 shrink-0 shadow-md group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-11 h-16 bg-white/5 rounded-lg border border-white/10 shrink-0 flex items-center justify-center">
                              <Tv className="h-5 w-5 text-zinc-600" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <a 
                              href={watchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-white text-sm hover:text-primary transition-colors line-clamp-1 block"
                              title={anime?.title || "Unknown Donghua"}
                            >
                              {anime?.title || "Donghua Series"}
                            </a>
                            {anime?.original_title && (
                              <p className="text-[11px] text-zinc-500 truncate" title={anime.original_title}>
                                {anime.original_title}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-primary/40 text-primary bg-primary/10">
                                {epNum ? `Ep #${epNum}` : `Ep ID #${c.episode_id}`}
                              </Badge>
                              {c.episode?.season_id && (
                                <span className="text-[10px] text-zinc-400">
                                  Season {c.episode.season_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* USER */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 border border-white/10">
                            <AvatarImage src={c.avatar_url} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                              {(c.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-xs truncate max-w-[120px]">
                              {c.username || 'Cultivator'}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate">
                              {c.cultivation_rank || 'Mortal'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* COMMENT CONTENT & TAGS */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="space-y-1.5">
                          <p className="text-zinc-200 text-xs leading-relaxed break-words">
                            {c.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {c.is_danmaku && (
                              <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] px-1.5 py-0 font-medium">
                                ⚡ Danmaku {formatVideoTimestamp(c.timestamp_seconds) ? `@ ${formatVideoTimestamp(c.timestamp_seconds)}` : ''}
                              </Badge>
                            )}
                            {c.is_spoiler && (
                              <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] px-1.5 py-0 font-medium">
                                ⚠️ Spoiler
                              </Badge>
                            )}
                            {c.likes_count > 0 && (
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1 ml-1">
                                <ThumbsUp className="h-2.5 w-2.5 text-zinc-400" />
                                {c.likes_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* TIMESTAMP */}
                      <td className="px-6 py-4 text-xs text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Direct Jump to Watch Page */}
                          <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="bg-white/5 hover:bg-primary hover:text-primary-foreground border border-white/10 text-xs h-8 px-3 font-semibold transition-all group-hover:border-primary/50"
                          >
                            <a
                              href={watchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5"
                            >
                              <span>Watch Ep</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            onClick={() => handleDelete(c.id)}
                            title="Delete Comment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE / TABLET CARDS VIEW */}
        <div className="block lg:hidden divide-y divide-white/5">
          {filteredComments.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              No comments match your filter.
            </div>
          ) : (
            filteredComments.map((c) => {
              const watchUrl = getWatchUrl(c);
              const anime = c.episode?.anime;
              const epNum = c.episode?.episode_number;

              return (
                <div key={c.id} className="p-4 sm:p-5 space-y-3.5 hover:bg-white/[0.02]">
                  {/* Donghua Header Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {anime?.poster_url ? (
                        <img
                          src={anime.poster_url}
                          alt={anime.title}
                          className="w-10 h-14 object-cover rounded-md border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-white/5 rounded-md border border-white/10 shrink-0 flex items-center justify-center">
                          <Tv className="h-4 w-4 text-zinc-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <a
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-white text-xs hover:text-primary transition-colors block truncate"
                        >
                          {anime?.title || "Donghua Series"}
                        </a>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-primary/40 text-primary bg-primary/10">
                            {epNum ? `Ep #${epNum}` : `Ep ID #${c.episode_id}`}
                          </Badge>
                          {c.is_danmaku && (
                            <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] px-1.5 py-0">
                              ⚡ Danmaku
                            </Badge>
                          )}
                          {c.is_spoiler && (
                            <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] px-1.5 py-0">
                              ⚠️ Spoiler
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-full shrink-0"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Comment Body */}
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2">
                    <p className="text-xs text-zinc-200 leading-relaxed break-words">
                      {c.content}
                    </p>
                    {c.is_danmaku && formatVideoTimestamp(c.timestamp_seconds) && (
                      <span className="text-[10px] text-cyan-400 font-mono block">
                        Playback mark: {formatVideoTimestamp(c.timestamp_seconds)}
                      </span>
                    )}
                  </div>

                  {/* Commenter & Jump Button Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-white/10">
                        <AvatarImage src={c.avatar_url} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                          {(c.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-zinc-300">{c.username || 'Cultivator'}</span>
                      <span className="text-[10px] text-zinc-500">• {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>

                    <Button
                      asChild
                      size="sm"
                      className="bg-primary/90 hover:bg-primary text-primary-foreground font-semibold text-xs h-8 px-3 rounded-lg shadow-sm"
                    >
                      <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        <span>Jump to Ep</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentList;
