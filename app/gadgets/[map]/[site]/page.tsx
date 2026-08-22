import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getMaps } from "@/lib/db";
import { findSite, GADGET_OPERATORS } from "@/content/gadgets";

export const dynamic = "force-dynamic";

type Params = { params: { map: string; site: string } };

async function findMap(slug: string) {
  const maps = await getMaps();
  return maps.find((m) => m.slug === slug && m.published) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const map = await findMap(params.map);
  const site = findSite(params.site);
  if (!map || !site) return { title: "Not found" };
  return {
    title: `${site.name} on ${map.name} — gadget operators`,
    description: `Operators with gadget placements on ${site.name}, ${map.name}.`,
  };
}

// Step 3: map -> site -> OPERATOR -> placements.
export default async function SiteOperatorsPage({ params }: Params) {
  const map = await findMap(params.map);
  const site = findSite(params.site);
  if (!map || !site) notFound();

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href={`/gadgets/${map.slug}`}
          className="text-sm font-medium text-muted transition-colors hover:text-blue"
        >
          ← {map.name} sites
        </Link>

        <header className="mt-4 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            {map.name} · {site.floorHint}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
            {site.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-[#6f716a]">
            Pick an operator
          </p>
        </header>

        <ul className="mt-8 space-y-3">
          {GADGET_OPERATORS.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/gadgets/${map.slug}/${site.slug}/${o.slug}`}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-4 transition-colors duration-150 ease-out hover:border-blue"
              >
                <span className="min-w-0">
                  <span className="block text-lg font-semibold text-ink">
                    {o.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {o.role} · {o.gadget}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-blue">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
