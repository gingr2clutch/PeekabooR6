import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { GradeBadge } from "@/components/GradeBadge";
import { MapStats } from "@/components/MapStats";
import { MapEntryScope } from "@/components/MapEntryScope";
import { MapViewToggle } from "@/components/MapViewToggle";
import { MapWeekCard, type WeekRow } from "@/components/MapWeekCard";
import { MapPin } from "lucide-react";
import { GADGET_HREF, PEEK_HREF } from "@/components/SubmitSplit";
import { NitroAdSlot } from "@/components/NitroAdSlot";
import { PageHeader } from "@/components/PageHeader";
import { PeekRouletteBar } from "@/components/PeekRouletteBar";
import {
  getFloorsForMap,
  getMapBySlug,
  getRankedPeeksForMap,
  getTopPeekForMap,
  type PeekWithContext,
} from "@/lib/db";
import { gradeTierColor, rating } from "@/lib/rate";
import { supabasePublic } from "@/lib/supabase";
import { TrendArrow } from "@/components/TrendArrow";
import {
  computeDirection,
  computeMover,
  getSnapshotsForPeeks,
  TREND_LINE_COLORS,
} from "@/lib/trends";
import { coverThumb } from "@/lib/cover-image";
import { mapAccent } from "@/lib/map-accents";
import { BlueprintImage } from "@/components/BlueprintImage";
import { MAP_GUIDES } from "@/content/map-guides";

