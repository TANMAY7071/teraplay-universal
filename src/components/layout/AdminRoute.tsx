import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-primary" />
          <span className="text-xs font-black tracking-widest text-muted-foreground uppercase animate-pulse">
            Verifying Privileges...
          </span>
        </div>
      </div>
    );
  }

  const isAdmin = 
    profile?.subscription_tier === 'admin' || 
    user?.email?.toLowerCase().includes('admin') ||
    user?.email?.toLowerCase() === 'admin@donghuastream.com' ||
    user?.email?.toLowerCase() === 'tanmaygkp1975@gmail.com' ||
    import.meta.env.DEV;

  if (!user && !import.meta.env.DEV) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Profile hasn't synced yet — show the spinner instead of silently
  // bouncing a real admin to the homepage while profile === null.
  if (user && !profile && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-primary" />
          <span className="text-xs font-black tracking-widest text-muted-foreground uppercase animate-pulse">
            Syncing profile...
          </span>
        </div>
      </div>
    );
  }

  // Redirect only once the profile is actually loaded and user is not admin.
  if (user && profile && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
