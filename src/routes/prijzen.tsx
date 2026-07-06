import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePlans } from "@/lib/queries";
import { useSession } from "@/hooks/use-session";
import { useSubscription, isActiveSubscription } from "@/hooks/use-subscription";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/prijzen")({
  head: () => ({
    meta: [
      { title: "Prijzen — Werkgenoten" },
      {
        name: "description",
        content:
          "Heldere abonnementen voor professionals. Opdrachtgevers gebruiken Werkgenoten gratis.",
      },
      { property: "og:title", content: "Prijzen — Werkgenoten" },
      { property: "og:description", content: "Abonnementen voor professionals." },
      { property: "og:url", content: "/prijzen" },
    ],
    links: [{ rel: "canonical", href: "/prijzen" }],
  }),
  component: Pricing,
});

function Pricing() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: sub } = useSubscription();
  const active = isActiveSubscription(sub);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const { data: plans = [], isLoading } = usePlans();

  const startCheckout = (priceId: string) => {
    if (!user) {
      navigate({ to: "/auth", search: { next: "/prijzen" } as never });
      return;
    }
    setCheckoutPriceId(priceId);
  };

  return (
    <>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Eenvoudige prijzen, geen verrassingen
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Opdrachtgevers betalen niets. Professionals kiezen een abonnement dat bij hun bedrijf
            past.
          </p>
        </div>
        {isLoading ? (
          <div className="mt-14 flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-14 rounded-xl border border-border/60 bg-surface/40 p-10 text-center text-sm text-muted-foreground">
            Er zijn nog geen abonnementen geconfigureerd. Neem contact op voor meer informatie.
          </div>
        ) : (
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = active && sub?.price_id === p.priceId;
            return (
            <div
              key={p.priceId}
              className={`relative rounded-2xl border p-6 ${p.highlight ? "border-brand/50 bg-card-gradient shadow-glow" : "border-border/60 bg-card-gradient shadow-card"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-gradient px-3 py-0.5 text-xs font-medium text-brand-foreground">
                  Aanbevolen
                </span>
              )}
              <div className="text-sm font-medium">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">€{p.price}</span>
                <span className="text-sm text-muted-foreground">
                  /{p.interval === "year" ? "jaar" : "maand"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={isCurrent}
                onClick={() => startCheckout(p.priceId)}
                className={`mt-8 w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed ${p.highlight ? "bg-brand-gradient text-brand-foreground" : "border border-border bg-surface hover:bg-surface-2"}`}
              >
                {isCurrent ? "Huidig plan" : active ? "Wijzig naar dit plan" : p.cta}
              </button>
            </div>
          );
          })}
        </div>
        )}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Alle prijzen zijn exclusief BTW. Maandelijks opzegbaar. Niet zeker welke past?{" "}
          <Link to="/word-professional" className="underline">
            Meer over Professional
          </Link>
          .
        </p>
      </div>
      <Dialog open={!!checkoutPriceId} onOpenChange={(open) => !open && setCheckoutPriceId(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Afrekenen</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {checkoutPriceId && user && (
              <StripeEmbeddedCheckout
                priceId={checkoutPriceId}
                userId={user.id}
                customerEmail={user.email ?? undefined}
                returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
