import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Allow guests (no account) through. Used by /watch: guests track progress
   * in localStorage only (services/guestSync.ts), which migrates to their
   * account on sign-in. Library/Profile/Community still require a real user.
   */
  allowGuest?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowGuest = false }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-4">
          {/* Animated Spinner with brand gradient */}
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-primary" />
          <span className="text-xs font-black tracking-widest text-muted-foreground uppercase animate-pulse">
            Channelling Qi...
          </span>
        </div>
      </div>
    );
  }

  if (!user && !allowGuest) {
    // Redirect to login page and save target location in history state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
