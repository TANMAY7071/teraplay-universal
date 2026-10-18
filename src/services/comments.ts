import { supabase } from "@/lib/supabase";
import { memoryCache } from "@/lib/cache";

export interface Comment {
  id: number;
  user_id: string;
  episode_id: number;
  parent_id?: number | null;
  content: string;
  is_spoiler: boolean;
  likes_count: number;
  timestamp_seconds?: number | null;
  is_danmaku: boolean;
  danmaku_color: string;
  danmaku_position: string;
  created_at: string;
  user_profile?: {
    username: string;
    avatar_url: string;
    cultivation_rank: string;
  };
}

// Memory fallback to persist mockup comments during page refresh if Supabase is offline
const memoryComments: Record<number, Comment[]> = {};

export async function fetchComments(episodeId: number): Promise<Comment[]> {
  const cacheKey = `comments_${episodeId}`;
  const cached = memoryCache.get<Comment[]>(cacheKey);
  if (cached) return cached;

  try {
    // Author profiles come from the comments_with_profiles RPC — other
    // users' rows in public.users are no longer readable under RLS.
    const { data, error } = await supabase
      .rpc("comments_with_profiles", { p_episode_id: episodeId });

    if (error) throw error;
    if (data) {
      // An empty array is a legitimate "no comments yet" — return it as-is
      // instead of falling through to mock data.
      const result: Comment[] = (data as any[]).map((row) => {
        const { username, avatar_url, cultivation_rank, ...comment } = row;
        return {
          ...comment,
          user_profile: {
            username: username ?? "",
            avatar_url: avatar_url ?? "",
            cultivation_rank: cultivation_rank ?? "",
          },
        } as Comment;
      });
      memoryCache.set(cacheKey, result, 60_000); // 1 minute TTL
      return result;
    }
  } catch (err) {
    console.warn(`Supabase fetchComments failed for episode ID ${episodeId}, using fallback:`, err);
  }

  // Memory/Static fallback
  if (!memoryComments[episodeId]) {
    // Generate initial mockup comments
    memoryComments[episodeId] = [
      {
        id: episodeId * 1000 + 1,
        user_id: "mock-uid-1",
        episode_id: episodeId,
        content: "Xiao Yan's lotus attack was absolutely stunning in 3D! Can't wait for the next fight.",
        is_spoiler: false,
        likes_count: 24,
        is_danmaku: false,
        danmaku_color: "#ffffff",
        danmaku_position: "scroll",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        user_profile: {
          username: "BattleGod99",
          avatar_url: "",
          cultivation_rank: "Qi Condensation V",
        },
      },
      {
        id: episodeId * 1000 + 2,
        user_id: "mock-uid-2",
        episode_id: episodeId,
        content: "Warning: the novel diverges slightly here, but the animation pacing is way better!",
        is_spoiler: true,
        likes_count: 12,
        is_danmaku: false,
        danmaku_color: "#ffffff",
        danmaku_position: "scroll",
        created_at: new Date(Date.now() - 7200000).toISOString(),
        user_profile: {
          username: "SectMasterXiao",
          avatar_url: "",
          cultivation_rank: "Foundation Establishment I",
        },
      },
    ];
  }

  return memoryComments[episodeId];
}

export async function postComment(params: {
  userId: string;
  username: string;
  avatarUrl: string;
  cultivationRank: string;
  episodeId: number;
  content: string;
  parentId?: number;
  isSpoiler?: boolean;
  isDanmaku?: boolean;
  timestampSeconds?: number;
  danmakuColor?: string;
  danmakuPosition?: string;
}): Promise<Comment> {
  const {
    userId,
    username,
    avatarUrl,
    cultivationRank,
    episodeId,
    content,
    parentId = null,
    isSpoiler = false,
    isDanmaku = false,
    timestampSeconds = null,
    danmakuColor = "#ffffff",
    danmakuPosition = "scroll",
  } = params;

  memoryCache.invalidate(`comments_${episodeId}`);

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: userId,
        episode_id: episodeId,
        parent_id: parentId,
        content,
        is_spoiler: isSpoiler,
        is_danmaku: isDanmaku,
        timestamp_seconds: timestampSeconds,
        danmaku_color: danmakuColor,
        danmaku_position: danmakuPosition,
      })
      .select()
      .single();

    if (error) throw error;
    if (data) {
      return {
        ...data,
        user_profile: {
          username,
          avatar_url: avatarUrl,
          cultivation_rank: cultivationRank,
        },
      } as Comment;
    }
  } catch (err) {
    console.warn("Supabase postComment failed, appending to memory fallback:", err);
  }

  // Memory fallback
  const newComment: Comment = {
    id: Math.floor(Math.random() * 1000000),
    user_id: userId,
    episode_id: episodeId,
    parent_id: parentId,
    content,
    is_spoiler: isSpoiler,
    likes_count: 0,
    is_danmaku: isDanmaku,
    timestamp_seconds: timestampSeconds,
    danmaku_color: danmakuColor,
    danmaku_position: danmakuPosition,
    created_at: new Date().toISOString(),
    user_profile: {
      username,
      avatar_url: avatarUrl,
      cultivation_rank: cultivationRank,
    },
  };

  if (!memoryComments[episodeId]) {
    memoryComments[episodeId] = [];
  }
  memoryComments[episodeId].unshift(newComment);
  return newComment;
}

export async function likeComment(commentId: number): Promise<void> {
  try {
    const { error } = await supabase.rpc("increment_likes", { comment_id: commentId });
    if (error) {
      // Fallback: regular query update if RPC is missing
      const { data } = await supabase.from("comments").select("likes_count").eq("id", commentId).single();
      if (data) {
        await supabase
          .from("comments")
          .update({ likes_count: (data.likes_count || 0) + 1 })
          .eq("id", commentId);
      }
    }
  } catch (err) {
    console.warn("Supabase likeComment failed:", err);
  }
}
