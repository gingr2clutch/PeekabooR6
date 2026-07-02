import { ArrowUp, Building2, MapPin, Star } from "lucide-react";

export type MapGrades = { S: number; A: number; B: number; C: number };

type Props = {
  peeks: number;
  votes: number;
  grades: MapGrades;
};

// Grade-mix bar tiers, strongest → weakest. Colors are fixed brand tokens (not
// per-map): S teal, A orange, B sand, C tan.
const GRADE_TIERS: { key: keyof MapGrades; color: string }[] = [
  { key: "S", color: "#3f978b" },
  { key: "A", color: "#f2640e" },
  { key: "B", color: "#d8a24a" },
  { key: "C", color: "#b8a888" },
];

// Tactical "Map Intel" card shown at the top of each map page. All figures are
// real, request-time Supabase data for the current map, computed server-side by
// the caller. The Votes "live" dot pulses only when motion is allowed
// (motion-safe:), so prefers-reduced-motion is respected without any JS.
export function MapIntel({ peeks, votes, grades }: Props) {
  const total = peeks || 1; // guard against divide-by-zero on empty maps
  const stats = [
    { label: "Peeks", value: peeks, Icon: MapPin, tile: "bg-teal/10 text-teal", live: false },
    { label: "Votes", value: votes, Icon: ArrowUp, tile: "bg-teal/10 text-teal", live: true },
    { label: "S-Tier", value: grades.S, Icon: Star, tile: "bg-brand/10 text-brand", live: false },
    { label: "A-Tier", value: grades.A, Icon: Building2, tile: "bg-brand/10 text-brand", live: false },
  ];

  return (
    <div className="relative rounded-card border border-border bg-card px-4 py-5 sm:px-6">
      {/* HUD corner brackets (~12px) in teal. */}
      <span aria-hidden className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-teal/60" />
      <span aria-hidden className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2 border-teal/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-teal/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-teal/60" />

      <div className="mb-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-teal">
        Map Intel
      </div>

      {/* 4 icon-stats: one row on desktop, 2x2 on mobile. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tile}`}
            >
              <s.Icon size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="flex items-center gap-1">
              <span className="text-2xl font-bold tabular-nums tracking-tight text-ink">
                {s.value.toLocaleString("en-US")}
              </span>
              {s.live && (
                <span
                  className="relative flex h-1.5 w-1.5"
                  aria-label="Live"
                  title="Live"
                >
                  <span className="absolute inline-flex h-full w-full rounded-full bg-teal opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
                </span>
              )}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Grade mix bar — stacked share of S/A/B/C across this map's peeks. */}
      <div className="mt-5">
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
