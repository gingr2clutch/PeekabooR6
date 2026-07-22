import { BestPeek } from "@/components/BestPeek";
import { GradeMixBar, type MapGrades } from "@/components/GradeMixBar";
import type { PeekWithContext } from "@/lib/db";

export type { MapGrades };

type Props = {
  peeks: number;
  votes: number;
  grades: MapGrades;
  // This map's top peek, rendered as a row inside the same card (optional).
  topPeek?: PeekWithContext | null;
};

// Map stats card: a white rounded card with a centered inline stat line
// (Peeks / Votes / S-Tier), a divider, the grade-mix bar + legend, and — when
// provided — a divider + the map's Top Peek row, all in one bubble. Real
// per-map data, computed server-side by the caller.
export function MapStats({ peeks, votes, grades, topPeek }: Props) {
  const stats = [
    { label: "Peeks", value: peeks },
    { label: "Votes", value: votes },
    { label: "S-Tier", value: grades.S },
  ];

  return (
    <div className="rounded-card border border-border bg-card px-4 py-5 shadow-sm sm:px-6">
      {/* Small card header. */}
      <div className="mb-3 text-center text-lg font-bold tracking-tight text-ink">
        Map Stats
      </div>

      {/* Stat line — bold black numbers + muted mono labels. */}
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 sm:gap-x-10">
        {stats.map((s) => (
          <div key={s.label} className="inline-flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums tracking-tight text-ink sm:text-2xl">
              {s.value.toLocaleString("en-US")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Thin divider. */}
      <div className="my-4 border-t border-border" />

      {/* Grade mix bar — stacked share of S/A/B/C across this map's peeks. */}
      <GradeMixBar grades={grades} />

      {/* Top Peek row — same card, below a divider. */}
      {topPeek && (
        <>
          <div className="my-4 border-t border-border" />
          <BestPeek peek={topPeek} eyebrow="Top Peek" bare />
        </>
      )}
    </div>
  );
}
