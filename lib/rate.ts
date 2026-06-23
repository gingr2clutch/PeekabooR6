// Display floor/ceiling for an admin-seeded rate estimate. Voting and the DB
// hold raw [0, 100] values; this clamps what admin inputs can produce to
// [10, 92] so a seed never reads as fake-perfect or fake-terrible.
export const displayRate = (n: number) =>
  Math.max(10, Math.min(92, Math.round(n)));

// A peek graduates from its admin-seeded estimate to a community-backed grade
// once it has collected this many real votes.
export const MEASURED_MIN_VOTES = 5;

export type Grade = "S" | "A" | "B" | "C";

// THE one place to tune Effectiveness grading. Strongest-first; a 0–100 value
// (the admin seed for the estimate tier, or the worked/total % for the
// player-voted tier) maps to the first row whose `min` it clears.
//
// This single table encodes BOTH cutoffs the product needs:
//   • the base letter bands — the "X-" rows: S-=85, A-=70, B-=55, C bottom;
//   • the +/- thirds within each band (only surfaced in the player-voted tier).
// The plain letter is just a graded label's leading character, so the two can
// never drift apart.
export const GRADED_THRESHOLDS: ReadonlyArray<{ label: string; min: number }> = [
  { label: "S+", min: 95 },
  { label: "S", min: 90 },
  { label: "S-", min: 85 },
  { label: "A+", min: 80 },
  { label: "A", min: 75 },
  { label: "A-", min: 70 },
  { label: "B+", min: 65 },
  { label: "B", min: 60 },
  { label: "B-", min: 55 },
  { label: "C+", min: 50 },
  { label: "C", min: 45 },
  { label: "C-", min: 0 },
];

// Full label including the +/- modifier — used only in the player-voted tier.
export function gradedLabel(value: number): string {
  const n = Math.round(value || 0);
  for (const t of GRADED_THRESHOLDS) {
    if (n >= t.min) return t.label;
  }
  return "C-";
}

// Plain letter band (the estimate tier and badge colour) — the graded label's
// leading character, so base letters stay in lockstep with the +/- cutoffs.
export function grade(value: number): Grade {
  return gradedLabel(value).charAt(0) as Grade;
}

export type Rating =
  | { tier: "estimate"; grade: Grade; label: string }
  | { tier: "measured"; grade: Grade; label: string; pct: number; votes: number };

// Single source of truth for how a peek's reliability renders.
//   • < MEASURED_MIN_VOTES votes → "estimate": plain letter from the admin
//     seed. `label` equals the letter — never a +/- modifier here.
//   • ≥ MEASURED_MIN_VOTES votes → "measured": grade recomputed from the real
//     worked/total ratio, `label` carrying the +/- modifier, plus the
//     percentage and vote count.
// `grade` is always the plain letter (drives the badge colour); `label` is the
// string to display.
export function rating(
  estimate: number,
  workedVotes: number,
  totalVotes: number
): Rating {
  const total = Math.max(0, Math.floor(totalVotes || 0));
  if (total >= MEASURED_MIN_VOTES) {
    const worked = Math.max(0, Math.min(total, Math.floor(workedVotes || 0)));
    const pct = Math.round((worked / total) * 100);
    const label = gradedLabel(pct);
    return { tier: "measured", grade: label.charAt(0) as Grade, label, pct, votes: total };
  }
  const g = grade(estimate);
  return { tier: "estimate", grade: g, label: g };
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

// Inline label for pin tooltips. Map pins stay PLAIN letter (no +/-): use the
// base grade, not the modified label. Measured pins append the vote count.
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
