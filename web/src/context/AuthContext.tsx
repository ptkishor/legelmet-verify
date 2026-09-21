import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getEffectiveOnlineStatus } from "@/lib/syncEngine";
import type { Profile, UserRole } from "@/types/database";

export interface DemoAccount {
  key: string;
  role: UserRole;
  title: string;
  subtitle: string;
  email: string;
  badge: string;
  jurisdiction: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "admin",
    role: "admin",
    title: "State Admin (Bihar)",
    subtitle: "Awadhesh Narayan Singh (Controller)",
    email: "admin@legalmet.gov.in",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300",
    jurisdiction: "Bihar (Statewide)",
  },
  {
    key: "officer_patna",
    role: "metrology_officer",
    title: "Field Officer (Patna)",
    subtitle: "Alok Kumar Singh (Senior Inspector)",
    email: "officer.patna@legalmet.gov.in",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300",
    jurisdiction: "Patna, Bihar",
  },
  {
    key: "officer_samastipur",
    role: "metrology_officer",
    title: "Field Officer (Samastipur)",
    subtitle: "Rakesh Ranjan (Inspector)",
    email: "officer.samastipur@legalmet.gov.in",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300",
    jurisdiction: "Samastipur, Bihar",
  },
  {
    key: "officer_siwan",
    role: "metrology_officer",
    title: "Field Officer (Siwan)",
    subtitle: "Manoj Kumar Tiwari (Inspector)",
    email: "officer.siwan@legalmet.gov.in",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300",
    jurisdiction: "Siwan, Bihar",
  },
  {
    key: "officer_vaishali",
    role: "metrology_officer",
    title: "Field Officer (Vaishali)",
    subtitle: "Priya Kumari (Inspector)",
    email: "officer.vaishali@legalmet.gov.in",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300",
    jurisdiction: "Vaishali, Bihar",
  },
  {
    key: "trader_patna",
    role: "business_owner",
    title: "Business Owner (Patna)",
    subtitle: "Sunil Kumar Verma (Maurya Sweets)",
    email: "trader.patna@gmail.com",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300",
    jurisdiction: "Patna, Bihar",
  },
  {
    key: "trader_samastipur",
    role: "business_owner",
    title: "Business Owner (Samastipur)",
    subtitle: "Dinesh Yadav (Mithila Mandi)",
    email: "trader.samastipur@gmail.com",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300",
    jurisdiction: "Samastipur, Bihar",
  },
  {
    key: "trader_siwan",
    role: "business_owner",
    title: "Business Owner (Siwan)",
    subtitle: "Amitabh Roy (Siwan Petro)",
    email: "trader.siwan@gmail.com",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300",
    jurisdiction: "Siwan, Bihar",
  },
  {
    key: "trader_vaishali",
    role: "business_owner",
    title: "Business Owner (Vaishali)",
    subtitle: "Rajeev Ranjan (Hajipur Agro)",
    email: "trader.vaishali@gmail.com",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300",
    jurisdiction: "Vaishali, Bihar",
  },
  {
    key: "gatc",
    role: "gatc_user",
    title: "GATC Testing Lab",
    subtitle: "Dr. Meenakshi Sharma (Lead Metrologist)",
    email: "gatc.lab@legalmet.gov.in",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300",
    jurisdiction: "Central Standards Lab",
  },
];

const CACHED_AUTH_KEY = "legalmet_cached_auth";

interface CachedAuth {
  user: User;
  session: Session | null;
  profile: Profile;
  role: UserRole;
  savedAt: number;
}

