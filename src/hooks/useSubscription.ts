import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionStatus {
  subscribed: boolean;
  tier: string | null;
  subscriptionEnd: string | null;
  hasUnlimitedGenerations: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    tier: null,
    subscriptionEnd: null,
    hasUnlimitedGenerations: false,
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setSubscription({
        subscribed: false,
        tier: null,
        subscriptionEnd: null,
        hasUnlimitedGenerations: false,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        console.error("Error checking subscription:", error);
        setLoading(false);
        return;
      }

      const tier = data?.tier || null;
      const hasUnlimited = tier === "pro" || tier === "studio";

      setSubscription({
        subscribed: data?.subscribed || false,
        tier,
        subscriptionEnd: data?.subscription_end || null,
        hasUnlimitedGenerations: hasUnlimited,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return { ...subscription, loading, refetch: checkSubscription };
}
