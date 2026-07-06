import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Clock, Euro, Shield, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useJob, formatBudget, timeAgo } from "@/lib/queries";
import { useSession } from "@/hooks/use-session";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useHasActiveSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/opdrachten/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Opdracht — Werkgenoten" },
      { name: "description", content: "Bekijk de opdracht en stuur een offerte." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `/opdrachten/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/opdrachten/${params.slug}` }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Opdracht niet gevonden</h1>
      <Link to="/opdrachten" className="mt-4 inline-block text-brand hover:underline">
        ← Terug naar opdrachten
      </Link>
    </div>
  ),
  component: JobDetail,
});

function JobDetail() {
  const { slug } = Route.useParams();
  const { data: job, isLoading } = useJob(slug);
  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const { isActive } = useHasActiveSubscription();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const submitQuote = useMutation({
    mutationFn: async () => {
      if (!job) throw new Error("Opdracht niet geladen");
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Vul een geldig bedrag in");
      const { error } = await supabase.rpc("submit_quote", {
        _job_id: job.id,
        _amount: Math.round(amt),
        _message: message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offerte verzonden");
      setQuoteOpen(false);
      setAmount("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["job", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPro = profile?.primary_type === "professional";
  const isOwner = job && user?.id === job.client_id;
  const canQuote = !!user && isPro && isActive && !isOwner && job?.status === "open";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center text-sm text-muted-foreground">
        Laden…
      </div>
    );
  }
  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Opdracht niet gevonden</h1>
        <Link to="/opdrachten" className="mt-4 inline-block text-brand hover:underline">
          ← Terug naar opdrachten
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        to="/opdrachten"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Alle opdrachten
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <article>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-surface-2 px-2 py-0.5">{job.category?.name ?? "—"}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {job.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {timeAgo(job.created_at)}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{job.title}</h1>

          <div className="bg-card-gradient shadow-card mt-6 rounded-xl border border-border/60 p-6">
            <h2 className="text-sm font-medium">Beschrijving</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          </div>

          <div className="bg-card-gradient shadow-card mt-4 rounded-xl border border-border/60 p-6">
            <h2 className="text-sm font-medium">Foto's</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg border border-dashed border-border bg-surface-2/40"
                />
              ))}
            </div>
          </div>

          <div className="bg-card-gradient shadow-card mt-4 rounded-xl border border-border/60 p-6">
            <h2 className="text-sm font-medium">Ontvangen offertes ({job.offers})</h2>
            {job.offers === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nog geen offertes ontvangen.</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {job.offers} {job.offers === 1 ? "offerte" : "offertes"} — log in als opdrachtgever
                om ze te zien.
              </p>
            )}
          </div>
        </article>

        <aside className="space-y-3">
          <div className="bg-card-gradient shadow-card sticky top-20 rounded-xl border border-border/60 p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Budget</span>
              <Euro className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {formatBudget(job.budget_min, job.budget_max)}
            </div>
            {isOwner ? (
              <Link
                to="/dashboard/projecten/$jobId"
                params={{ jobId: job.id }}
                className="mt-5 block w-full rounded-lg bg-brand-gradient px-4 py-2.5 text-center text-sm font-medium text-brand-foreground shadow-glow"
              >
                Beheer je project
              </Link>
            ) : !user ? (
              <Link
                to="/auth"
                className="mt-5 block w-full rounded-lg bg-brand-gradient px-4 py-2.5 text-center text-sm font-medium text-brand-foreground shadow-glow"
              >
                Log in om te reageren
              </Link>
            ) : canQuote ? (
              <button
                onClick={() => setQuoteOpen(true)}
                className="mt-5 w-full rounded-lg bg-brand-gradient px-4 py-2.5 text-sm font-medium text-brand-foreground shadow-glow"
              >
                Offerte versturen
              </button>
            ) : isPro && !isActive ? (
              <Link
                to="/dashboard/abonnement"
                className="mt-5 block w-full rounded-lg bg-brand-gradient px-4 py-2.5 text-center text-sm font-medium text-brand-foreground shadow-glow"
              >
                Abonnement nodig om offerte te versturen
              </Link>
            ) : !isPro ? (
              <Link
                to="/word-professional"
                className="mt-5 block w-full rounded-lg bg-brand-gradient px-4 py-2.5 text-center text-sm font-medium text-brand-foreground shadow-glow"
              >
                Word Werkgenoot om te reageren
              </Link>
            ) : (
              <div className="mt-5 text-center text-xs text-muted-foreground">
                Deze opdracht is niet meer open.
              </div>
            )}
            {user && !isOwner && (
              <button
                onClick={() =>
                  navigate({
                    to: "/dashboard/berichten/$jobId",
                    params: { jobId: job.id },
                    search: { with: job.client_id },
                  })
                }
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface/60 px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
              >
                <MessageCircle className="h-4 w-4" /> Stel een vraag
              </button>
            )}
            <div className="mt-5 border-t border-border/60 pt-4 text-xs">
              <div className="font-medium">Opdrachtgever</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-medium">
                  {(job.client?.display_name ?? "?")[0]}
                </div>
                <div>
                  <div className="text-sm">{job.client?.display_name ?? "Opdrachtgever"}</div>
                  {job.client?.city && (
                    <div className="text-muted-foreground">{job.client.city}</div>
                  )}
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-1 text-brand">
                <Shield className="h-3 w-3" /> Geverifieerd
              </div>
            </div>
          </div>
        </aside>
      </div>
      {quoteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setQuoteOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card"
          >
            <h3 className="text-lg font-semibold">Offerte versturen</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              De opdrachtgever ziet je bedrag, bericht en profiel.
            </p>
            <label className="mt-4 block text-xs font-medium">Bedrag (€, excl. btw)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="bijv. 850"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-medium">Bericht (optioneel)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Leg kort uit wat je aanpak is."
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setQuoteOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Annuleren
              </button>
              <button
                onClick={() => submitQuote.mutate()}
                disabled={submitQuote.isPending}
                className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
              >
                Verstuur offerte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
