import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FloorView, type FloorSpot } from "@/components/FloorView";
import { groupIntoSpots } from "@/lib/pin-groups";
import { clipCreditName } from "@/components/ClipCredit";
import { clipPlatform } from "@/lib/gadget-embed";
import { NitroAdSlot } from "@/components/NitroAdSlot";
import { PageHeader } from "@/components/PageHeader";
import {
  getFloorBySlug,
  getFloorsForMap,
  getMapBySlug,
  getPublishedPeeksForFloor,
  getRankedPeeksForMap,
} from "@/lib/db";
import type { Peek } from "@/lib/db";
import { rating, gradeTierColor, displayRate } from "@/lib/rate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string; floor: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map) return { title: "Not found" };
  const floor = await getFloorBySlug(map.id, params.floor);
  if (!floor) return { title: "Not found" };
  return {
    title: `${map.name} · ${floor.name}`,
    description: `Spawn peeks on ${map.name} ${floor.name} — Rainbow Six Siege.`,
  };
}

export default async function FloorPage({
  params,
}: {
  params: { slug: string; floor: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  const floor = await getFloorBySlug(map.id, params.floor);
  if (!floor) notFound();

  const peeks = await getPublishedPeeksForFloor(floor.id);

  // Peeks filmed at the same window or door collapse into one pin. Grouping
  // happens here, on the server, so the client is handed the finished shape —
  // and the old fan-out spiral is gone with it: spots are at least SAME_SPOT
  // apart by construction, so there is nothing left to un-overlap.
  //
  // Credits resolve here too, through the SAME clipCreditName the peek page
  // renders, so a contributor cannot be worded differently in a pin list than
  // on their own peek. Only these plain fields cross to the client — never a
  // contributor row, and never another column of the peeks table.
  const spots: FloorSpot[] = groupIntoSpots(peeks).map((spot) => ({
    members: spot.members.map((p) => {
      const platform = p.tiktok_url ? clipPlatform(p.tiktok_url) : null;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        x_pct: p.x_pct,
        y_pct: p.y_pct,
        tiktok_url: p.tiktok_url,
        base_success_rate: p.base_success_rate,
        worked_votes: p.worked_votes,
        vote_count: p.vote_count,
        created_at: p.created_at,
        difficulty: p.difficulty,
        risk: p.risk,
        credit: clipCreditName({
          contributor: p.contributors,
          platform,
          externalUnknown: !!p.tiktok_url && platform === null,
        }),
      };
    }),
  }));
  // Same query path /maps/[slug]/page.tsx uses — one extra round trip,
  // ordered by display_order ascending.
  const allFloors = await getFloorsForMap(map.id);

  // Floor-level stats, computed from the peeks already loaded for this floor.
  const floorStats = computeFloorStats(peeks);

  // Rank this floor vs. the map's other floors by S/A-tier count. Needs every
  // floor's peeks (one extra map-wide query) — only when there's more than one
  // floor and this floor has peeks to rank.
  let saRank: { rank: number; total: number } | null = null;
  if (allFloors.length > 1 && peeks.length > 0) {
    const mapPeeks = await getRankedPeeksForMap(allFloors.map((f) => f.id));
    const countByFloor = new Map<string, number>();
    for (const f of allFloors) countByFloor.set(f.id, 0);
    for (const p of mapPeeks) {
      if (isSaTier(p) && countByFloor.has(p.floor_id)) {
        countByFloor.set(p.floor_id, (countByFloor.get(p.floor_id) ?? 0) + 1);
      }
    }
    // Standard competition ranking: floors with a strictly higher count rank
    // ahead; ties share a rank number ("2nd of 4" for both).
    let ahead = 0;
    countByFloor.forEach((c, id) => {
      if (id !== floor.id && c > floorStats.saCount) ahead++;
    });
    saRank = { rank: ahead + 1, total: allFloors.length };
  }

  return (
    <>
      <PageHeader />
      <main className="site-shell fade-in-up mx-auto max-w-5xl px-6 pb-8 pt-10">
        <div className="mb-8 text-center">
          <div className="mb-3">
            <Link
              href={`/maps/${map.slug}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-btn px-2.5 py-1 text-sm font-medium text-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand lg:text-base"
            >
              <BackArrowIcon />
              <span>{map.name}</span>
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight lg:text-[52px] lg:font-bold lg:leading-[1.05] lg:tracking-[-0.02em]">
            {map.name} · {floor.name}
          </h1>
          <p className="mt-2 text-muted lg:mt-3 lg:text-xl">
            Spawn peeks · click any pin for details
          </p>
          {allFloors.length > 1 && (
            <nav
              aria-label="Floors"
              className="mt-5 flex flex-wrap justify-center gap-2 lg:mt-7 lg:gap-3"
            >
              {allFloors.map((f) => {
                const isCurrent = f.id === floor.id;
                const base =
                  "inline-flex items-center rounded-btn px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out lg:px-6 lg:py-3 lg:text-lg";
                const state = isCurrent
                  ? "bg-brand text-white shadow-sm"
                  : "border border-border bg-card text-ink hover:border-brand hover:text-brand";
                return isCurrent ? (
                  <span
                    key={f.id}
                    aria-current="page"
                    className={`${base} ${state}`}
                  >
                    {f.name}
                  </span>
                ) : (
                  <Link
                    key={f.id}
                    href={`/maps/${map.slug}/${f.slug}`}
                    className={`${base} ${state}`}
                  >
                    {f.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Caps the map at 960px on desktop (it filled ~1235px at 1470). Only
            a wrapper — FloorView is untouched. The map keeps aspect-[16/10]
            w-full, so it stays 16:10 and the pins, which are positioned in
            percentages, scale with it. `floor-stage` also carries the one rule
            that reaches "Ranked by grade" inside FloorView (globals.css). */}
        <div className="floor-stage lg:mx-auto lg:max-w-[960px]">
          <FloorView map={map} floor={floor} spots={spots} />
        </div>

        {peeks.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            No spawn peeks pinned to this floor yet.
          </p>
        )}

        {saRank && (
          <p className="mt-6 text-center text-[13px] text-muted lg:text-[15px]">
            {floor.name} ranks {ordinal(saRank.rank)}{" "}
            <Link href={`/maps/${map.slug}`} className="hover:text-brand">
              of {saRank.total}
            </Link>{" "}
            on{" "}
            <Link href={`/maps/${map.slug}`} className="hover:text-brand">
              {map.name}
            </Link>{" "}
            for S/A-tier peeks.
          </p>
        )}

        {/* The page's only in-content slot: below the "ranks Nth of N" line,
            above Floor stats. mt-12 matches the gap Floor stats already had
            from the line above it, so the ad sits in the page's own rhythm
            rather than adding a band of its own. */}
        <NitroAdSlot
          id="pkb-content-1"
          className="my-8 md:my-7"
          // Measured, not assumed: collapsing this slot while visible costs
          // 0.0000 CLS across three runs, because nothing visible sits below
          // it. It is also the only slot on the site that can NEVER scroll out
          // of view — the floor page is ~1300px against an 844px viewport, so
          // at maximum scroll the slot is still on screen. Without this it
          // would be a permanent 250px gap whenever unsold.
          //
          // The same measurement on map (0.0446), peek (0.0876) and Top Peeks
          // (0.0116) came back non-zero, which is why they are not opted in.
          collapseWhenVisible
        />

        {/* Floor-level stats — server-rendered so crawlers and ad units see
            them on load. All values derived from this floor's peeks.
            At lg the whole block is 1.5x its previous size — real sizes, not a
            transform, so it still lays out and wraps normally. Every value is
            1.5x what lg rendered before: 448->672 wide, 11->16.5 labels,
            26->39 numbers, 36->54 padding, 14->21 radius. tracking-[0.14em]
            and leading-none are relative, so they follow for free. */}
        <section className="mx-auto mt-12 max-w-md lg:max-w-[672px]">
          <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted lg:text-[16.5px]">
            Floor stats
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-y-6 rounded-card border border-border bg-card px-2 py-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:grid-cols-4 sm:gap-y-0 lg:mt-[18px] lg:rounded-[21px] lg:px-3 lg:py-[54px]">
            <FloorStatCell label="Peeks" value={String(floorStats.total)} />
            <FloorStatCell
              label="Best"
              value={floorStats.bestGrade ?? "—"}
              valueStyle={
                floorStats.bestColor
                  ? { color: floorStats.bestColor }
                  : undefined
              }
              className="border-l border-border"
            />
            <FloorStatCell
              label="S/A tier"
              value={String(floorStats.saCount)}
              className="sm:border-l sm:border-border"
            />
            <FloorStatCell
              label="Average %"
              value={floorStats.avgPct !== null ? `${floorStats.avgPct}%` : "—"}
              className="border-l border-border"
            />
          </div>
        </section>

      </main>
    </>
  );
}

function isSaTier(p: {
  base_success_rate: number;
  worked_votes: number;
  vote_count: number;
}): boolean {
  const g = rating(p.base_success_rate, p.worked_votes, p.vote_count).grade;
  return g === "A" || g === "S";
}

// Total, best grade + its tier colour, S/A-tier count, and average
// effectiveness % for a floor's peeks. best/avgPct are null on an empty floor
// (strip shows dashes). The % per peek is the measured worked/total rate, or
// the (clamped) admin seed for estimate-tier peeks.
function computeFloorStats(peeks: Peek[]): {
  total: number;
  bestGrade: string | null;
  bestColor: string | null;
  saCount: number;
  avgPct: number | null;
} {
  const total = peeks.length;
  if (total === 0)
    return { total: 0, bestGrade: null, bestColor: null, saCount: 0, avgPct: null };

  let bestGrade: string | null = null;
  let bestScore = -1;
  let saCount = 0;
  let pctSum = 0;
  for (const p of peeks) {
    const r = rating(p.base_success_rate, p.worked_votes, p.vote_count);
    if (r.score > bestScore) {
      bestScore = r.score;
      bestGrade = r.grade;
    }
    if (r.grade === "A" || r.grade === "S") saCount++;
    pctSum += r.tier === "measured" ? r.pct : displayRate(p.base_success_rate);
  }
  return {
    total,
    bestGrade,
    bestColor: bestGrade ? gradeTierColor(bestGrade) : null,
    saCount,
    avgPct: Math.round(pctSum / total),
  };
}

function ordinal(n: number): string {
  const v = n % 100;
  const suffix =
    v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

// One stat in the floor strip: small-caps label above, bold value below.
// `className` carries the dividing hairline; `valueStyle`/`valueClassName`
// carry the per-value colour (grade green, risk amber).
function FloorStatCell({
  label,
  value,
  valueClassName,
  valueStyle,
  className,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  valueStyle?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center px-3 lg:px-[18px] ${className ?? ""}`}>
      {/* tracking is in em, so it scales with the font size on its own */}
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted lg:text-[16.5px]">
        {label}
      </span>
      <span
        className={`mt-2 text-[26px] font-extrabold leading-none lg:mt-3 lg:text-[39px] ${
          valueClassName ?? "text-ink"
        }`}
        style={valueStyle}
      >
        {value}
      </span>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
