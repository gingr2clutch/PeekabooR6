// Pure pair-URL helpers, with NO imports.
//
// Split out of lib/compare.ts because that file imports lib/db, which pulls the
// Supabase client and its server-only environment into anything that touches it.
// The compare picker is a client component and needs canonicalPair/pairId to
// build the destination URL, so importing lib/compare there would drag the whole
// database layer into the browser bundle.
//
// lib/compare.ts re-exports everything here, so existing imports are unchanged.

// Delimiter between the two map slugs in a comparison URL. Map slugs contain
// hyphens (e.g. "nighthaven-labs"), so we split on this exact token, never a
// bare "-".
export const VS = "-vs-";

// A pairing is unordered: chalet-vs-oregon and oregon-vs-chalet are the same
// matchup, so one of them has to be canonical or the same page exists at two
// URLs. Alphabetical wins.
export function canonicalPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

export function pairId(a: string, b: string): string {
  const [first, second] = canonicalPair(a, b);
  return `${first}${VS}${second}`;
}

// Split a `[pair]` route param into its two slugs, or null if it isn't a
// well-formed pair (missing delimiter, extra delimiters, or self-vs-self).
export function parsePair(param: string): { a: string; b: string } | null {
  const parts = param.split(VS);
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!a || !b || a === b) return null;
  return { a, b };
}
