import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getMaps } from "@/lib/db";
import { sitesForMap } from "@/content/gadgets";

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
    title: `${map.name} bomb sites — gadgets`,
    description: `Pick a bomb site on ${map.name} to see gadget placements for each operator.`,
  };
}

// Step 2 of the gadget flow: map -> SITE -> operator -> placements.
// Sites are placeholder (content/gadgets.ts); the map is real, so an unknown
// or unpublished slug 404s the same way the peek map pages do.
export default async function MapSitesPage({ params }: Params) {
  const map = await findMap(params.map);
  if (!map) notFound();

  const sites = sitesForMap(map.slug);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
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
          <p className="mt-2 text-lg font-medium text-[#6f716a]">
            Pick the bomb site
          </p>
          <p className="mt-3 inline-block rounded-btn border border-blue/30 bg-blue/[0.06] px-3 py-1 text-xs font-medium text-blue">
            Placeholder sites — real bomb sites land with the database
          </p>
        </header>

        {/* Two-up from 320px: four short labels fit comfortably. */}
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
          {sites.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/gadgets/${map.slug}/${s.slug}`}
                className="flex h-full flex-col items-center justify-center rounded-card border border-border bg-card px-4 py-6 text-center transition-colors duration-150 ease-out hover:border-blue sm:py-8"
              >
                <span className="text-lg font-semibold text-ink sm:text-xl">
                  {s.name}
                </span>
                <span className="mt-1 text-xs text-muted">{s.floorHint}</span>
              </Link>
            </li>
          ))}
        </ul>

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
    </>
  );
}
