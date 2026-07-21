import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BestPeek } from "@/components/BestPeek";
import { GradeBadge } from "@/components/GradeBadge";
import { GradeMixBar } from "@/components/GradeMixBar";
import { PageHeader } from "@/components/PageHeader";
import {
  canonicalPair,
  decideComparison,
  getComparisonMaps,
  pairId,
  parsePair,
  type MapCompareStats,
} from "@/lib/compare";
import { getMapBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export async function generateMetadata({
  params,
}: {
  params: { pair: string };
}): Promise<Metadata> {
  const parsed = parsePair(params.pair);
  if (!parsed) return { title: "Not found" };
  const [slugA, slugB] = canonicalPair(parsed.a, parsed.b);
  const [mapA, mapB] = await Promise.all([
    getMapBySlug(slugA),
    getMapBySlug(slugB),
  ]);
  if (!mapA?.published || !mapB?.published) return { title: "Not found" };

  const title = `${mapA.name} vs ${mapB.name} — which map has better spawn peeks?`;
  const description = `${mapA.name} vs ${mapB.name} spawn peeks compared: S-tier counts, average grade, total votes, and the top peeks from each map. Rainbow Six Siege.`;
  const url = `${SITE_URL}/compare/${pairId(slugA, slugB)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "peekabooR6",
    },
    twitter: { card: "summary", title, description },
  };
}

// One side of the matchup: stat grid (peeks / S-tier / avg grade / votes) plus
// the shared grade-mix bar. The winner gets a brand-colored tag.
function MapColumn({
  side,
  isWinner,
}: {
  side: MapCompareStats;
  isWinner: boolean;
}) {
  const stats = [
    { label: "Peeks", value: side.peekCount.toLocaleString("en-US") },
    { label: "S-Tier", value: side.sTier.toLocaleString("en-US") },
    { label: "Votes", value: side.totalVotes.toLocaleString("en-US") },
  ];

  return (
    <div className="rounded-card border border-border bg-card px-4 py-5 shadow-sm sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={`/maps/${side.map.slug}`}
          className="text-xl font-bold tracking-tight text-ink transition-colors hover:text-brand sm:text-2xl"
        >
          {side.map.name}
        </Link>
        {isWinner && (
          <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
            Winner
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-inner border border-border bg-bg/60 px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Avg grade
          </div>
          <div className="mt-1 text-sm font-semibold text-ink">
            {side.avgLabel}
          </div>
        </div>
        <GradeBadge label={side.avgLabel} size="lg" />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.label} className="rounded-inner bg-bg/60 px-2 py-2.5">
            <div className="text-lg font-bold tabular-nums tracking-tight text-ink sm:text-xl">
              {s.value}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <GradeMixBar grades={side.grades} />
    </div>
  );
}

// "Compare {name} vs …" chips linking to every other eligible pairing, so each
// page feeds the internal-linking loop.
function CrossLinks({
  side,
  others,
}: {
  side: MapCompareStats;
  others: MapCompareStats[];
}) {
  if (others.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">
        Compare {side.map.name} vs…
      </h3>
      <div className="flex flex-wrap gap-2">
        {others.map((o) => (
          <Link
            key={o.map.slug}
            href={`/compare/${pairId(side.map.slug, o.map.slug)}`}
            className="peek-lift rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
          >
            {o.map.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function ComparePage({
  params,
}: {
  params: { pair: string };
}) {
  const parsed = parsePair(params.pair);
  if (!parsed) notFound();

  // One canonical URL per unordered pair — redirect the reversed order.
  const canonical = pairId(parsed.a, parsed.b);
  if (params.pair !== canonical) permanentRedirect(`/compare/${canonical}`);

  const [slugA, slugB] = canonicalPair(parsed.a, parsed.b);

  // Load every eligible map once: gives us both sides plus the opponents for the
  // cross-link chips (so those links can never point at an ineligible pairing).
  const all = await getComparisonMaps();
  const a = all.find((m) => m.map.slug === slugA);
  const b = all.find((m) => m.map.slug === slugB);
  if (!a || !b) notFound();

  const result = decideComparison(a, b);
  const winnerSlug = result.winner?.map.slug ?? null;
  const others = all.filter((m) => m.map.slug !== slugA && m.map.slug !== slugB);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Compare maps",
        item: `${SITE_URL}/compare`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${a.map.name} vs ${b.map.name}`,
        item: `${SITE_URL}/compare/${canonical}`,
      },
    ],
  };

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />

        {/* 1 — Head-to-head header + declared winner. */}
        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            Map comparison
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {a.map.name}{" "}
            <span className="text-muted">vs</span> {b.map.name}
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            Which map has better spawn peeks?
          </p>
          <p className="mx-auto mt-5 max-w-2xl rounded-card border border-border bg-card px-5 py-4 text-lg font-semibold text-ink shadow-sm">
            {result.headline}
          </p>
        </div>

        {/* 2 + 3 — Side-by-side stats and grade-mix bars. */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MapColumn side={a} isWinner={winnerSlug === a.map.slug} />
          <MapColumn side={b} isWinner={winnerSlug === b.map.slug} />
        </div>

        {/* 4 — Top 3 peeks from each map. */}
        <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[a, b].map((side) => (
            <div key={side.map.slug}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                Top peeks · {side.map.name}
              </h2>
              {side.topPeeks.length === 0 ? (
                <p className="text-sm text-muted">No peeks yet.</p>
              ) : (
                <div className="space-y-3">
                  {side.topPeeks.map((peek) => (
                    <BestPeek key={peek.id} peek={peek} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 5 — Cross-links: keep the internal-linking loop going. */}
        <div className="space-y-6 border-t border-border pt-8">
          <CrossLinks side={a} others={others} />
          <CrossLinks side={b} others={others} />
          <div>
            <Link
              href="/compare"
              className="text-sm font-semibold text-brand hover:underline"
            >
              ← All map matchups
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
