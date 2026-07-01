import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getWpPage } from "../lib/wordpress/pages";

export const Route = createFileRoute("/over-ons")({
  component: OverOnsPage,
});

function OverOnsPage() {
  const [page, setPage] = useState<any>(null);

  useEffect(() => {
    getWpPage("/over-ons").then(setPage);
  }, []);

  if (!page) {
    return <div>Laden...</div>;
  }

  return (
    <>
      <Hero page={page} />
      <CTA page={page} />
    </>
  );
}

function Hero({ page }: { page: any }) {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="relative mx-auto max-w-7xl px-4 py-24 text-center">

        <h1 className="text-5xl font-semibold text-gradient">
          {page.title}
        </h1>

        <div
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground prose prose-invert"
          dangerouslySetInnerHTML={{
            __html: page.content,
          }}
        />

        <div className="mt-10">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-6 py-3 text-brand-foreground"
          >
            Neem contact op
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}

function CTA({ page }: { page: any }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24">
      <div className="rounded-3xl border border-border bg-card-gradient p-12 text-center">

        <h2 className="text-4xl font-semibold">
          {page.title}
        </h2>

        <div
          className="mx-auto mt-4 max-w-xl text-muted-foreground prose"
          dangerouslySetInnerHTML={{
            __html: page.excerpt || page.content,
          }}
        />

        <Link
          to="/contact"
          className="mt-8 inline-flex rounded-lg bg-brand-gradient px-6 py-3 text-brand-foreground"
        >
          Vraag vrijblijvend informatie aan
        </Link>

      </div>
    </section>
  );
}