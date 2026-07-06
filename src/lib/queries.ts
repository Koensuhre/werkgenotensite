import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listPlans, type PlanDTO } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

// ---------- Categories ----------
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, description")
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ---------- Jobs ----------
export type JobRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  urgent: boolean;
  status: string;
  created_at: string;
  client_id: string;
  category: { name: string; slug: string } | null;
  client: { display_name: string | null } | null;
  offers: number;
};

const jobSelect = `
  id, slug, title, description, city, budget_min, budget_max,
  urgent, status, created_at, client_id,
  category:categories(name, slug),
  client:profiles!jobs_client_id_fkey(display_name)
`;

// jobs.client_id references auth.users, not profiles, so the embed above may fail.
// Use a 2-step approach instead.
async function fetchJobs(filter?: { categorySlug?: string; city?: string }) {
  let q = supabase
    .from("jobs")
    .select(
      "id, slug, title, description, city, budget_min, budget_max, urgent, status, created_at, client_id, category:categories(name, slug)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (filter?.city) q = q.eq("city", filter.city);
  const { data, error } = await q;
  if (error) throw error;

  const clientIds = Array.from(new Set((data ?? []).map((j) => j.client_id)));
  const jobIds = (data ?? []).map((j) => j.id);

  const [{ data: clients }, { data: quotes }] = await Promise.all([
    clientIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
    jobIds.length
      ? supabase.from("quotes").select("job_id").in("job_id", jobIds)
      : Promise.resolve({ data: [] as { job_id: string }[] }),
  ]);

  const byClient = new Map((clients ?? []).map((c) => [c.id, c.display_name]));
  const countByJob = new Map<string, number>();
  for (const q of quotes ?? []) {
    countByJob.set(q.job_id, (countByJob.get(q.job_id) ?? 0) + 1);
  }

  return (data ?? [])
    .filter((j) => !filter?.categorySlug || j.category?.slug === filter.categorySlug)
    .map<JobRow>((j) => ({
      ...j,
      client: { display_name: byClient.get(j.client_id) ?? null },
      offers: countByJob.get(j.id) ?? 0,
    }));
}

export function useJobs(filter?: { categorySlug?: string; city?: string }) {
  return useQuery({
    queryKey: ["jobs", filter ?? {}],
    queryFn: () => fetchJobs(filter),
    staleTime: 60_000,
  });
}

export function useJob(slug: string) {
  return useQuery({
    queryKey: ["job", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, slug, title, description, city, budget_min, budget_max, urgent, status, created_at, client_id, category:categories(name, slug)",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [{ data: client }, { count }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, city, rating_avg, review_count")
          .eq("id", data.client_id)
          .maybeSingle(),
        supabase.from("quotes").select("*", { count: "exact", head: true }).eq("job_id", data.id),
      ]);
      return { ...data, client, offers: count ?? 0 };
    },
  });
}

// ---------- Pros ----------
export type ProRow = {
  id: string;
  slug: string | null;
  display_name: string | null;
  company: string | null;
  city: string | null;
  bio: string | null;
  response_time: string | null;
  years_experience: number | null;
  verified: boolean;
  rating_avg: number | null;
  review_count: number;
  category: { name: string; slug: string } | null;
};

export function usePros(filter?: { categorySlug?: string; city?: string; search?: string }) {
  return useQuery({
    queryKey: ["pros", filter ?? {}],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select(
          "id, slug, display_name, company, city, bio, response_time, years_experience, verified, rating_avg, review_count, category:categories(name, slug)",
        )
        .eq("primary_type", "professional")
        .not("slug", "is", null)
        .order("rating_avg", { ascending: false });
      if (filter?.city) q = q.eq("city", filter.city);
      const { data, error } = await q;
      if (error) throw error;
      const filtered = (data ?? []).filter((p) => {
        if (filter?.categorySlug && p.category?.slug !== filter.categorySlug) return false;
        if (filter?.search) {
          const s = filter.search.toLowerCase();
          return (
            (p.company ?? "").toLowerCase().includes(s) ||
            (p.display_name ?? "").toLowerCase().includes(s) ||
            (p.bio ?? "").toLowerCase().includes(s)
          );
        }
        return true;
      });
      return filtered as ProRow[];
    },
    staleTime: 60_000,
  });
}

