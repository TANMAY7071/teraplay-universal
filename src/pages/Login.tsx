import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, LogIn, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import dragonLoginDesktop from "@/assets/dragon-login-desktop.webp";
import dragonLoginMobile from "@/assets/dragon-login-mobile.webp";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signInWithGoogle, bypassLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve redirects or fallback to Home
  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Successfully logged in!");
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed.");
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
            <h2 className="text-lg md:text-xl font-black text-foreground">Sign In</h2>
            <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
              Sign in to sync your watch history, library, and personalized recommendations.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 md:space-y-4">
            <div className="space-y-1 md:space-y-1.5 text-left">
              <label className="text-[10px] font-black uppercase text-muted-foreground pl-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-white/10 bg-white/[0.03] rounded-xl focus:border-primary/60"
                  required
                />
              </div>
            </div>

            <div className="space-y-1 md:space-y-1.5 text-left">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-primary font-bold hover:underline">
                  Forgot?
                </Link>
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
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-[1px] bg-white/5" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Or</span>
            <div className="flex-1 h-[1px] bg-white/5" />
          </div>

          {/* Social Logins */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full rounded-2xl h-10 md:h-11 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-semibold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google Single Sign-on</span>
            </Button>

            {import.meta.env.DEV && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await bypassLogin(email);
                    toast.success("Bypassed authentication! Entering local guest mode...");
                    navigate(from, { replace: true });
                  } catch (err: any) {
                    toast.error("Failed to bypass authentication.");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="w-full rounded-2xl h-10 md:h-11 text-xs border-primary/25 bg-primary/10 hover:bg-primary/20 text-primary font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all"
              >
                <LogIn className="h-4 w-4 text-primary animate-pulse" />
                <span>Bypass Auth (Local Guest Mode)</span>
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/5 my-2" />

          {/* Footer Redirect moved inside Card */}
          <div className="text-center text-xs text-muted-foreground pt-1">
            New to the Sect?{" "}
            <Link to="/register" className="text-primary font-bold hover:underline inline-flex items-center gap-0.5">
              Register here <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
