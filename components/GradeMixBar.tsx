import { GRADE_TIER_COLORS } from "@/lib/rate";

export type MapGrades = { S: number; A: number; B: number; C: number };

// Grade-mix bar tiers, strongest → weakest, using the shared site-wide grade
// colors (S green, A lime, B amber, C red-orange).
const GRADE_TIERS: { key: keyof MapGrades; color: string }[] = [
  { key: "S", color: GRADE_TIER_COLORS.S },
  { key: "A", color: GRADE_TIER_COLORS.A },
  { key: "B", color: GRADE_TIER_COLORS.B },
  { key: "C", color: GRADE_TIER_COLORS.C },
];

// The stacked S/A/B/C distribution bar + legend, shared by the map-stats card
// and the map-comparison pages so the two can never render a different bar.
// Legend shows only tiers with at least one peek.
export function GradeMixBar({ grades }: { grades: MapGrades }) {
  const total = grades.S + grades.A + grades.B + grades.C || 1; // guard div-by-0

  return (
    <div>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-border"
        role="img"
        aria-label="Grade distribution across this map's peeks"
      >
        {GRADE_TIERS.map((t, ti) =>
          grades[t.key] > 0 ? (
            <div
              key={t.key}
              className="peek-grade-seg"
              style={
                {
                  width: `${(grades[t.key] / total) * 100}%`,
                  backgroundColor: t.color,
                  ["--seg-delay"]: `${ti * 80}ms`,
                } as React.CSSProperties
              }
            />
          ) : null
        )}
      </div>
      {/* Legend — only tiers with at least one peek. */}
      <div className="peek-grade-legend mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
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
  );
}
