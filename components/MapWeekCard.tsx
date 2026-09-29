"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { gradeTierColor, gradedLabel } from "@/lib/rate";

// The map page's 7-day card — lg only. Below lg the original chart card is
// still what renders; this component is never mounted there.
//
// Two views over the SAME five peeks and the same data the chart already
// loaded (no new queries). Both views use identical row and header heights, so
// switching cannot move anything below the card — that holds for a map with
// two peeks as well as five, which a fixed card height would not.

export type WeekDay = { key: string; label: string; pct: number | null };

export type WeekRow = {
  id: string;
  slug: string;
  name: string;
  floorName: string | null;
  color: string;
  label: string; // grade label
  score: number;
  pct: number | null; // current %, measured peeks only
  movePct: number | null; // weekly change, whole points
  days: WeekDay[]; // oldest -> newest, one per day, null where missing
};

type View = "top5" | "days";

const ROW_H = 58;
const HEAD_H = 28;

// The bar is drawn on a 50-90 scale, not 0-100: every peek worth showing sits
// in a narrow band up there, and a full-range bar makes 68% and 81% look
// identical. Clamped so anything outside still renders a sane bar.
const BAR_MIN = 50;
const BAR_MAX = 90;
const barPct = (p: number) =>
  Math.max(0, Math.min(1, (p - BAR_MIN) / (BAR_MAX - BAR_MIN))) * 100;

function Move({ value }: { value: number | null }) {
  if (value === null) return <span className="msc-move msc-flat">–</span>;
  if (value > 0)
    return <span className="msc-move msc-up">&#9650;{value}</span>;
  if (value < 0)
    return <span className="msc-move msc-down">&#9660;{Math.abs(value)}</span>;
  return <span className="msc-move msc-flat">–</span>;
}

