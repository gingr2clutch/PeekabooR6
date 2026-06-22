// Single source of truth for the success-rate display floor/ceiling.
// Voting and the DB still hold raw [0, 100] values; this helper clamps
// what users see (and what admin inputs can produce) to [10, 92] so peeks
// never read as fake-perfect or fake-terrible.
export const displayRate = (n: number) =>
  Math.max(10, Math.min(92, Math.round(n)));

// Below this many community reports (votes) a peek's success rate is too
// thin to present as ranked — or even as a bare percentage. Drives both the
// reliability() copy below and the /popular + "leads the list" exclusions.
export const MIN_REPORTS_FOR_RANKING = 3;

export type Reliability =
  | { kind: "unrated"; reports: 0 }
  | { kind: "early"; rate: number; reports: number }
  | { kind: "rated"; rate: number; reports: number };

// Single source of truth for how a peek's reliability should render, keyed
// off how many community reports (votes) back it:
//   • 0 reports   → "unrated": callers must omit the percentage entirely.
//   • 1–2 reports → "early": show the rate with its count + an early-data note.
//   • 3+ reports  → "rated": show "X% success · N reports".
// A bare percentage with no report count must never reach the user.
export function reliability(
  successRate: number,
  reportCount: number
): Reliability {
  const reports = Math.max(0, Math.floor(reportCount || 0));
  if (reports <= 0) return { kind: "unrated", reports: 0 };
  const rate = displayRate(successRate);
  if (reports < MIN_REPORTS_FOR_RANKING) return { kind: "early", rate, reports };
  return { kind: "rated", rate, reports };
}

export const reportsText = (n: number) =>
  `${n} ${n === 1 ? "report" : "reports"}`;

// Inline label for prose, stat captions, and structured-data text. Never
// emits a bare percentage: unrated peeks read "New — not yet rated".
export function reliabilityLabel(
  successRate: number,
  reportCount: number
): string {
  const r = reliability(successRate, reportCount);
  switch (r.kind) {
    case "unrated":
      return "New — not yet rated";
    case "early":
      return `${r.rate}% success · ${reportsText(r.reports)} (early data)`;
    case "rated":
      return `${r.rate}% success · ${reportsText(r.reports)}`;
  }
}
