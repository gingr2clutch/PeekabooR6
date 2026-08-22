import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackToTop } from "@/components/BackToTop";
import { getMaps } from "@/lib/db";
import { gadgetsForMap, type Gadget } from "@/content/gadgets";

export const dynamic = "force-dynamic";

type Params = { params: { map: string } };

async function findMap(slug: string) {
  const maps = await getMaps();
  return maps.find((m) => m.slug === slug && m.published) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const map = await findMap(params.map);
  if (!map) return { title: "Not found" };
  return {
    title: `${map.name} gadgets`,
    description: `Operator gadgets that matter on ${map.name} in Rainbow Six Siege — what each one does, what counters it, and how to use it.`,
  };
}

// A single map's gadgets. Mirrors the peek flow: maps grid -> this page.
// Gadget bodies are placeholder (content/gadgets.ts); the map itself is real,
// so an unpublished or unknown slug 404s exactly like the peek map pages do.
export default async function MapGadgetsPage({ params }: Params) {
  const map = await findMap(params.map);
  if (!map) notFound();

  const gadgets = gadgetsForMap(map.slug);
  const attack = gadgets.filter((g) => g.side === "attack");
  const defense = gadgets.filter((g) => g.side === "defense");

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href="/gadgets"
          className="text-sm font-medium text-muted transition-colors hover:text-blue"
        >
          ← All maps
        </Link>

        <header className="mt-4 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            Gadgets
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
            {map.name}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {gadgets.length} gadgets worth knowing on this map.
          </p>
          <p className="mt-3 inline-block rounded-btn border border-blue/30 bg-blue/[0.06] px-3 py-1 text-xs font-medium text-blue">
            Placeholder data — real gadgets land once the database is wired up
          </p>
        </header>

        <Section title="Attack" gadgets={attack} />
        <Section title="Defense" gadgets={defense} />

        <p className="mt-12 text-center text-sm text-muted">
          Looking for spawn peeks instead?{" "}
          <Link
            href={`/maps/${map.slug}`}
            className="font-medium text-brand hover:underline"
          >
            {map.name} peeks →
          </Link>
        </p>
      </main>
      <BackToTop />
    </>
  );
}

function Section({ title, gadgets }: { title: string; gadgets: Gadget[] }) {
  if (gadgets.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-blue">
          {title}
        </h2>
        <hr className="h-px flex-1 border-0 bg-border" />
      </div>

      {/* One column at 320px, widening with the viewport. */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {gadgets.map((g) => (
          <li
            key={g.id}
            className="flex h-full flex-col rounded-card border border-border bg-card p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">{g.name}</h3>
              <span className="shrink-0 text-[11px] font-medium text-muted">
                {g.operator}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue">
              {g.category}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{g.summary}</p>

            {g.counters.length > 0 && (
              <p className="mt-3 text-[13px] leading-snug text-ink">
                <span className="font-semibold text-muted">Countered by: </span>
                {g.counters.join(", ")}
              </p>
            )}
            {g.tips.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink">
                {g.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
