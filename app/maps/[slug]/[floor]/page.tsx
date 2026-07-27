import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FloorView } from "@/components/FloorView";
import { PageHeader } from "@/components/PageHeader";
import {
  getFloorBySlug,
  getFloorsForMap,
  getMapBySlug,
  getPublishedPeeksForFloor,
  getRankedPeeksForMap,
} from "@/lib/db";
import type { Peek } from "@/lib/db";
import { rating, gradeTierColor } from "@/lib/rate";

export const dynamic = "force-dynamic";

// When two or more peeks share the same (x_pct, y_pct), they render on top of
// each other and only the topmost is visible. We push duplicates onto a small
// circle around the shared point so every pin remains tappable. Order in the
// returned array is preserved (so pin numbers still match success-rate rank).
function fanOutCoincidentPins<
  T extends { x_pct: number; y_pct: number },
>(peeks: T[]): Array<T & { displayX: number; displayY: number }> {
  const seen = new Map<string, number>();
  return peeks.map((peek) => {
    // Bucket to ~0.5% so near-coincident points still cluster.
    const key = `${Math.round(peek.x_pct * 2)},${Math.round(peek.y_pct * 2)}`;
    const idx = seen.get(key) ?? 0;
    seen.set(key, idx + 1);
    if (idx === 0) {
      return { ...peek, displayX: peek.x_pct, displayY: peek.y_pct };
    }
    // Spiral outward in 60° steps. Radius grows slowly so big clusters
    // still stay near the original point.
    const angle = (Math.PI / 3) * (idx - 1);
    const radius = 3 + Math.floor((idx - 1) / 6) * 1.5;
    return {
      ...peek,
      displayX: peek.x_pct + radius * Math.cos(angle),
      displayY: peek.y_pct + radius * Math.sin(angle),
    };
  });
}

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
  // Every peek's position is public (Pro tier not launched).
  const positioned = fanOutCoincidentPins(peeks);
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
      <main className="fade-in-up mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mb-8 text-center">
          <div className="mb-3">
            <Link
              href={`/maps/${map.slug}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-btn px-2.5 py-1 text-sm font-medium text-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand"
            >
              <BackArrowIcon />
              <span>{map.name}</span>
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {map.name} · {floor.name}
          </h1>
          <p className="mt-2 text-muted">
            Spawn peeks · click any pin for details
          </p>
          {allFloors.length > 1 && (
            <nav
              aria-label="Floors"
              className="mt-5 flex flex-wrap justify-center gap-2"
            >
              {allFloors.map((f) => {
                const isCurrent = f.id === floor.id;
                const base =
                  "inline-flex items-center rounded-btn px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out";
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

        {/* Floor-level stats — server-rendered so crawlers and ad units see
            them on load. All values derived from this floor's peeks. */}
        <div className="mx-auto mt-6 grid max-w-md grid-cols-2 sm:grid-cols-4">
          <FloorStatCell label="Peeks" value={String(floorStats.total)} />
          <FloorStatCell
            label="Best"
            value={floorStats.bestGrade ?? "—"}
            valueStyle={
              floorStats.bestColor ? { color: floorStats.bestColor } : undefined
            }
            className="border-l border-border"
          />
          <FloorStatCell
            label="S/A tier"
            value={String(floorStats.saCount)}
            className="sm:border-l sm:border-border"
          />
          <FloorStatCell
            label="Avg risk"
            value={floorStats.risk ? RISK_LABEL[floorStats.risk] : "—"}
            valueClassName={
              floorStats.risk ? RISK_TEXT[floorStats.risk] : undefined
            }
            className="border-l border-border"
          />
        </div>

        <FloorView map={map} floor={floor} peeks={positioned} />

        {peeks.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            No spawn peeks pinned to this floor yet.
          </p>
        )}

        {saRank && (
          <p className="mt-6 text-center text-[13px] text-muted">
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

// Total, best grade + its tier colour, S/A-tier count, and modal risk for a
// floor's peeks. Best/risk are null on an empty floor (strip shows dashes).
function computeFloorStats(peeks: Peek[]): {
  total: number;
  bestGrade: string | null;
  bestColor: string | null;
  saCount: number;
  risk: "low" | "medium" | "high" | null;
} {
  const total = peeks.length;
  if (total === 0)
    return { total: 0, bestGrade: null, bestColor: null, saCount: 0, risk: null };

  let bestGrade: string | null = null;
  let bestScore = -1;
  let saCount = 0;
  const riskCounts: Record<"low" | "medium" | "high", number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  for (const p of peeks) {
    const r = rating(p.base_success_rate, p.worked_votes, p.vote_count);
    if (r.score > bestScore) {
      bestScore = r.score;
      bestGrade = r.grade;
    }
    if (r.grade === "A" || r.grade === "S") saCount++;
    riskCounts[p.risk]++;
  }
  // Modal risk; ties break toward the higher severity (high > medium > low).
  let risk: "low" | "medium" | "high" = "low";
  let riskN = -1;
  for (const rk of ["high", "medium", "low"] as const) {
    if (riskCounts[rk] > riskN) {
      riskN = riskCounts[rk];
      risk = rk;
    }
  }
  return {
    total,
    bestGrade,
    bestColor: bestGrade ? gradeTierColor(bestGrade) : null,
    saCount,
    risk,
  };
}

const RISK_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
// The existing risk text colours (same as RiskPill on the peek page).
const RISK_TEXT: Record<"low" | "medium" | "high", string> = {
  low: "text-emerald-700",
  medium: "text-amber-700",
  high: "text-red-700",
};

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
    <div className={`flex flex-col items-center px-4 py-1 ${className ?? ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span
        className={`mt-1 text-[14px] font-bold ${valueClassName ?? "text-ink"}`}
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
