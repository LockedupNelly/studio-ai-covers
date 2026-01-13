import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreditsState {
  credits: number | null;
  loading: boolean;
  subscriptionTier: string | null;
  subscriptionUsage: number | null;
  subscriptionLimit: number | null;
}

const initialState: CreditsState = {
  credits: null,
  loading: true,
  subscriptionTier: null,
  subscriptionUsage: null,
  subscriptionLimit: null,
};

export function useCredits() {
  const { user } = useAuth();
  const [state, setState] = useState<CreditsState>(initialState);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false); // Prevent concurrent fetches

  const fetchCredits = useCallback(async () => {
    // Prevent concurrent/duplicate fetches
    if (fetchingRef.current) return;
    
    if (!user) {
      setState({
        credits: null,
        loading: false,
        subscriptionTier: null,
        subscriptionUsage: null,
        subscriptionLimit: null,
      });
      return;
    }

    fetchingRef.current = true;

    try {
      // Fetch credits
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mountedRef.current) {
        fetchingRef.current = false;
        return;
      }

      let newCredits = 0;
      if (!error) {
        newCredits = data?.credits ?? 0;
      } else {
        console.error("Error fetching credits:", error);
      }

      // Check subscription for tier, usage, and limits
      const { data: subData } = await supabase.functions.invoke("check-subscription");

      if (!mountedRef.current) {
        fetchingRef.current = false;
        return;
      }

      if (subData?.tier) {
        setState({
          credits: newCredits,
          loading: false,
          subscriptionTier: subData.tier,
          subscriptionUsage: subData.usage ?? 0,
          subscriptionLimit: subData.limit ?? null,
        });
      } else {
        setState({
          credits: newCredits,
          loading: false,
          subscriptionTier: null,
          subscriptionUsage: null,
          subscriptionLimit: null,
        });
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [user]); // Only depend on user, NOT state.credits

  useEffect(() => {
    mountedRef.current = true;
    fetchCredits();
    return () => {
      mountedRef.current = false;
    };
  }, [user]); // Only re-run when user changes, not when fetchCredits reference changes

  const refetch = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    fetchCredits();
  }, [fetchCredits]);

  const hasUnlimitedGenerations =
    state.subscriptionTier === "pro" ||
    state.subscriptionTier === "studio" ||
    state.subscriptionTier === "starter";

  return {
    credits: state.credits,
    loading: state.loading,
    refetch,
    subscriptionTier: state.subscriptionTier,
    hasUnlimitedGenerations,
    subscriptionUsage: state.subscriptionUsage,
    subscriptionLimit: state.subscriptionLimit,
  };
}
