import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, User, Shield, HelpCircle, Info, Sparkles, Sword, Trophy, CreditCard, Palette, Settings as SettingsIcon, BarChart2, LogOut, Mail, KeyRound, Check, Share2, FolderHeart, Globe, CheckCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCompletedEpisodesCountQuery } from "@/hooks/useAnimeQueries";
import PageWrapper from "@/components/layout/PageWrapper";
import AppearanceSelector from "@/components/AppearanceSelector";
import { useAuth } from "@/contexts/AuthContext";
import { animeCatalog } from "@/data/anime";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Achievements collectible cards
const achievementsList = [
  { id: "ascension", title: "First Ascension", desc: "Watch your first episode", icon: Sparkles, rarity: "Common", color: "from-blue-500/20 to-blue-600/5 border-blue-500/25 text-blue-400", unlocked: true },
  { id: "foundation", title: "Foundation Pillar", desc: "Complete 30 episodes", icon: Sword, rarity: "Rare", color: "from-purple-500/20 to-purple-600/5 border-purple-500/25 text-purple-400", unlocked: true },
  { id: "scholar", title: "Spiritual Scholar", desc: "Provide 5 ratings", icon: Trophy, rarity: "Epic", color: "from-donghua-orange/20 to-donghua-orange/5 border-donghua-orange/25 text-donghua-orange", unlocked: true },
  { id: "sovereign", title: "Immortal Sovereign", desc: "Watch 300 episodes", icon: Shield, rarity: "Legendary", color: "from-red-500/20 to-red-600/5 border-red-500/25 text-red-400", unlocked: false },
];

// Daily quests
const dailyQuests = [
  { id: 1, text: "Watch 1 episode of an ongoing series", xp: "50 XP", done: true },
  { id: 2, text: "Share your cultivator card", xp: "30 XP", done: false },
  { id: 3, text: "Rate a show in the Explore page", xp: "20 XP", done: false },
];

