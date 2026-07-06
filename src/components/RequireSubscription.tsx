import { Link } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { useHasActiveSubscription, useSubscription } from "@/hooks/use-subscription";

interface Props {
  children: React.ReactNode;
  /** Als gezet: alleen deze price-IDs (lookup keys) tellen als toegang. */
  allowedPriceIds?: string[];
  title?: string;
  description?: string;
}

/**
 * Gate content achter een actief abonnement. Toont upgrade-card wanneer
 * de user geen (of het verkeerde) actief abonnement heeft.
 */
export function RequireSubscription({
  children,
  allowedPriceIds,
  title = "Alleen voor abonnees",
  description = "Deze functie is onderdeel van het Professional-abonnement.",
}: Props) {
  const { isActive, isLoading } = useHasActiveSubscription();
  const { data: sub } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tierOk =
    !allowedPriceIds || (isActive && sub?.price_id && allowedPriceIds.includes(sub.price_id));

  if (isActive && tierOk) return <>{children}</>;

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border/60 bg-card-gradient p-8 text-center shadow-card">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-brand-foreground">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Link
        to="/dashboard/abonnement"
        className="mt-6 inline-block rounded-lg bg-brand-gradient px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-glow"
      >
        Bekijk abonnementen
      </Link>
    </div>
  );
}