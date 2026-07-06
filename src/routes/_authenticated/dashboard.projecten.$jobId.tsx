import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Star, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { formatBudget } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard/projecten/$jobId")({
  component: ProjectDetail,
});

type QuoteRow = {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
  pro_id: string;
  pro: {
    display_name: string | null;
    company: string | null;
    city: string | null;
    rating_avg: number | null;
    review_count: number;
    slug: string | null;
  } | null;
};

function ProjectDetail() {
  const { jobId } = Route.useParams();
  const { user } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const jobQ = useQuery({
    queryKey: ["job-detail", jobId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, slug, title, description, city, status, budget_min, budget_max, awarded_pro_id, completed_at, created_at, client_id",
        )
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const quotesQ = useQuery({
    queryKey: ["job-quotes", jobId],
    enabled: !!user,
    queryFn: async (): Promise<QuoteRow[]> => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, amount, message, status, created_at, pro_id")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((q) => q.pro_id)));
      if (!ids.length) return [];
      const { data: pros } = await supabase
        .from("profiles")
        .select("id, display_name, company, city, rating_avg, review_count, slug")
        .in("id", ids);
      const byId = new Map((pros ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((q) => ({
        ...q,
        pro: (byId.get(q.pro_id) as QuoteRow["pro"]) ?? null,
      }));
    },
  });

  const reviewQ = useQuery({
    queryKey: ["job-review", jobId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body, created_at")
        .eq("job_id", jobId)
        .eq("client_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const acceptMut = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase.rpc("accept_quote", { _quote_id: quoteId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offerte geaccepteerd");
      qc.invalidateQueries({ queryKey: ["job-detail", jobId] });
      qc.invalidateQueries({ queryKey: ["job-quotes", jobId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const declineMut = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase.rpc("decline_quote", { _quote_id: quoteId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offerte afgewezen");
      qc.invalidateQueries({ queryKey: ["job-quotes", jobId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("complete_job", { _job_id: jobId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project afgerond");
      qc.invalidateQueries({ queryKey: ["job-detail", jobId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const job = jobQ.data;
  const quotes = quotesQ.data ?? [];
  const acceptedQuote = quotes.find((q) => q.status === "accepted");

  if (jobQ.isLoading) return <div className="text-sm text-muted-foreground">Laden…</div>;
  if (!job)
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm">
        Project niet gevonden.
      </div>
    );

  const isOwner = job.client_id === user?.id;

  return (
    <div>
      <Link
        to="/dashboard/projecten"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mijn projecten
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="text-xs text-muted-foreground">
            {job.city ?? "—"} · {formatBudget(job.budget_min, job.budget_max)} · status: {job.status}
          </p>
        </div>
        <Link
          to="/opdrachten/$slug"
          params={{ slug: job.slug }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Publieke pagina →
        </Link>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>

      {isOwner && job.status === "in_progress" && acceptedQuote && (
        <div className="mt-6 rounded-xl border border-border/60 bg-brand/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Project loopt met {acceptedQuote.pro?.company ?? acceptedQuote.pro?.display_name}</div>
              <div className="text-xs text-muted-foreground">
                Geaccepteerd bedrag: €{acceptedQuote.amount.toLocaleString("nl-NL")}
              </div>
            </div>
            <button
              onClick={() => completeMut.mutate()}
              disabled={completeMut.isPending}
              className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
            >
              <CheckCircle2 className="mr-1 inline h-4 w-4" /> Project afronden
            </button>
          </div>
        </div>
      )}

      {isOwner && job.status === "completed" && (
        <ReviewSection
          jobId={jobId}
          proId={job.awarded_pro_id ?? acceptedQuote?.pro_id ?? null}
          existing={reviewQ.data ?? null}
          onSubmitted={() => qc.invalidateQueries({ queryKey: ["job-review", jobId, user?.id] })}
        />
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Ontvangen offertes ({quotes.length})
      </h2>
      <div className="mt-3 space-y-3">
        {quotesQ.isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
        {!quotesQ.isLoading && quotes.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nog geen offertes ontvangen.
          </div>
        )}
        {quotes.map((q) => (
          <div key={q.id} className="bg-card-gradient shadow-card rounded-xl border border-border/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">
                  {q.pro?.company ?? q.pro?.display_name ?? "Vakman"}{" "}
                  {q.pro?.rating_avg != null && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-brand text-brand" />
                      {q.pro.rating_avg} ({q.pro.review_count})
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{q.pro?.city ?? ""}</div>
                {q.message && <p className="mt-2 text-sm">{q.message}</p>}
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">€{q.amount.toLocaleString("nl-NL")}</div>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                    q.status === "accepted"
                      ? "bg-brand/15 text-brand"
                      : q.status === "declined"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {q.status}
                </span>
              </div>
            </div>
            {isOwner && job.status === "open" && q.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => acceptMut.mutate(q.id)}
                  disabled={acceptMut.isPending}
                  className="rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-medium text-brand-foreground disabled:opacity-50"
                >
                  Accepteer
                </button>
                <button
                  onClick={() => declineMut.mutate(q.id)}
                  disabled={declineMut.isPending}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Afwijzen
                </button>
                <button
                  onClick={() =>
                    navigate({
                      to: "/dashboard/berichten/$jobId",
                      params: { jobId },
                      search: { with: q.pro_id },
                    })
                  }
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  <MessageCircle className="h-3 w-3" /> Bericht
                </button>
              </div>
            )}
            {isOwner && (job.status === "in_progress" || job.status === "completed") && q.status === "accepted" && (
              <button
                onClick={() =>
                  navigate({
                    to: "/dashboard/berichten/$jobId",
                    params: { jobId },
                    search: { with: q.pro_id },
                  })
                }
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                <MessageCircle className="h-3 w-3" /> Bericht sturen
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewSection({
  jobId,
  proId,
  existing,
  onSubmitted,
}: {
  jobId: string;
  proId: string | null;
  existing: { id: string; rating: number; body: string | null; created_at: string } | null;
  onSubmitted: () => void;
}) {
  const { user } = useSession();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const submitMut = useMutation({
    mutationFn: async () => {
      if (!user || !proId) throw new Error("ontbrekende gegevens");
      const { error } = await supabase.from("reviews").insert({
        job_id: jobId,
        client_id: user.id,
        pro_id: proId,
        rating,
        body: body || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bedankt voor je review");
      onSubmitted();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (existing) {
    return (
      <div className="mt-6 rounded-xl border border-border/60 bg-brand/5 p-5">
        <div className="text-sm font-medium">Je review</div>
        <div className="mt-1 flex gap-0.5">
          {Array.from({ length: existing.rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-brand text-brand" />
          ))}
        </div>
        {existing.body && <p className="mt-2 text-sm text-muted-foreground">{existing.body}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-card-gradient p-5">
      <div className="text-sm font-medium">Laat een review achter</div>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Star
              className={`h-6 w-6 ${n <= rating ? "fill-brand text-brand" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Hoe verliep de samenwerking?"
        className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <button
        onClick={() => submitMut.mutate()}
        disabled={submitMut.isPending}
        className="mt-3 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
      >
        Review plaatsen
      </button>
    </div>
  );
}