export function usePro(slug: string) {
  return useQuery({
    queryKey: ["pro", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, slug, display_name, company, city, bio, response_time, years_experience, verified, rating_avg, review_count, category:categories(name, slug)",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as ProRow | null;
    },
  });
}

// ---------- Helpers ----------
export function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatBudget(min: number | null, max: number | null) {
  if (min == null && max == null) return "Op aanvraag";
  if (min != null && max != null)
    return `€${min.toLocaleString("nl-NL")} – €${max.toLocaleString("nl-NL")}`;
  if (min != null) return `vanaf €${min.toLocaleString("nl-NL")}`;
  return `tot €${(max ?? 0).toLocaleString("nl-NL")}`;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${Math.max(1, m)} min geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} uur geleden`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "dag" : "dagen"} geleden`;
  return new Date(iso).toLocaleDateString("nl-NL");
}

// ---------- Stats (homepage) ----------
export type HomeStats = {
  jobsCount: number;
  prosCount: number;
  reviewsCount: number;
  avgRating: number;
};

export function useHomeStats() {
  return useQuery({
    queryKey: ["home-stats"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<HomeStats> => {
      const [jobs, pros, reviewsCount, ratingsSample] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("primary_type", "professional"),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("rating").limit(1000),
      ]);
      const ratings = (ratingsSample.data ?? []) as { rating: number }[];
      const avg =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratings.length
          : 0;
      return {
        jobsCount: jobs.count ?? 0,
        prosCount: pros.count ?? 0,
        reviewsCount: reviewsCount.count ?? 0,
        avgRating: Math.round(avg * 10) / 10,
      };
    },
  });
}

// ---------- Top reviews (testimonials) ----------
export type TestimonialRow = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  client: { display_name: string | null; city: string | null } | null;
  pro: { display_name: string | null; company: string | null } | null;
};

export function useTopReviews(limit = 4) {
  return useQuery({
    queryKey: ["top-reviews", limit],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<TestimonialRow[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body, created_at, client_id, pro_id")
        .not("body", "is", null)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as {
        id: string;
        rating: number;
        body: string | null;
        created_at: string;
        client_id: string;
        pro_id: string;
      }[];
      const ids = Array.from(new Set([...rows.map((r) => r.client_id), ...rows.map((r) => r.pro_id)]));
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, city, company")
        .in("id", ids);
      const byId = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          { display_name: p.display_name, city: p.city, company: p.company },
        ]),
      );
      return rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        created_at: r.created_at,
        client: byId.get(r.client_id)
          ? {
              display_name: byId.get(r.client_id)!.display_name,
              city: byId.get(r.client_id)!.city,
            }
          : null,
        pro: byId.get(r.pro_id)
          ? {
              display_name: byId.get(r.pro_id)!.display_name,
              company: byId.get(r.pro_id)!.company,
            }
          : null,
      }));
    },
  });
}

// ---------- Category counts (open jobs per category) ----------
export function useCategoryCounts() {
  return useQuery({
    queryKey: ["category-counts"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("category_id")
        .eq("status", "open")
        .not("category_id", "is", null);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as { category_id: string | null }[]) {
        if (!row.category_id) continue;
        map.set(row.category_id, (map.get(row.category_id) ?? 0) + 1);
      }
      return map;
    },
  });
}

// ---------- Subscription plans (from Stripe) ----------
export function usePlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PlanDTO[]> => {
      let env: "sandbox" | "live";
      try {
        env = getStripeEnvironment();
      } catch {
        return [];
      }
      const result = await listPlans({ data: { environment: env } });
      if ("error" in result) throw new Error(result.error);
      return result.plans;
    },
  });
}
