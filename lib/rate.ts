// Display floor/ceiling for an admin-seeded rate estimate. Voting and the DB
// hold raw [0, 100] values; this clamps what admin inputs can produce to
// [10, 92] so a seed never reads as fake-perfect or fake-terrible.
export const displayRate = (n: number) =>
  Math.max(10, Math.min(92, Math.round(n)));

// A peek graduates from its admin-seeded estimate to a community-backed grade
// once it has collected this many real votes. Below the threshold the grade
// comes from base_success_rate; at or above it the grade is recomputed from
// the real worked/total vote ratio.
export const MEASURED_MIN_VOTES = 5;

export type Grade = "S" | "A" | "B" | "C";

// The one place grade cutoffs live — tune here. Ordered strongest-first; the
// last entry is the floor. A 0–100 value (admin seed, or measured worked/total
// percentage) maps to the first grade whose `min` it clears.
export const GRADE_THRESHOLDS: ReadonlyArray<{ grade: Grade; min: number }> = [
  { grade: "S", min: 85 },
  { grade: "A", min: 70 },
  { grade: "B", min: 55 },
  { grade: "C", min: 0 },
];

export function grade(value: number): Grade {
  const n = Math.round(value || 0);
  for (const t of GRADE_THRESHOLDS) {
    if (n >= t.min) return t.grade;
  }
  return "C";
}

export type Rating =
  | { tier: "estimate"; grade: Grade }
  | { tier: "measured"; grade: Grade; pct: number; votes: number };

// Single source of truth for how a peek's reliability renders. The grade is
// always the headline:
//   • < MEASURED_MIN_VOTES votes → "estimate": grade from the admin seed, and
//     `pct` is intentionally absent — a percentage must never show here.
//   • ≥ MEASURED_MIN_VOTES votes → "measured": grade AND percentage recomputed
//     from the real worked/total ratio, with the vote count, so the rate is
//     only ever shown once it's vote-backed.
export function rating(
  estimate: number,
  workedVotes: number,
  totalVotes: number
): Rating {
  const total = Math.max(0, Math.floor(totalVotes || 0));
  if (total >= MEASURED_MIN_VOTES) {
    const worked = Math.max(0, Math.min(total, Math.floor(workedVotes || 0)));
    const pct = Math.round((worked / total) * 100);
    return { tier: "measured", grade: grade(pct), pct, votes: total };
  }
  return { tier: "estimate", grade: grade(estimate) };
}

export const votesText = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`;

// Numeric ranking score spanning both tiers so /popular can order across them:
// measured peeks rank by their real percentage (nudged so a community-proven
// peek edges an equal-scoring estimate), estimate peeks by their seed.
export function ratingScore(
  estimate: number,
  workedVotes: number,
  totalVotes: number
): number {
  const total = Math.max(0, Math.floor(totalVotes || 0));
  if (total >= MEASURED_MIN_VOTES) {
    const worked = Math.max(0, Math.min(total, Math.floor(workedVotes || 0)));
    return Math.round((worked / total) * 100) + 0.5;
  }
  return Math.round(estimate || 0);
}

// Inline label for pin tooltips and prose. Estimate tier is the bare grade;
// measured tier appends the vote count ("S · 47 votes").
export function ratingLabel(
  estimate: number,
  workedVotes: number,
  totalVotes: number
): string {
  const r = rating(estimate, workedVotes, totalVotes);
  return r.tier === "measured"
    ? `${r.grade} · ${votesText(r.votes)}`
    : r.grade;
}
