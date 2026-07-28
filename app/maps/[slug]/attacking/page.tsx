import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BestPeek } from "@/components/BestPeek";
import { AttackerPeekRow } from "@/components/AttackerPeekRow";
import { AttackerViewToggle } from "@/components/AttackerViewToggle";
import { getFloorsForMap, getMapBySlug, getRankedPeeksForMap } from "@/lib/db";
import { rating } from "@/lib/rate";
import { dangerForGrade } from "@/lib/attacker";
import { coverThumb } from "@/lib/cover-image";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map) return { title: "Not found" };
  return {
    title: `How to Counter Spawn Peeks on ${map.name} — Every Angle Ranked`,
    description: `Every spawn peek defenders use on ${map.name}, ranked by how dangerous it is to attackers. Clear these angles or die to them — watch the exact setup and timing for each.`,
    alternates: { canonical: `${SITE_URL}/maps/${map.slug}/attacking` },
  };
}

function jsonLdText(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export default async function AttackerGuidePage({
  params,
}: {
  params: { slug: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  const floors = await getFloorsForMap(map.id);
  const floorIds = floors.map((f) => f.id);
  // Already sorted best → worst, i.e. most → least dangerous.
  const peeks = await getRankedPeeksForMap(floorIds);
  const top3 = peeks.slice(0, 3);

  // Same peeks grouped by floor, in physical floor order (roof → basement).
  const byFloor = floors
    .map((f) => ({ floor: f, peeks: peeks.filter((p) => p.floor_id === f.id) }))
    .filter((g) => g.peeks.length > 0);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: map.name,
        item: `${SITE_URL}/maps/${map.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Attacker's Guide",
        item: `${SITE_URL}/maps/${map.slug}/attacking`,
      },
    ],
  };

  const itemListJsonLd =
    peeks.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Most dangerous spawn peeks on ${map.name}`,
          itemListElement: peeks.slice(0, 20).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.name,
            url: `${SITE_URL}/peeks/${p.slug}`,
          })),
        }
      : null;

  const dangerView = (
    <ol className="space-y-3">
      {peeks.map((p, i) => (
        <li key={p.id}>
          <AttackerPeekRow peek={p} rank={i + 1} />
        </li>
      ))}
    </ol>
  );

  const floorView = (
    <div className="space-y-8">
      {byFloor.map(({ floor, peeks: fp }) => (
        <div key={floor.id}>
          <h3 className="mb-3 text-lg font-bold tracking-tight text-ink">
            {floor.name}
          </h3>
          <ol className="space-y-3">
            {fp.map((p, i) => (
              <li key={p.id}>
                <AttackerPeekRow peek={p} rank={i + 1} showFloor={false} />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        {/* Header with the map's faint cover backdrop (same treatment as the
            map page), fading to the page background at the bottom. */}
        <div className="relative mb-8 overflow-hidden rounded-card">
          {map.cover_image_url && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <Image
                src={coverThumb(map.cover_image_url, 900)}
                alt=""
                fill
                sizes="(max-width: 896px) 100vw, 848px"
                className="object-cover object-center opacity-[0.22]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
            </div>
          )}
          <div className="relative z-10 px-4 py-8 text-center">
            <div className="mb-3">
              <Link
                href={`/maps/${map.slug}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                ← Back to {map.name}
              </Link>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              {map.name}: Attacker&apos;s Guide to Spawn Peeks
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-[#6f716a]">
              Every peek defenders use on {map.name} — ranked by how dangerous
              they are to you. Clear these angles or die to them.
            </p>
          </div>
        </div>

        {peeks.length === 0 ? (
          <p className="rounded-card border border-border bg-card px-4 py-8 text-center text-muted">
            No angles catalogued for {map.name} yet — check back soon.
          </p>
        ) : (
          <>
            {/* Clear these first — the tl;dr for someone loading in now. */}
            <section className="mb-10">
              <h2 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                ⚔️ Clear these first
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {top3.map((p) => {
                  const r = rating(
                    p.base_success_rate,
                    p.worked_votes,
                    p.vote_count
                  );
                  return (
                    <BestPeek
                      key={p.id}
                      peek={p}
                      from="attacking"
                      eyebrow={dangerForGrade(r.grade).label}
                    />
                  );
                })}
              </div>
            </section>

            <AttackerViewToggle dangerView={dangerView} floorView={floorView} />
          </>
        )}
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdText(itemListJsonLd) }}
        />
      )}
    </>
  );
}
