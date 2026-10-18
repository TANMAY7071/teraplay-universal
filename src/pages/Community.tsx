import { useState } from "react";
import { ArrowLeft, MessageSquare, Users, Megaphone, PlusCircle, Heart, Share2, Play, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import PageWrapper from "@/components/layout/PageWrapper";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock discussions data
interface Thread {
  id: number;
  author: string;
  avatar: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  replies: number;
  time: string;
}

const initialThreads: Thread[] = [
  {
    id: 1,
    author: "Xiao_Fan_Fan",
    avatar: "XF",
    title: "Battle Through The Heavens Episode 158 Discussion thread",
    content: "Can we talk about that final alchemy duel? The animation of the Green Lotus Core Flame was absolutely unreal! Foch Film really raised the bar for this season.",
    category: "Episode Discussion",
    likes: 42,
    replies: 18,
    time: "2 hours ago"
  },
  {
    id: 2,
    author: "SwordSovereign",
    avatar: "SS",
    title: "Who wins: Tang San vs Shi Hao at Golden Core peak stage?",
    content: "Purely comparing their peak Golden Core abilities and weapons (Tang San's hidden weapons vs Shi Hao's physical tempering). Let's debate righteous dao only!",
    category: "Power Scaling",
    likes: 29,
    replies: 34,
    time: "5 hours ago"
  },
  {
    id: 3,
    author: "Cultivator_99",
    avatar: "C9",
    title: "Recommended dark cultivation donghua like Renegade Immortal?",
    content: "Just finished season 1 of Renegade Immortal and I loved the ruthless nature of Wang Lin. Any suggestions for similar shows with determined, non-naive protagonists?",
    category: "Recommendations",
    likes: 15,
    replies: 9,
    time: "1 day ago"
  }
];

// Mock lobbies for Watch Together
const watchTogetherLobbies = [
  { id: 1, host: "Venerable_Master", show: "Perfect World", episode: "Ep 182", members: 8, maxMembers: 15, status: "Starting in 5m" },
  { id: 2, host: "Alchemist_Queen", show: "Jade Dynasty", episode: "Ep 66", members: 3, maxMembers: 10, status: "Active" },
  { id: 3, host: "Spiritual_Lord", show: "Tales of Herding Gods", episode: "Ep 39", members: 12, maxMembers: 20, status: "Starting in 15m" }
];

// Mock announcements
const announcements = [
  {
    id: 1,
    title: "Scheduled Maintenance & Server Migration",
    desc: "We are migrating to a premium high-speed streaming CDN to support buffer-less 4K playback. The site will be down for 30 minutes on June 29, at 03:00 AM UTC.",
    date: "June 26, 2026",
    tag: "Maintenance"
  },
  {
    id: 2,
    title: "Theme Personalization & Appearance Settings Release",
    desc: "You can now customize your highlight accents! Go to your profile settings to choose between Cosmic Purple, Cyber Blue, Crimson, Emerald, and AMOLED Black.",
    date: "June 25, 2026",
    tag: "Feature Update"
  }
];

const Community = () => {
  const navigate = useNavigate();
  
  // Tabs: "discussions" | "watch-together" | "announcements"
  const [activeTab, setActiveTab] = useState<"discussions" | "watch-together" | "announcements">("discussions");
  
  // Post Creator State
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("General");
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [isPosting, setIsPosting] = useState(false);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    const newThread: Thread = {
      id: Date.now(),
      author: "Tang_San_99",
      avatar: "TS",
      title: postTitle,
      content: postContent,
      category: postCategory,
      likes: 0,
      replies: 0,
      time: "Just now"
    };

    setThreads([newThread, ...threads]);
    setPostTitle("");
    setPostContent("");
    setIsPosting(false);
  };

  const handleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreads(prev => prev.map(t => t.id === id ? { ...t, likes: t.likes + 1 } : t));
  };

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="pb-4">
        {/* Header Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground font-semibold">Community Area</span>
        </div>

        {/* Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-6xl mb-2">
              Community Hub
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Discuss your favorite cultivation realms, host streaming lobbies, and read dev announcements
            </p>
          </div>
          {activeTab === "discussions" && !isPosting && (
            <Button
              onClick={() => setIsPosting(true)}
              className="rounded-full font-bold text-xs gap-1.5 self-start sm:self-auto hover:scale-105 transition-transform"
            >
              <PlusCircle className="h-4 w-4" />
              Create Post
            </Button>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-white/10 mb-6 gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "discussions", label: "Discussions", icon: MessageSquare },
            { id: "watch-together", label: "Watch Together (Lobby)", icon: Users },
            { id: "announcements", label: "Announcements", icon: Megaphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as "discussions" | "watch-together" | "announcements");
                  setIsPosting(false);
                }}
                className={cn(
                  "pb-3 text-sm font-extrabold relative shrink-0 transition-colors flex items-center gap-2",
                  isActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Discussions Tab */}
        {activeTab === "discussions" && (
          <div className="space-y-6 animate-fade-in">
            {/* Post Creator Panel */}
            {isPosting && (
              <form onSubmit={handleCreatePost} className="premium-surface rounded-3xl p-5 border border-white/5 space-y-4 max-w-2xl mx-auto">
                <h3 className="font-extrabold text-base text-foreground">Create New Discussion Thread</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Enter thread title..."
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                    className="border-white/10 bg-white/[0.04] rounded-xl focus:border-primary/60"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={postCategory} onValueChange={setPostCategory}>
                      <SelectTrigger className="border-white/10 bg-white/[0.04] rounded-xl text-xs sm:text-sm">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-white/10 text-xs sm:text-sm">
                        <SelectItem value="General">General Discussion</SelectItem>
                        <SelectItem value="Episode Discussion">Episode Discussion</SelectItem>
                        <SelectItem value="Power Scaling">Power Scaling</SelectItem>
                        <SelectItem value="Recommendations">Recommendations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="What is on your mind? Discuss characters, plots, cultivation realms..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    required
                    className="border-white/10 bg-white/[0.04] rounded-xl focus:border-primary/60 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsPosting(false)}
                    className="rounded-full text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full text-xs font-bold gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Publish Post
                  </Button>
                </div>
              </form>
            )}

            {/* Threads List */}
            <div className="space-y-4 max-w-3xl mx-auto">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className="premium-surface rounded-3xl p-5 border border-white/5 space-y-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-xs text-primary shadow-sm">
                        {thread.avatar}
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-foreground">{thread.author}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{thread.time}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full text-[9px] font-bold bg-white/5 border border-white/5 text-muted-foreground uppercase">
                      {thread.category}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="font-black text-base text-foreground tracking-tight hover:text-primary transition-colors cursor-pointer">
                      {thread.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {thread.content}
                    </p>
                  </div>

                  <div className="flex gap-4 pt-2 border-t border-white/5 text-xs text-muted-foreground">
                    <button 
                      onClick={(e) => handleLike(thread.id, e)} 
                      className="flex items-center gap-1.5 hover:text-primary transition-colors font-semibold"
                    >
                      <Heart className="h-4 w-4" />
                      <span>{thread.likes} Likes</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-donghua-cyan transition-colors font-semibold">
                      <MessageSquare className="h-4 w-4" />
                      <span>{thread.replies} Replies</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-muted-foreground/80 transition-colors font-semibold ml-auto">
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watch Together Tab */}
        {activeTab === "watch-together" && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="premium-surface rounded-3xl p-5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary animate-pulse" />
                  What is Watch Together?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
                  Host digital theater lobbies to sync video streams with your friends. Chat in real-time, share reactions, and watch your favorite cultivators side-by-side!
                </p>
              </div>
              <Button className="rounded-full font-bold text-xs gap-1.5 w-full md:w-auto hover:scale-105 transition-transform shrink-0">
                <PlusCircle className="h-4 w-4" />
                Host Lobby Room
              </Button>
            </div>

            {/* Active Lobbies Grid */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-foreground tracking-tight pl-1">Active Lobby Rooms</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {watchTogetherLobbies.map((room) => (
                  <div
                    key={room.id}
                    className="premium-surface rounded-3xl p-5 border border-white/5 flex flex-col justify-between h-[180px] hover:border-primary/45 transition-colors"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="rounded-full text-[10px] border-white/10 text-muted-foreground">
                          Host: {room.host}
                        </Badge>
                        <Badge className="bg-primary/20 text-primary text-[9px] border-none font-bold uppercase rounded-full">
                          {room.status}
                        </Badge>
                      </div>
                      <h4 className="font-black text-base text-foreground leading-snug line-clamp-1 mt-1">
                        {room.show}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{room.episode}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="text-xs text-muted-foreground font-semibold">
                        {room.members} / {room.maxMembers} users
                      </span>
                      <Button size="sm" className="rounded-full h-8 px-4 text-xs font-bold gap-1 group">
                        <Play className="h-3 w-3 fill-current" />
                        Join Room
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === "announcements" && (
          <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="premium-surface rounded-3xl p-6 border border-white/5 space-y-3 relative overflow-hidden group"
              >
                {/* Decorative neon accent bar */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
                
                <div className="flex items-center justify-between flex-wrap gap-2 pl-2">
                  <Badge variant="secondary" className="rounded-full text-[9px] font-extrabold uppercase px-2.5 bg-primary/10 text-primary border-none">
                    {ann.tag}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-semibold">{ann.date}</span>
                </div>
                
                <div className="space-y-1.5 pl-2">
                  <h3 className="font-black text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {ann.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {ann.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageWrapper>
    </div>
  );
};

export default Community;
