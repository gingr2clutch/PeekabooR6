import Link from "next/link";
import { BestPeek } from "@/components/BestPeek";
import { PeekThumb } from "@/components/PeekThumb";
import { GradeBadge } from "@/components/GradeBadge";
import { rating } from "@/lib/rate";
import { GradeMixBar, type MapGrades } from "@/components/GradeMixBar";
import { GRADE_TIER_COLORS } from "@/lib/rate";
import type { PeekWithContext } from "@/lib/db";

export type { MapGrades };

type Props = {
  peeks: number;
  votes: number;
  grades: MapGrades;
  // This map's top peek, rendered as a row inside the same card (optional).
  topPeek?: PeekWithContext | null;
  /** Desktop header row, right side: "{Map} · N floors". */
  mapName?: string;
  floorLabel?: string;
};

// Grade spread segments, strongest -> weakest. Same colours as GradeMixBar,
// read from the same source, so the two can never disagree.
const SPREAD_TIERS: { key: keyof MapGrades; color: string }[] = [
  { key: "S", color: GRADE_TIER_COLORS.S },
  { key: "A", color: GRADE_TIER_COLORS.A },
  { key: "B", color: GRADE_TIER_COLORS.B },
  { key: "C", color: GRADE_TIER_COLORS.C },
];

// Below this share of the bar a segment cannot hold its own label.
//
// The stats card's inner width at lg is ~751px at 1470 and ~781px at 1920, and
// a label like "A · 1" needs roughly 54px including its padding — about 7.2%
// of the narrower case. 8% leaves headroom for a two-digit count without
// dropping labels that would have fitted. Measured against the real widths
// rather than guessed: Coastline's smallest segment is 9.1% and keeps its
// label, Oregon's S and C are 5.9% and lose theirs.
const MIN_LABEL_PCT = 8;

