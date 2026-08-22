import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { BackToTop } from "@/components/BackToTop";
import { loadGadgets } from "@/content/gadgets";

export const metadata: Metadata = {
  title: "Operator gadgets",
  description:
    "Every Rainbow Six Siege operator gadget — what it does, what counters it, and how to use it well.",
};

// Gadgets mode. A real route rather than a client-side view swap, so the content
// is server-rendered and crawlable and carries its own metadata — the same
// reason the peek pages are routes. PageHeader picks up the blue accent
// automatically from the /gadgets path.
//
// Data is placeholder (content/gadgets.ts) until the Supabase table exists.
export default function GadgetsPage() {
  const gadgets = loadGadgets();
  const attack = gadgets.filter((g) => g.side === "attack");
  const defense = gadgets.filter((g) => g.side === "defense");

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <div className="text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            Gadgets
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-5xl">
            Operator gadgets
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            What each gadget does, what beats it, and how to get value from it.
          </p>
          <p className="mt-3 inline-block rounded-btn border border-blue/30 bg-blue/[0.06] px-3 py-1 text-xs font-medium text-blue">
            Placeholder data — real gadgets land once the database is wired up
          </p>
        </div>

        <Section title="Attack" gadgets={attack} />
        <Section title="Defense" gadgets={defense} />
      </main>
      <BackToTop />
    </>
  );
}

function Section({
  title,
  gadgets,
}: {
  title: string;
  gadgets: ReturnType<typeof loadGadgets>;
}) {
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
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {gadgets.map((g) => (
          <li key={g.id}>
            <Link
              href={`/gadgets/${g.slug}`}
              className="flex h-full flex-col rounded-card border border-border bg-card p-4 transition-colors duration-150 ease-out hover:border-blue"
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
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {g.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