// Avatar borders/frames
const avatarFrames = [
  { id: "none", name: "Standard Border", class: "border-white/10" },
  { id: "cyan", name: "Spiritual Ice (Cyan)", class: "border-donghua-cyan animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.3)]" },
  { id: "gold", name: "Immortal Flame (Gold)", class: "border-donghua-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.3)]" },
  { id: "purple", name: "Cosmic Realm (Purple)", class: "border-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.3)]" }
];

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Simkl Integration State
  const [simklToken, setSimklToken] = useState<string | null>(null);
  const [simklUsername, setSimklUsername] = useState<string | null>(null);

  useEffect(() => {
    setSimklToken(localStorage.getItem("simkl_access_token"));
    setSimklUsername(localStorage.getItem("simkl_username"));
  }, []);

  const handleLinkSimkl = () => {
    const clientId = "c307e7c79e68401e90815a94e89c3b76ed3a249429529f697512ea27f1f2476c";
    const origin = window.location.origin;
    const redirectUri = encodeURIComponent(`${origin}/auth/simkl/callback`);
    
    // Generate secure state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("oauth_simkl_state", state);
    
    window.location.href = `https://simkl.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
  };

  const handleDisconnectSimkl = () => {
    localStorage.removeItem("simkl_access_token");
    localStorage.removeItem("simkl_username");
    localStorage.removeItem("simkl_avatar");
    setSimklToken(null);
    setSimklUsername(null);
    toast.success("Successfully disconnected your Simkl account.");
  };
  
  // Tabs: "me" | "library" | "progress" | "preferences" | "support"
  const activeTab = useMemo(() => {
    const focus = searchParams.get("focus") || "me";
    if (focus === "realm" || focus === "progress" || focus === "achievements") return "progress";
    if (focus === "appearance" || focus === "settings" || focus === "preferences") return "preferences";
    if (focus === "help" || focus === "support" || focus === "about") return "support";
    if (focus === "library") return "library";
    return focus;
  }, [searchParams]);

  const { data: completedCount = 0 } = useCompletedEpisodesCountQuery();

  const { user, profile, updateProfile, signOut } = useAuth();

  // Settings State
  const [notifyNewEpisode, setNotifyNewEpisode] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(true);
  const [downloadHighQuality, setDownloadHighQuality] = useState(true);
  const [playbackAutoplay, setPlaybackAutoplay] = useState(true);
  const [privacyPublicProgress, setPrivacyPublicProgress] = useState(true);

  // Profile Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFrame, setSelectedFrame] = useState("none");

  // Sync profile data to local state
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setEmail(profile.email || "");
      setSelectedFrame(profile.avatar_frame || "none");
      
      const prefs = profile.preferences || {};
      if (prefs.notifyNewEpisode !== undefined) setNotifyNewEpisode(prefs.notifyNewEpisode);
      if (prefs.notifyMarketing !== undefined) setNotifyMarketing(prefs.notifyMarketing);
      if (prefs.downloadWifiOnly !== undefined) setDownloadWifiOnly(prefs.downloadWifiOnly);
      if (prefs.downloadHighQuality !== undefined) setDownloadHighQuality(prefs.downloadHighQuality);
      if (prefs.playbackAutoplay !== undefined) setPlaybackAutoplay(prefs.playbackAutoplay);
      if (prefs.privacyPublicProgress !== undefined) setPrivacyPublicProgress(prefs.privacyPublicProgress);
    } else if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  const currentFrameClass = useMemo(() => {
    return avatarFrames.find(f => f.id === selectedFrame)?.class || "border-white/10";
  }, [selectedFrame]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        username,
        avatar_frame: selectedFrame,
      });
      toast.success("Profile saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile changes");
    }
  };

  const handlePreferenceToggle = async (key: string, value: boolean) => {
    try {
      const prefs = {
        ...(profile?.preferences || {}),
        [key]: value,
      };
      await updateProfile({ preferences: prefs });
    } catch (err: any) {
      console.warn("Failed to persist preference toggle:", err);
    }
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ focus: tab });
  };

  // Calculate episodes count
  const totalCompletedEpisodes = completedCount === 0 ? 427 : completedCount;

  const progressPercent = 75; // 427 / 500 XP to next realm

  const renderSyncPrompt = () => {
    if (!user || !user.is_anonymous) return null;

    return (
      <div className="animate-reveal-up mb-6">
        <div className="relative rounded-[24px] overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/10 via-background/40 to-background/90 backdrop-blur-xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black uppercase text-foreground tracking-wider">
                Ephemeral Spiritual Root
              </h4>
              <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                You are cultivating as a Guest. Sync your progress to secure your realm stage and settings forever.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              size="sm"
              className="rounded-full text-[10px] uppercase font-black tracking-wider border-white/10 hover:bg-white/5 px-4 h-9"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/register")}
              size="sm"
              className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-black text-[10px] uppercase tracking-wider px-4 h-9 shadow-lg shadow-primary/20"
            >
              Sync Journey
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-sm font-semibold text-muted-foreground">Profile Hub</div>
        </div>

        {renderSyncPrompt()}

        {/* Top Cultivator Profile Header card */}
        <div className="premium-surface rounded-[32px] p-6 border border-white/5 mb-6 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-5 items-center text-center sm:text-left">
            {/* Avatar with custom frames */}
            <div className={cn("relative rounded-full p-1 border-2 shrink-0 bg-background/50 transition-all duration-300", currentFrameClass)}>
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-accent flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {username ? username.slice(0, 2).toUpperCase() : "CU"}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 border-2 border-background text-primary-foreground shadow">
                <Sword className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-2xl font-black text-foreground tracking-tight">{username}</h2>
                <Badge variant="secondary" className="rounded-full text-xs font-black uppercase px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 w-fit mx-auto sm:mx-0">
                  Qi Condensation III
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
                Level 14 Cultivator • Premium Gold Member
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                <Badge variant="outline" className="rounded-full border-donghua-cyan/30 bg-donghua-cyan/10 text-donghua-cyan text-[10px] font-bold">
                  Sovereign Pass
                </Badge>
                <Badge variant="outline" className="rounded-full border-emerald-500/25 bg-emerald-500/5 text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                  <Check className="h-3 w-3" />
                  Meridian Active
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick stats board */}
          <div className="flex items-center gap-6 sm:gap-10 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10 w-full md:w-auto justify-around md:justify-start">
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Episodes</span>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{totalCompletedEpisodes}</div>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Hours</span>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">163</div>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Achievements</span>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">31</div>
            </div>
          </div>
        </div>

        {/* Tabbed content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar Tabs - 5 categories */}
          <div className="lg:col-span-1 flex lg:flex-col border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-4 gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
            {[
              { id: "me", label: "Overview", icon: User },
              { id: "library", label: "Library", icon: FolderHeart },
              { id: "progress", label: "Progress & Realms", icon: Sword },
              { id: "preferences", label: "Preferences", icon: SettingsIcon },
              { id: "support", label: "Support", icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-left flex items-center gap-3 transition-all text-xs sm:text-sm font-extrabold whitespace-nowrap shrink-0 w-auto lg:w-full",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border border-primary/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right main hub area */}
          <div className="lg:col-span-3 premium-surface rounded-[32px] p-6 sm:p-7 border border-white/5">
            
            {/* 1. ME TAB */}
            {activeTab === "me" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">Account & Cultivator Identity</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure your credentials, connected tiers, and avatar frames</p>
                </div>

                {/* Edit Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-muted-foreground pl-1">Username</label>
                    <Input value={username} onChange={e => setUsername(e.target.value)} className="border-white/10 bg-white/[0.03] rounded-xl focus:border-primary/60" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-muted-foreground pl-1">Email Address</label>
                    <Input value={email} className="border-white/10 bg-white/[0.03] rounded-xl focus:border-primary/60 text-muted-foreground" disabled />
                  </div>
                </div>

                {/* Avatar Frame Selector */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase text-muted-foreground pl-1">Cultivator Avatar Frame</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {avatarFrames.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFrame(f.id)}
                        className={cn(
                          "p-3 rounded-2xl border text-center cursor-pointer transition-all hover:bg-white/5 flex flex-col items-center justify-center gap-2",
                          selectedFrame === f.id ? "border-primary bg-primary/5" : "border-white/5 bg-white/[0.02]"
                        )}
                      >
                        <div className={cn("h-10 w-10 rounded-full border-2 flex items-center justify-center font-black text-xs", f.class)}>
                          TS
                        </div>
                        <span className="text-[10px] font-bold text-foreground truncate max-w-full">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Changes Trigger */}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} className="rounded-full text-xs font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Save Profile Changes
                  </Button>
                </div>

                {/* Membership Details */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <div className="text-xs font-black text-foreground">Sovereign Cultivator Pass</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Active Xianxia Realm Membership</div>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-none font-bold uppercase rounded-full text-[9px] px-2.5">
                      Renewing Dec 31
                    </Badge>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" size="sm" className="rounded-full text-xs border-white/10 hover:bg-white/10">
                      View Invoices
                    </Button>
                    <Button size="sm" className="rounded-full text-xs font-bold">
                      Upgrade Tier
                    </Button>
                  </div>
                </div>

                {/* Simkl Metadata Integration */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <div className="text-xs font-black text-foreground">Simkl Metadata Integration</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {simklToken 
                          ? `Linked to Simkl account: ${simklUsername || "Active"}` 
                          : "Link your Simkl account to sync watchlist, rating, and watch history."
                        }
                      </p>
                    </div>
                    {simklToken ? (
                      <Badge className="bg-green-500/20 text-green-400 border-none font-bold uppercase rounded-full text-[9px] px-2.5">
                        Connected
                      </Badge>
                    ) : (
                      <Badge className="bg-white/10 text-muted-foreground border-none font-bold uppercase rounded-full text-[9px] px-2.5">
                        Not Linked
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    {simklToken ? (
                      <Button 
                        onClick={handleDisconnectSimkl} 
                        variant="destructive" 
                        size="sm" 
                        className="rounded-full text-xs font-bold px-4"
                      >
                        Disconnect Account
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleLinkSimkl} 
                        size="sm" 
                        className="rounded-full text-xs font-bold px-5 bg-donghua-cyan hover:bg-donghua-cyan/90 text-black shadow-lg shadow-donghua-cyan/20"
                      >
                        Connect Simkl
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. LIBRARY TAB (Summary preview) */}
            {activeTab === "library" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-foreground tracking-tight">My Saved Library</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Quick access to watchlist and saved sessions</p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/library")} className="rounded-full text-xs font-bold">
                    Go to Library
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Quick Watch Later list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-muted-foreground pl-0.5">Watch Later Queue</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {animeCatalog.slice(0, 4).map((anime) => (
                        <div
                          key={anime.id}
                          onClick={() => navigate(`/anime/${anime.slug}`)}
                          className="bg-white/5 border border-white/5 hover:border-primary/40 p-3 rounded-2xl flex items-center gap-3 cursor-pointer group"
                        >
                          <img src={anime.image} className="h-10 w-7.5 rounded object-cover border border-white/10 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{anime.title}</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">{anime.genre} • {anime.rating} Rating</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PROGRESS TAB (Cultivator Card, Achievements, Stats) */}
            {activeTab === "progress" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">Realm Ascension & Achievements</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">View your shareable rank card, unlocked trophy medals, and quests</p>
                </div>

                {/* Shareable Cultivator Card mockup */}
                <div className="p-6 bg-gradient-accent rounded-3xl text-white shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-transform border border-primary/20 flex flex-col justify-between h-[230px]">
                  {/* Subtle Background pattern */}
                  <div className="absolute top-0 right-0 opacity-10 translate-x-12 -translate-y-6 pointer-events-none">
                    <Sword className="h-64 w-64 rotate-45" />
                  </div>
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-center z-10">
                    <span className="text-[10px] font-black tracking-widest text-white/70 uppercase">DonghuaStream Cultivator Card</span>
                    <Badge className="bg-white/20 text-white text-[9px] border-none font-bold rounded-full">
                      Gold Member
                    </Badge>
                  </div>

                  {/* Card Body */}
                  <div className="flex items-center gap-4 z-10 mt-3">
                    <div className="h-16 w-16 rounded-full bg-background/30 border-2 border-white/30 flex items-center justify-center text-xl font-black shrink-0">
                      {username.slice(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-black tracking-tight">{username}</div>
                      <div className="text-xs text-white/80 mt-0.5">Level 14 Cultivator</div>
                      <div className="flex items-center gap-1.5 mt-2 bg-black/20 rounded-full px-2 py-0.5 w-fit border border-white/5">
                        <Sword className="h-3 w-3 text-donghua-cyan" />
                        <span className="text-[9px] font-black text-donghua-cyan uppercase tracking-wider">Qi Condensation III</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer (Stats & Progress) */}
                  <div className="pt-4 border-t border-white/10 z-10 mt-4 flex items-end justify-between">
                    <div className="flex gap-6 text-xs text-white/70">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-white/50">Episodes</div>
                        <div className="font-black text-white text-sm mt-0.5">{totalCompletedEpisodes}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-white/50">Watch Time</div>
                        <div className="font-black text-white text-sm mt-0.5">163 hrs</div>
                      </div>
                    </div>
                    
                    <div className="w-[120px] sm:w-[150px] space-y-1">
                      <div className="flex justify-between text-[9px] text-white/60 font-semibold">
                        <span>XP Progress</span>
                        <span>427 / 500 XP</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: "75%" }} />
                      </div>
                      <div className="text-[8px] text-white/50 text-right">Next: Foundation Stage</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm" className="rounded-full text-xs font-bold border-white/10 hover:bg-white/10 gap-1.5">
                    <Share2 className="h-3.5 w-3.5" />
                    Share Cultivator Card
                  </Button>
                </div>

                {/* Achievements Collectible cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-0.5">Unlocked Medals</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {achievementsList.map((ach) => {
                      const Icon = ach.icon;
                      return (
                        <div
                          key={ach.id}
                          className={cn(
                            "p-4 rounded-3xl border flex gap-3.5 items-center bg-gradient-to-br relative overflow-hidden transition-all shadow",
                            ach.unlocked 
                              ? `${ach.color} hover:scale-[1.01]` 
                              : "from-white/[0.01] to-transparent border-white/5 opacity-40"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner bg-background/50"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                              {ach.title}
                              {ach.unlocked && <CheckCircle className="h-3 w-3 text-emerald-400" />}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{ach.desc}</p>
                            <Badge className="absolute top-2 right-2 rounded-full text-[8px] bg-black/40 text-muted-foreground border-none font-bold uppercase">
                              {ach.rarity}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily quests */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-0.5">Daily Quests</h4>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2.5">
                    {dailyQuests.map((quest) => (
                      <div key={quest.id} className="flex justify-between items-center gap-3 py-1.5 border-b border-white/5 last:border-none last:pb-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {quest.done ? (
                            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-white/30 shrink-0" />
                          )}
                          <span className={cn("text-xs truncate", quest.done ? "text-muted-foreground line-through" : "text-foreground font-medium")}>
                            {quest.text}
                          </span>
                        </div>
                        <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none text-[9px] font-bold">
                          {quest.xp}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. PREFERENCES TAB (Themes accents, settings toggles) */}
            {activeTab === "preferences" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">System Preferences</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Adjust custom theme accents, notifications, and media settings</p>
                </div>

                {/* Appearance Accents */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-black uppercase text-muted-foreground pl-0.5">Visual Accents Theme</h4>
                  <AppearanceSelector />
                </div>

                {/* Preferences Form Toggles */}
                <div className="space-y-4 pt-2">
                  {/* Notifications */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-muted-foreground pl-0.5">Notifications Settings</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4 p-3.5 bg-white/5 rounded-2xl border border-white/5">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">New Episode Alerts</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 leading-snug">Notify when followed series receive updates</div>
                        </div>
                        <div className="shrink-0">
                          <Switch checked={notifyNewEpisode} onCheckedChange={(val) => {
                            setNotifyNewEpisode(val);
                            handlePreferenceToggle("notifyNewEpisode", val);
                          }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 p-3.5 bg-white/5 rounded-2xl border border-white/5">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">Recommendations & Offers</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 leading-snug">Notify about trending items and customization details</div>
                        </div>
                        <div className="shrink-0">
                          <Switch checked={notifyMarketing} onCheckedChange={(val) => {
                            setNotifyMarketing(val);
                            handlePreferenceToggle("notifyMarketing", val);
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Playback & Downloads */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-muted-foreground pl-0.5">Media & Downloads</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4 p-3.5 bg-white/5 rounded-2xl border border-white/5">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">Autoplay Next Episode</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 leading-snug">Sync next episode stream automatically on completion</div>
                        </div>
                        <div className="shrink-0">
                          <Switch checked={playbackAutoplay} onCheckedChange={(val) => {
                            setPlaybackAutoplay(val);
                            handlePreferenceToggle("playbackAutoplay", val);
                          }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 p-3.5 bg-white/5 rounded-2xl border border-white/5">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">Download over WiFi Only</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 leading-snug">Restricts downloads to active WiFi connections</div>
                        </div>
                        <div className="shrink-0">
                          <Switch checked={downloadWifiOnly} onCheckedChange={(val) => {
                            setDownloadWifiOnly(val);
                            handlePreferenceToggle("downloadWifiOnly", val);
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account & Security */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-muted-foreground pl-0.5">Account & Security</h4>
                    <div className="space-y-2">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <KeyRound className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="text-xs font-bold text-foreground">Update Password</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">Change your mortal gate password regularly</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full text-xs border-white/10 hover:bg-white/10 font-bold">
                          Change
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SUPPORT TAB */}
            {activeTab === "support" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">Help & Support</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">FAQs, contact details, feedback portals, and credits</p>
                </div>

                {/* FAQ Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-muted-foreground pl-0.5">Frequently Asked Questions</h4>
                  <div className="space-y-2.5">
                    <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                      <h4 className="text-xs font-bold text-foreground">How is my Cultivation level determined?</h4>
                      <p className="text-[10px] text-muted-foreground mt-1">Your level increases as you complete episodes. Watch more episodes to progress through stages.</p>
                    </div>
                    <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                      <h4 className="text-xs font-bold text-foreground">How do I stream offline?</h4>
                      <p className="text-[10px] text-muted-foreground mt-1">Select an episode on the detail page and tap the download icon. Download progress will display in your Library tab.</p>
                    </div>
                  </div>
                </div>

                {/* Support buttons */}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button className="rounded-full text-xs font-bold flex-1 h-10 gap-1.5">
                    <HelpCircle className="h-4 w-4" />
                    Submit Ticket
                  </Button>
                  <Button variant="outline" className="rounded-full text-xs font-bold border-white/10 hover:bg-white/10 flex-1 h-10">
                    Terms & Privacy
                  </Button>
                </div>

                {/* App about info */}
                <div className="border-t border-white/10 pt-5 space-y-4">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground font-semibold">Client Version</span>
                    <span className="text-xs font-bold text-foreground">v2.1.0-immortal</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground font-semibold">Developers</span>
                    <span className="text-xs font-bold text-foreground">Advanced Agentic Coding</span>
                  </div>
                </div>

                {/* Logout confirmation block */}
                <div className="p-5 bg-red-500/5 rounded-3xl border border-red-500/20 text-center space-y-3.5 mt-6">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center justify-center gap-1.5 text-red-400">
                    <LogOut className="h-4 w-4" />
                    Leave Mortal Realm
                  </h4>
                  <p className="text-[10px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Ready to leave the mortal realm? Logging out resets transient credentials. Your cultivation path remains tied to your spiritual root.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await signOut();
                        toast.success("Successfully logged out of the mortal realm!");
                        navigate("/login");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to log out");
                      }
                    }}
                    variant="destructive"
                    className="rounded-full text-xs font-bold h-9 px-6 bg-red-500/80 hover:bg-red-500 text-white"
                  >
                    Confirm Logout
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </PageWrapper>
    </div>
  );
};

export default Profile;
