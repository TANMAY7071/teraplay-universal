import React, { useState, useEffect } from "react";
import { MessageSquare, ChevronDown, Pin, AlertCircle, MessageCircle, Send, Smile, User, CornerDownRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CommentSectionProps {
  episodeId: number;
  dbComments: any[];
  postCommentMutation: any;
  isDiscussionLocked: boolean;
  knownIssueText: string;
}

interface LocalReply {
  id: string;
  parentId: string;
  username: string;
  rank: string;
  content: string;
  created_at: string;
  reactions: Record<string, number>;
  userReaction?: string;
}

interface LocalComment {
  id: string;
  episode_id: number;
  content: string;
  created_at: string;
  user_profile?: {
    username: string;
  };
  reactions: Record<string, number>;
  userReaction?: string;
  replies: LocalReply[];
}

const CULTIVATION_RANKS = [
  "Mortal",
  "Qi Gathering",
  "Foundation Establishment",
  "Core Formation",
  "Nascent Soul",
  "Spirit Severing",
  "Dao Ancestor"
];

const STICKER_LIST = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "⚔️", label: "Sword" },
  { emoji: "🐉", label: "Dragon" },
  { emoji: "💥", label: "Boom" },
  { emoji: "⚡", label: "Lightning" },
  { emoji: "👑", label: "Crown" },
  { emoji: "🧘", label: "Cultivate" },
  { emoji: "🍿", label: "Popcorn" },
  { emoji: "🏆", label: "Trophy" },
  { emoji: "😂", label: "LOL" },
  { emoji: "🤯", label: "Mindblown" },
  { emoji: "👍", label: "Like" },
  { emoji: "💖", label: "Love" },
];

