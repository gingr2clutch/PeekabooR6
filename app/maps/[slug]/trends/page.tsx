import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeBadge } from "@/components/GradeBadge";
import { MultiTrendChart, type TrendSeries } from "@/components/MultiTrendChart";
import { PageHeader } from "@/components/PageHeader";
import { TrendRangeToggle } from "@/components/TrendRangeToggle";
import {
  getFloorsForMap,
  getMapBySlug,
  getRankedPeeksForMap,
  type PeekWithContext,
} from "@/lib/db";
import { rating } from "@/lib/rate";
import {
  computeMover,
  getSnapshotsForPeeks,
  pointsWithinDays,
  trackingSinceLabel,
  TREND_LINE_COLORS,
  type SnapshotPoint,
} from "@/lib/trends";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";
const MOVERS_WINDOW_DAYS = 14;
const RISER_COLOR = "#1f9d55";
const FALLER_COLOR = "#d1573a";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map?.published) return { title: "Not found" };
  const title = `${map.name} peek trends — effectiveness over time`;
  const description = `How spawn peek effectiveness is trending on ${map.name} — top peeks charted over the last 14 days, plus the biggest risers and fallers. Rainbow Six Siege.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/maps/${map.slug}/trends` },
    openGraph: { title, description, type: "website", siteName: "peekabooR6" },
  };
}

type MoverRow = { peek: PeekWithContext; changePct: number };

// Risers and fallers over `windowDays`, each capped at 5. Zero-change peeks are
// dropped (not a "mover").
function moversFor(
  peeks: PeekWithContext[],
  snaps: Map<string, SnapshotPoint[]>,
  windowDays: number
): { risers: MoverRow[]; fallers: MoverRow[] } {
  const rows: MoverRow[] = [];
  for (const peek of peeks) {
    const m = computeMover(snaps.get(peek.id) ?? [], windowDays);
    if (m && m.changePct !== 0) rows.push({ peek, changePct: m.changePct });
  }
  return {
    risers: rows
      .filter((r) => r.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 5),
    fallers: rows
      .filter((r) => r.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 5),
  };
}

// Server-rendered chart, or a centered note when the window has no plottable
// series yet (cold-start grace).
function ChartOrEmpty({ series }: { series: TrendSeries[] }) {
  if (series.length === 0) {
    return (
      <p className="text-center text-sm text-muted">
        Not enough data in this range yet.
      </p>
    );
  }
  return <MultiTrendChart series={series} />;
}

// One uniform mover row: grade badge, centered peek name, and the change
// (green for risers, red for fallers). The whole row links to the peek.
function MoverItem({ row }: { row: MoverRow }) {
  const { peek, changePct } = row;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const up = changePct > 0;
  return (
    <li>
      <Link
        href={`/peeks/${peek.slug}`}
        className="peek-lift group flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-brand"
      >
        <GradeBadge label={r.label} score={r.score} />
        <span className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-ink group-hover:text-brand">
          {peek.name}
        </span>
        <span
          className="shrink-0 text-sm font-bold tabular-nums"
          style={{ color: up ? RISER_COLOR : FALLER_COLOR }}
        >
          {up ? "+" : "−"}
          {Math.abs(changePct)}%
        </span>
      </Link>
    </li>
  );
}

// A titled, centered group of movers (Risers or Fallers).
function MoverGroup({
  title,
  rows,
  emptyNote,
}: {
  title: string;
  rows: MoverRow[];
  emptyNote: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {rows.length > 0 ? (
        <ul className="mx-auto max-w-md space-y-2">
          {rows.map((row) => (
            <MoverItem key={row.peek.id} row={row} />
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-muted">{emptyNote}</p>
      )}
    </div>
  );
}

export default async function MapTrendsPage({
  params,
}: {
  params: { slug: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  const floors = await getFloorsForMap(map.id);
  const rankedPeeks = await getRankedPeeksForMap(floors.map((f) => f.id));

  // One query for every ranked peek's 14-day history — powers both the chart
  // (7d / 14d, top 5) and the movers (all peeks, 14d).
  const snaps = await getSnapshotsForPeeks(
    rankedPeeks.map((p) => p.id),
    14
  );

  // Top 5 peeks by grade, built per window. Only peeks with >= 2 points in the
  // window are plotted so a line always has a real slope.
  const seriesFor = (windowDays: number): TrendSeries[] =>
    rankedPeeks
      .slice(0, 5)
      .map((peek, i) => ({
        label: peek.name,
        href: `/peeks/${peek.slug}`,
        color: TREND_LINE_COLORS[i % TREND_LINE_COLORS.length],
        points: pointsWithinDays(snaps.get(peek.id) ?? [], windowDays),
      }))
      .filter((s) => s.points.length >= 2);
  const series14 = seriesFor(14);
  const series7 = seriesFor(7);

  const movers = moversFor(rankedPeeks, snaps, MOVERS_WINDOW_DAYS);
  const hasMovers = movers.risers.length + movers.fallers.length > 0;

  const allPoints = rankedPeeks.flatMap((p) => snaps.get(p.id) ?? []);
  const trackingSince = trackingSinceLabel(
    [...allPoints].sort((a, b) => a.date.localeCompare(b.date))
  );

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
        name: "Trends",
        item: `${SITE_URL}/maps/${map.slug}/trends`,
      },
    ],
  };

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />

        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            📈 Effectiveness trends
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {map.name}
          </h1>
          <div className="mt-3">
            <Link
              href={`/maps/${map.slug}`}
              className="text-sm font-semibold text-brand hover:underline"
            >
              ← Back to {map.name}
            </Link>
          </div>
        </div>

        {series14.length === 0 && series7.length === 0 ? (
          <p className="rounded-card border border-border bg-card p-6 text-center text-sm text-muted">
            Trends will appear here as we collect more daily snapshots.
            {trackingSince ? ` ${trackingSince}.` : ""}
          </p>
        ) : (
          <section className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">
              Top 5 peeks over time
            </h2>
            <TrendRangeToggle
              sevenDay={<ChartOrEmpty series={series7} />}
              fourteenDay={<ChartOrEmpty series={series14} />}
            />
          </section>
        )}

        {hasMovers && (
          <section className="mt-12">
            <h2 className="text-center text-lg font-semibold tracking-tight text-ink">
              Movers
            </h2>
            <p className="mt-1 text-center text-xs text-muted">Last 14 days</p>
            <div className="mt-6 space-y-8">
              <MoverGroup
                title="📈 Risers"
                rows={movers.risers}
                emptyNote="No risers yet."
              />
              <MoverGroup
                title="📉 Fallers"
                rows={movers.fallers}
                emptyNote="No fallers yet."
              />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
