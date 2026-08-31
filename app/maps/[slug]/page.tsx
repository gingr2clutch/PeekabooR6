import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BestPeek } from "@/components/BestPeek";
import { FavoriteButton } from "@/components/FavoriteButton";
import { GradeBadge } from "@/components/GradeBadge";
import { MapStats } from "@/components/MapStats";
import { MapEntryScope } from "@/components/MapEntryScope";
import { MapViewToggle } from "@/components/MapViewToggle";
import { PageHeader } from "@/components/PageHeader";
import { PeekRouletteBar } from "@/components/PeekRouletteBar";
import {
  getFloorsForMap,
  getMapBySlug,
  getRankedPeeksForMap,
  getTopPeekForMap,
  getUnderratedTopIds,
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
import { coverThumb } from "@/lib/cover-image";
import { MAP_GUIDES } from "@/content/map-guides";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map) return { title: "Not found" };
  const guide = MAP_GUIDES[params.slug];
  return {
    title: guide?.seoTitle ?? map.name,
    description:
      guide?.seoDescription ??
      `Spawn peek locations on ${map.name} — Rainbow Six Siege.`,
  };
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  // ?view=ranked keeps the ranked-list choice on direct links and back-nav.
  searchParams: { view?: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  // gemIds is a sitewide list and does not depend on this map, so it rides
  // along with the floors lookup instead of waiting for it.
  const [floors, gemIds] = await Promise.all([
    getFloorsForMap(map.id),
    getUnderratedTopIds(),
  ]);

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
  // These three all key off floorIds and nothing else, so they run together.
  // getTopPeekForMap and getRankedPeeksForMap both short-circuit on an empty
  // floor list, so no guard is needed around them.
  const [peekRollupRes, topPeek, rankedPeeks] = await Promise.all([
    floorIds.length > 0
      ? supabasePublic()
          .from("peeks")
          .select(
            "floor_id, created_at, vote_count, worked_votes, base_success_rate"
          )
          .in("floor_id", floorIds)
          .eq("published", true)
      : Promise.resolve({ data: [] }),
    getTopPeekForMap(floorIds),
    getRankedPeeksForMap(floorIds),
  ]);

  {
    const peeks = peekRollupRes.data;
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

  // Batched 7-vs-7 trend direction for the ranked-list arrows (one query).
  const rankedTrends = await getSnapshotsForPeeks(
    rankedPeeks.map((p) => p.id),
    14
  );

  // "Underrated on this map" now shows ONLY this map's peeks that made the
  // sitewide top 10 — so a map surfaces 0–3 real gems (or the row hides). Keeps
  // the rarity story consistent with /underrated. rankedPeeks is already sorted
  // best-first, so this preserves grade order.
  const underratedPeeks = rankedPeeks.filter((p) => gemIds.has(p.id));

  // Peek Roulette draws from this map's full published pool. rankedPeeks is
  // already loaded above, so this adds no query — it is a reshape, not a read.
  // Grade is the computed rating() label, since peeks carry no grade column.
  const roulettePeeks = rankedPeeks.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    floorName: p.floors?.name ?? null,
    gradeLabel: rating(p.base_success_rate, p.worked_votes, p.vote_count).label,
    videoUrl: p.video_url,
    posterUrl: p.poster_url,
  }));

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
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-6">
        <MapEntryScope>
        {/* Header with a subtle backdrop of the map's own cover image — faint,
            cover-cropped, fading into the page background at the bottom so it
            blends into the stats section. Decorative (empty alt) and absolutely
            positioned, so it adds no layout shift. */}
        <div className="relative mb-8 overflow-hidden rounded-card">
          {map.cover_image_url && (
            <div aria-hidden className="map-image-enter pointer-events-none absolute inset-0">
              <Image
                src={coverThumb(map.cover_image_url, 900)}
                alt=""
                fill
                sizes="(max-width: 896px) 100vw, 848px"
                className="object-cover object-center opacity-[0.22]"
              />
              {/* Soft fade to the page background at the bottom edge. */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
            </div>
          )}
          <div className="relative z-10 px-4 py-8 text-center">
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
              {map.name}
            </h1>
            <p className="mt-3 text-base text-[#585a52] sm:text-lg">{floorLabel}</p>
            {totalPeeks >= 2 && (
              <div className="mt-5">
                <PeekRouletteBar
                  mapName={map.name}
                  mapSlug={map.slug}
                  peeks={roulettePeeks}
                  mapCoverUrl={map.cover_image_url}
                />
              </div>
            )}
          </div>
        </div>

        {totalPeeks > 0 && (
          <div className="mb-8">
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
            initialView={searchParams.view === "ranked" ? "ranked" : "floors"}
            floorsView={
              <ul className="space-y-3">
                {floors.map((floor, i) => {
                  const n = peekCountByFloor.get(floor.id) ?? 0;
                  return (
                    <li
                      key={floor.id}
                      className="floor-enter"
                      style={
                        {
                          ["--enter-delay"]: `${Math.min(i, 12) * 40}ms`,
                        } as React.CSSProperties
                      }
                    >
                      <Link
                        href={`/maps/${map.slug}/${floor.slug}`}
                        className="peek-lift group relative flex items-center justify-between gap-4 overflow-hidden rounded-card border-[3px] border-white bg-card px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:border-brand sm:px-6 sm:py-5"
                      >
                        {/* Faint floor blueprint as the card background —
                            decorative, lazy, behind the text. The white card base
                            keeps the name/count fully readable. Omitted when the
                            floor has no image, so those cards stay plain. */}
                        {floor.birds_eye_url && (
                          <Image
                            src={floor.birds_eye_url}
                            alt=""
                            aria-hidden
                            fill
                            sizes="(max-width: 896px) 100vw, 848px"
                            loading="lazy"
                            className="pointer-events-none object-cover object-center opacity-[0.16]"
                          />
                        )}
                        <span className="relative z-10 text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-2xl">
                          {floor.name}
                        </span>
                        <span className="relative z-10 shrink-0 font-mono text-sm font-semibold uppercase tracking-wider text-brand">
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
                        data-reveal="quick"
                        style={
                          {
                            "--reveal-delay": `${Math.min(i, 5) * 50}ms`,
                          } as React.CSSProperties
                        }
                      >
                        <div className="peek-lift group relative flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm hover:border-brand">
                          <Link
                            href={`/peeks/${peek.slug}?from=ranked`}
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

        {/* Hidden gems on this map — high grade, few votes. Only shown when the
            map actually has some. */}
        {underratedPeeks.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-center text-lg font-bold tracking-tight text-ink">
              💎 Underrated on this map
            </h2>
            {/* Revealed as one block rather than per card: BestPeek's root has
                no h-full, so wrapping each card in a reveal div would make it
                the grid item and break the row-height stretch. */}
            <div data-reveal="quick" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {underratedPeeks.map((peek) => (
                <BestPeek key={peek.id} peek={peek} isGem from="map" />
              ))}
            </div>
          </div>
        )}

        {/* Effectiveness trend — always visible, below the floor picker. The
            7-day chart lives here; the full 30-day chart + Movers are one tap
            away. Card matches the stats box width/styling. */}
        {totalPeeks >= 2 && (
          <div className="mt-8">
            <div className="rounded-card border border-border bg-card px-4 py-5 shadow-sm sm:px-6">
              <h2 className="mb-4 text-center text-lg font-bold tracking-tight text-ink">
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

        {/* Per-map guide text (SEO + in-content ad anchors). Renders ONLY for
            maps with an entry in content/map-guides.ts — other maps unchanged.
            Sits below the trends card so nothing above it moves. */}
        {MAP_GUIDES[map.slug] && (
          <section className="mx-auto mt-12 max-w-2xl">
            <h2 className="mb-3 text-xl font-bold tracking-tight text-ink">
              {MAP_GUIDES[map.slug].heading}
            </h2>
            <p className="text-[15px] leading-relaxed text-ink/80">
              {MAP_GUIDES[map.slug].intro}
            </p>
            {MAP_GUIDES[map.slug].sections.map((s) => (
              <div key={s.heading} className="mt-6">
                <h3 className="mb-2 text-base font-bold tracking-tight text-ink">
                  {s.heading}
                </h3>
                <p className="text-[15px] leading-relaxed text-ink/80">
                  {s.body}
                </p>
              </div>
            ))}
          </section>
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
        </MapEntryScope>
      </main>
    </>
  );
}
