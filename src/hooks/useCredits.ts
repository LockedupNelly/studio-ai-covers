import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState<number | null>(null);
  const [subscriptionLimit, setSubscriptionLimit] = useState<number | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setSubscriptionTier(null);
      setSubscriptionUsage(null);
      setSubscriptionLimit(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch credits
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        // Don't clobber the UI with 0 on transient errors; keep the previous value.
      } else {
        setCredits(data?.credits ?? 0);
      }

      // Check subscription for tier, usage, and limits
      const { data: subData } = await supabase.functions.invoke("check-subscription");
      if (subData?.tier) {
        setSubscriptionTier(subData.tier);
        setSubscriptionUsage(subData.usage ?? 0);
        setSubscriptionLimit(subData.limit ?? null);
      } else {
        setSubscriptionTier(null);
        setSubscriptionUsage(null);
        setSubscriptionLimit(null);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      // Keep last known credits on errors.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchCredits();
  }, [fetchCredits]);

  const hasUnlimitedGenerations = subscriptionTier === "pro" || subscriptionTier === "studio" || subscriptionTier === "starter";

  return { 
    credits, 
    loading, 
    refetch, 
    subscriptionTier, 
    hasUnlimitedGenerations,
    subscriptionUsage,
    subscriptionLimit
  };
}
