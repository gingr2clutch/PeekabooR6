import { supabaseAdmin } from "@/lib/supabase";

// A single day's snapshot of a peek, shaped for charting/trend math.
export type SnapshotPoint = {
  date: string; // YYYY-MM-DD (UTC), the captured_at day
  pct: number; // effectiveness_pct, 0–100
  grade: string; // grade label that day (e.g. "A+", "B")
  votes: number; // vote_count that day
};

export type TrendDirection = "up" | "down" | "stable";

// Distinct line colors for the multi-line map chart (not grade colors — these
// just need to be tellable apart against cream). Brand orange leads.
export const TREND_LINE_COLORS = [
  "#f2640e", // brand orange
  "#3f978b", // teal
  "#4f7cc4", // blue
  "#9b5de5", // purple
  "#e0a92e", // amber
  "#1f9d55", // green
] as const;

// A recent-vs-prior 7-day average within this band (percentage points) reads as
// "stable" rather than up/down. THE knob for how twitchy the arrows are.
const STABLE_THRESHOLD = 1.5;

// ---------------------------------------------------------------------------
// Reads. peek_snapshots has RLS enabled with NO public policies, so anon can't
// read it — every query here goes through the service-role client and MUST stay
// server-side. A missing table or transient error returns empty (cold-start
// grace: the UI shows "coming soon" rather than crashing).
// ---------------------------------------------------------------------------

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function mapRow(r: {
  captured_at: string;
  effectiveness_pct: number;
  grade: string;
  vote_count: number;
}): SnapshotPoint {
  return {
    date: r.captured_at,
    pct: r.effectiveness_pct,
    grade: r.grade,
    votes: r.vote_count,
  };
}

// Ascending-by-date snapshots for one peek over the last `days`.
export async function getSnapshotsForPeek(
  peekId: string,
  days = 30
): Promise<SnapshotPoint[]> {
  const { data, error } = await supabaseAdmin()
    .from("peek_snapshots")
    .select("captured_at, effectiveness_pct, grade, vote_count")
    .eq("peek_id", peekId)
    .gte("captured_at", isoDaysAgo(days))
    .order("captured_at", { ascending: true });
  if (error || !data) return [];
  return (data as Parameters<typeof mapRow>[0][]).map(mapRow);
}

