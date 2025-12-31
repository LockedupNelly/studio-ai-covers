import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let didSettle = false;

    // Safety: never stay stuck in loading forever
    const safetyTimeout = window.setTimeout(() => {
      if (!didSettle) {
        console.warn("[AuthContext] Safety timeout hit; forcing loading=false");
        setLoading(false);
      }
    }, 8000);

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthContext] onAuthStateChange", {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        currentPath: window.location.pathname,
        currentSearch: window.location.search,
      });

      didSettle = true;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Clean up OAuth params after callback
      const url = new URL(window.location.href);
      if (url.searchParams.has("code") || url.searchParams.has("error")) {
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_description");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    });

    // 1) If we have an OAuth `code` in the URL, exchange it for a session ourselves.
    // This avoids relying on implicit URL detection, which can hang in some environments.
    const url = new URL(window.location.href);
    const oauthCode = url.searchParams.get("code");
    if (oauthCode) {
      console.log("[AuthContext] Found OAuth code in URL; exchanging for session");
      supabase.auth
        .exchangeCodeForSession(oauthCode)
        .then(({ data, error }) => {
          if (error) {
            console.error("[AuthContext] exchangeCodeForSession error", error);
            toast.error("Login error", { description: error.message });
            return;
          }

          didSettle = true;
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setLoading(false);

          // Clean URL
          url.searchParams.delete("code");
          window.history.replaceState(null, "", url.pathname + url.search);
        })
        .catch((err) => {
          console.error("[AuthContext] exchangeCodeForSession exception", err);
          didSettle = true;
          setLoading(false);
        })
        .finally(() => {
          window.clearTimeout(safetyTimeout);
        });
      return () => {
        window.clearTimeout(safetyTimeout);
        subscription.unsubscribe();
      };
    }

    // 2) Otherwise, try reading the stored session directly (fast + avoids hanging getSession)
    try {
      const storageKey = (supabase.auth as any)?.storageKey ?? "supabase.auth.token";
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const stored = JSON.parse(raw);
        const storedSession = stored?.access_token ? (stored as Session) : null;
        console.log("[AuthContext] localStorage session", { hasSession: !!storedSession });
        didSettle = true;
        setSession(storedSession);
        setUser(storedSession?.user ?? null);
        setLoading(false);
      }
    } catch (err) {
      console.warn("[AuthContext] Failed reading stored session", err);
    } finally {
      window.clearTimeout(safetyTimeout);
      if (!didSettle) setLoading(false);
    }

    return () => {
      window.clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error("Sign in failed", {
          description: error.message,
        });
      }
    } catch (error) {
      toast.error("Sign in failed", {
        description: "An unexpected error occurred",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      // "Auth session missing" means user is already signed out - treat as success
      if (error && !error.message.includes('session missing')) {
        toast.error("Sign out failed", {
          description: error.message,
        });
      } else {
        // Clear local state regardless
        setUser(null);
        setSession(null);
        toast.success("Signed out", {
          description: "Come back soon!",
        });
      }
    } catch (error) {
      // Still clear local state on error
      setUser(null);
      setSession(null);
      toast.success("Signed out", {
        description: "Come back soon!",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
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
