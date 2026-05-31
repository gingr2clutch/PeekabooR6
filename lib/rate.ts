// Single source of truth for the success-rate display floor/ceiling.
// Voting and the DB still hold raw [0, 100] values; this helper clamps
// what users see (and what admin inputs can produce) to [10, 92] so peeks
// never read as fake-perfect or fake-terrible.
export const displayRate = (n: number) =>
  Math.max(10, Math.min(92, Math.round(n)));
