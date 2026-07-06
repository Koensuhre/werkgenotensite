import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useSession } from "./use-session";

export type SubscriptionRow = {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function useSubscription() {
  const { user } = useSession();
  const qc = useQueryClient();

  // Realtime: elke wijziging van de eigen subscription-rij → refetch.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`subscription:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["subscription", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      let env: string;
      try {
        env = getStripeEnvironment();
      } catch {
        return null;
      }
      const { data, error } = await (supabase.from("subscriptions") as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SubscriptionRow | null;
    },
  });
}

export function isActiveSubscription(
  sub: { status: string; current_period_end: string | null } | null | undefined,
): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const future = end === null || end > Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status) && future) return true;
  if (sub.status === "canceled" && end !== null && end > Date.now()) return true;
  return false;
}

/** Gebruik voor UI-gates: mag deze user premium features zien? */
export function useHasActiveSubscription(): { isActive: boolean; isLoading: boolean } {
  const { data, isLoading } = useSubscription();
  return { isActive: isActiveSubscription(data), isLoading };
}