// Map stats card: a white rounded card with a centered inline stat line
// (Peeks / Votes / S-Tier), a divider, the grade-mix bar + legend, and — when
// provided — a divider + the map's Top Peek row, all in one bubble. Real
// per-map data, computed server-side by the caller.
export function MapStats({
  peeks,
  votes,
  grades,
  topPeek,
  mapName,
  floorLabel,
}: Props) {
  const stats = [
    { label: "Peeks", value: peeks },
    { label: "Votes", value: votes },
    { label: "S-Tier", value: grades.S },
  ];

  const gradeTotal = grades.S + grades.A + grades.B + grades.C;
  const spread = SPREAD_TIERS.filter((t) => grades[t.key] > 0).map((t) => {
    const pct = gradeTotal > 0 ? (grades[t.key] / gradeTotal) * 100 : 0;
    return { ...t, count: grades[t.key], pct, showLabel: pct >= MIN_LABEL_PCT };
  });

  const r = topPeek
    ? rating(topPeek.base_success_rate, topPeek.worked_votes, topPeek.vote_count)
    : null;
  // Below lg this is one card, exactly as before. At lg it becomes 8 + 4: the
  // stats keep the left card and the top peek gets its own on the right.
  return (
    <div className="rounded-card border border-border bg-card px-4 py-5 shadow-sm sm:px-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <div className="lg:col-span-8 lg:flex lg:flex-col lg:rounded-card lg:border lg:border-border lg:bg-card lg:px-8 lg:py-7 lg:shadow-sm">
      {/* Header. Below lg this is the centred title it has always been; at lg
          it becomes a row with the map and floor count on the right. */}
      <div className="mb-3 text-center text-lg font-bold tracking-tight text-ink lg:mb-6 lg:flex lg:items-baseline lg:justify-between lg:text-left lg:text-2xl">
        <span>Map Stats</span>
        {mapName && floorLabel && (
          <span className="hidden font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-muted lg:inline">
            {mapName} · {floorLabel}
          </span>
        )}
      </div>

      {/* Stat line. Below lg: the inline cluster, unchanged. At lg: three
          equal columns, each number centred over its own label with hairline
          rules between, which is what lets the numbers grow this large without
          colliding. */}
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 sm:gap-x-10 lg:mb-7 lg:grid lg:flex-1 lg:grid-cols-3 lg:items-center lg:gap-0">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`inline-flex items-baseline gap-1.5 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-1 ${
              i > 0 ? "lg:border-l lg:border-border" : ""
            }`}
          >
            <span className="text-xl font-bold tabular-nums tracking-tight text-ink sm:text-2xl lg:text-[100px] lg:font-extrabold lg:leading-[0.92]">
              {s.value.toLocaleString("en-US")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted lg:text-[13px] lg:tracking-[0.18em]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Thin divider — mobile only; at lg the column rules do this job. */}
      <div className="my-4 border-t border-border lg:hidden" />

      {/* Grade mix. The shared thin bar + legend below lg (also what the
          compare page renders, so it is untouched); the thick labelled spread
          at lg. Exactly one is displayed. */}
      <div className="lg:hidden">
        <GradeMixBar grades={grades} />
      </div>

      {gradeTotal > 0 && (
        <div className="hidden lg:block">
          <div className="mb-2 flex items-baseline justify-between font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
            <span>Grade spread</span>
            <span>
              {peeks} {peeks === 1 ? "peek" : "peeks"}
            </span>
          </div>
          <div
            className="flex h-[34px] w-full gap-1.5"
            role="img"
            aria-label={`Grade spread: ${spread
              .map((t) => `${t.key} ${t.count}`)
              .join(", ")}`}
          >
            {spread.map((t) => (
              <div
                key={t.key}
                className="flex items-center justify-center overflow-hidden rounded-btn"
                style={{ width: `${t.pct}%`, backgroundColor: t.color }}
              >
                {t.showLabel && (
                  <span className="whitespace-nowrap px-2 text-[13px] font-bold tracking-wide text-white">
                    {t.key} · {t.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      {/* Top Peek. Two presentations of the same peek: the existing inline row
          below lg (untouched), and the mock's vertical card at lg. Gated so
          exactly one is ever visible — the hidden one is display:none, not a
          second link a reader or a crawler follows twice into the page. */}
      {topPeek && (
        <div className="lg:col-span-4 lg:overflow-hidden lg:rounded-card lg:border-2 lg:border-brand lg:bg-card lg:shadow-sm">
          <div className="lg:hidden">
            <div className="my-4 border-t border-border" />
            <BestPeek peek={topPeek} eyebrow="Top Peek" bare />
          </div>

          {/* Whole card is the link — the mock drops the separate "Watch the
              clip" affordance, so the target has to be the card itself. Focus
              ring is explicit because the visible border is the brand outline,
              which would otherwise be the only focus cue. */}
          <Link
            href={`/peeks/${topPeek.slug}?from=map`}
            className="peek-lift hidden rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:flex lg:h-full lg:flex-col lg:overflow-hidden"
          >
            {/* Same cascade BestPeek uses below lg — clip first frame, then
                map cover, then stripes. Fixed 16/9 box, so nothing shifts when
                the frame decodes. */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <PeekThumb peek={topPeek} sizes="420px" />
            </div>
            <div className="flex flex-1 flex-col justify-center px-5 py-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
                Top Peek
              </span>
              <span className="mt-1.5 flex items-start gap-2.5">
                <span className="min-w-0 flex-1 text-xl font-bold leading-tight tracking-tight text-ink">
                  {topPeek.name}
                </span>
                {r && (
                  <span className="shrink-0">
                    <GradeBadge label={r.label} score={r.score} />
                  </span>
                )}
              </span>
              <span className="mt-1 text-[14px] text-muted">
                {topPeek.floors?.name} · {topPeek.vote_count}{" "}
                {topPeek.vote_count === 1 ? "vote" : "votes"}
              </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
