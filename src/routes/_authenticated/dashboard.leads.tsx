import { createFileRoute, Link } from "@tanstack/react-router";
import { useJobs, formatBudget, timeAgo } from "@/lib/queries";
import { RequireSubscription } from "@/components/RequireSubscription";

export const Route = createFileRoute("/_authenticated/dashboard/leads")({
  component: Leads,
});

function Leads() {
  const { data: jobs = [], isLoading } = useJobs();

  return (
    <RequireSubscription
      title="Leads zijn voor Professional-leden"
      description="Neem een abonnement om alle openstaande opdrachten in jouw regio te zien en te reageren."
    >
     <div>
      <h1 className="text-2xl font-semibold">Leads</h1>
      <p className="text-sm text-muted-foreground">
        Openstaande opdrachten in jouw vakgebied en regio.
      </p>
      <div className="mt-6 space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
        {!isLoading && jobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Geen openstaande opdrachten op dit moment.
          </div>
        )}
        {jobs.map((j) => (
          <div
            key={j.id}
            className="bg-card-gradient shadow-card flex items-center justify-between rounded-lg border border-border/60 p-4"
          >
            <div>
              <div className="font-medium">{j.title}</div>
              <div className="text-xs text-muted-foreground">
                {j.category?.name ?? "—"} · {j.city ?? ""} ·{" "}
                {formatBudget(j.budget_min, j.budget_max)} · {timeAgo(j.created_at)}
              </div>
            </div>
            <Link
              to="/opdrachten/$slug"
              params={{ slug: j.slug }}
              className="rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-medium text-brand-foreground"
            >
              Bekijken
            </Link>
          </div>
        ))}
      </div>
     </div>
    </RequireSubscription>
  );
}
