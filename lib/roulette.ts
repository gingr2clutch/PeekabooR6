import { ratingScore } from "@/lib/rate";

// A peek shaped for the client-side roulette game — everything needed to render
// the result card and compute its grade, nothing more. Serializable so a server
// component can hand the whole map's pool to <RouletteGame> in one payload.
export type RoulettePeek = {
  id: string;
  slug: string;
  name: string;
  floorName: string;
  videoUrl: string | null;
  posterUrl: string | null;
  // Grade inputs — grade is computed on the client with rating(), never stored.
  baseSuccessRate: number;
  workedVotes: number;
  voteCount: number;
};

// Minimum-grade filter for the spin. `min` is a 0–100 ratingScore floor, aligned
// to GRADED_THRESHOLDS: B+ = 65, A = 75, S- (S tier) = 85. "Any" keeps the whole
// pool. Persisted in localStorage under MIN_GRADE_STORAGE_KEY.
export type MinGradeValue = "any" | "b" | "a" | "s";

export const MIN_GRADE_OPTIONS: ReadonlyArray<{
  value: MinGradeValue;
  label: string;
  min: number;
}> = [
  { value: "any", label: "Any", min: 0 },
  { value: "b", label: "B+", min: 65 },
  { value: "a", label: "A", min: 75 },
  { value: "s", label: "S-tier", min: 85 },
];

export const MIN_GRADE_STORAGE_KEY = "peek-roulette-mingrade";

export function minGradeFloor(value: MinGradeValue): number {
  return MIN_GRADE_OPTIONS.find((o) => o.value === value)?.min ?? 0;
}

// Peeks that clear the chosen minimum grade, scored with the same ratingScore
// the rest of the site ranks by.
export function filterByMinGrade(
  peeks: RoulettePeek[],
  value: MinGradeValue
): RoulettePeek[] {
  const min = minGradeFloor(value);
  if (min <= 0) return peeks;
  return peeks.filter(
    (p) => ratingScore(p.baseSuccessRate, p.workedVotes, p.voteCount) >= min
  );
}

// Random pick from a pool, avoiding an immediate repeat: the just-served peek is
// excluded unless it's the only option. Returns null for an empty pool.
export function pickRandomPeek(
  pool: RoulettePeek[],
  excludeId: string | null,
  random: () => number = Math.random
): RoulettePeek | null {
  if (pool.length === 0) return null;
  const candidates =
    pool.length > 1 && excludeId
      ? pool.filter((p) => p.id !== excludeId)
      : pool;
  const list = candidates.length > 0 ? candidates : pool;
  return list[Math.floor(random() * list.length)] ?? null;
}
