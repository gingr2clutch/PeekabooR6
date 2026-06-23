import { rating, gradeColor, gradeBarGradientCss } from "@/lib/rate";

// Horizontal worse→better grade scale (C·B·A·S) with a single marker — a grade
// pill plus a caret pointing to where this peek sits. Estimate peeks position
// from the admin seed; player-voted peeks from the real worked/total %. The
// pill label carries the +/- modifier in the voted tier. Pure presentational.
export function GradeBar({
  baseSuccessRate,
  workedVotes,
  voteCount,
}: {
  baseSuccessRate: number;
  workedVotes: number;
  voteCount: number;
}) {
  const r = rating(baseSuccessRate, workedVotes, voteCount);
  // Clamp the marker so the pill + caret never spill past the card edge on a
  // narrow phone. Grades cluster in B/A (well inside the range), so the clamp
  // only nudges the rare C-bottom / S-top peeks.
  const markerPos = Math.max(10, Math.min(90, r.score));
  const color = gradeColor(r.score);

  return (
    <div className="mt-6 border-t border-border pt-3">
      {/* pt-9 reserves room for the marker sitting above the bar */}
      <div className="relative pt-9">
        <div className="relative h-2 rounded-full" style={{ background: gradeBarGradientCss() }}>
          <div
            className="pointer-events-none absolute bottom-full mb-1 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${markerPos}%` }}
          >
            <span
              className="rounded-btn px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {r.label}
            </span>
            <span
              aria-hidden
              className="h-0 w-0 border-x-4 border-t-4 border-x-transparent"
              style={{ borderTopColor: color }}
            />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-4 text-center text-[11px] font-semibold tracking-wide text-muted">
          <span>C</span>
          <span>B</span>
          <span>A</span>
          <span>S</span>
        </div>
      </div>

      {r.tier === "estimate" && (
        <p className="mt-1.5 whitespace-nowrap text-center text-[11px] text-muted">
          Estimate until 5 votes.
        </p>
      )}
    </div>
  );
}
