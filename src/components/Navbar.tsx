import { useState, useEffect } from "react";
import { Search, Menu, User, Sparkles, Settings, HelpCircle, Info, LogOut, Download, Bell, CreditCard, Palette, BarChart2, Trophy, Heart, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationDropdown from "./NotificationDropdown";
import SearchOverlay from "./SearchOverlay";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Shield } from "lucide-react";
import { toast } from "sonner";

const Navbar = () => {
  const navigate = useNavigate();

  const { site_name: siteName } = useSiteSettings();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isVideoPage =
    location.pathname === "/" ||
    location.pathname.startsWith("/terabox") ||
    location.pathname.startsWith("/1024") ||
    location.pathname.startsWith("/nephobox");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleSearchClick = () => {
    if (window.innerWidth < 768) {
      navigate("/search");
    } else {
      setIsSearchOpen(true);
    }
  };

  const handleProfileMenuItemClick = (focusTab: string) => {
    setIsProfileOpen(false);
    navigate(`/profile?focus=${focusTab}`);
  };

  const isTransparentPage =
    ["/", "/explore", "/calendar", "/library", "/browse"].includes(location.pathname) ||
    location.pathname.startsWith("/watch") ||
    location.pathname.startsWith("/anime") ||
    location.pathname.startsWith("/series");
  const navbarClasses = cn(
    "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
    isTransparentPage && !isScrolled
      ? "bg-transparent border-b-transparent shadow-none backdrop-blur-none"
      : "border-b border-white/10 bg-[#05060a]/85 backdrop-blur-2xl shadow-2xl"
  );

  return (
    <>
      <nav className={navbarClasses}>
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12 h-[60px] md:h-[64px] flex items-center justify-between">

          {/* DESKTOP HEADER (lg:flex, hidden on mobile/tablet) */}
          <div className="hidden lg:flex w-full items-center justify-between">
            {/* Left: Logo & Links */}
            <div className="flex items-center space-x-8">
              <h1
                onClick={() => navigate("/")}
                className="text-2xl font-black tracking-tight cursor-pointer select-none"
              >
                {isVideoPage ? (
                  <span className="inline-flex items-center gap-2 text-white font-black tracking-tight text-xl">
                    <span>TeraPlay</span>
                    <svg width="15" height="12" viewBox="0 0 17 14" aria-hidden="true" className="text-[#e4f222]">
                      <path d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : (
                  <span className="bg-gradient-to-r from-[#A855F7] to-[#06B6D4] bg-clip-text text-transparent">
                    {siteName}
                  </span>
                )}
              </h1>

              <div className="flex items-center space-x-8 text-[13px] font-medium">
                <button
                  onClick={() => navigate('/')}
                  className={`transition-colors ${isActive('/') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                >
                  Home
                </button>
                <button
                  onClick={() => navigate('/explore')}
                  className={`transition-colors ${isActive('/explore') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                >
                  Explore
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className={`transition-colors ${isActive('/calendar') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => navigate('/library')}
                  className={`transition-colors ${isActive('/library') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground font-medium'}`}
                >
                  Library
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-4 relative">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/10"
                onClick={handleSearchClick}
              >
                <Search className="h-5 w-5 text-foreground" />
              </Button>

              <NotificationDropdown />

              {/* Profile Avatar with Dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/10"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <User className="h-5 w-5 text-foreground" />
                </Button>

                {isProfileOpen && (
                  <>
                    {/* Backdrop to close click */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />

                    {/* Logged out: guest info card with Sign In / Create Account CTAs */}
                    {!user && (
                      <div className="absolute right-0 mt-3 w-64 border border-white/10 rounded-[20px] p-4 shadow-2xl animate-fade-in flex flex-col z-50 bg-[#0c0d14]/95 backdrop-blur-xl">
                        <div className="text-left space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            <span className="text-xs font-black tracking-wide text-white uppercase">BROWSING AS GUEST</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Progress is saved on this device and syncs to your account when you sign in.
                          </p>
                          <div className="pt-1 space-y-2">
                            <button
                              onClick={() => {
                                setIsProfileOpen(false);
                                navigate("/login");
                              }}
                              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-black text-xs rounded-full text-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all cursor-pointer"
                            >
                              Sign In
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileOpen(false);
                                navigate("/register");
                              }}
                              className="w-full py-2.5 px-4 bg-white/5 border border-white/10 text-foreground font-black text-xs rounded-full text-center hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                            >
                              Create Account
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {user && (
                    <div className="absolute right-0 mt-3 w-56 premium-surface border border-white/10 rounded-[14px] p-2.5 shadow-2xl animate-fade-in flex flex-col z-50 bg-background/95 backdrop-blur-xl">
                      <div className="px-3 py-2 border-b border-white/5 mb-1 text-left">
                        <div className="text-xs font-black text-foreground truncate max-w-full">
                          {profile?.username || profile?.email || "Cultivator"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                          {profile?.cultivation_rank || "Qi Condensation I"}
                        </div>
                      </div>
                      {[
                        { label: "My Profile", icon: User, tab: "me" },
                        { label: "Appearance", icon: Palette, tab: "preferences" },
                        { label: "Subscription", icon: CreditCard, tab: "me" },
                        { label: "Achievements", icon: Trophy, tab: "progress" },
                        { label: "Statistics", icon: BarChart2, tab: "progress" },
                        { label: "Settings", icon: Settings, tab: "preferences" },
                        { label: "Help & Support", icon: HelpCircle, tab: "support" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => handleProfileMenuItemClick(item.tab)}
                            className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 font-semibold transition-colors"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}

                      {(profile?.subscription_tier === 'admin' || user?.email?.toLowerCase().includes('admin') || user?.email?.toLowerCase() === 'tanmaygkp1975@gmail.com') && (
                        <div className="border-t border-white/5 mt-1 pt-1 mb-1">
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate('/admin');
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 font-semibold transition-colors"
                          >
                            <Shield className="h-4 w-4" />
                            <span>Admin Panel</span>
                          </button>
                        </div>
                      )}

                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button
                          onClick={async () => {
                            try {
                              setIsProfileOpen(false);
                              await signOut();
                              navigate("/");
                            } catch (err: any) {
                              toast.error("Logout failed: " + err.message);
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 font-semibold transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE/TABLET HEADER (lg:hidden, flex on mobile/tablet) */}
          <div className="flex lg:hidden w-full items-center justify-between relative">
            {/* Left: Hamburger menu */}
            <div className="flex items-center">
              <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                {/* Floating App Drawer Panel */}
                <SheetContent side="left" className="w-[300px] sm:w-[325px] border-r border-white/10 bg-background/95 backdrop-blur-xl p-5 shadow-2xl flex flex-col h-full rounded-r-[16px]">
                  {/* User Card Header */}
                  {!user ? (
                    <div className="pb-4 border-b border-white/10 mb-5 text-left space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        <span className="text-xs font-black tracking-wide text-white uppercase">BROWSING AS GUEST</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Progress is saved on this device and syncs to your account when you sign in.
                      </p>
                      <div className="pt-1 space-y-2">
                        <button
                          onClick={() => {
                            setIsDrawerOpen(false);
                            navigate("/login");
                          }}
                          className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-black text-xs rounded-full text-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all cursor-pointer"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            setIsDrawerOpen(false);
                            navigate("/register");
                          }}
                          className="w-full py-2.5 px-4 bg-white/5 border border-white/10 text-foreground font-black text-xs rounded-full text-center hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                        >
                          Create Account
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-5 text-left shrink-0">
                    <div className="h-11 w-11 rounded-full border border-primary/30 overflow-hidden flex items-center justify-center bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{profile?.username || profile?.email || "Cultivator"}</span>
                        <span className="bg-primary/20 border border-primary/20 text-primary text-[8px] font-black px-1.5 py-0 rounded-full uppercase">
                          {profile?.subscription_tier || "FREE"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                        {profile?.cultivation_rank || "Qi Condensation I"}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Drawer Menu Sections */}
                  <div className="flex-1 overflow-y-auto space-y-5 [scrollbar-width:none]">
                    {/* YOUR ACCOUNT SECTION */}
                    <div className="space-y-1 text-left">
                      <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-2 mb-1.5">Your Account</h4>
                      {[
                        { label: "Realm Tracker", icon: Sparkles, path: "/profile?focus=realm" },
                        { label: "Favorites", icon: Heart, path: "/library?tab=Favorites" },
                        { label: "Watch History", icon: Clock, path: "/library?tab=History" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              setIsDrawerOpen(false);
                              navigate(item.path);
                            }}
                            className="w-full text-left h-9 px-2.5 rounded-xl flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 font-bold transition-all"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* OFFLINE SECTION */}
                    <div className="space-y-1 text-left">
                      <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-2 mb-1.5">Offline</h4>
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          navigate("/library?tab=Downloads");
                        }}
                        className="w-full text-left h-9 px-2.5 rounded-xl flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 font-bold transition-all"
                      >
                        <Download className="h-4 w-4 shrink-0" />
                        <span>Downloads</span>
                      </button>
                    </div>

                    {/* PREFERENCES & UTILITIES */}
                    <div className="space-y-1 text-left">
                      <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-2 mb-1.5">Preferences</h4>
                      {[
                        { label: "Appearance", icon: Palette, path: "/profile?focus=preferences" },
                        { label: "Settings", icon: Settings, path: "/profile?focus=preferences" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              setIsDrawerOpen(false);
                              navigate(item.path);
                            }}
                            className="w-full text-left h-9 px-2.5 rounded-xl flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 font-bold transition-all"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* SUPPORT */}
                    <div className="space-y-1 text-left">
                      <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-2 mb-1.5">Support</h4>
                      {[
                        { label: "Help & Support", icon: HelpCircle, path: "/profile?focus=support" },
                        { label: "About", icon: Info, path: "/profile?focus=support" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              setIsDrawerOpen(false);
                              navigate(item.path);
                            }}
                            className="w-full text-left h-9 px-2.5 rounded-xl flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 font-bold transition-all"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* ADMIN ONLY */}
                    {(profile?.subscription_tier === 'admin' || user?.email?.toLowerCase().includes('admin') || user?.email?.toLowerCase() === 'tanmaygkp1975@gmail.com') && (
                      <div className="space-y-1 text-left">
                        <h4 className="text-[9px] font-black text-primary uppercase tracking-widest pl-2 mb-1.5">Admin</h4>
                        <button
                          onClick={() => {
                            setIsDrawerOpen(false);
                            navigate("/admin");
                          }}
                          className="w-full text-left h-9 px-2.5 rounded-xl flex items-center gap-2 text-xs text-primary hover:text-primary hover:bg-primary/10 font-bold transition-all"
                        >
                          <Shield className="h-4 w-4 shrink-0" />
                          <span>Admin Panel</span>
                        </button>
                      </div>
                    )}
                    {/* LOGOUT */}
                    <div className="space-y-1 text-left pt-2 border-t border-white/5">
                      <button
                        onClick={async () => {
                          try {
                            setIsDrawerOpen(false);
                            await signOut();
                            navigate("/");
                          } catch (err: any) {
                            toast.error("Logout failed: " + err.message);
                          }
                        }}
                        className="w-full text-left h-9 px-2.5 rounded-xl flex items-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 font-bold transition-all"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Daily Cultivation Widget */}
                  <div className="mt-auto pt-3 border-t border-white/5 text-left shrink-0">
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                      <div className="text-[8px] font-black text-primary uppercase tracking-widest mb-0.5">Daily Quest</div>
                      <div className="text-[11px] font-extrabold text-foreground">Watch 2 Episodes</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Reward: +25 XP (Qi Condensation III)</div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Centered Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <h1
                onClick={() => navigate("/")}
                className="text-base sm:text-lg font-black tracking-tight cursor-pointer select-none"
              >
                {isVideoPage ? (
                  <span className="inline-flex items-center gap-1.5 text-white font-black tracking-tight">
                    <span>TeraPlay</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e4f222] shadow-[0_0_8px_#e4f222]" />
                  </span>
                ) : (
                  <span className="bg-gradient-to-r from-[#A855F7] to-[#06B6D4] bg-clip-text text-transparent">
                    {siteName}
                  </span>
                )}
              </h1>
            </div>

            {/* Right: Search & Notifications */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={handleSearchClick}
              >
                <Search className="h-5 w-5 text-foreground" />
              </Button>

              <NotificationDropdown />
            </div>
          </div>

        </div>
      </nav>

      {/* Desktop Search Overlay Modal */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Navbar;

