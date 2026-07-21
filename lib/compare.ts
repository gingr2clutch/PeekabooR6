import type { MapGrades } from "@/components/GradeMixBar";
import {
  getFloorsForMap,
  getMaps,
  getRankedPeeksForMap,
  type Map as GameMap,
  type PeekWithContext,
} from "@/lib/db";
import { gradedLabel, rating, ratingScore } from "@/lib/rate";

// Delimiter between the two map slugs in a comparison URL. Map slugs contain
// hyphens (e.g. "nighthaven-labs"), so we split on this exact token, never a
// bare "-".
export const VS = "-vs-";

// Everything a comparison page needs about one side of the matchup. All figures
// are computed from PUBLISHED peeks using the same rating() the rest of the site
// uses — there is no stored grade column.
export type MapCompareStats = {
  map: GameMap;
  peekCount: number;
  totalVotes: number;
  grades: MapGrades;
  sTier: number; // grades.S, surfaced for the winner headline
  avgScore: number; // mean ratingScore across the map's peeks (0 when empty)
  avgLabel: string; // avgScore rendered as a grade letter, or "—" when empty
  topPeeks: PeekWithContext[]; // best→worst; caller slices to the top N
};

// Roll a map's peeks into comparison stats. `peeks` is expected best→worst
// (getRankedPeeksForMap already sorts that way) so `topPeeks` is just a prefix.
export function summarizeMap(
  map: GameMap,
  peeks: PeekWithContext[]
): MapCompareStats {
  const grades: MapGrades = { S: 0, A: 0, B: 0, C: 0 };
  let totalVotes = 0;
  let scoreSum = 0;

  for (const p of peeks) {
    grades[rating(p.base_success_rate, p.worked_votes, p.vote_count).grade] += 1;
    totalVotes += p.vote_count ?? 0;
    scoreSum += ratingScore(p.base_success_rate, p.worked_votes, p.vote_count);
  }

  const avgScore = peeks.length > 0 ? scoreSum / peeks.length : 0;

  return {
    map,
    peekCount: peeks.length,
    totalVotes,
    grades,
    sTier: grades.S,
    avgScore,
    avgLabel: peeks.length > 0 ? gradedLabel(avgScore) : "—",
    topPeeks: peeks.slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// THE winner logic. This is the single place to tune how a matchup is decided.
// Scoring, tiebreaks, and the headline copy all live here so future changes are
// one edit. Ranking: higher average grade wins; ties break on S-tier count,
// then on peek count; a full tie is declared even.
// ---------------------------------------------------------------------------

// Lower = better. Sorts two sides best-first for winner selection.
function rankForWinner(a: MapCompareStats, b: MapCompareStats): number {
  if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
  if (a.sTier !== b.sTier) return b.sTier - a.sTier;
  if (a.peekCount !== b.peekCount) return b.peekCount - a.peekCount;
  return 0;
}

export type Comparison = {
  tie: boolean;
  winner: MapCompareStats | null;
  loser: MapCompareStats | null;
  // One confident, fun line summarizing the result.
  headline: string;
};

function winnerHeadline(w: MapCompareStats, l: MapCompareStats): string {
  const reasons: string[] = [];
  if (w.sTier !== l.sTier) {
    reasons.push(
      `${w.sTier} S-tier ${w.sTier === 1 ? "peek" : "peeks"} vs ${l.sTier}`
    );
  }
  if (w.avgLabel !== l.avgLabel) {
    reasons.push(`a higher average grade (${w.avgLabel} vs ${l.avgLabel})`);
  }
  if (reasons.length === 0) {
    reasons.push(`more graded peeks (${w.peekCount} vs ${l.peekCount})`);
  }
  return `${w.map.name} wins — ${reasons.join(", and ")}.`;
}

export function decideComparison(
  a: MapCompareStats,
  b: MapCompareStats
): Comparison {
  const r = rankForWinner(a, b);
  if (r === 0) {
    return {
      tie: true,
      winner: null,
      loser: null,
      headline: `${a.map.name} and ${b.map.name} are dead even — matching grades top to bottom. Too close to call.`,
    };
  }
  const winner = r < 0 ? a : b;
  const loser = r < 0 ? b : a;
  return { tie: false, winner, loser, headline: winnerHeadline(winner, loser) };
}

// ---------------------------------------------------------------------------
// Pairing / URL helpers. One canonical URL per unordered pair: slugs sorted
// alphabetically. parsePair() accepts either order; the page redirects a
// non-canonical order to the canonical one.
// ---------------------------------------------------------------------------

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

// Every canonical unordered pairing across the given slugs.
export function allPairings(slugs: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      out.push(pairId(slugs[i], slugs[j]));
    }
  }
  return out;
}

// Featured matchups for the index: pairings of the most-played maps. Scores each
// pairing by combined total votes and returns the top `limit` (default 8).
export function featuredPairings(
  maps: MapCompareStats[],
  limit = 8
): { pairId: string; a: MapCompareStats; b: MapCompareStats }[] {
  const scored: {
    pairId: string;
    a: MapCompareStats;
    b: MapCompareStats;
    votes: number;
  }[] = [];
  for (let i = 0; i < maps.length; i++) {
    for (let j = i + 1; j < maps.length; j++) {
      const a = maps[i];
      const b = maps[j];
      scored.push({
        pairId: pairId(a.map.slug, b.map.slug),
        a,
        b,
        votes: a.totalVotes + b.totalVotes,
      });
    }
  }
  return scored
    .sort((x, y) => y.votes - x.votes)
    .slice(0, limit)
    .map(({ pairId, a, b }) => ({ pairId, a, b }));
}

// ---------------------------------------------------------------------------
// Data access. Comparison-eligible = a PUBLISHED map with at least one
// published peek. Note: getMaps() does NOT filter by published, so we do it
// here — never expose an unpublished map through /compare.
// ---------------------------------------------------------------------------

async function summarizeOneMap(map: GameMap): Promise<MapCompareStats> {
  const floors = await getFloorsForMap(map.id);
  const peeks = await getRankedPeeksForMap(floors.map((f) => f.id));
  return summarizeMap(map, peeks);
}

// All comparison-eligible maps, each fully summarized, sorted most-played first
// (by total votes) so callers get a stable, sensible default order.
export async function getComparisonMaps(): Promise<MapCompareStats[]> {
  const maps = (await getMaps()).filter((m) => m.published);
  const summaries = await Promise.all(maps.map(summarizeOneMap));
  return summaries
    .filter((s) => s.peekCount > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes);
}