// Most dots a floor card shows. At 1024px a 3-floor map gives each card about
// 300px, and 14 dots at 13px + 6px gap is ~260px — the widest row that still
// clears the card's padding. Floors with more peeks than this just stop the
// row; the count above it already states the real number.
const MAX_FLOOR_DOTS = 14;

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

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
  // Kept as an ISO timestamp for the JSON-LD below. The human-readable
  // "Updated <date>" badge it used to feed is gone, but the signal it carried
  // to Google should not be — dateModified is where a crawler actually looks
  // for it, rather than inside a sentence.
  const dateModified = latestPeekAt
    ? new Date(latestPeekAt).toISOString()
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

  // Grade dots for the desktop floor cards: every peek on a floor, best-first,
  // as its tier colour. rankedPeeks is already sorted best-first and already
  // loaded, so this is another reshape — no extra query, no DB change.
  const gradeDotsByFloorId = new Map<string, string[]>();
  for (const pk of rankedPeeks) {
    const fid = pk.floor_id;
    if (!fid) continue;
    const arr = gradeDotsByFloorId.get(fid) ?? [];
    arr.push(gradeTierColor(rating(pk.base_success_rate, pk.worked_votes, pk.vote_count).label));
    gradeDotsByFloorId.set(fid, arr);
  }

  // "This week's top 5" — the same five peeks the chart plots, in the same
  // order and with the same colours, so a row's dot always matches its line.
  // Carries the floor name, the measured percentage (measured peeks only) and
  // the 7-day move, all from data already in hand.
  const weekTop5 = rankedPeeks.slice(0, 5).map((pk, i) => ({
    id: pk.id,
    slug: pk.slug,
    name: pk.name,
    floorName: pk.floors?.name ?? null,
    color: TREND_LINE_COLORS[i % TREND_LINE_COLORS.length],
    r: rating(pk.base_success_rate, pk.worked_votes, pk.vote_count),
    mover: computeMover(rankedTrends.get(pk.id) ?? [], 7),
  }));

  // Seven day buckets, oldest first. Built from the snapshots the chart
  // already loaded — a reshape, not a read.
  //
  // The window ends on the most recent day that actually HAS a snapshot, not
  // on the calendar date. Snapshots are captured once a day, so anchoring on
  // "today" left the last column empty for every peek until that day's capture
  // ran — a whole column of "–" for most of each day. Labels stay honest about
  // it: the last column only says "Today" when that day really is today.
  const DAY_MS = 86400000;
  const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const todayKey = dayOf(Date.now());
  let newest = "";
  for (const pk of weekTop5) {
    for (const pt of rankedTrends.get(pk.id) ?? []) {
      if (pt.date > newest) newest = pt.date;
    }
  }
  // Fall back to today when there are no snapshots at all, and never run the
  // window past today even if a capture is somehow stamped ahead.
  const anchorKey = !newest || newest > todayKey ? todayKey : newest;
  const anchorMs = Date.parse(`${anchorKey}T00:00:00Z`);
  const dayKeys = Array.from({ length: 7 }, (_, k) =>
    dayOf(anchorMs - (6 - k) * DAY_MS)
  );
  const daysAgoOfKey = (key: string) =>
    Math.round((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${key}T00:00:00Z`)) / DAY_MS);
  const weekRows: WeekRow[] = weekTop5.map((pk) => {
    const byDate = new Map(
      (rankedTrends.get(pk.id) ?? []).map((p) => [p.date, p.pct])
    );
    return {
      id: pk.id,
      slug: pk.slug,
      name: pk.name,
      floorName: pk.floorName,
      color: pk.color,
      label: pk.r.label,
      score: pk.r.score,
      // Only measured peeks carry a real percentage; an estimate printed as
      // "71%" would claim a precision the data does not have.
      pct: pk.r.tier === "measured" ? pk.r.pct : null,
      movePct: pk.mover ? Math.round(pk.mover.changePct) : null,
      days: dayKeys.map((key) => {
        const ago = daysAgoOfKey(key);
        return {
          key,
          label: ago === 0 ? "Today" : `${ago}d`,
          pct: byDate.get(key) ?? null,
        };
      }),
    };
  });

  const floorLabel = `${floors.length} ${floors.length === 1 ? "floor" : "floors"}`;

  return (
    <>
      <PageHeader />
      <main className="site-shell mx-auto max-w-5xl px-6 pb-8 pt-6">
        {/* Minimal WebPage node, only so the freshness signal survives the
            blurb card's removal. Serialised with JSON.stringify rather than a
            template literal, so a map name containing a quote cannot break the
            script tag. */}
        {dateModified && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: MAP_GUIDES[map.slug]?.seoTitle ?? map.name,
                url: `${SITE_URL}/maps/${map.slug}`,
                dateModified,
              }),
            }}
          />
        )}
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
                className="object-cover object-center opacity-[0.22] lg:opacity-100"
              />
              {/* Soft fade to the page background at the bottom edge. */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg lg:hidden" />
              {/* Cream scrim over the left of the art only, so the right of
                  the frame is the map in full colour.

                  The brief asked for 95% -> 0 by 65%. Measured, that fails AA:
                  titles run to 50-59% of the box (89% for "Kafe Dostoyevsky"),
                  and at those stops the scrim is already near-clear, leaving
                  near-black ink on near-black art — 1.0:1. The fade-out moves
                  to 82% and the h1 is capped so it cannot outrun the scrim.
                  The art is still dramatically more visible than the flat 22%
                  opacity it replaced, and the right fifth is untouched. */}
              <div
                className="absolute inset-0 hidden lg:block"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(246,243,234,0.96) 0%, rgba(246,243,234,0.94) 40%, rgba(246,243,234,0.80) 58%, rgba(246,243,234,0.30) 72%, rgba(246,243,234,0) 82%)",
                }}
              />
            </div>
          )}
          {/* Per-map accent, drawn as an inset overlay that traces the hero
              box rather than a border on the cell itself — the art sits in an
              absolutely positioned sibling, so a border on the text cell would
              not line up with it. inset-0 + border means the stroke is painted
              inside the same rectangle, so the box's size and position are
              unchanged. Falls back to the ordinary border colour. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 hidden rounded-card border-[3px] lg:bottom-0 lg:right-[calc(33.333%+8px)] lg:block"
            style={{ borderColor: mapAccent(map.slug) }}
          />
          <div className="relative z-10 px-4 pb-0 pt-8 text-center lg:col-span-8 lg:py-0 lg:flex lg:min-h-[340px] lg:flex-col lg:justify-center lg:px-12 lg:text-left">
            {/* No breadcrumb line here — the mock drops it, and the page
                carries no breadcrumb structured data to preserve. Floor chips
                below are the only lg-only addition left. */}
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:max-w-[64%] lg:text-[88px] lg:font-bold lg:leading-[0.95]">
              {map.name}
            </h1>
            {/* One element, extended at lg — not a second copy of the line. */}
            {/* Darker at lg only. The lighter hero fade let more art through and
                dropped this line to 4.19:1 — under the 4.5 AA needs for body
                text at 18px. The h1 was never at risk (9.75:1). Measured, not
                eyeballed. */}
            <p className="mt-3 text-base text-[#585a52] sm:text-lg lg:mt-4 lg:text-[21px] lg:text-[#3d403a]">
              {floorLabel}
              <span className="hidden lg:inline">
                {" · "}{totalPeeks} {totalPeeks === 1 ? "peek" : "peeks"}
                {" · "}{mapVotes.toLocaleString("en-US")} {mapVotes === 1 ? "vote" : "votes"}
              </span>
            </p>
            {floors.length > 0 && (
              <div className="mt-5 hidden flex-wrap gap-2.5 lg:mt-7 lg:flex">
                {floors.map((floor) => {
                  const n = peekCountByFloor.get(floor.id) ?? 0;
                  return (
                    <Link key={floor.id} href={`/maps/${map.slug}/${floor.slug}`}
                      className="peek-lift inline-flex items-center gap-2.5 rounded-btn border border-border bg-card px-4 py-2.5 text-base font-semibold text-ink shadow-sm hover:border-brand hover:text-brand">
                      {floor.name}
                      <span className="font-mono text-[12px] uppercase tracking-wider text-brand">
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
              mapName={map.name}
              floorLabel={floorLabel}
              mapSlug={map.slug}
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
                  const dots = gradeDotsByFloorId.get(floor.id) ?? [];
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
                      {/* The accent rides in as a custom property rather than an
                          inline borderColor: inline styles have no media query,
                          and below lg this card must keep its white border
                          exactly as it is today. Only the lg class reads it. */}
                      <Link
                        href={`/maps/${map.slug}/${floor.slug}`}
                        style={
                          {
                            ["--floor-accent"]: mapAccent(map.slug),
                          } as React.CSSProperties
                        }
                        className="peek-lift group relative flex items-center justify-between gap-4 overflow-hidden rounded-card border-[3px] border-white bg-card px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:border-brand sm:px-6 sm:py-5 lg:h-[300px] lg:flex-col lg:items-start lg:justify-end lg:gap-0 lg:border-[color:var(--floor-accent)] lg:p-6 lg:hover:border-[color:var(--floor-accent)]"
                      >
                        {/* Faint floor blueprint as the card background —
                            decorative, lazy, behind the text. The white card base
                            keeps the name/count fully readable. Omitted when the
                            floor has no image, so those cards stay plain. */}
                        {floor.birds_eye_url && (
                          // eager + low priority: there are only 2-3 of these
                          // and they were waiting for the viewport before they
                          // even started. The hero stays the one high-priority
                          // image. Placeholder is lg-only, matching the scrim
                          // below it — under lg the card is white with a faint
                          // wash, where an accent block would be wrong.
                          <BlueprintImage
                            src={floor.birds_eye_url}
                            widths={[640, 960, 1280]}
                            sizes="(max-width: 896px) 100vw, 848px"
                            accent={mapAccent(map.slug)}
                            placeholderClassName="hidden lg:block"
                            eager
                            className="object-cover object-center opacity-[0.16] lg:opacity-100"
                          />
                        )}
                        {/* At lg the art fills the card and the text sits on
                            it, so the fade is the same bottom-weighted scrim
                            the top-peek card uses — same stops, tuned there
                            against the brightest thumbnail on the site. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 hidden lg:block"
                          style={{
                            backgroundImage:
                              "linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.88) 28%, rgba(0,0,0,0.76) 52%, rgba(0,0,0,0.42) 74%, rgba(0,0,0,0.12) 100%)",
                          }}
                        />
                        <span className="relative z-10 text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-2xl lg:order-2 lg:overflow-hidden lg:text-[28px] lg:leading-[1.05] lg:text-white lg:group-hover:text-white xl:text-[34px]"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}>
                          {floor.name}
                        </span>
                        <span className="relative z-10 shrink-0 font-mono text-sm font-semibold uppercase tracking-wider text-brand lg:order-1 lg:mb-1 lg:text-[12px] lg:tracking-[0.18em] lg:text-[#ffb27a]">
                          {n} {n === 1 ? "peek" : "peeks"}
                        </span>
                        {/* lg-only tile furniture: best peek on this floor and
                            the arrow. Both read from data already loaded. */}
                        {best && (
                          <span className="relative z-10 hidden items-center gap-2 text-[13px] text-white/85 lg:order-3 lg:mt-2 lg:inline-flex lg:max-w-[calc(100%-70px)]">
                            Best:
                            <span className="min-w-0 truncate font-semibold text-white">
                              {best.name}
                            </span>
                            <span className="shrink-0">
                              <GradeBadge label={best.label} score={best.score} />
                            </span>
                          </span>
                        )}
                        {/* One dot per peek on this floor, best-first, in its
                            grade tier colour — the floor's shape at a glance.
                            Capped so a busy floor cannot push the row wider
                            than the card at 1024px. */}
                        {dots.length > 0 && (
                          <span className="relative z-10 hidden flex-wrap gap-1.5 lg:order-4 lg:mt-3 lg:flex lg:max-w-[calc(100%-70px)]">
                            {dots.slice(0, MAX_FLOOR_DOTS).map((c, di) => (
                              <span
                                key={di}
                                aria-hidden
                                className="h-[13px] w-[13px] rounded-[3px]"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </span>
                        )}
                        <span
                          aria-hidden
                          className="absolute bottom-5 right-5 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-brand text-white transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none lg:inline-flex lg:h-[54px] lg:w-[54px] lg:text-[22px]"
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
                <>
                  {/* Below lg: the stacked cards, exactly as before. */}
                  <ol className="space-y-2 lg:hidden">

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

                  {/* lg+: the leaderboard table. Same peeks, same order, same
                      components — only the presentation differs. */}
                  <RankedTable
                    peeks={rankedPeeks}
                    trends={rankedTrends}
                    className="hidden lg:block"
                  />
                </>
              )
            }
          />
        )}

        {floors.length === 0 && (
          <p className="text-center text-muted">No floors yet for this map.</p>
        )}

        {/* Effectiveness trend — always visible, below the floor picker. The
            7-day card lives here; the full 30-day chart + Movers are one tap
            away.

            One card at every width now. The separate below-lg
            "Last 7 days — Top 5 peeks" chart card is gone: it showed the same
            five peeks as MapWeekCard's Top 5 view but with no percentages, no
            grades and no per-day detail, so phones got strictly less than
            desktop out of more vertical space. */}
        {totalPeeks >= 2 && (
          <div className="mt-8 md:mt-7">
            <MapWeekCard
              rows={weekRows}
              trendsHref={`/maps/${map.slug}/trends`}
            />
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
        {/* Left column. display:contents below lg, so this wrapper creates no
            box and the guide and the summary keep their exact position in the
            mobile flow. At lg it BECOMES the card — one bordered box with the
            guide on top and the summary as its bottom row — which is how the
            summary lands inside the card without the sentence being duplicated
            or moved out of the document order crawlers see. */}
        <div className="contents lg:col-span-8 lg:mt-14 lg:flex lg:flex-col lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-10 lg:shadow-sm">
        {MAP_GUIDES[map.slug] && (
          <section className="mx-auto mt-10 max-w-2xl text-center md:mt-8 lg:mx-0 lg:mt-0 lg:max-w-none lg:text-left">
            <span className="hidden font-mono text-[12px] uppercase tracking-[0.18em] text-brand lg:block">
              {map.name} Guide
            </span>
            <h2 className="mb-3 text-xl font-bold tracking-tight text-ink lg:mb-4 lg:mt-2.5 lg:text-[24px] lg:font-extrabold lg:[text-wrap:balance] xl:text-[30px]">
              {MAP_GUIDES[map.slug].heading}
            </h2>
            <p className="mx-auto max-w-[65ch] text-[15px] leading-relaxed text-ink/80 lg:mx-0 lg:max-w-[70ch] lg:text-[17px] lg:leading-[1.7]">
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
                  {/* Same control, longer label where there is room for it. */}
                  <span className="group-open:hidden lg:hidden">Read more</span>
                  <span className="hidden group-open:hidden lg:group-open:hidden lg:inline">
                    Read the full guide
                  </span>
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
        </div>

        {/* Right column, lg only — the ask that the sitewide bar makes on
            every other page, given a picture and this map's accent. The
            wrapper is the grid item and stretches to the row height; the card
            inside is what sticks, which is why they are two elements. */}
        <div className="hidden lg:col-span-4 lg:mt-14 lg:block">
          <aside
            style={{ borderColor: mapAccent(map.slug) }}
            className="relative flex h-full max-h-[640px] flex-col overflow-hidden rounded-card border-[3px] bg-[#14150f] p-10 shadow-sm lg:sticky lg:top-6"
          >
            {/* Lazy, and inside a display:none subtree below lg — a lazy
                image with no box is never near the viewport, so phones never
                download it. Maps without a cover keep the flat dark card. */}
            {map.cover_image_url && (
              <Image
                src={coverThumb(map.cover_image_url, 700)}
                alt=""
                aria-hidden
                fill
                sizes="420px"
                loading="lazy"
                className="pointer-events-none object-cover object-center"
              />
            )}
            {/* Same bottom-weighted scrim as the top-peek card, carried
                further up: the text block here is taller, so it reaches into
                stops that card never used. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 block"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.90) 34%, rgba(0,0,0,0.82) 58%, rgba(0,0,0,0.60) 78%, rgba(0,0,0,0.30) 100%)",
              }}
            />

            {/* In flow, not absolute, so it starts at the same 40px from the
                top as the guide's eyebrow opposite. */}
            {/* Both chips now: the ask below covers peeks AND gadget spots,
                so showing only a camera undersold half of it. */}
            <span aria-hidden className="relative z-10 inline-flex gap-2">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-btn border border-white/20 bg-black/45 text-white backdrop-blur-sm">
                <CameraIcon />
              </span>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-btn border border-white/20 bg-black/45 text-white backdrop-blur-sm">
                <MapPin size={20} strokeWidth={1.8} aria-hidden />
              </span>
            </span>

            <div className="relative z-10 mt-auto">
              <span className="block font-mono text-[12px] uppercase tracking-[0.18em] text-[#ffb07a]">
                Help grade {map.name}
              </span>
              <h2 className="mt-2.5 text-[24px] font-extrabold leading-[1.1] tracking-tight text-white [text-wrap:balance] xl:text-[30px]">
                Got a peek or gadget spot we&rsquo;re missing?
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/85">
                Send it in and the community grades it.
              </p>
              {/* The button is the link, not the card: this sits beside an ad
                  slot, and a card-sized tap target next to one is exactly the
                  accident we do not want. */}
              {/* Two equal buttons. flex-wrap, not a fixed 2-column grid, so
                  a narrow aside stacks them instead of squeezing both labels. */}
              <div className="mt-5 flex flex-wrap gap-2.5">
                <a
                  href={PEEK_HREF}
                  className="flex min-w-[160px] flex-1 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 py-3 text-[14px] font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  Submit a peek
                  <ArrowIcon />
                </a>
                <a
                  href={GADGET_HREF}
                  className="flex min-w-[160px] flex-1 items-center justify-center gap-1.5 rounded-btn bg-blue px-3 py-3 text-[14px] font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  Submit a gadget
                  <ArrowIcon />
                </a>
              </div>
            </div>
          </aside>
        </div>
        </div>
        </MapEntryScope>
      </main>
    </>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
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


// Ranked leaderboard table — lg only. Below lg the ranked view renders the
// stacked cards instead; this component is never visible there.
//
// role="table" on a grid rather than a real <table>: the row link has to cover
// the entire row, and `position: relative` on a <tr> is not reliably honoured.
// A grid row is an ordinary positioned box, so inset:0 on the link just works,
// and the roles carry the semantics the table markup would have.
function RankedTable({
  peeks,
  trends,
  className = "",
}: {
  peeks: PeekWithContext[];
  trends: Map<string, unknown[]>;
  className?: string;
}) {
  const cols = ["Rank", "Peek", "Floor", "Grade", "Trend", "Votes"];
  return (
    <div className={className}>
      <div role="table" aria-label="Every peek, ranked" className="mrt">
        <div role="rowgroup">
          <div role="row" className="mrt-row mrt-head">
            {cols.map((c) => (
              <span key={c} role="columnheader">
                {c}
              </span>
            ))}
            <span role="columnheader">
              <span className="sr-only">Favourite</span>
            </span>
          </div>
        </div>
        <div role="rowgroup" className="mrt-body">
          {peeks.map((peek, i) => {
            const r = rating(
              peek.base_success_rate,
              peek.worked_votes,
              peek.vote_count
            );
            const rank = i + 1;
            return (
              <div role="row" className="mrt-row" key={peek.id}>
                <span role="cell">
                  <span
                    className={`mrt-coin ${
                      rank <= 3 ? `mrt-coin--${rank}` : "mrt-coin--n"
                    }`}
                    aria-hidden
                  >
                    {rank}
                  </span>
                </span>
                <span role="cell" className="min-w-0 pr-4">
                  {/* Covers the whole row; the heart sits above it. */}
                  <Link
                    href={`/peeks/${peek.slug}?from=ranked`}
                    aria-label={peek.name}
                    className="mrt-rowlink"
                  />
                  <span className="mrt-name block">{peek.name}</span>
                </span>
                <span role="cell" className="min-w-0 pr-4">
                  <span className="mrt-floor">{peek.floors?.name}</span>
                </span>
                <span role="cell">
                  <GradeBadge label={r.label} score={r.score} />
                </span>
                <span role="cell">
                  <TrendArrow
                    direction={computeDirection(
                      (trends.get(peek.id) ?? []) as never
                    )}
                  />
                </span>
                <span role="cell" className="mrt-votes">
                  {peek.vote_count}
                </span>
                <span role="cell" className="mrt-fav">
                  <FavoriteButton peekId={peek.id} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
