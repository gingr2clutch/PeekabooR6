import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { GradeBadge } from "@/components/GradeBadge";
import { MapStats } from "@/components/MapStats";
import { MapEntryScope } from "@/components/MapEntryScope";
import { MapViewToggle } from "@/components/MapViewToggle";
import { NitroAdSlot } from "@/components/NitroAdSlot";
import { PageHeader } from "@/components/PageHeader";
import { PeekRouletteBar } from "@/components/PeekRouletteBar";
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

  // Best peek per floor for the desktop tiles. rankedPeeks is already loaded
  // and already sorted best-first, so the first hit per floor name is that
  // floor's best — a reshape of data in hand, not another query.
  const bestByFloorName = new Map<string, { name: string; label: string; score: number }>();
  for (const pk of rankedPeeks) {
    const fname = pk.floors?.name;
    if (!fname || bestByFloorName.has(fname)) continue;
    const rr = rating(pk.base_success_rate, pk.worked_votes, pk.vote_count);
    bestByFloorName.set(fname, { name: pk.name, label: rr.label, score: rr.score });
  }

  // "This week's top 5" — the same five peeks the chart plots, in the same
  // order and with the same colours, so a row's dot always matches its line.
  const weekTop5 = rankedPeeks.slice(0, 5).map((pk, i) => ({
    id: pk.id,
    slug: pk.slug,
    name: pk.name,
    color: TREND_LINE_COLORS[i % TREND_LINE_COLORS.length],
    r: rating(pk.base_success_rate, pk.worked_votes, pk.vote_count),
  }));

  const floorLabel = `${floors.length} ${floors.length === 1 ? "floor" : "floors"}`;

  return (
    <>
      <PageHeader />
      <main className="site-shell mx-auto max-w-5xl px-6 pb-8 pt-6">
        <MapEntryScope>
        {/* Header with a subtle backdrop of the map's own cover image — faint,
            cover-cropped, fading into the page background at the bottom so it
            blends into the stats section. Decorative (empty alt) and absolutely
            positioned, so it adds no layout shift. */}
        {/* ROW 1 — hero + roulette. Below lg this is the block it has always
            been: one rounded card, cover art behind, centred text, roulette
            underneath. At lg the same two children become an 8 + 4 grid. No
            element is added or removed for mobile. */}
        <div className="relative mb-8 overflow-hidden rounded-card lg:mb-6 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6 lg:overflow-visible lg:rounded-none">
          {map.cover_image_url && (
            <div aria-hidden className="map-image-enter pointer-events-none absolute inset-0 lg:bottom-0 lg:right-[calc(33.333%+8px)] lg:overflow-hidden lg:rounded-card">
              <Image
                src={coverThumb(map.cover_image_url, 900)}
                alt=""
                fill
                sizes="(max-width: 896px) 100vw, 848px"
                className="object-cover object-center opacity-[0.22]"
              />
              {/* Soft fade to the page background at the bottom edge. */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg lg:hidden" />
              {/* Cream fade from the left so the headline sits on page colour
                  and the art reads at the right edge — the mock's treatment. */}
              <div className="absolute inset-0 hidden bg-gradient-to-r from-bg via-bg/80 to-transparent lg:block" />
            </div>
          )}
          <div className="relative z-10 px-4 pb-0 pt-8 text-center lg:col-span-8 lg:py-0 lg:flex lg:min-h-[300px] lg:flex-col lg:justify-center lg:px-10 lg:text-left">
            {/* Breadcrumb and floor chips are lg-only additions. */}
            <nav aria-label="Breadcrumb" className="mb-3 hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted lg:block">
              <Link href="/" className="hover:text-brand">Maps</Link>
              <span aria-hidden> / </span>
              <span className="text-ink/70">{map.name}</span>
            </nav>
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              {map.name}
            </h1>
            {/* One element, extended at lg — not a second copy of the line. */}
            <p className="mt-3 text-base text-[#585a52] sm:text-lg">
              {floorLabel}
              <span className="hidden lg:inline">
                {" · "}{totalPeeks} {totalPeeks === 1 ? "peek" : "peeks"}
                {" · "}{mapVotes.toLocaleString("en-US")} {mapVotes === 1 ? "vote" : "votes"}
              </span>
            </p>
            {floors.length > 0 && (
              <div className="mt-5 hidden flex-wrap gap-2 lg:flex">
                {floors.map((floor) => {
                  const n = peekCountByFloor.get(floor.id) ?? 0;
                  return (
                    <Link key={floor.id} href={`/maps/${map.slug}/${floor.slug}`}
                      className="peek-lift inline-flex items-center gap-2 rounded-btn border border-border bg-card px-3 py-1.5 text-sm font-semibold text-ink shadow-sm hover:border-brand hover:text-brand">
                      {floor.name}
                      <span className="font-mono text-[11px] uppercase tracking-wider text-brand">
                        {n} {n === 1 ? "peek" : "peeks"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {totalPeeks >= 2 && (
            <div className="relative z-10 mt-5 px-4 pb-8 lg:col-span-4 lg:mt-0 lg:px-0 lg:pb-0">
              <PeekRouletteBar
                mapName={map.name}
                mapSlug={map.slug}
                peeks={roulettePeeks}
                mapCoverUrl={map.cover_image_url}
                stacked
              />
            </div>
          )}
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

        {/* content-1 — between the Map Stats card and the Floors panel. Below
            the fold on a phone: the hero, the roulette bar and the stats card
            all sit above it. */}
        <NitroAdSlot id="pkb-content-1" className="my-8 md:my-7" />

        {floors.length > 0 && (
          <MapViewToggle
            initialView={searchParams.view === "ranked" ? "ranked" : "floors"}
            floorsView={
              <ul className="space-y-3 lg:grid lg:gap-6 lg:space-y-0 lg:[grid-template-columns:repeat(var(--floor-cols),minmax(0,1fr))]"
                  style={{ ["--floor-cols" as string]: floors.length === 3 ? 3 : 2 }}>
                {floors.map((floor, i) => {
                  const n = peekCountByFloor.get(floor.id) ?? 0;
                  const best = bestByFloorName.get(floor.name);
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
                        className="peek-lift group relative flex items-center justify-between gap-4 overflow-hidden rounded-card border-[3px] border-white bg-card px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:border-brand sm:px-6 sm:py-5 lg:h-[190px] lg:flex-col lg:items-start lg:justify-start lg:py-6"
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
                            className="pointer-events-none object-cover object-center opacity-[0.16] lg:opacity-100"
                          />
                        )}
                        {/* At lg the art is fully visible on the right, with a
                            card-coloured fade so the text keeps its contrast. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-card via-card/92 to-transparent lg:block"
                        />
                        <span className="relative z-10 text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-2xl lg:text-3xl">
                          {floor.name}
                        </span>
                        <span className="relative z-10 shrink-0 font-mono text-sm font-semibold uppercase tracking-wider text-brand lg:mt-1">
                          {n} {n === 1 ? "peek" : "peeks"}
                        </span>
                        {/* lg-only tile furniture: best peek on this floor and
                            the arrow. Both read from data already loaded. */}
                        {best && (
                          <span className="relative z-10 mt-auto hidden items-center gap-2 text-[13px] text-muted lg:inline-flex">
                            Best:
                            <span className="font-semibold text-ink">{best.name}</span>
                            <GradeBadge label={best.label} score={best.score} />
                          </span>
                        )}
                        <span
                          aria-hidden
                          className="absolute bottom-5 right-5 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-brand text-white transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none lg:inline-flex"
                        >
                          →
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

        {/* Effectiveness trend — always visible, below the floor picker. The
            7-day chart lives here; the full 30-day chart + Movers are one tap
            away. Card matches the stats box width/styling. */}
        {totalPeeks >= 2 && (
          <div className="mt-8 md:mt-7 lg:grid lg:grid-cols-12 lg:gap-6">
            <div className="rounded-card border border-border bg-card px-4 py-4 shadow-sm sm:px-6 md:py-5 lg:col-span-8 lg:px-8 lg:py-7">
              <h2 className="mb-4 text-center text-lg font-bold tracking-tight text-ink lg:mb-5 lg:text-xl">
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
              <div className="mt-3 text-center lg:text-left">
                <Link
                  href={`/maps/${map.slug}/trends`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  See full trends →
                </Link>
              </div>
            </div>

            {/* lg-only companion to the chart. Same five peeks, same order,
                same colours, so a row's dot is its line. */}
            {weekTop5.length > 0 && (
              <div className="hidden lg:col-span-4 lg:block lg:rounded-card lg:border lg:border-border lg:bg-card lg:px-6 lg:py-7 lg:shadow-sm">
                <h2 className="mb-4 text-lg font-bold tracking-tight text-ink lg:text-xl">
                  This week&apos;s top 5
                </h2>
                <ol className="space-y-1">
                  {weekTop5.map((pk, i) => (
                    <li key={pk.id} className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0">
                      <span className="w-3 shrink-0 font-mono text-[11px] text-muted tabular-nums">
                        {i + 1}
                      </span>
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pk.color }} />
                      <Link href={`/peeks/${pk.slug}?from=map`} className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink hover:text-brand">
                        {pk.name}
                      </Link>
                      <GradeBadge label={pk.r.label} score={pk.r.score} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* content-2 — below the trend chart, above the guide text. */}
        <NitroAdSlot id="pkb-content-2" className="my-8 md:my-7" />

        {/* Per-map guide text (SEO + in-content ad anchors). Renders ONLY for
            maps with an entry in content/map-guides.ts — other maps unchanged.
            Sits below the trends card so nothing above it moves. */}
        {/* Centred down to the toggle; the folded prose below goes back to
            left-aligned. Centring a heading and a lead paragraph reads as
            deliberate, but centring several paragraphs of body copy makes every
            line start in a different place and is genuinely harder to read — so
            the column stays centred and the text inside it does not. */}
        {/* ROW 7 — guide card + summary. Wrapped in a grid at lg; below lg the
            two children stack exactly as they do today. */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        {MAP_GUIDES[map.slug] && (
          <section className="mx-auto mt-10 max-w-2xl text-center md:mt-8 lg:col-span-8 lg:mt-14 lg:max-w-none lg:rounded-card lg:border lg:border-border lg:bg-card lg:px-8 lg:py-7 lg:text-left lg:shadow-sm">
            <h2 className="mb-3 text-xl font-bold tracking-tight text-ink lg:mb-4 lg:text-2xl">
              {MAP_GUIDES[map.slug].heading}
            </h2>
            <p className="mx-auto max-w-[65ch] text-[15px] leading-relaxed text-ink/80 lg:mx-0">
              {MAP_GUIDES[map.slug].intro}
            </p>
            {/* The rest folds away, but it is NOT conditionally rendered: a
                <details> ships its whole subtree in the server HTML, headings
                and all, and is readable to crawlers whether or not it is open.
                Rendering the sections client-side on demand is what would cost
                the SEO this text exists for.

                No ad lives inside the fold — content-2 sits above this section,
                so nothing is ever requested for a box a reader cannot see. */}
            {MAP_GUIDES[map.slug].sections.length > 0 && (
              <details className="group mt-5 map-guide-more">
                <summary className="mx-auto inline-flex lg:mx-0 cursor-pointer list-none items-center gap-1.5 rounded-btn text-sm font-semibold text-brand hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Read more</span>
                  <span className="hidden group-open:inline">Show less</span>
                  <ChevronIcon />
                </summary>
                <div className="map-guide-more-body mx-auto max-w-[65ch] text-left lg:mx-0">
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
                </div>
              </details>
            )}
          </section>
        )}

        {/* Descriptive blurb, now in a card of its own so it reads as a
            deliberate footer note rather than text that ran out of page.

            The sentence is UNCHANGED, including the trailing "Updated <date>."
            — it is indexed copy, so the date is repeated inside the badge
            rather than moved into it. Visually the badge carries it; in the
            markup the sentence is still whole. */}
        {totalPeeks > 0 && (
          <div className="mx-auto mt-10 max-w-2xl md:mt-8 lg:col-span-4 lg:mt-14 lg:max-w-none">
            <div className="flex flex-col items-center gap-2.5 rounded-card border border-border bg-card px-5 py-4 text-center shadow-sm lg:gap-3 lg:px-8 lg:py-6">
              <p className="max-w-[65ch] text-sm leading-relaxed text-muted">
                Community-graded spawn peeks for {map.name} — pick a floor to
                see exact spots, watch clips, and learn the setups.
                {lastUpdatedLabel ? (
                  <span className="sr-only">{` Updated ${lastUpdatedLabel}.`}</span>
                ) : (
                  ""
                )}
              </p>
              {lastUpdatedLabel && (
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-1.5 rounded-btn border border-border bg-bg px-2.5 py-1 text-[11px] font-medium text-muted"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  Updated {lastUpdatedLabel}
                </span>
              )}
            </div>
          </div>
        )}
        </div>
        </MapEntryScope>
      </main>
    </>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden
      className="shrink-0 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
