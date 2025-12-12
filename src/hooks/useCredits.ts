import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setSubscriptionTier(null);
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
        setCredits(0);
      } else {
        setCredits(data?.credits ?? 0);
      }

      // Check subscription for unlimited status
      const { data: subData } = await supabase.functions.invoke("check-subscription");
      if (subData?.tier) {
        setSubscriptionTier(subData.tier);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0);
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

  const hasUnlimitedGenerations = subscriptionTier === "pro" || subscriptionTier === "studio";

  return { credits, loading, refetch, subscriptionTier, hasUnlimitedGenerations };
}
