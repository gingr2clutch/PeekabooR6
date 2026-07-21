import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  featuredPairings,
  getComparisonMaps,
  pairId,
  type MapCompareStats,
} from "@/lib/compare";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Compare maps — which has the better spawn peeks?",
  description:
    "Head-to-head Rainbow Six Siege map comparisons. See which map has more S-tier spawn peeks, a higher average grade, and more community votes.",
  alternates: { canonical: `${SITE_URL}/compare` },
};

// A featured matchup: two map names + a compact "N vs M S-tier" teaser.
function FeaturedCard({
  href,
  a,
  b,
}: {
  href: string;
  a: MapCompareStats;
  b: MapCompareStats;
}) {
  return (
    <Link
      href={href}
      className="peek-lift group flex flex-col justify-between gap-3 rounded-card border border-border bg-card p-4 shadow-sm hover:border-brand"
    >
      <div className="text-lg font-bold tracking-tight text-ink group-hover:text-brand">
        {a.map.name} <span className="text-muted">vs</span> {b.map.name}
      </div>
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
        {a.sTier}–{b.sTier} S-tier · {(a.totalVotes + b.totalVotes).toLocaleString("en-US")} votes
      </div>
    </Link>
  );
}

export default async function CompareIndexPage() {
  const maps = await getComparisonMaps();
  const featured = featuredPairings(maps, 8);

  // Full matchup list, grouped by map. Each map lists every eligible opponent.
  const groups = maps.map((stats) => ({
    stats,
    opponents: maps.filter((o) => o.map.slug !== stats.map.slug),
  }));

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6">
        <div className="mb-10 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            Map comparisons
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Which map has the better peeks?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
            Every matchup is scored from real community data — S-tier counts,
            average grade, and total votes. Pick two maps and settle it.
          </p>
        </div>

        {maps.length < 2 ? (
          <p className="text-center text-muted">
            Not enough graded maps to compare yet — check back soon.
          </p>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                  Featured matchups
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((f) => (
                    <FeaturedCard
                      key={f.pairId}
                      href={`/compare/${f.pairId}`}
                      a={f.a}
                      b={f.b}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                All matchups
              </h2>
              <div className="space-y-6">
                {groups.map((g) => (
                  <div
                    key={g.stats.map.slug}
                    className="rounded-card border border-border bg-card px-4 py-4 shadow-sm sm:px-6"
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <Link
                        href={`/maps/${g.stats.map.slug}`}
                        className="text-base font-bold tracking-tight text-ink transition-colors hover:text-brand"
                      >
                        {g.stats.map.name}
                      </Link>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        {g.stats.peekCount} peeks · {g.stats.sTier} S-tier
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.opponents.map((o) => (
                        <Link
                          key={o.map.slug}
                          href={`/compare/${pairId(g.stats.map.slug, o.map.slug)}`}
                          className="peek-lift rounded-full border border-border bg-bg/60 px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                        >
                          vs {o.map.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