export const CommentSection: React.FC<CommentSectionProps> = ({
  episodeId,
  dbComments,
  postCommentMutation,
  isDiscussionLocked,
  knownIssueText,
}) => {
  const [sortOrder, setSortOrder] = useState<"top" | "newest" | "staff">("top");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Author username state
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("donghua_commenter_name") || "Legendary Cultivator";
  });

  const [newCommentText, setNewCommentText] = useState("");
  const [isCommentInputFocused, setIsCommentInputFocused] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReplyStickers, setShowReplyStickers] = useState(false);

  // Reaction picker state
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);

  // Spoilers reveal state
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Local comments state merged with dbComments
  const [comments, setComments] = useState<LocalComment[]>([]);

  // Synchronize dbComments into local state
  useEffect(() => {
    const formattedDb: LocalComment[] = (dbComments || []).map((ep, idx) => ({
      id: String(ep.id || `db-${idx}`),
      episode_id: ep.episode_id || episodeId,
      content: ep.content || "",
      created_at: ep.created_at || new Date().toISOString(),
      user_profile: ep.user_profile || { username: ep.username || `Cultivator_${idx + 1}` },
      reactions: ep.reactions || { "🔥": 24 - idx * 3, "👍": 18 - idx * 2, "😂": 12 },
      replies: ep.replies || [],
    }));

    // Add default initial comments if DB is empty
    if (formattedDb.length === 0) {
      formattedDb.push(
        {
          id: "demo-1",
          episode_id: episodeId,
          content: "Xiao Yan's lotus attack was absolutely stunning in 3D! Can't wait for the next fight.",
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          user_profile: { username: "BattleGod99" },
          reactions: { "🔥": 34, "👍": 22, "🤯": 15 },
          replies: [
            {
              id: "reply-1-1",
              parentId: "demo-1",
              username: "FlameMaster",
              rank: "Core Formation",
              content: "Agreed! The flame particle effects were top tier animation.",
              created_at: new Date(Date.now() - 1800000).toISOString(),
              reactions: { "🔥": 12, "👍": 8 }
            }
          ]
        },
        {
          id: "demo-2",
          episode_id: episodeId,
          content: "Warning: the novel diverges slightly here, but the animation pacing is way better!",
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          user_profile: { username: "SectMasterXiao" },
          reactions: { "👍": 19, "💡": 14, "🔥": 9 },
          replies: []
        }
      );
    }

    setComments(formattedDb);
  }, [dbComments, episodeId]);

  const handleNameChange = (name: string) => {
    setUserName(name);
    localStorage.setItem("donghua_commenter_name", name);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDiscussionLocked) {
      toast.error("This episode's discussion thread has been locked by staff.");
      return;
    }
    if (!newCommentText.trim()) return;

    const author = userName.trim() || "Cultivator";

    try {
      if (postCommentMutation?.mutateAsync) {
        await postCommentMutation.mutateAsync({
          episodeId,
          content: newCommentText.trim(),
          username: author
        });
      }
    } catch (err: any) {
      console.warn("Backend comment post fallback to local state:", err);
    }

    const newComment: LocalComment = {
      id: `local-${Date.now()}`,
      episode_id: episodeId,
      content: newCommentText.trim(),
      created_at: new Date().toISOString(),
      user_profile: { username: author },
      reactions: { "🔥": 1, "👍": 1 },
      replies: []
    };

    setComments(prev => [newComment, ...prev]);
    setNewCommentText("");
    setIsCommentInputFocused(false);
    setShowStickerPicker(false);
    toast.success("Comment posted!");
  };

  const handleAddReply = (parentId: string, parentUsername: string) => {
    if (!replyText.trim()) return;

    const author = userName.trim() || "Cultivator";
    const newReply: LocalReply = {
      id: `reply-${Date.now()}`,
      parentId,
      username: author,
      rank: "Foundation Establishment",
      content: replyText.trim().startsWith(`@${parentUsername}`) ? replyText.trim() : `@${parentUsername} ${replyText.trim()}`,
      created_at: new Date().toISOString(),
      reactions: { "👍": 1 }
    };

    setComments(prev => prev.map(c => {
      if (c.id === parentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    }));

    setReplyText("");
    setReplyingToId(null);
    setShowReplyStickers(false);
    toast.success(`Replied to ${parentUsername}!`);
  };

  const toggleCommentReaction = (commentId: string, emoji: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const currentReactions = { ...c.reactions };
        const hasReacted = c.userReaction === emoji;

        if (hasReacted) {
          currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
          if (currentReactions[emoji] === 0) delete currentReactions[emoji];
          return { ...c, reactions: currentReactions, userReaction: undefined };
        } else {
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
          return { ...c, reactions: currentReactions, userReaction: emoji };
        }
      }
      return c;
    }));
  };

  const toggleReplyReaction = (parentId: string, replyId: string, emoji: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === parentId) {
        const updatedReplies = c.replies.map(r => {
          if (r.id === replyId) {
            const currentReactions = { ...r.reactions };
            const hasReacted = r.userReaction === emoji;

            if (hasReacted) {
              currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
              if (currentReactions[emoji] === 0) delete currentReactions[emoji];
              return { ...r, reactions: currentReactions, userReaction: undefined };
            } else {
              currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
              return { ...r, reactions: currentReactions, userReaction: emoji };
            }
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }
      return c;
    }));
  };

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Sort logic
  const sortedComments = [...comments].sort((a, b) => {
    if (sortOrder === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortOrder === "top") {
      const sumA = Object.values(a.reactions).reduce((acc, n) => acc + n, 0);
      const sumB = Object.values(b.reactions).reduce((acc, n) => acc + n, 0);
      return sumB - sumA;
    }
    return 0;
  });

  const totalCommentCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 2);

  return (
    <div id="discussion-section" className="space-y-4 pt-6 text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Episode Discussion ({totalCommentCount})
          </h3>
        </div>
        
        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            className="text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none"
          >
            Sort: {sortOrder} <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {isSortDropdownOpen && (
            <>
              <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsSortDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 z-30 bg-[#0c0d12] border border-white/10 rounded-lg py-1 min-w-[100px] shadow-xl text-left animate-in fade-in slide-in-from-top-1 duration-150">
                {["top", "newest", "staff"].map((opt) => (
                  <button 
                    type="button"
                    key={opt}
                    onClick={() => { setSortOrder(opt as any); setIsSortDropdownOpen(false); }}
                    className={cn("w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer", sortOrder === opt ? "text-primary bg-white/5" : "text-zinc-400 hover:text-white")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* User handle bar & Comment Composer input */}
      <form onSubmit={handleAddComment} className="flex flex-col bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <User className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Comment as:</span>
          <input
            type="text"
            value={userName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter your name / handle..."
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50 font-semibold w-48 transition-all"
          />
        </div>

        <div className="relative pt-1">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            onFocus={() => setIsCommentInputFocused(true)}
            placeholder="Share your thoughts..."
            maxLength={2000}
            className={cn(
              "w-full bg-transparent border-0 text-xs text-white placeholder-zinc-500 focus:ring-0 focus:outline-none resize-none transition-all duration-200",
              isCommentInputFocused ? "h-20" : "h-9"
            )}
          />
        </div>

        {/* Sticker / Emoji quick picker panel */}
        {showStickerPicker && (
          <div className="flex items-center gap-1.5 flex-wrap p-2 bg-black/40 border border-white/10 rounded-xl animate-in fade-in duration-150">
            {STICKER_LIST.map((stk) => (
              <button
                type="button"
                key={stk.label}
                onClick={() => {
                  setNewCommentText(prev => prev + ` ${stk.emoji} `);
                }}
                className="hover:scale-125 transition-transform p-1 text-base cursor-pointer bg-transparent border-0"
                title={stk.label}
              >
                {stk.emoji}
              </button>
            ))}
          </div>
        )}

        {isCommentInputFocused && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2 animate-in fade-in duration-200">
            <div className="flex gap-1.5">
              <button 
                type="button" 
                onClick={() => setShowStickerPicker(!showStickerPicker)}
                className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-primary border border-primary/20 flex items-center gap-1 cursor-pointer"
              >
                <Smile className="w-3 h-3" /> Emojis & Stickers
              </button>
              <button 
                type="button" 
                onClick={() => setNewCommentText(prev => prev + " ||spoiler|| ")}
                className="text-[9px] font-bold px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 cursor-pointer"
              >
                || Spoiler ||
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsCommentInputFocused(false); setShowStickerPicker(false); }}
                className="text-[9px] font-black uppercase text-zinc-400 hover:text-white px-3 py-1 bg-transparent border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isDiscussionLocked}
                className="rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black px-4 py-1.5 shadow transition-all active:scale-95 disabled:opacity-50 border-0 flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" /> Post Comment
              </button>
            </div>
          </div>
        )}
      </form>

      {/* List of comments */}
      <div className="space-y-4">
        
        {/* Pinned Episode Discussion Card */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Pin className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">📌 Episode Discussion</span>
            </div>
            <span className="text-[9px] text-zinc-500 font-bold">26 July</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[9px] text-zinc-500 font-bold block uppercase">Episode Released</span>
              <span className="text-white font-bold">26 July</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 font-bold block uppercase">Next Episode</span>
              <span className="text-white font-bold">2 August</span>
            </div>
          </div>

          {knownIssueText && (
            <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-red-300 font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-red-400 leading-none mb-0.5">Known Issue</span>
                {knownIssueText}
              </div>
            </div>
          )}

          <div className="text-[10px] text-zinc-400 leading-relaxed pt-1">
            <span className="font-extrabold text-white block mb-0.5">Rules:</span>
            Keep discussions relevant. Spoilers must be tagged with double pipelines (e.g. ||spoiler||).
          </div>
        </div>

        {/* Staff Reply */}
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-donghua-cyan/20 border border-donghua-cyan/30 flex items-center justify-center font-bold text-[9px] text-donghua-cyan shrink-0">
                SF
              </div>
              <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                🛠 Staff <Badge className="bg-donghua-cyan/10 text-donghua-cyan border border-donghua-cyan/20 text-[8px] font-black uppercase py-0 px-1.5 h-4">Uploader</Badge>
              </span>
              <span className="text-[9px] text-zinc-500">1 hour ago</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setReplyingToId("staff-1");
                setReplyText("@Staff ");
              }}
              className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-0"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Reply
            </button>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed font-bold">
            Tencent servers are currently buffering due to high traffic volume on the CDN. We have activated mirrors below the player. Please swap server mirror to Rumble or Dailymotion.
          </p>

          {/* Inline Reply Form for Staff */}
          {replyingToId === "staff-1" && (
            <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[10px] text-primary font-bold">
                <span>Replying to Staff...</span>
                <button type="button" onClick={() => setReplyingToId(null)} className="text-zinc-400 hover:text-white cursor-pointer bg-transparent border-0"><X className="w-3 h-3" /></button>
              </div>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReplyingToId(null)} className="text-[10px] font-bold text-zinc-400 px-2 py-1 cursor-pointer bg-transparent border-0">Cancel</button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (replyText.trim()) {
                      toast.success("Reply submitted to Staff!");
                      setReplyingToId(null);
                      setReplyText("");
                    }
                  }} 
                  className="text-[10px] font-bold bg-primary text-white px-3 py-1 rounded-lg cursor-pointer border-0"
                >
                  Send Reply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Comments List */}
        {sortedComments.map((comment, index) => {
          const cRank = CULTIVATION_RANKS[Math.min(index + 2, CULTIVATION_RANKS.length - 1)];
          const text = comment.content || "";
          const isSpoiler = text.includes("||") || text.includes("[spoiler]");
          const cleanContent = text.replace(/\|\|/g, "");
          const isRevealed = revealedSpoilers[comment.id];
          const authorName = comment.user_profile?.username || "Cultivator";

          return (
            <div key={comment.id} className="space-y-2 border-l-2 border-white/5 pl-4 ml-2.5 py-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-purple-950/60 border border-purple-500/30 flex items-center justify-center font-bold text-[9px] text-purple-300 shrink-0">
                  {authorName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white">{authorName}</span>
                  <span className="text-[8px] text-primary/80 font-bold block uppercase leading-none mt-0.5">{cRank}</span>
                </div>
                <span className="text-[9px] text-zinc-500 ml-auto">
                  {new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              
              {isSpoiler ? (
                <div className="space-y-1.5">
                  <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider inline-flex items-center gap-1">
                    ⚠️ Contains Spoilers
                  </span>
                  <p 
                    onClick={() => toggleSpoiler(comment.id)}
                    className={cn(
                      "text-xs leading-relaxed pr-2 cursor-pointer select-none transition-all duration-300",
                      isRevealed ? "text-zinc-300" : "bg-zinc-800/80 text-transparent blur-sm rounded px-1"
                    )}
                    title="Click to reveal spoiler"
                  >
                    {cleanContent}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-300 leading-relaxed pr-2">
                  {comment.content}
                </p>
              )}

              {/* Reaction bar & Reply button */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-0.5 border border-white/5 text-[9px] font-bold text-zinc-400 font-sans">
                  {Object.entries(comment.reactions).map(([emoji, count]) => {
                    const active = comment.userReaction === emoji;
                    return (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => toggleCommentReaction(comment.id, emoji)}
                        className={cn(
                          "hover:scale-125 transition-transform px-1 cursor-pointer bg-transparent border-0 outline-none flex items-center gap-1",
                          active && "scale-110 opacity-100 font-bold text-primary filter brightness-125"
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="text-[8px] opacity-75">{count}</span>
                      </button>
                    );
                  })}

                  {/* Add reaction emoji picker button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveEmojiPickerId(activeEmojiPickerId === comment.id ? null : comment.id)}
                      className="text-[10px] text-zinc-500 hover:text-white px-1 cursor-pointer bg-transparent border-0"
                      title="Add reaction"
                    >
                      +
                    </button>

                    {activeEmojiPickerId === comment.id && (
                      <>
                        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setActiveEmojiPickerId(null)} />
                        <div className="absolute left-0 bottom-6 z-30 bg-[#0c0d12] border border-white/10 rounded-xl p-1.5 flex items-center gap-1 shadow-2xl animate-in fade-in duration-150">
                          {["🔥", "👍", "😂", "🤯", "⚔️", "🍿"].map((em) => (
                            <button
                              type="button"
                              key={em}
                              onClick={() => {
                                toggleCommentReaction(comment.id, em);
                                setActiveEmojiPickerId(null);
                              }}
                              className="hover:scale-130 transition-transform p-1 text-xs cursor-pointer bg-transparent border-0"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    setReplyingToId(comment.id);
                    setReplyText(`@${authorName} `);
                  }}
                  className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 bg-transparent border-0 outline-none cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-primary/80" /> Reply
                </button>
              </div>

              {/* Inline Reply Input Form */}
              {replyingToId === comment.id && (
                <div className="mt-3 p-3 bg-[#0c0d12]/90 border border-primary/30 rounded-2xl space-y-2.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between text-[10px] text-primary font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3" /> Replying to @{authorName}
                    </span>
                    <button type="button" onClick={() => setReplyingToId(null)} className="text-zinc-400 hover:text-white cursor-pointer bg-transparent border-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write your reply to ${authorName}...`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary resize-none h-16"
                  />

                  {/* Sticker row for replies */}
                  {showReplyStickers && (
                    <div className="flex items-center gap-1.5 flex-wrap p-2 bg-black/40 border border-white/10 rounded-xl">
                      {STICKER_LIST.map((stk) => (
                        <button
                          type="button"
                          key={stk.label}
                          onClick={() => setReplyText(prev => prev + ` ${stk.emoji} `)}
                          className="hover:scale-125 transition-transform p-1 text-sm cursor-pointer bg-transparent border-0"
                        >
                          {stk.emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReplyStickers(!showReplyStickers)}
                      className="text-[9px] font-bold text-primary hover:text-purple-300 flex items-center gap-1 cursor-pointer bg-transparent border-0"
                    >
                      <Smile className="w-3 h-3" /> Stickers
                    </button>

                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setReplyingToId(null)} 
                        className="text-[10px] font-bold text-zinc-400 hover:text-white px-2.5 py-1 bg-transparent border-0 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleAddReply(comment.id, authorName)} 
                        className="text-[10px] font-black bg-primary hover:bg-primary/90 text-white px-3.5 py-1 rounded-xl shadow cursor-pointer border-0 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Render Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-primary/20 space-y-2.5">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="space-y-1.5 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-[8px] text-primary shrink-0">
                          {reply.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-[11px] text-white">{reply.username}</span>
                        <span className="text-[7.5px] text-zinc-400 font-bold uppercase">{reply.rank}</span>
                        <span className="text-[8.5px] text-zinc-500 ml-auto">
                          {new Date(reply.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-zinc-300 leading-relaxed pl-1">
                        {reply.content}
                      </p>

                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-0.5 border border-white/5 text-[8.5px] font-bold text-zinc-400">
                          {Object.entries(reply.reactions || {}).map(([em, cnt]) => (
                            <button
                              type="button"
                              key={em}
                              onClick={() => toggleReplyReaction(comment.id, reply.id, em)}
                              className={cn(
                                "hover:scale-120 transition-transform cursor-pointer bg-transparent border-0 flex items-center gap-0.5",
                                reply.userReaction === em && "text-primary font-bold"
                              )}
                            >
                              <span>{em}</span>
                              <span className="text-[7.5px]">{cnt}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {sortedComments.length === 0 && (
          <div className="text-center py-6 text-zinc-500 text-xs italic">
            No discussions yet. Be the first to share your breakthrough!
          </div>
        )}
      </div>
    </div>
  );
};
