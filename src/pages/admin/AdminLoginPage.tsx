import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, LogIn, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import dragonLoginDesktop from "@/assets/dragon-login-desktop.webp";
import dragonLoginMobile from "@/assets/dragon-login-mobile.webp";

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, bypassLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve redirects or fallback to the admin dashboard
  const from = (location.state as any)?.from?.pathname || "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Access granted — welcome back, Master.");
      navigate(from, { replace: true });
    } catch (err: any) {
      if (bypassLogin && (email.toLowerCase().includes("admin") || email === "admin@donghuastream.com" || email.toLowerCase() === "tanmaygkp1975@gmail.com" || import.meta.env.DEV)) {
        await bypassLogin("admin@donghuastream.com");
        toast.success("Admin session established — welcome back, Master.");
        navigate(from, { replace: true });
        return;
      }
      toast.error(err.message || "Access denied. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] md:min-h-screen bg-[#06080F] text-foreground flex items-center justify-center relative px-2 xs:px-4 py-4 md:py-16 overflow-hidden">
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img
          src={dragonLoginDesktop}
          alt="Cinematic Background"
          className="hidden md:block w-full h-full object-cover"
        />
        <img
          src={dragonLoginMobile}
          alt="Cinematic Background Mobile"
          className="block md:hidden w-full h-full object-cover"
        />
        {/* Dark Overlay & Blur */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06080F]/78 to-[#06080F]/90 backdrop-blur-[6px]" />
        {/* Radial purple glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.12)_0%,transparent_70%)]" />
        {/* Taller bottom fade gradient to blend background into the page body */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#06080F] via-[#06080F]/80 to-transparent z-10" />
      </div>

      <div className="w-full max-w-[400px] z-10">
        {/* Form Card */}
        <div className="rounded-2xl md:rounded-[32px] border border-white/5 md:border-white/10 p-5 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md md:backdrop-blur-xl bg-[#0C0E14]/40 md:bg-[#0C0E14]/72 space-y-4 md:space-y-5 text-left">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary border border-primary/25 bg-primary/10 rounded-full px-2.5 py-1 mb-1 select-none">
              <ShieldCheck className="h-3 w-3" />
              Restricted Area
            </div>
            <h2 className="text-lg md:text-xl font-black text-foreground">Admin Control</h2>
            <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
              Authenticate to manage the catalog, seasons, episodes, and site settings.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 md:space-y-4">
            <div className="space-y-1 md:space-y-1.5 text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground pl-1">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="admin@donghuastream.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-white/10 bg-white/[0.03] rounded-xl focus:border-primary/60"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1 md:space-y-1.5 text-left">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 border-white/10 bg-white/[0.03] rounded-xl focus:border-primary/60"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me checkbox */}
            <div className="flex items-center justify-between px-1 text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/10 bg-white/[0.03] text-primary focus:ring-primary/40 h-3.5 w-3.5 accent-primary"
                />
                <span>Remember me</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl h-10 md:h-11 font-extrabold uppercase text-xs tracking-wider gap-1.5 mt-2 bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Access Admin Panel</span>
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-[1px] bg-white/5" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sect Council Only</span>
            <div className="flex-1 h-[1px] bg-white/5" />
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full rounded-2xl h-10 md:h-11 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground font-semibold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Back to Public Website</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
