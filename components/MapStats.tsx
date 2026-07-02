export type MapGrades = { S: number; A: number; B: number; C: number };

type Props = {
  peeks: number;
  votes: number;
  grades: MapGrades;
};

// Grade-mix bar tiers, strongest → weakest: S teal, A orange, B sand, C tan.
const GRADE_TIERS: { key: keyof MapGrades; color: string }[] = [
  { key: "S", color: "#3f978b" },
  { key: "A", color: "#f2640e" },
  { key: "B", color: "#d8a24a" },
  { key: "C", color: "#b8a888" },
];

// Slim, borderless map stats: a centered inline stat line (Peeks / Votes /
// S-Tier) with a live dot on Votes, above the full grade-mix bar + legend. No
// card, icons, or header — clean and airy. Real per-map data, computed
// server-side by the caller. The Votes dot pulses only when motion is allowed.
export function MapStats({ peeks, votes, grades }: Props) {
  const total = peeks || 1; // guard against divide-by-zero on empty maps
  const stats = [
    { label: "Peeks", value: peeks, live: false },
    { label: "Votes", value: votes, live: true },
    { label: "S-Tier", value: grades.S, live: false },
  ];

  return (
    <div>
      {/* Slim stat line — no box, no icons. */}
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 sm:gap-x-10">
        {stats.map((s) => (
          <div key={s.label} className="inline-flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums tracking-tight text-ink sm:text-2xl">
              {s.value.toLocaleString("en-US")}
            </span>
            {s.live && (
              <span
                className="relative flex h-1.5 w-1.5 self-center"
                aria-label="Live"
                title="Live"
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-teal opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
              </span>
            )}
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Grade mix bar — stacked share of S/A/B/C across this map's peeks. */}
      <div className="mt-4">
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
