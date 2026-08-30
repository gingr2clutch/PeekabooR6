import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackToTop } from "@/components/BackToTop";
import {
  getMapBySlug,
  getFloorsForMap,
  getGadgetSiteBySlug,
  getGadgetOperatorBySlug,
  getGadgetPlacements,
} from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { map: string; site: string; operator: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const map = await getMapBySlug(params.map);
  if (!map?.published) return { title: "Not found" };
  const [site, op] = await Promise.all([
    getGadgetSiteBySlug(map.id, params.site),
    getGadgetOperatorBySlug(params.operator),
  ]);
  if (!site || !op) return { title: "Not found" };
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
  if (!map || !map.published) notFound();
  const [site, op] = await Promise.all([
    getGadgetSiteBySlug(map.id, params.site),
    getGadgetOperatorBySlug(params.operator),
  ]);
  if (!site || !op) notFound();

  const pins = await getGadgetPlacements(site.id, op.id);

  // The site now names its own blueprint. Falling back to the first floor that
  // has one only matters while floor_id is unset — that is the mismatch the
  // column was added to fix, so a site with floor_id set is always correct.
  const floors = await getFloorsForMap(map.id);
  const floor =
    (site.floor_id ? floors.find((f) => f.id === site.floor_id) : null) ??
    floors.find((f) => f.birds_eye_url) ??
    null;

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
            {[op.role, op.gadget_name].filter(Boolean).join(" · ")}
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
                style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue text-[11px] font-bold text-white ring-2 ring-white">
                  {i + 1}
                </span>
              </span>
            ))}
          </div>
        </div>

        {pins.length === 0 && (
          <p className="mt-5 rounded-card border border-border bg-card p-4 text-center text-sm text-muted">
            No {op.name} placements published for {site.name} yet.
          </p>
        )}

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
                  {p.label ?? `Placement ${i + 1}`}
                </span>
                {p.note && (
                  <span className="block text-[13px] leading-snug text-muted">
                    {p.note}
                  </span>
                )}
                {p.video_url && (
                  <a
                    href={p.video_url}
                    target="_blank"
                    rel="noopener"
                    className="mt-1 inline-block text-[13px] font-medium text-blue hover:underline"
                  >
                    Watch clip →
                  </a>
                )}
                <span className="mt-1 block text-[11px] text-muted">
                  👍 {p.thumbs_up} · 👎 {p.thumbs_down}
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
