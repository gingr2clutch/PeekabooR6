import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { OperatorIcon } from "@/components/OperatorIcon";
import {
  getMaps,
  getGadgetSiteBySlug,
  getGadgetOperatorsForSite,
} from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { map: string; site: string } };

async function findMap(slug: string) {
  const maps = await getMaps();
  return maps.find((m) => m.slug === slug && m.published) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const map = await findMap(params.map);
  if (!map) return { title: "Not found" };
  const site = await getGadgetSiteBySlug(map.id, params.site);
  if (!site) return { title: "Not found" };
  return {
    title: `${site.name} on ${map.name} — gadget operators`,
    description: `Operators with gadget placements on ${site.name}, ${map.name}.`,
  };
}

// Step 3: map -> site -> OPERATOR -> placements.
export default async function SiteOperatorsPage({ params }: Params) {
  const map = await findMap(params.map);
  if (!map) notFound();
  const site = await getGadgetSiteBySlug(map.id, params.site);
  if (!site) notFound();

  // Only operators with a published placement here — anyone else is a dead end.
  const operators = await getGadgetOperatorsForSite(site.id);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href={`/gadgets/${map.slug}`}
          className="text-sm font-medium text-muted transition-colors hover:text-blue"
        >
          ← Sites
        </Link>

        <header className="mt-4 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            {map.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
            {site.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-[#6f716a]">
            Pick an operator
          </p>
        </header>

        {operators.length === 0 ? (
          <p className="mt-8 rounded-card border border-border bg-card p-4 text-center text-sm text-muted">
            No placements published for {site.name} yet.
          </p>
        ) : (
        /* Square image cards in the homepage maps-grid language: same
           aspect-square, rounded-card, elev-card shadow, white border and
           hover lift. Three across on phones, four from lg.

           The role/gadget subtitle is dropped here — it is on the operator's
           own page, and over an image it competed with the name.

           OperatorIcon in fill mode supplies the image and, when there is no
           icon yet, a steel-blue letter panel — so the grid never has holes
           and every cell is the same square regardless. */
        <ul className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-4">
          {operators.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/gadgets/${map.slug}/${site.slug}/${o.slug}`}
                className="map-card group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-white text-center elev-card outline-none transition-all duration-[180ms] ease-out focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99]"
              >
                <OperatorIcon iconUrl={o.icon_url} name={o.name} fill />

                {/* Same bottom-up scrim the map cards use, so the name reads
                    over a light icon as well as a dark one. */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                {/* Blue edge on hover/focus — the gadget accent, drawn inside
                    the card's overflow so it reads as a crisp ring. */}
                <span className="pointer-events-none absolute inset-0 rounded-card ring-0 ring-inset ring-blue transition-all duration-[180ms] ease-out group-hover:ring-2 group-focus-visible:ring-2" />

                <span className="relative z-10 mt-auto w-full px-2.5 pb-2 text-left">
                  <span className="block truncate text-sm font-semibold text-white drop-shadow-sm">
                    {o.name}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        )}
      </main>
    </>
  );
}
