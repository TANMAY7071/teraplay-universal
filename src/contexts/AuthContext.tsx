import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncGuestProgressToAccount } from "@/services/guestSync";
import type { Session, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  avatar_frame: string;
  cultivation_rank: string;
  xp: number;
  level: number;
  subscription_tier: string;
  preferences: Record<string, any>;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  bypassLogin: (email?: string) => Promise<void>;
}

const isMockMode = import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes("placeholder-id"));

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile details from users table. Resolves `true` only when profile
  // state was actually set (DB row, upserted row, or local fallback) so
  // callers can gate clearing the loading spinner on a profile really existing.
  const fetchProfile = async (userId: string, userEmail: string, metaUsername?: string): Promise<boolean> => {
    // Toast at most once per call — failures must be loud, never repeated.
    let toastedFailure = false;
    const toastLoadFailure = () => {
      if (!toastedFailure) {
        toastedFailure = true;
        // Loud failure: a swallowed SELECT error used to leave profile null
        // forever and AdminRoute treated the admin as unauthorized.
        toast.error("Failed to load profile");
      }
    };

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
        toastLoadFailure();
      }

      if (data) {
        setProfile(data as UserProfile);
        return true;
      }

      // Silent-zero-row case: the SELECT found no row for a real (non-mock)
      // auth user. Warn loudly with the id so a missing DB-trigger row is
      // diagnosable instead of failing silently downstream.
      if (!isMockMode && !userId.startsWith("mock-user-id-") && (!error || error.code === "PGRST116")) {
        console.warn(
          `[AuthContext] fetchProfile: no profile row for user ${userId} (email ${userEmail}) — creating fallback profile.`
        );
      }

      // Fallback profile creation if not created by DB trigger
      const defaultUsername = metaUsername || userEmail.split("@")[0] || "Cultivator";
      // Never include subscription_tier here: on conflict this upserts over
      // the existing row and would reset a DB-granted admin tier to free.
      const newProfile = {
        id: userId,
        email: userEmail,
        username: defaultUsername,
        avatar_url: "",
        avatar_frame: "none",
        cultivation_rank: "Qi Condensation I",
        xp: 0,
        level: 1,
        preferences: {},
      };

      const { data: upsertedData, error: upsertError } = await supabase
        .from("users")
        .upsert(newProfile)
        .select("*")
        .maybeSingle();

      if (upsertError) {
        console.error("Failed to upsert default profile:", upsertError);
        // Local fallback so application doesn't block
        setProfile({ ...newProfile, subscription_tier: "free", created_at: new Date().toISOString() } as UserProfile);
      } else if (upsertedData) {
        setProfile(upsertedData as UserProfile);
      } else {
        // Upsert reported no error but returned no row — still never leave
        // profile null for a signed-in user, or user && profile never resolves.
        setProfile({ ...newProfile, subscription_tier: "free", created_at: new Date().toISOString() } as UserProfile);
      }
      return true;
    } catch (e) {
      console.error("Exception during profile sync:", e);
      toastLoadFailure();
      // Local fallback (same pattern as the upsertError path above) so an
      // exception no longer swallows the profile: user && profile still
      // resolves and AdminRoute sees a real profile instead of null.
      setProfile({
        id: userId,
        email: userEmail,
        username: metaUsername || userEmail.split("@")[0] || "Cultivator",
        avatar_url: "",
        avatar_frame: "none",
        cultivation_rank: "Qi Condensation I",
        xp: 0,
        level: 1,
        subscription_tier: "free",
        preferences: {},
        created_at: new Date().toISOString(),
      } as UserProfile);
      return true;
    }
  };

  // NOTE: guests are intentionally database-free — their watch history lives
  // in localStorage only (see services/guestSync.ts) and is batched into the
  // account on sign-in. No anonymous Supabase sessions are created.

  useEffect(() => {
    if (import.meta.env.DEV) {
      const savedSession = localStorage.getItem("donghua-mock-session");
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          setSession(parsed.session);
          setUser(parsed.user);
          setProfile(parsed.profile);
        } catch (e) {
          console.error("Failed to parse mock session:", e);
        }
        setIsLoading(false);
        return;
      }
    }

    if (isMockMode) {
      setIsLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email ?? "", session.user.user_metadata?.username);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error("Error fetching initial session:", err);
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // If a mock session exists in localStorage, do not overwrite it with Supabase state (DEV mode only)
      if (import.meta.env.DEV && localStorage.getItem("donghua-mock-session")) {
        return;
      }

      // Clear TanStack Query Cache on transition to prevent cross-session data leak
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || (event as string) === "USER_DELETED") {
        queryClient.clear();
      }

      if (event === "SIGNED_IN" && session?.user) {
        // "Watch now, sign up later": migrate any guest (localStorage) history
        // into the account in one batched write. Local data is kept on failure
        // so the next sign-in retries automatically.
        syncGuestProgressToAccount(session.user.id)
          .then((res) => {
            if (res.episodesSynced > 0 || res.watchlistSynced > 0) {
              toast.success("Guest history synced to your account!");
              queryClient.invalidateQueries();
            }
          })
          .catch(() => {});
        sessionStorage.removeItem("donghua-guest-id-before-login");
        sessionStorage.removeItem("donghua-guest-id-before-oauth");
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true);
        // Only clear loading when fetchProfile actually set profile state —
        // clearing it while profile is still null makes AdminRoute treat a
        // real admin as unauthorized and redirect them to the homepage.
        fetchProfile(session.user.id, session.user.email ?? "", session.user.user_metadata?.username).then((profileSet) => {
          if (profileSet) {
            setIsLoading(false);
          }
        });
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Monitor loading status of profile sync
  useEffect(() => {
    if (user && profile) {
      setIsLoading(false);
    }
  }, [user, profile]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const mockUser = {
        id: "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, "-"),
        email,
        user_metadata: { username: email.split("@")[0] },
        is_anonymous: false,
      } as any;
      const mockProfile = {
        id: mockUser.id,
        email,
        username: email.split("@")[0],
        avatar_url: "",
        avatar_frame: "none",
        cultivation_rank: "Qi Condensation I",
        xp: 120,
        level: 1,
        subscription_tier: "free",
        preferences: {},
        created_at: new Date().toISOString(),
      };
      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: mockUser,
      } as any;
      localStorage.setItem("donghua-mock-session", JSON.stringify({ session: mockSession, user: mockUser, profile: mockProfile }));
      setSession(mockSession);
      setUser(mockUser);
      setProfile(mockProfile);
      setIsLoading(false);
      toast.success("Signed in successfully (Mock Mode Sandbox)!");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
    } catch (err: any) {
      // Re-throw auth and network failures alike — no silent fallback session.
      throw err;
    }
  };

  const bypassLogin = async (customEmail?: string) => {
    if (!import.meta.env.DEV) {
      // Local guest mode is a development-only convenience; never create a
      // fake session in production.
      console.warn("bypassLogin is disabled in production builds");
      return;
    }
    setIsLoading(true);
    const email = customEmail || "guest.cultivator@donghuastream.com";
    const isAdmin = import.meta.env.DEV && email.toLowerCase().includes("admin");
    const mockUser = {
      id: "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, "-"),
      email,
      user_metadata: { username: email.split("@")[0] },
      is_anonymous: false,
    } as any;
    const mockProfile = {
      id: mockUser.id,
      email,
      username: email.split("@")[0],
      avatar_url: "",
      avatar_frame: "none",
      cultivation_rank: isAdmin ? "Deity Realm" : "Qi Condensation I",
      xp: 120,
      level: isAdmin ? 99 : 1,
      subscription_tier: isAdmin ? "admin" : "free",
      preferences: {},
      created_at: new Date().toISOString(),
    };
    const mockSession = {
      access_token: "mock-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: mockUser,
    } as any;
    localStorage.setItem("donghua-mock-session", JSON.stringify({ session: mockSession, user: mockUser, profile: mockProfile }));
    setSession(mockSession);
    setUser(mockUser);
    setProfile(mockProfile);
    setIsLoading(false);
  };

  const signUp = async (email: string, password: string, username: string) => {
    setIsLoading(true);
    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockUser = {
        id: "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, "-"),
        email,
        user_metadata: { username },
        is_anonymous: false,
      } as any;
      const mockProfile = {
        id: mockUser.id,
        email,
        username,
        avatar_url: "",
        avatar_frame: "none",
        cultivation_rank: "Qi Condensation I",
        xp: 0,
        level: 1,
        subscription_tier: "free",
        preferences: {},
        created_at: new Date().toISOString(),
      };
      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: mockUser,
      } as any;
      localStorage.setItem("donghua-mock-session", JSON.stringify({ session: mockSession, user: mockUser, profile: mockProfile }));
      setSession(mockSession);
      setUser(mockUser);
      setProfile(mockProfile);
      setIsLoading(false);
      toast.success("Account created successfully (Mock Mode Sandbox)!");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    if (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    // Mock login for testing while Google OAuth API is not configured
    await new Promise((resolve) => setTimeout(resolve, 300));
    const mockUser = {
      id: "mock-google-user",
      email: "creator@teraplay.com",
      user_metadata: { username: "TeraPlay Creator" },
      is_anonymous: false,
    } as any;
    const mockProfile = {
      id: mockUser.id,
      email: mockUser.email,
      username: "TeraPlay Creator",
      avatar_url: "",
      avatar_frame: "none",
      cultivation_rank: "VIP Unlimited",
      xp: 500,
      level: 5,
      subscription_tier: "premium",
      preferences: {},
      created_at: new Date().toISOString(),
    };
    const mockSession = {
      access_token: "mock-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: mockUser,
    } as any;
    localStorage.setItem("donghua-mock-session", JSON.stringify({ session: mockSession, user: mockUser, profile: mockProfile }));
    localStorage.removeItem("teraplay_guest_plays");
    setSession(mockSession);
    setUser(mockUser);
    setProfile(mockProfile);
    setIsLoading(false);
    toast.success("Signed in with Google (Mock Testing Mode)!");
  };

  const signOut = async () => {
    setIsLoading(true);
    const keys = [
      "donghua-watchlist",
      "donghua-continue-watching",
      "donghua-episode-progress",
      "donghua-ratings",
      "donghua-notifications",
      "donghua-recent-searches",
      "donghua-recently-viewed",
      "donghua-mock-session",
      "teraplay_guest_plays"
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    setProfile(null);
    setUser(null);
    setSession(null);
    setIsLoading(false);
    toast.success("Signed out successfully!");
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isMockMode) {
      if (!user) throw new Error("No active user to update profile for");
      if (profile) {
        const updated = { ...profile, ...updates };
        setProfile(updated);
        const sessionData = import.meta.env.DEV ? localStorage.getItem("donghua-mock-session") : null;
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          parsed.profile = updated;
          localStorage.setItem("donghua-mock-session", JSON.stringify(parsed));
        }
      }
      return;
    }

    if (!user) throw new Error("No active user to update profile for");

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) throw error;
    if (data) {
      setProfile(data as UserProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateProfile,
        bypassLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