// Batched: one query for many peeks, grouped by peek_id (each list ascending by
// date). Avoids N+1 on list views.
export async function getSnapshotsForPeeks(
  peekIds: string[],
  days = 30
): Promise<Map<string, SnapshotPoint[]>> {
  const out = new Map<string, SnapshotPoint[]>();
  if (peekIds.length === 0) return out;
  const { data, error } = await supabaseAdmin()
    .from("peek_snapshots")
    .select("peek_id, captured_at, effectiveness_pct, grade, vote_count")
    .in("peek_id", peekIds)
    .gte("captured_at", isoDaysAgo(days))
    .order("captured_at", { ascending: true });
  if (error || !data) return out;
  for (const row of data as (Parameters<typeof mapRow>[0] & {
    peek_id: string;
  })[]) {
    const arr = out.get(row.peek_id) ?? [];
    arr.push(mapRow(row));
    out.set(row.peek_id, arr);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pure trend math.
// ---------------------------------------------------------------------------

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

// Whole days between a snapshot date and today (UTC). 0 = today.
function daysAgoOf(dateStr: string): number {
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round((todayUtc - Date.UTC(y, m - 1, d)) / 86400000);
}

function avgInWindow(
  points: SnapshotPoint[],
  minAgo: number,
  maxAgo: number
): number | null {
  const vals = points
    .filter((p) => {
      const a = daysAgoOf(p.date);
      return a >= minAgo && a <= maxAgo;
    })
    .map((p) => p.pct);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// Direction of the last 7 days vs the prior 7. Returns null when either window
// has no data (not enough history yet → caller renders no arrow).
export function computeDirection(
  points: SnapshotPoint[]
): TrendDirection | null {
  if (points.length < 2) return null;
  const recent = avgInWindow(points, 0, 6);
  const prior = avgInWindow(points, 7, 13);
  if (recent === null || prior === null) return null;
  const diff = recent - prior;
  if (Math.abs(diff) < STABLE_THRESHOLD) return "stable";
  return diff > 0 ? "up" : "down";
}

export type Mover = { from: number; to: number; changePct: number };

// Change over the last `windowDays`: latest point minus the earliest point
// still inside the window. Null if fewer than 2 points land in the window.
export function computeMover(
  points: SnapshotPoint[],
  windowDays: number
): Mover | null {
  const within = points.filter((p) => daysAgoOf(p.date) <= windowDays);
  if (within.length < 2) return null;
  const from = within[0].pct;
  const to = within[within.length - 1].pct;
  return { from, to, changePct: to - from };
}

// "Tracking since July 2026", from the earliest point present.
export function trackingSinceLabel(points: SnapshotPoint[]): string | null {
  if (points.length === 0) return null;
  const [y, m] = points[0].date.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `Tracking since ${month}`;
}

// ---------------------------------------------------------------------------
// SVG layout (shared by the single- and multi-line charts). X is date-scaled by
// days-ago (right edge = today); Y is 0–100 effectiveness. A gap of more than
// one day between consecutive points breaks the line (no phantom connection
// across missing snapshot days).
// ---------------------------------------------------------------------------

export type ChartBox = {
  width: number;
  height: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
};

// Y-axis value range. Auto-scaled charts pass a tight data-driven domain so
// small real moves read as real slopes; the default is the full 0–100.
export type YDomain = { min: number; max: number };

// Only the points within the last `days` (used to split the 7- and 30-day
// charts). Keeps the ascending order.
export function pointsWithinDays(
  points: SnapshotPoint[],
  days: number
): SnapshotPoint[] {
  return points.filter((p) => daysAgoOf(p.date) <= days);
}

// Tightest y-domain that hugs the plotted values: [min − pad, max + pad] with a
// small padding (default 2 points) so lines never touch the edges, clamped to
// [0, 100]. No minimum span and no anchoring to 0 or any preset — a 71–84 spread
// yields ~69–86, which makes the zoom obvious. Empty input falls back to 0–100.
export function autoYDomain(points: SnapshotPoint[], pad = 2): YDomain {
  if (points.length === 0) return { min: 0, max: 100 };
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of points) {
    lo = Math.min(lo, p.pct);
    hi = Math.max(hi, p.pct);
  }
  const min = Math.max(0, Math.floor(lo - pad));
  const max = Math.min(100, Math.ceil(hi + pad));
  // Guarantee a non-zero span even if clamping collapses it (e.g. all 0s).
  return max > min ? { min, max } : { min, max: Math.min(100, min + 1) };
}

// Axis ticks for a tight y-domain: always the min and max (so the exact zoomed
// range is labelled, e.g. 71%–84%), plus nice interior multiples (1/2/5/10…
// steps sized to the range), dropping any that would crowd an endpoint. Narrow
// ranges get 1% or 2% steps. Shared by the single- and multi-line charts.
export function axisTicks(min: number, max: number): number[] {
  const range = Math.max(1, max - min);
  const step = [1, 2, 5, 10, 20, 25, 50].find((s) => range / s <= 5) ?? 100;
  const ticks: number[] = [min];
  const first = Math.ceil(min / step) * step;
  for (let v = first; v < max; v += step) {
    if (v - min >= step / 2 && max - v >= step / 2 && !ticks.includes(v)) {
      ticks.push(v);
    }
  }
  if (!ticks.includes(max)) ticks.push(max);
  return ticks.sort((a, b) => a - b);
}

export type LaidPoint = {
  x: number;
  y: number;
  gapBefore: boolean;
  point: SnapshotPoint;
};

// Widest span (in days) present across the given points, capped at `cap`. Used
// as the X domain so sparse cold-start data still spreads across the chart.
export function domainDaysFor(points: SnapshotPoint[], cap = 30): number {
  let maxAgo = 0;
  for (const p of points) maxAgo = Math.max(maxAgo, daysAgoOf(p.date));
  return Math.min(cap, Math.max(1, maxAgo));
}

export function layoutSeries(
  points: SnapshotPoint[],
  box: ChartBox,
  domainDays: number,
  yDomain: YDomain = { min: 0, max: 100 }
): LaidPoint[] {
  const innerW = box.width - box.padL - box.padR;
  const innerH = box.height - box.padT - box.padB;
  const dd = domainDays <= 0 ? 1 : domainDays;
  const ySpan = Math.max(1, yDomain.max - yDomain.min);
  const out: LaidPoint[] = [];
  let prevAgo: number | null = null;
  for (const p of points) {
    const ago = daysAgoOf(p.date);
    const x = box.padL + (1 - Math.min(ago, dd) / dd) * innerW;
    const frac = (clamp(p.pct, yDomain.min, yDomain.max) - yDomain.min) / ySpan;
    const y = box.padT + (1 - frac) * innerH;
    out.push({ x, y, gapBefore: prevAgo !== null && prevAgo - ago > 1, point: p });
    prevAgo = ago;
  }
  return out;
}

// SVG path `d` from laid-out points, starting a fresh subpath after any gap.
export function pathFromLayout(laid: LaidPoint[]): string {
  return laid
    .map(
      (pt, i) =>
        `${i === 0 || pt.gapBefore ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(
          1
        )}`
    )
    .join(" ");
}
