import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/berichten/$jobId")({
  validateSearch: (s: Record<string, unknown>): { with?: string } => ({
    with: typeof s.with === "string" ? s.with : undefined,
  }),
  component: Thread,
});

function Thread() {
  const { jobId } = Route.useParams();
  const { with: withParam } = Route.useSearch();
  const { user } = useSession();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const jobQ = useQuery({
    queryKey: ["job-brief", jobId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, slug, client_id, awarded_pro_id")
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // determine the counterparty
  const counterpartyId = (() => {
    if (!user || !jobQ.data) return null;
    if (withParam && withParam !== user.id) return withParam;
    if (jobQ.data.client_id === user.id) return jobQ.data.awarded_pro_id;
    return jobQ.data.client_id;
  })();

  const msgsQ = useQuery({
    queryKey: ["messages-thread", jobId, user?.id, counterpartyId],
    enabled: !!user && !!counterpartyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, created_at, sender_id, recipient_id, read_at")
        .eq("job_id", jobId)
        .or(
          `and(sender_id.eq.${user!.id},recipient_id.eq.${counterpartyId}),and(sender_id.eq.${counterpartyId},recipient_id.eq.${user!.id})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const counterpartyQ = useQuery({
    queryKey: ["profile-brief", counterpartyId],
    enabled: !!counterpartyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, company")
        .eq("id", counterpartyId!)
        .maybeSingle();
      return data;
    },
  });

  // Realtime updates for this job's messages.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`msgs:${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${jobId}` },
        () => qc.invalidateQueries({ queryKey: ["messages-thread", jobId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [jobId, user, qc]);

  // Autoscroll to bottom on new messages.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgsQ.data?.length]);

  // Mark unread messages as read when we open the thread.
  useEffect(() => {
    if (!user || !msgsQ.data?.length) return;
    const unread = msgsQ.data.filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id);
    if (!unread.length) return;
    supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread).then();
  }, [user, msgsQ.data]);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!user || !counterpartyId) throw new Error("ontvanger onbekend");
      const text = body.trim();
      if (!text) return;
      const { error } = await supabase.from("messages").insert({
        job_id: jobId,
        sender_id: user.id,
        recipient_id: counterpartyId,
        body: text,
      });
      if (error) throw error;
      setBody("");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages-thread", jobId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-[70vh] flex-col">
      <Link
        to="/dashboard/berichten"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Alle berichten
      </Link>
      <div className="mt-2 border-b border-border/60 pb-3">
        <div className="text-sm font-medium">
          {counterpartyQ.data?.company ?? counterpartyQ.data?.display_name ?? "Gesprek"}
        </div>
        <div className="text-xs text-muted-foreground">Over: {jobQ.data?.title ?? "…"}</div>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-4">
        {msgsQ.isLoading && <div className="text-sm text-muted-foreground">Laden…</div>}
        {!msgsQ.isLoading && (msgsQ.data ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nog geen berichten. Stuur het eerste bericht hieronder.
          </div>
        )}
        {(msgsQ.data ?? []).map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-brand-gradient text-brand-foreground" : "bg-surface-2 text-foreground"
                }`}
              >
                <div className="whitespace-pre-line">{m.body}</div>
                <div className={`mt-1 text-[10px] opacity-70`}>
                  {new Date(m.created_at).toLocaleString("nl-NL")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMut.mutate();
        }}
        className="mt-3 flex gap-2 border-t border-border/60 pt-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={counterpartyId ? "Schrijf een bericht…" : "Geen ontvanger geselecteerd"}
          disabled={!counterpartyId || sendMut.isPending}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!counterpartyId || !body.trim() || sendMut.isPending}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Verzenden
        </button>
      </form>
    </div>
  );
}