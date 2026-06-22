// Display floor/ceiling for an admin-seeded rate estimate. Voting and the DB
// hold raw [0, 100] values; this clamps what admin inputs can produce to
// [10, 92] so a seed never reads as fake-perfect or fake-terrible. Measured
// community percentages are NOT clamped — they're real.
export const displayRate = (n: number) =>
  Math.max(10, Math.min(92, Math.round(n)));

// A peek graduates from its admin-seeded Effectiveness estimate to a measured
// community success rate once it has collected this many real votes.
export const MEASURED_MIN_VOTES = 5;

export type EffectivenessLevel = "High" | "Reliable" | "Situational" | "Risky";

export type Rating =
  | { tier: "estimate"; level: EffectivenessLevel }
  | { tier: "measured"; pct: number; votes: number };

// Maps an admin-seeded estimate (base_success_rate, 0–100) to a qualitative
// effectiveness band. This is the only thing shown for sub-threshold peeks,
// and it is never rendered as a percentage.
export function effectivenessLevel(estimate: number): EffectivenessLevel {
  const n = Math.round(estimate || 0);
  if (n >= 80) return "High";
  if (n >= 70) return "Reliable";
  if (n >= 60) return "Situational";
  return "Risky";
}

// Single source of truth for how a peek's reliability renders:
//   • < MEASURED_MIN_VOTES real votes → "estimate": qualitative band only,
//     never a percentage.
//   • ≥ MEASURED_MIN_VOTES real votes → "measured": the ONLY place a precise
//     percentage appears, computed from worked / total and always paired with
//     its vote count.
export function rating(
  estimate: number,
  workedVotes: number,
  totalVotes: number
): Rating {
  const total = Math.max(0, Math.floor(totalVotes || 0));
  if (total >= MEASURED_MIN_VOTES) {
    const worked = Math.max(0, Math.min(total, Math.floor(workedVotes || 0)));
    return { tier: "measured", pct: Math.round((worked / total) * 100), votes: total };
  }
  return { tier: "estimate", level: effectivenessLevel(estimate) };
}

export const votesText = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`;

// Ranking score spanning both tiers: measured peeks rank by their real
// percentage, estimate peeks by their seed. Measured peeks get a small nudge
// so a community-proven peek edges out an equal-scoring estimate.
export function ratingScore(
  estimate: number,
  workedVotes: number,
  totalVotes: number
): number {
  const r = rating(estimate, workedVotes, totalVotes);
  return r.tier === "measured" ? r.pct + 0.5 : Math.round(estimate || 0);
}

// Inline label for prose and structured-data text. Never emits a bare
// percentage — estimate-tier peeks read as their effectiveness band.
export function ratingLabel(
  estimate: number,
  workedVotes: number,
  totalVotes: number
): string {
  const r = rating(estimate, workedVotes, totalVotes);
  return r.tier === "measured"
    ? `${r.pct}% success · ${votesText(r.votes)}`
    : `${r.level} effectiveness`;
}
