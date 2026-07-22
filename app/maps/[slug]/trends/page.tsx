import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeBadge } from "@/components/GradeBadge";
import { MultiTrendChart, type TrendSeries } from "@/components/MultiTrendChart";
import { PageHeader } from "@/components/PageHeader";
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

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map?.published) return { title: "Not found" };
  const title = `${map.name} peek trends — effectiveness over time`;
  const description = `How spawn peek effectiveness is trending on ${map.name} — top peeks charted over time, plus the biggest risers and fallers. Rainbow Six Siege.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/maps/${map.slug}/trends` },
    openGraph: { title, description, type: "website", siteName: "peekabooR6" },
  };
}

// One labelled chart panel (a "Last 7 days" / "Last 30 days" section). Its
// y-axis auto-scales to the window's own data range inside MultiTrendChart.
function TrendChartBlock({
  title,
  series,
  emptyNote,
}: {
  title: string;
  series: TrendSeries[];
  emptyNote: string;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {series.length === 0 ? (
        <p className="text-center text-sm text-muted">{emptyNote}</p>
      ) : (
        <MultiTrendChart series={series} />
      )}
    </section>
  );
}

type MoverRow = { peek: PeekWithContext; changePct: number };

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
      .slice(0, 3),
    fallers: rows
      .filter((r) => r.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 3),
  };
}

function MoverItem({ row }: { row: MoverRow }) {
  const { peek, changePct } = row;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const up = changePct > 0;
  const sign = up ? "+" : "−";
  return (
    <li>
      <Link
        href={`/peeks/${peek.slug}`}
        className="peek-lift group flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-brand"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-ink group-hover:text-brand">
            {peek.name}
          </div>
          <div className="truncate text-[12px] text-muted">
            {peek.floors?.name}
          </div>
        </div>
        <GradeBadge label={r.label} score={r.score} />
        <span
          className="shrink-0 text-sm font-bold tabular-nums"
          style={{ color: up ? "#1f9d55" : "#d1573a" }}
        >
          {sign}
          {Math.abs(changePct)} pts
        </span>
      </Link>
    </li>
  );
}

function MoversBlock({
  windowLabel,
  risers,
  fallers,
}: {
  windowLabel: string;
  risers: MoverRow[];
  fallers: MoverRow[];
}) {
  if (risers.length === 0 && fallers.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {windowLabel}
      </h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">▲ Risers</p>
          {risers.length > 0 ? (
            <ul className="space-y-2">
              {risers.map((row) => (
                <MoverItem key={row.peek.id} row={row} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No risers yet.</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">▼ Fallers</p>
          {fallers.length > 0 ? (
            <ul className="space-y-2">
              {fallers.map((row) => (
                <MoverItem key={row.peek.id} row={row} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No fallers yet.</p>
          )}
        </div>
      </div>
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

  // One query for every ranked peek's 30-day history — powers both the chart
  // (top 6) and the movers (all peeks).
  const snaps = await getSnapshotsForPeeks(
    rankedPeeks.map((p) => p.id),
    30
  );

  // Chart series: the map's top 5 peeks by grade. Built once per window (7 and
  // 30 days), keeping only peeks with >= 2 points in that window so a line
  // always has a real slope to draw.
  const topPeeks = rankedPeeks.slice(0, 5);
  const seriesFor = (windowDays: number): TrendSeries[] =>
    topPeeks
      .map((peek, i) => ({
        label: peek.name,
        href: `/peeks/${peek.slug}`,
        color: TREND_LINE_COLORS[i % TREND_LINE_COLORS.length],
        points: pointsWithinDays(snaps.get(peek.id) ?? [], windowDays),
      }))
      .filter((s) => s.points.length >= 2);
  const series7 = seriesFor(7);
  const series30 = seriesFor(30);

  const sevenDay = moversFor(rankedPeeks, snaps, 7);
  const thirtyDay = moversFor(rankedPeeks, snaps, 30);
  const hasMovers =
    sevenDay.risers.length + sevenDay.fallers.length > 0 ||
    thirtyDay.risers.length + thirtyDay.fallers.length > 0;

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
          <p className="mt-3 text-[15px] text-muted">
            How this map&apos;s spawn peeks are trending over time.
            {trackingSince ? ` ${trackingSince}.` : ""}
          </p>
          <div className="mt-3">
            <Link
              href={`/maps/${map.slug}`}
              className="text-sm font-semibold text-brand hover:underline"
            >
              ← Back to {map.name}
            </Link>
          </div>
        </div>

        {series7.length === 0 && series30.length === 0 ? (
          <p className="rounded-card border border-border bg-card p-6 text-center text-sm text-muted">
            Trends will appear here as we collect more daily snapshots.
            {trackingSince ? ` ${trackingSince}.` : ""}
          </p>
        ) : (
          <div className="space-y-6">
            <TrendChartBlock
              title="Last 7 days"
              series={series7}
              emptyNote="Not enough data in the last 7 days yet — check back soon."
            />
            <TrendChartBlock
              title="Last 30 days"
              series={series30}
              emptyNote="Not enough data yet."
            />
          </div>
        )}

        {hasMovers && (
          <section className="mt-10 space-y-8">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Movers
            </h2>
            <MoversBlock
              windowLabel="Last 7 days"
              risers={sevenDay.risers}
              fallers={sevenDay.fallers}
            />
            <MoversBlock
              windowLabel="Last 30 days"
              risers={thirtyDay.risers}
              fallers={thirtyDay.fallers}
            />
          </section>
        )}
      </main>
    </>
  );
}
