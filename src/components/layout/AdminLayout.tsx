import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Film, 
  Tags, 
  Users, 
  Settings, 
  LogOut, 
  MessageSquare, 
  AlertCircle, 
  Sparkles, 
  Menu, 
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Activity,
  Search,
  RefreshCw,
  Tv,
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navSections = [
    {
      title: "Content",
      items: [
        { label: "Donghua Catalog", icon: Film, path: "/admin/anime" },
        { label: "Community Comments", icon: MessageSquare, path: "/admin/comments" },
      ]
    },
    {
      title: "People",
      items: [
        { label: "User Management", icon: Users, path: "/admin/users" },
        { label: "Content Requests", icon: AlertCircle, path: "/admin/requests" },
      ]
    },
    {
      title: "Operations",
      items: [
        { label: "Episode Operations", icon: Activity, path: "/admin/episodes" },
        { label: "Wiki Data Studio", icon: Sparkles, path: "/admin/data-studio/wiki" },
        { label: "Automated Sync Engine", icon: RefreshCw, path: "/admin/sync" },
      ]
    },
    {
      title: "Experiments",
      items: [
        { label: "Donghua Live", icon: Tv, path: "/admin/live" },
        { label: "Experiment AI", icon: Cpu, path: "/admin/experiment-ai" },
      ]
    },
    {
      title: "Configuration",
      items: [
        { label: "Genre Taxonomy", icon: Tags, path: "/admin/genres" },
        { label: "Feature Toggles", icon: Settings, path: "/admin/settings" },
      ]
    }
  ];

  // Generate dynamic breadcrumb title from path
  const getBreadcrumbs = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments.length <= 1) return [{ label: "Dashboard", path: "/admin" }];
    
    const crumbs = [{ label: "Admin", path: "/admin" }];
    let currentPath = "/admin";
    
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;
      const formatted = seg.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      crumbs.push({ label: formatted, path: currentPath });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
        {/* Main Dashboard CTA */}
        <Link
          to="/admin"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black uppercase tracking-wider transition-all border",
            location.pathname === "/admin" 
              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
              : "bg-white/5 text-zinc-300 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard Overview
        </Link>

        {/* Grouped CMS Sections */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all border",
                      isActive 
                        ? "bg-primary/15 text-primary border-primary/40 shadow-sm" 
                        : "text-zinc-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-zinc-400")} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Admin User Footer */}
      <div className="p-4 border-t border-white/10 bg-[#07070c] space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black text-xs shrink-0">
              {profile?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-white truncate">{profile?.username || "Admin User"}</span>
              <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-green-400" /> Superadmin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to="/"
            target="_blank"
            className="flex-1"
          >
            <Button 
              variant="outline"
              size="sm"
              className="w-full text-[11px] font-bold h-8 border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 gap-1 rounded-xl"
            >
              <ExternalLink className="h-3 w-3 text-primary" /> Live Site
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 px-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
            title="Sign Out"
            onClick={() => signOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#050508] text-foreground select-none">
      {/* Keep every admin page out of search-engine indexes, even if a URL leaks */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-[#0a0a0f] text-foreground hidden md:flex flex-col">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10 bg-[#07070c]">
          <Link to="/" className="flex items-center gap-2 font-black text-lg tracking-tight text-white">
            <span className="text-primary">Donghua</span>CMS
          </Link>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase px-2">
            v2.4
          </Badge>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Admin Navigation Menu"
          className="fixed inset-0 z-50 flex md:hidden bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-64 bg-[#0a0a0f] border-r border-white/10 h-full flex flex-col shadow-2xl">
            <div className="flex h-16 items-center justify-between px-5 border-b border-white/10 bg-[#07070c]">
              <span className="font-black text-lg text-white">
                <span className="text-primary">Donghua</span>CMS
              </span>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5 text-zinc-400 hover:text-white" />
              </Button>
            </div>
            <SidebarContent />
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden text-zinc-300 hover:bg-white/5"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Dynamic Breadcrumb Bar */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 overflow-hidden">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="text-white font-black truncate">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="hover:text-white transition-colors truncate">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Quick Actions Header Items */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              System Operational
            </div>

            <Button
              size="sm"
              onClick={() => navigate("/")}
              className="hidden md:flex bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-black uppercase rounded-xl gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Live Site
            </Button>
          </div>
        </header>

        {/* Content Outlet Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

