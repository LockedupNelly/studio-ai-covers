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
        currentHash: window.location.hash ? 'has hash' : 'no hash'
      });
      didSettle = true;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Clean up URL hash after OAuth callback
      if (event === "SIGNED_IN" && window.location.hash) {
        console.log("[AuthContext] Cleaning up hash after SIGNED_IN");
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log("[AuthContext] getSession", { hasSession: !!session });
        didSettle = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Clean up URL hash on initial load if user is already signed in
        if (session && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      })
      .catch((err) => {
        console.error("[AuthContext] getSession error", err);
        didSettle = true;
        setLoading(false);
        toast.error("Auth error", { description: "Could not initialize login. Please refresh." });
      })
      .finally(() => {
        window.clearTimeout(safetyTimeout);
      });

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
