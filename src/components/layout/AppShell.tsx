import type { ReactNode } from "react";
import { CalendarDays, Compass, Home, Library, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ConsentBanner from "@/components/layout/ConsentBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Explore", icon: Compass, path: "/explore" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
  { label: "Library", icon: Library, path: "/library" },
  { label: "Profile", icon: User, path: "/profile" },
];

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  useTheme();

  const isVideoPage =
    location.pathname === "/" ||
    location.pathname.startsWith("/terabox") ||
    location.pathname.startsWith("/1024") ||
    location.pathname.startsWith("/nephobox");

  const isItemActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden w-full max-w-full relative touch-pan-y select-none">
      <Navbar />

      {/* Main Content Area */}
      <main className={cn("min-h-screen pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0 overflow-x-hidden w-full max-w-full relative touch-pan-y")}>
        {children}
      </main>

      {/* Mobile/Tablet Bottom Navigation Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/82 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl lg:hidden">
        <nav className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            return (
              <button
                key={item.label}
                className={cn(
                  "relative h-14 flex flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] transition-all bg-transparent border-none outline-none focus:outline-none focus:ring-0 active:bg-transparent",
                  active
                    ? "text-[#A855F7] font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  if (location.pathname === item.path) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    navigate(item.path);
                  }
                }}
              >
                {/* Sleek focused glow behind active icon */}
                {active && (
                  <div className="absolute inset-0 m-auto h-7 w-12 bg-[#A855F7]/12 rounded-full blur-[10px] pointer-events-none z-0 animate-fade-in" />
                )}
                <Icon className={cn("relative z-10 h-5 w-5 transition-transform duration-300", active ? "scale-110 text-[#A855F7]" : "text-muted-foreground")} />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <ConsentBanner />

      {!isVideoPage && (
        <div className="hidden md:block relative z-10">
          <Footer />
        </div>
      )}
    </div>
  );
};


export default AppShell;