function getLocalCachedAuth(): CachedAuth | null {
  try {
    const raw = localStorage.getItem(CACHED_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocalCachedAuth(user: User | null, session: Session | null, profile: Profile | null) {
  try {
    if (user && profile) {
      const data: CachedAuth = {
        user,
        session,
        profile,
        role: profile.role,
        savedAt: Date.now(),
      };
      localStorage.setItem(CACHED_AUTH_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.warn("Could not save cached auth:", e);
  }
}

function clearLocalCachedAuth() {
  try {
    localStorage.removeItem(CACHED_AUTH_KEY);
  } catch {}
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginAsDemo: (demoKey: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Pre-load from cached offline auth to ensure immediate rendering with 0 logout flicker
  const initialCached = getLocalCachedAuth();
  const [user, setUser] = useState<User | null>(initialCached?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialCached?.session ?? null);
  const [profile, setProfile] = useState<Profile | null>(initialCached?.profile ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCached);

  // Fetch or refresh profile details from public.profiles
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not load user profile from cloud (offline mode):", error.message);
        return null;
      }
      return (data as unknown as Profile) || null;
    } catch (err) {
      console.warn("Network error fetching profile:", err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    if (getEffectiveOnlineStatus()) {
      const p = await fetchProfile(user.id);
      if (p) {
        setProfile(p);
        saveLocalCachedAuth(user, session, p);
      }
    }
  }, [user, session, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    const isOnline = getEffectiveOnlineStatus();

    if (isOnline) {
      // 1. Initial active session check via Supabase when online
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          setSession(session);
          setUser(session.user);

          const p = await fetchProfile(session.user.id);
          if (mounted) {
            if (p) {
              setProfile(p);
              saveLocalCachedAuth(session.user, session, p);
            } else {
              // Network failed while loading profile -> preserve cached profile
              const cached = getLocalCachedAuth();
              if (cached?.profile) setProfile(cached.profile);
            }
          }
        } else {
          // If no active session online and no local cache, clear state
          const cached = getLocalCachedAuth();
          if (!cached) {
            setUser(null);
            setSession(null);
            setProfile(null);
          }
        }
        if (mounted) setIsLoading(false);
      }).catch((err) => {
        console.warn("Session check fallback to cached auth:", err);
        if (mounted) setIsLoading(false);
      });
    } else {
      // Offline mode active: Immediately restore cached auth without making network calls
      const cached = getLocalCachedAuth();
      if (cached) {
        setUser(cached.user);
        setSession(cached.session);
        setProfile(cached.profile);
      }
      setIsLoading(false);
    }

    // 2. Real-time auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);

        if (getEffectiveOnlineStatus()) {
          const p = await fetchProfile(currentSession.user.id);
          if (mounted) {
            if (p) {
              setProfile(p);
              saveLocalCachedAuth(currentSession.user, currentSession, p);
            } else {
              const cached = getLocalCachedAuth();
              if (cached?.profile) setProfile(cached.profile);
            }
          }
        }
      } else if (event === "SIGNED_OUT") {
        // Only clear if deliberately signed out while online
        if (getEffectiveOnlineStatus()) {
          clearLocalCachedAuth();
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    setIsLoading(true);

    // If offline, check if credentials match cached officer or demo account
    if (!getEffectiveOnlineStatus()) {
      const matchDemo = DEMO_ACCOUNTS.find((d) => d.email.toLowerCase() === email.toLowerCase());
      if (matchDemo && password === "Password@123") {
        setIsLoading(false);
        return loginAsDemo(matchDemo.key);
      }

      const cached = getLocalCachedAuth();
      if (cached && cached.user.email?.toLowerCase() === email.toLowerCase()) {
        setUser(cached.user);
        setSession(cached.session);
        setProfile(cached.profile);
        setIsLoading(false);
        return { error: null };
      }

      setIsLoading(false);
      return {
        error: new Error(
          "Device is offline. Connect to the internet to sign in with a new account, or use 1-click Offline Field Officer login below."
        ),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      setUser(data.user);
      setSession(data.session);

      if (data.user) {
        const p = await fetchProfile(data.user.id);
        setProfile(p);
        if (p) saveLocalCachedAuth(data.user, data.session, p);
      }

      setIsLoading(false);
      return { error: null };
    } catch (err) {
      setIsLoading(false);
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    metadata?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            ...metadata,
            full_name: fullName.trim(),
            phone: phone?.trim() || null,
            role: "business_owner",
          },
        },
      });

      setIsLoading(false);
      return { error };
    } catch (err) {
      setIsLoading(false);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    clearLocalCachedAuth();
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsLoading(false);
  };

  const loginAsDemo = async (
    demoKey: string
  ): Promise<{ error: Error | null }> => {
    const demo = DEMO_ACCOUNTS.find((d) => d.key === demoKey);
    if (!demo) {
      return { error: new Error(`Unknown demo account: ${demoKey}`) };
    }

    // Offline Demo Authentication: Instantly establishes and caches the demo officer session
    if (!getEffectiveOnlineStatus()) {
      const BIHAR_DEMO_IDS: Record<string, string> = {
        admin: "b848b279-831f-4ffe-a36e-01f774a4e00a",
        officer_patna: "4bb73cf2-56f7-4365-b3b8-31308b6257af",
        officer_samastipur: "be366d8d-4b91-4a5f-8046-d80042fa8cfd",
        officer_siwan: "f4f4d953-e0d0-49c4-900a-66a1902e922d",
        officer_vaishali: "6711445c-4fa1-413e-823b-d2f0517b8b2f",
        trader_patna: "aac8f5da-43de-4881-8dd5-b9feca62bdbf",
        trader_samastipur: "fc0f815a-a5fa-4ff3-8a7f-f29b67eb74bb",
        trader_siwan: "7ac64aa1-9b90-456d-9d26-8f88f83027e7",
        trader_vaishali: "2ccdb7e1-6ae3-4f33-b50a-9c0abee75e69",
        gatc: "1ef8f19b-d161-4cba-9efb-e7163f4d09ac",
      };

      const offlineProfile: Profile = {
        id: BIHAR_DEMO_IDS[demoKey] || "b848b279-831f-4ffe-a36e-01f774a4e00a",
        full_name: demo.subtitle.split(" (")[0] || demo.title,
        phone: "+91 98350 12345",
        role: demo.role,
        jurisdiction_state: "Bihar",
        jurisdiction_district: demo.jurisdiction.includes(",") ? demo.jurisdiction.split(", ")[0] : "Patna",
        designation: demo.subtitle.includes("(") ? demo.subtitle.split("(")[1].replace(")", "") : "Legal Metrology Officer",
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const offlineUser: any = {
        id: offlineProfile.id,
        email: demo.email,
        aud: "authenticated",
        role: "authenticated",
        user_metadata: {
          full_name: offlineProfile.full_name,
          role: offlineProfile.role,
          designation: offlineProfile.designation,
          jurisdiction_district: offlineProfile.jurisdiction_district,
          jurisdiction_state: offlineProfile.jurisdiction_state,
        },
      };

      const offlineSession: any = {
        access_token: "offline-auth-token-" + offlineProfile.id,
        token_type: "bearer",
        user: offlineUser,
      };

      setUser(offlineUser);
      setSession(offlineSession);
      setProfile(offlineProfile);
      saveLocalCachedAuth(offlineUser, offlineSession, offlineProfile);
      return { error: null };
    }

    return signIn(demo.email, "Password@123");
  };

  const role: UserRole | null = profile?.role ?? null;

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    loginAsDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
