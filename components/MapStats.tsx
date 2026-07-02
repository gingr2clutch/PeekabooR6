import { GRADE_TIER_COLORS } from "@/lib/rate";

export type MapGrades = { S: number; A: number; B: number; C: number };

type Props = {
  peeks: number;
  votes: number;
  grades: MapGrades;
};

// Grade-mix bar tiers, strongest → weakest, using the shared site-wide grade
// colors (S green, A lime, B amber, C red-orange).
const GRADE_TIERS: { key: keyof MapGrades; color: string }[] = [
  { key: "S", color: GRADE_TIER_COLORS.S },
  { key: "A", color: GRADE_TIER_COLORS.A },
  { key: "B", color: GRADE_TIER_COLORS.B },
  { key: "C", color: GRADE_TIER_COLORS.C },
];

// Map stats card: a white rounded card with a centered inline stat line
// (Peeks / Votes / S-Tier), a divider, then the grade-mix bar + legend. Real
// per-map data, computed server-side by the caller.
export function MapStats({ peeks, votes, grades }: Props) {
  const total = peeks || 1; // guard against divide-by-zero on empty maps
  const stats = [
    { label: "Peeks", value: peeks },
    { label: "Votes", value: votes },
    { label: "S-Tier", value: grades.S },
  ];

  return (
    <div className="rounded-card border border-border bg-card px-4 py-5 shadow-sm sm:px-6">
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
      <div>
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-border"
          role="img"
          aria-label="Grade distribution across this map's peeks"
        >
          {GRADE_TIERS.map((t) =>
            grades[t.key] > 0 ? (
              <div
                key={t.key}
                style={{
                  width: `${(grades[t.key] / total) * 100}%`,
                  backgroundColor: t.color,
                }}
              />
            ) : null
          )}
        </div>
        {/* Legend — only tiers with at least one peek. */}
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
          {GRADE_TIERS.map((t) =>
            grades[t.key] > 0 ? (
              <span key={t.key} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ backgroundColor: t.color }}
                />
                <span className="font-semibold text-ink">{t.key}</span>
                <span>{grades[t.key]}</span>
              </span>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
