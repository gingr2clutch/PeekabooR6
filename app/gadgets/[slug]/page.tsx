import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackToTop } from "@/components/BackToTop";
import { GADGETS, findGadget } from "@/content/gadgets";

type Params = { params: { slug: string } };

// Placeholder data is a static list, so every gadget page can be prerendered.
// Once this reads from Supabase, drop this and let the route go dynamic like
// the map pages do.
export function generateStaticParams() {
  return GADGETS.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const g = findGadget(params.slug);
  if (!g) return { title: "Not found" };
  return {
    title: `${g.name} — ${g.operator}`,
    description: g.summary,
  };
}

export default function GadgetPage({ params }: Params) {
  const g = findGadget(params.slug);
  if (!g) notFound();

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href="/gadgets"
          className="text-sm font-medium text-muted transition-colors hover:text-blue"
        >
          ← All gadgets
        </Link>

        <header className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue">
            {g.side === "attack" ? "Attack" : "Defense"} · {g.category}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight lg:text-4xl">
            {g.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{g.operator}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink">{g.summary}</p>
        </header>

        <Block title="Countered by" items={g.counters} />
        <Block title="Tips" items={g.tips} />

        <p className="mt-10 rounded-card border border-blue/30 bg-blue/[0.06] p-3 text-xs text-blue">
          Placeholder content. Real gadget data arrives with the database.
        </p>
      </main>
      <BackToTop />
    </>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-blue">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((t, i) => (
          <li
            key={i}
            className="rounded-card border border-border bg-card p-3 text-sm leading-relaxed text-ink"
          >
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
