import { rating, gradeBarPercent } from "@/lib/rate";

// Static horizontal grade scale (C·B·A·S, worse→better) with a marker at this
// peek's position. Estimate peeks position from the admin seed; player-voted
// peeks from the real worked/total percentage. The marker label carries the
// +/- modifier in the voted tier. Replaces the old info popover by showing the
// scale visually. Pure presentational — no client JS.
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
  const value = r.tier === "measured" ? r.pct : baseSuccessRate;
  const pos = gradeBarPercent(value);
  // The on-bar tick stays at the exact position; the floating label is clamped
  // so it never spills past the card edge on a phone.
  const labelPos = Math.max(12, Math.min(88, pos));

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="relative pt-7">
        <span
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-btn bg-ink px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm"
          style={{ left: `${labelPos}%` }}
        >
          {r.label}
        </span>

        <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400">
          <span
            aria-hidden
            className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink shadow ring-2 ring-card"
            style={{ left: `${pos}%` }}
          />
        </div>

        <div className="mt-2 grid grid-cols-4 text-center text-[11px] font-semibold tracking-wide text-muted">
          <span>C</span>
          <span>B</span>
          <span>A</span>
          <span>S</span>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] leading-snug text-muted">
        New peeks use our estimate; player-voted after 5 votes.
      </p>
    </div>
  );
}
