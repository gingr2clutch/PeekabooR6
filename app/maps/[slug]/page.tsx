import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { GradeBadge } from "@/components/GradeBadge";
import { ProLockBadge } from "@/components/ProLockBadge";
import { MapStats } from "@/components/MapStats";
import { MapViewToggle } from "@/components/MapViewToggle";
import { PageHeader } from "@/components/PageHeader";
import { RandomPeekButton } from "@/components/RandomPeekButton";
import {
  getFloorsForMap,
  getMapBySlug,
  getRankedPeeksForMap,
  getTopPeekForMap,
} from "@/lib/db";
import { rating } from "@/lib/rate";
import { supabasePublic } from "@/lib/supabase";
import { TrendArrow } from "@/components/TrendArrow";
import { MultiTrendChart, type TrendSeries } from "@/components/MultiTrendChart";
import {
  computeDirection,
  getSnapshotsForPeeks,
  pointsWithinDays,
  TREND_LINE_COLORS,
} from "@/lib/trends";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map) return { title: "Not found" };
  return {
    title: map.name,
    description: `Spawn peek locations on ${map.name} — Rainbow Six Siege.`,
  };
}

export default async function MapPage({
  params,
}: {
  params: { slug: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  const floors = await getFloorsForMap(map.id);

  const floorIds = floors.map((f) => f.id);
  const peekCountByFloor = new Map<string, number>();
  let totalPeeks = 0;
  let mapVotes = 0; // sum of vote_count across this map's published peeks
  // Peek counts by computed grade leading letter (each spans +/base/-).
  let mapSTier = 0; // S+, S, S-
  let mapATier = 0; // A+, A, A-
  let mapBTier = 0; // B+, B, B-
  let mapCTier = 0; // C+, C, C-
  let latestPeekAt: string | null = null;
  if (floorIds.length > 0) {
    const { data: peeks } = await supabasePublic()
      .from("peeks")
      .select(
        "floor_id, created_at, vote_count, worked_votes, base_success_rate"
      )
      .in("floor_id", floorIds)
      .eq("published", true);
    for (const p of (peeks ?? []) as {
      floor_id: string;
      created_at: string;
      vote_count: number;
      worked_votes: number;
      base_success_rate: number;
    }[]) {
      peekCountByFloor.set(
        p.floor_id,
        (peekCountByFloor.get(p.floor_id) ?? 0) + 1
      );
      totalPeeks += 1;
      mapVotes += p.vote_count ?? 0;
      // Grade is computed (no stored column) — the same rating() the rest of
      // the site uses. Bucket by leading letter (S/A/B/C).
      const g = rating(
        p.base_success_rate,
        p.worked_votes,
        p.vote_count
      ).grade;
      if (g === "S") mapSTier += 1;
      else if (g === "A") mapATier += 1;
      else if (g === "B") mapBTier += 1;
      else mapCTier += 1;
      if (!latestPeekAt || p.created_at > latestPeekAt) {
        latestPeekAt = p.created_at;
      }
    }
  }

  const topPeek = await getTopPeekForMap(floorIds);
  const rankedPeeks = await getRankedPeeksForMap(floorIds);

  // Batched 7-vs-7 trend direction for the ranked-list arrows (one query).
  const rankedTrends = await getSnapshotsForPeeks(
    rankedPeeks.map((p) => p.id),
    14
  );

  // Always-visible "Last 7 days" chart: top 5 peeks, reusing the 14-day
  // snapshots above (filtered to the last 7 days). Only series with a real
  // slope (>= 2 points in the window) are plotted.
  const mapSeries7: TrendSeries[] = rankedPeeks
    .slice(0, 5)
    .map((peek, i) => ({
      label: peek.name,
      href: `/peeks/${peek.slug}`,
      color: TREND_LINE_COLORS[i % TREND_LINE_COLORS.length],
      points: pointsWithinDays(rankedTrends.get(peek.id) ?? [], 7),
    }))
    .filter((s) => s.points.length >= 2);

  const lastUpdatedLabel = latestPeekAt
    ? new Date(latestPeekAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const floorLabel = `${floors.length} ${floors.length === 1 ? "floor" : "floors"}`;

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-6 pb-20 pt-6">
        {/* Header with a subtle backdrop of the map's own cover image — faint,
            cover-cropped, fading into the page background at the bottom so it
            blends into the stats section. Decorative (empty alt) and absolutely
            positioned, so it adds no layout shift. */}
        <div className="relative mb-8 overflow-hidden rounded-card">
          {map.cover_image_url && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <Image
                src={map.cover_image_url}
                alt=""
                fill
                sizes="(max-width: 896px) 100vw, 848px"
                className="object-cover object-center opacity-[0.12]"
              />
              {/* Soft fade to the page background at the bottom edge. */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
            </div>
          )}
          <div data-reveal className="relative z-10 px-4 py-8 text-center">
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
              {map.name}
            </h1>
            <p className="mt-3 text-sm text-muted">{floorLabel}</p>
            <p className="mt-2 text-[15px] font-light italic text-muted">
              Choose your floor
            </p>
            {totalPeeks >= 2 && (
              <div className="mt-5">
                <RandomPeekButton href={`/api/maps/${map.slug}/random-peek`} />
              </div>
            )}
          </div>
        </div>

        {totalPeeks > 0 && (
          <div data-reveal className="mb-8">
            <MapStats
              peeks={totalPeeks}
              votes={mapVotes}
              grades={{ S: mapSTier, A: mapATier, B: mapBTier, C: mapCTier }}
              topPeek={topPeek}
            />
          </div>
        )}

        {floors.length > 0 && (
          <MapViewToggle
            floorsView={
              <ul className="space-y-3">
                {floors.map((floor, i) => {
                  const n = peekCountByFloor.get(floor.id) ?? 0;
                  return (
                    <li
                      key={floor.id}
                      data-reveal
                      style={
                        {
                          ["--reveal-delay"]: `${(i % 5) * 70}ms`,
                        } as React.CSSProperties
                      }
                    >
                      <Link
                        href={`/maps/${map.slug}/${floor.slug}`}
                        className="peek-lift group flex items-center justify-between gap-4 rounded-card border-[3px] border-white bg-card px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:border-brand sm:px-6 sm:py-5"
                      >
                        <span className="text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-2xl">
                          {floor.name}
                        </span>
                        <span className="shrink-0 font-mono text-sm font-semibold uppercase tracking-wider text-brand">
                          {n} {n === 1 ? "peek" : "peeks"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            }
            rankedView={
              rankedPeeks.length === 0 ? (
                <p className="text-center text-sm text-muted">
                  No spawn peeks on this map yet.
                </p>
              ) : (
                <ol className="space-y-2">
                  {rankedPeeks.map((peek, i) => {
                    const r = rating(
                      peek.base_success_rate,
                      peek.worked_votes,
                      peek.vote_count
                    );
                    return (
                      <li
                        key={peek.id}
                        className="peek-cascade"
                        style={
                          {
                            ["--cascade-delay"]: `${Math.min(i, 20) * 40}ms`,
                          } as React.CSSProperties
                        }
                      >
                        <div className="peek-lift group relative flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm hover:border-brand">
                          <Link
                            href={`/peeks/${peek.slug}`}
                            aria-label={peek.name}
                            className="absolute inset-0 rounded-card"
                          />
                          <span
                            aria-hidden
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand"
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-semibold text-ink group-hover:text-brand">
                              {peek.name}
                            </div>
                            <div className="truncate text-[12px] text-muted">
                              {peek.floors?.name}
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1">
                            <GradeBadge label={r.label} score={r.score} />
                            <TrendArrow
                              direction={computeDirection(
                                rankedTrends.get(peek.id) ?? []
                              )}
                            />
                          </span>
                          {peek.is_pro_only && <ProLockBadge />}
                          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted tabular-nums">
                            {peek.vote_count}{" "}
                            {peek.vote_count === 1 ? "vote" : "votes"}
                          </span>
                          <FavoriteButton
                            peekId={peek.id}
                            className="relative z-10"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )
            }
          />
        )}

        {floors.length === 0 && (
          <p className="text-center text-muted">No floors yet for this map.</p>
        )}

        {/* Effectiveness trend — always visible, below the floor picker. The
            7-day chart lives here; the full 30-day chart + Movers are one tap
            away. Card matches the stats box width/styling. */}
        {totalPeeks >= 2 && (
          <div data-reveal className="mt-8">
            <div className="rounded-card border border-border bg-card px-4 py-5 shadow-sm sm:px-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                Last 7 days — Top 5 peeks
              </h2>
              {mapSeries7.length === 0 ? (
                <p className="text-center text-sm text-muted">
                  Trend data is still being collected — snapshots are captured
                  daily.
                </p>
              ) : (
                <MultiTrendChart series={mapSeries7} />
              )}
              <div className="mt-4 text-center">
                <Link
                  href={`/maps/${map.slug}/trends`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  See full trends →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Descriptive blurb — moved to the very bottom as small, secondary
            text (max 2 sentences: the intro + optional "Updated" line). */}
        {totalPeeks > 0 && (
          <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-muted">
            Community-graded spawn peeks for {map.name} — pick a floor to see
            exact spots, watch clips, and learn the setups.
            {lastUpdatedLabel ? ` Updated ${lastUpdatedLabel}.` : ""}
          </p>
        )}
      </main>
    </>
  );
}
