import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/berichten/")({
  component: Berichten,
});

function Berichten() {
  const { user } = useSession();
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["my-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, created_at, read_at, sender_id, recipient_id, job_id")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Group latest message per (job_id, counterparty).
  const threads = (() => {
    const map = new Map<
      string,
      { jobId: string; other: string; last: (typeof messages)[number]; unread: number }
    >();
    for (const m of messages) {
      if (!m.job_id) continue;
      const other = m.sender_id === user?.id ? m.recipient_id : m.sender_id;
      const key = `${m.job_id}:${other}`;
      const entry = map.get(key);
      if (!entry) {
        map.set(key, {
          jobId: m.job_id,
          other,
          last: m,
          unread: m.recipient_id === user?.id && !m.read_at ? 1 : 0,
        });
      } else if (m.recipient_id === user?.id && !m.read_at) {
        entry.unread += 1;
      }
    }
    return Array.from(map.values());
  })();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Berichten</h1>
      <p className="text-sm text-muted-foreground">Je inbox met opdrachtgevers en vakmensen.</p>
      {isLoading && <div className="mt-6 text-sm text-muted-foreground">Laden…</div>}
      {!isLoading && threads.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Nog geen berichten. Zodra je iemand aanschrijft of antwoord krijgt, verschijnt het hier.
        </div>
      )}
      <div className="mt-6 space-y-2">
        {threads.map((t) => (
          <Link
            key={`${t.jobId}:${t.other}`}
            to="/dashboard/berichten/$jobId"
            params={{ jobId: t.jobId }}
            search={{ with: t.other }}
            className="bg-card-gradient shadow-card block rounded-xl border border-border/60 p-4 hover:border-brand/40"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t.last.sender_id === user?.id ? "Verzonden" : "Ontvangen"}
                {t.unread > 0 && (
                  <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] text-brand-foreground">
                    {t.unread} nieuw
                  </span>
                )}
              </span>
              <span>{new Date(t.last.created_at).toLocaleString("nl-NL")}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm">{t.last.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
