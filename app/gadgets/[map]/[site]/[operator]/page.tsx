import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackToTop } from "@/components/BackToTop";
import { getMapBySlug, getFloorsForMap } from "@/lib/db";
import { findSite, findOperator, placementsFor } from "@/content/gadgets";

export const dynamic = "force-dynamic";

type Params = { params: { map: string; site: string; operator: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const map = await getMapBySlug(params.map);
  const site = findSite(params.site);
  const op = findOperator(params.operator);
  if (!map?.published || !site || !op) return { title: "Not found" };
  return {
    title: `${op.name} on ${site.name} — ${map.name}`,
    description: `${op.name} gadget placements for ${site.name} on ${map.name}.`,
  };
}

// Step 4: the bird's-eye with placement pins.
//
// The blueprint is REAL — it reuses the floor bird's-eye already stored for the
// peek side, so the view is recognisable. The PINS are placeholder: their
// coordinates are invented, not surveyed. Kept visually distinct from peek pins
// (blue, and labelled "Placement") so the two can't be confused.
export default async function OperatorPlacementsPage({ params }: Params) {
  const map = await getMapBySlug(params.map);
  const site = findSite(params.site);
  const op = findOperator(params.operator);
  if (!map || !map.published || !site || !op) notFound();

  // Any floor with a blueprint will do while sites aren't tied to floors.
  const floors = await getFloorsForMap(map.id);
  const floor = floors.find((f) => f.birds_eye_url) ?? null;

  const pins = placementsFor(op.slug, site.slug);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href={`/gadgets/${map.slug}/${site.slug}`}
          className="text-sm font-medium text-muted transition-colors hover:text-blue"
        >
          ← {site.name} operators
        </Link>

        <header className="mt-4 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            {map.name} · {site.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
            {op.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {op.role} · {op.gadget}
          </p>
          <p className="mt-3 inline-block rounded-btn border border-blue/30 bg-blue/[0.06] px-3 py-1 text-xs font-medium text-blue">
            Pin positions are placeholder — not real callouts
          </p>
        </header>

        {/* Same 16/10 box the peek floor view uses, so blueprints render at a
            familiar scale. */}
        <div className="relative mt-6 aspect-[16/10] w-full">
          <div className="absolute inset-0 overflow-hidden rounded-card border border-border bg-card">
            {floor?.birds_eye_url ? (
              <Image
                src={floor.birds_eye_url}
                alt={`${map.name} ${floor.name} bird's-eye view`}
                fill
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="placeholder-stripes flex h-full w-full items-center justify-center">
                <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                  Bird&apos;s-eye view coming soon
                </span>
              </div>
            )}
          </div>

          {/* Pin layer. Static and non-interactive for now — these are
              placeholders, so there is nothing to open. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {pins.map((p, i) => (
              <span
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue text-[11px] font-bold text-white ring-2 ring-white">
                  {i + 1}
                </span>
              </span>
            ))}
          </div>
        </div>

        <ol className="mt-5 space-y-2">
          {pins.map((p, i) => (
            <li
              key={p.id}
              className="flex items-start gap-3 rounded-card border border-border bg-card p-3"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {p.label}
                </span>
                <span className="block text-[13px] leading-snug text-muted">
                  {p.note}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </main>
      <BackToTop />
    </>
  );
}
