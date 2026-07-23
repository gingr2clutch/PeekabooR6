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

// Lowest percentage that earns each base letter, derived from the single
// threshold table so the grade bar can't drift from the grades.
function letterFloor(letter: Grade): number {
  return Math.min(
    ...GRADED_THRESHOLDS.filter((t) => t.label.charAt(0) === letter).map(
      (t) => t.min
    )
  );
}

// Maps a 0–100 value to a 0–100 position on the four-tier grade bar (C·B·A·S,
// left→right). Each tier fills an equal quarter regardless of its value-width,
// so the marker always lands inside its own tier's segment.
export function gradeBarPercent(value: number): number {
  const v = Math.max(0, Math.min(100, value || 0));
  const bounds = [
    letterFloor("C"),
    letterFloor("B"),
    letterFloor("A"),
    letterFloor("S"),
    100,
  ];
  for (let i = 0; i < 4; i++) {
    if (v < bounds[i + 1] || i === 3) {
      const frac = (v - bounds[i]) / (bounds[i + 1] - bounds[i]);
      return (i + Math.max(0, Math.min(1, frac))) * 25;
    }
  }
  return 100;
}

// THE single worse→better colour scale, shared by the grade bar AND every
// grade letter, so a letter's colour always equals the bar's colour at its
// position and the two can never disagree. Input is a 0–100 score = the grade's
// position on the bar (gradeBarPercent). Stops are placed by tier so C reads
// red, B amber (peaks ~38%, the B centre), A amber→green, and all S read green
// (green from 75%, the S floor).
const GRADE_COLOR_STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [0, [185, 28, 28]], // red-700
  [25, [220, 38, 38]], // red-600   (C → red)
  [38, [217, 119, 6]], // amber-600 (B → amber)
  [75, [22, 163, 74]], // green-600 (A → green)
  [100, [21, 128, 61]], // green-700 (S → green)
];

// CSS gradient for the grade bar, built from the GRADE_COLOR_STOPS scale.
export function gradeBarGradientCss(): string {
  const stops = GRADE_COLOR_STOPS.map(
    ([pos, [r, g, b]]) => `rgb(${r}, ${g}, ${b}) ${pos}%`
  ).join(", ");
  return `linear-gradient(to right, ${stops})`;
}

// THE single per-tier grade color, shared site-wide. Each grade's +/base/-
// share their tier's color (e.g. A+, A, A- all lime). Follows the same
// red→green direction as the effectiveness meter above (C red-orange → S
// green). Non-grade UI keeps the brand teal/orange — this is grades only.
export const GRADE_TIER_COLORS: Record<Grade, string> = {
  S: "#1f9d55", // green
  A: "#7cb342", // lime-green
  B: "#e0a92e", // amber
  C: "#d1573a", // red-orange
};

// Tier color for a grade letter OR a full label (S+, A-, … → its tier color).
export function gradeTierColor(gradeOrLabel: string): string {
  const letter = (gradeOrLabel || "").charAt(0) as Grade;
  return GRADE_TIER_COLORS[letter] ?? GRADE_TIER_COLORS.C;
}

export type Rating =
  | { tier: "estimate"; grade: Grade; label: string; score: number }
  | {
      tier: "measured";
      grade: Grade;
      label: string;
      pct: number;
      votes: number;
      score: number;
    };

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
    return {
      tier: "measured",
      grade: label.charAt(0) as Grade,
      label,
      pct,
      votes: total,
      score: gradeBarPercent(pct),
    };
  }
  const g = grade(estimate);
  return { tier: "estimate", grade: g, label: g, score: gradeBarPercent(estimate) };
}

export const votesText = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`;

// Distinct-voter count for honest display — one person is one player no matter
// how many times they've re-voted. Pairs with votesText for "N votes · M players".
export const playersText = (n: number) => `${n} ${n === 1 ? "player" : "players"}`;

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
