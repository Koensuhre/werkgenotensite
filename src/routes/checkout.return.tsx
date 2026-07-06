import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSubscription, isActiveSubscription } from "@/hooks/use-subscription";
import { usePlans } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Bedankt voor je aanmelding — Werkgenoten" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: sub } = useSubscription();
  const { data: plans = [] } = usePlans();
  const [timedOut, setTimedOut] = useState(false);

  const active = isActiveSubscription(sub);
  const plan = active && sub?.price_id ? plans.find((p) => p.priceId === sub.price_id) : undefined;

  // Poll de subscription-query tot webhook de rij heeft geschreven, max 10 s.
  useEffect(() => {
    if (active || !user) return;
    const start = Date.now();
    const iv = setInterval(() => {
      if (Date.now() - start > 10_000) {
        setTimedOut(true);
        clearInterval(iv);
        return;
      }
      qc.invalidateQueries({ queryKey: ["subscription", user.id] });
    }, 1500);
    return () => clearInterval(iv);
  }, [active, user, qc]);

  if (!active && !timedOut) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-2">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Betaling verwerken…</h1>
        <p className="mt-3 text-muted-foreground">
          We wachten tot je abonnement actief is. Dit duurt meestal enkele seconden.
        </p>
      </div>
    );
  }

  if (!active && timedOut) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/15 text-amber-500">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Nog even geduld</h1>
        <p className="mt-3 text-muted-foreground">
          Je betaling is verstuurd maar we hebben je abonnement nog niet zien binnenkomen. Ververs de
          pagina of kijk op je dashboard — het verschijnt normaal binnen een minuut.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/dashboard/abonnement"
            className="rounded-lg bg-brand-gradient px-6 py-3 text-sm font-medium text-brand-foreground shadow-glow"
          >
            Naar mijn abonnement
          </Link>
        </div>
        {session_id && (
          <p className="mt-6 text-xs text-muted-foreground">Referentie: {session_id}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-brand-gradient text-brand-foreground">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Bedankt! Je abonnement is actief.
      </h1>
      <p className="mt-3 text-muted-foreground">
        {plan
          ? `Je bent aangemeld voor ${plan.name}. Je hebt nu volledige toegang tot alle Professional-functies.`
          : "Je betaling is verwerkt. Je hebt nu volledige toegang tot alle Professional-functies."}
      </p>
      {session_id && <p className="mt-3 text-xs text-muted-foreground">Referentie: {session_id}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/dashboard"
          className="rounded-lg bg-brand-gradient px-6 py-3 text-sm font-medium text-brand-foreground shadow-glow"
        >
          Naar mijn dashboard
        </Link>
        <Link
          to="/"
          className="rounded-lg border border-border bg-surface px-6 py-3 text-sm font-medium"
        >
          Terug naar home
        </Link>
      </div>
    </div>
  );
}
