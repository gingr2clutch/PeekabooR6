import type { Peek } from "./db";

// How many of the very best peeks sitewide earn the flame ("top peek") badge.
export const TOP_PEEK_BADGE_COUNT = 10;

// A gentle "good first peek": easy to hit AND safe. Both conditions required —
// difficulty under 3 dots (1 or 2) and low risk.
export function isBeginnerPeek(
  peek: Pick<Peek, "difficulty" | "risk">
): boolean {
  return (peek.difficulty ?? 5) < 3 && peek.risk === "low";
}