// Sparkline over the peek's own min/max, so a 3-point wobble is still legible.
function Spark({ days, color }: { days: WeekDay[]; color: string }) {
  const pts = days
    .map((d, i) => ({ i, pct: d.pct }))
    .filter((p): p is { i: number; pct: number } => p.pct !== null);
  if (pts.length < 2) return <span className="msc-spark" aria-hidden />;

  const W = 150;
  const H = 30;
  const xs = days.length - 1 || 1;
  const values = pts.map((p) => p.pct);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  // 4px of padding top and bottom so a flat line is not glued to the edge
  const y = (v: number) => H - 4 - ((v - lo) / span) * (H - 8);
  const d = pts
    .map((p, k) => `${k === 0 ? "M" : "L"}${((p.i / xs) * W).toFixed(1)} ${y(p.pct).toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];

  return (
    <span className="msc-spark" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="msc-spark-svg">
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={((last.i / xs) * W).toFixed(1)} cy={y(last.pct).toFixed(1)} r={2.6} fill={color} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* Card-coloured cover that shrinks away to the right, revealing the
          line left to right. transform only — the line itself never redraws. */}
      <span className="msc-spark-cover" />
    </span>
  );
}

export function MapWeekCard({
  rows,
  trendsHref,
  className = "",
}: {
  rows: WeekRow[];
  trendsHref: string;
  className?: string;
}) {
  // Always opens on Top 5 — there is nothing worth remembering here, and a
  // remembered second view would make the card look different run to run.
  const [view, setView] = useState<View>("top5");
  // Bumping this restarts the CSS animations: it changes the keyed subtree, so
  // the elements are new and their animations run from 0 again.
  const [run, setRun] = useState(0);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Play once when the card scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function choose(next: View) {
    if (next === view) return;
    setView(next);
    setRun((n) => n + 1); // replay on every switch
  }

  const dayLabels = rows[0]?.days ?? [];

  return (
    <div ref={ref} className={className}>
      <div className="rounded-card border border-border bg-card px-8 py-7 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">
            This week&apos;s top 5
          </h2>
          <div className="flex items-center gap-4">
            <div role="tablist" aria-label="Week view" className="msc-seg">
              {(
                [
                  ["top5", "Top 5"],
                  ["days", "Day by day"],
                ] as [View, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => choose(v)}
                  className={view === v ? "msc-seg-on" : ""}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link
              href={trendsHref}
              className="whitespace-nowrap text-sm font-semibold text-brand hover:underline"
            >
              See full trends →
            </Link>
          </div>
        </div>

        <div key={`${view}-${run}`} className={seen ? "msc-in" : undefined}>
          {view === "top5" ? (
            <div role="table" aria-label="This week's top 5">
              <div role="row" className="msc-row msc-row--top5 msc-head" style={{ height: HEAD_H }}>
                <span role="columnheader">#</span>
                <span role="columnheader">Peek</span>
                <span role="columnheader">Success rate</span>
                <span role="columnheader">Last 7 days</span>
                <span role="columnheader">Week</span>
                <span role="columnheader">Grade</span>
              </div>
              {rows.map((r, i) => (
                <div
                  role="row"
                  key={r.id}
                  className="msc-row msc-row--top5 msc-body-row"
                  style={{ height: ROW_H, ["--d" as string]: `${i * 80}ms` }}
                >
                  <span role="cell" className="msc-rank">{i + 1}</span>
                  <span role="cell" className="msc-peek">
                    <span className="msc-dot" style={{ backgroundColor: r.color }} aria-hidden />
                    <span className="min-w-0">
                      <Link href={`/peeks/${r.slug}?from=map`} className="msc-name">
                        {r.name}
                      </Link>
                      {r.floorName && <span className="msc-floor">{r.floorName}</span>}
                    </span>
                  </span>
                  <span role="cell" className="msc-rate">
                    <span className="msc-bar">
                      {r.pct !== null && (
                        <span
                          className="msc-bar-fill"
                          style={{ width: `${barPct(r.pct)}%`, backgroundColor: r.color }}
                        />
                      )}
                    </span>
                    <span className="msc-pct">{r.pct !== null ? `${r.pct}%` : "–"}</span>
                  </span>
                  <span role="cell">
                    <Spark days={r.days} color={r.color} />
                  </span>
                  <span role="cell">
                    <Move value={r.movePct} />
                  </span>
                  <span role="cell">
                    <GradeBadge label={r.label} score={r.score} />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div role="table" aria-label="Last 7 days, day by day">
              <div role="row" className="msc-row msc-row--days msc-head" style={{ height: HEAD_H }}>
                <span role="columnheader">Peek</span>
                {dayLabels.map((d) => (
                  <span role="columnheader" key={d.key} className="text-center">
                    {d.label}
                  </span>
                ))}
                <span role="columnheader" className="text-right">Now</span>
                <span role="columnheader" className="text-right">Week</span>
                <span role="columnheader" className="text-right">Grade</span>
              </div>
              {rows.map((r, i) => (
                <div
                  role="row"
                  key={r.id}
                  className="msc-row msc-row--days msc-body-row"
                  style={{ height: ROW_H }}
                >
                  <span role="cell" className="msc-peek">
                    <span className="msc-dot" style={{ backgroundColor: r.color }} aria-hidden />
                    <span className="min-w-0">
                      <Link href={`/peeks/${r.slug}?from=map`} className="msc-name">
                        {r.name}
                      </Link>
                      {r.floorName && <span className="msc-floor">{r.floorName}</span>}
                    </span>
                  </span>
                  {r.days.map((d, c) => {
                    // Tint by that day's own value: the grade tier gives the
                    // hue, the value gives the strength, so a dip reads as a
                    // paler cell rather than a different colour entirely.
                    const style =
                      d.pct === null
                        ? undefined
                        : {
                            backgroundColor: gradeTierColor(gradedLabel(d.pct)),
                            opacity: 0.25 + Math.max(0, Math.min(1, (d.pct - 50) / 40)) * 0.55,
                          };
                    return (
                      <span
                        role="cell"
                        key={d.key}
                        className={`msc-cell${d.pct === null ? " msc-cell--none" : ""}`}
                        style={{ ["--c" as string]: `${c * 50 + i * 20}ms` }}
                      >
                        <span className="msc-cell-box" style={style} />
                        <span className="msc-cell-txt">
                          {d.pct === null ? "–" : Math.round(d.pct)}
                        </span>
                      </span>
                    );
                  })}
                  <span role="cell" className="msc-now">
                    {r.pct !== null ? `${r.pct}%` : "–"}
                  </span>
                  <span role="cell" className="text-right">
                    <Move value={r.movePct} />
                  </span>
                  <span role="cell" className="flex justify-end">
                    <GradeBadge label={r.label} score={r.score} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
