import { AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

/**
 * Toont een dunning-banner bij `past_due` en een grace-period-banner bij
 * `canceled` met een toekomstige `current_period_end`. Verder onzichtbaar.
 */
export function SubscriptionBanner() {
  const { data: sub } = useSubscription();
  const [opening, setOpening] = useState(false);

  if (!sub) return null;

  const endDate = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const endStr = endDate ? endDate.toLocaleDateString("nl-NL") : null;

  const isPastDue = sub.status === "past_due";
  const isGrace =
    sub.status === "canceled" && endDate !== null && endDate.getTime() > Date.now();
  const isCancelScheduled =
    sub.cancel_at_period_end && sub.status !== "canceled" && endDate && endDate.getTime() > Date.now();

  if (!isPastDue && !isGrace && !isCancelScheduled) return null;

  async function openPortal() {
    setOpening(true);
    try {
      const result = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Kon klantportaal niet openen");
    } finally {
      setOpening(false);
    }
  }

  if (isPastDue) {
    return (
      <Banner tone="danger" icon={<AlertTriangle className="h-4 w-4" />}>
        <div className="flex-1">
          <div className="font-medium">Betaling mislukt</div>
          <div className="text-xs opacity-90">
            We konden je laatste betaling niet innen. Stripe probeert het automatisch opnieuw —
            update je betaalmethode om onderbreking te voorkomen.
          </div>
        </div>
        <PortalButton opening={opening} onClick={openPortal} label="Update betaalmethode" />
      </Banner>
    );
  }

  if (isGrace) {
    return (
      <Banner tone="warning" icon={<Clock className="h-4 w-4" />}>
        <div className="flex-1">
          <div className="font-medium">Abonnement opgezegd</div>
          <div className="text-xs opacity-90">
            Je hebt toegang tot premium features tot {endStr}. Daarna vervalt je abonnement.
          </div>
        </div>
        <PortalButton opening={opening} onClick={openPortal} label="Heractiveer" />
      </Banner>
    );
  }

  return (
    <Banner tone="warning" icon={<Clock className="h-4 w-4" />}>
      <div className="flex-1">
        <div className="font-medium">Opzegging gepland</div>
        <div className="text-xs opacity-90">
          Je abonnement loopt af op {endStr}. Je behoudt tot die datum volledige toegang.
        </div>
      </div>
      <PortalButton opening={opening} onClick={openPortal} label="Beheer abonnement" />
    </Banner>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "danger" | "warning";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-amber-500/40 bg-amber-500/10 text-amber-500";
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <div className="mt-0.5">{icon}</div>
      {children}
    </div>
  );
}

function PortalButton({
  opening,
  onClick,
  label,
}: {
  opening: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={opening}
      className="shrink-0 rounded-lg border border-current/40 bg-background/40 px-3 py-1.5 text-xs font-medium hover:bg-background/60 disabled:opacity-60"
    >
      {opening ? "Bezig…" : label}
    </button>
  );
}