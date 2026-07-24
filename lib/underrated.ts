import { ratingScore } from "@/lib/rate";

// THE one place to tune "underrated". A peek is a hidden gem when it grades
// well but hasn't gathered many votes yet:
//   • grade >= B+ (ratingScore >= 65, the B+ floor in GRADED_THRESHOLDS), AND
//   • 4–15 votes inclusive (below 4 = too little signal; above 15 = already
//     noticed).
// Computed from live vote_count every call, so a peek graduates off the list
// automatically once it clears 15 votes — that's the feature working.
export const UNDERRATED_MIN_SCORE = 65; // B+ floor
export const UNDERRATED_MIN_VOTES = 4;
export const UNDERRATED_MAX_VOTES = 15;

// The feature is deliberately RARE: only the N most underrated peeks sitewide
// carry the gem badge and appear on /underrated. Everything reads from this one
// number, so the list stays curated and the badge stays scarce.
export const UNDERRATED_TOP_COUNT = 10;

export function isUnderrated(peek: {
  base_success_rate: number;
  worked_votes: number;
  vote_count: number;
}): boolean {
  const votes = peek.vote_count ?? 0;
  if (votes < UNDERRATED_MIN_VOTES || votes > UNDERRATED_MAX_VOTES) return false;
  return (
    ratingScore(peek.base_success_rate, peek.worked_votes, peek.vote_count) >=
    UNDERRATED_MIN_SCORE
  );
}
