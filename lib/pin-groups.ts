// Grouping peeks that were filmed at the same physical spot.
//
// A window or a door usually yields several peeks — a different angle, a
// runout, a re-film with better audio. Stored as separate rows they land on the
// map within a percent or two of each other and the floor page ends up with a
// knot of pins that all mean "that window".
//
// Pure data, no React and no imports: the floor page groups on the server, the
// peek page uses isSameSpot for its "Same spot" pill, and a throwaway script
// can exercise it without pulling the app in.

/**
 * How close two peeks have to be to count as the same spot, in x-percent.
 *
 * 3 is deliberately small. A window and the door beside it on Coastline's
 * second floor are ~16 apart, so the risk is not over-merging distinct spots —
 * it is that two clips of the same window pinned by different people a couple
 * of percent apart should still collapse to one pin.
 */
export const SAME_SPOT = 3;

// The map box is 16:10, so a percent of height is 0.625 of a percent of width
// in rendered pixels. Without this, two peeks separated vertically would read
// as further apart than the same separation horizontally.
const Y_TO_X = 0.625;

type Point = { x_pct: number; y_pct: number };

/** Screen-space distance between two peeks, in x-percent units. */
export function spotDistance(a: Point, b: Point): number {
  if (
    !Number.isFinite(a.x_pct) ||
    !Number.isFinite(a.y_pct) ||
    !Number.isFinite(b.x_pct) ||
    !Number.isFinite(b.y_pct)
  ) {
    // A row with no usable coordinates must never silently merge into a spot.
    return Infinity;
  }
  const dx = a.x_pct - b.x_pct;
  const dy = (a.y_pct - b.y_pct) * Y_TO_X;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isSameSpot(a: Point, b: Point): boolean {
  return spotDistance(a, b) <= SAME_SPOT;
}

export type Spot<T> = { lead: T; members: T[] };

/**
 * Collapse a best-first list of peeks into spots.
 *
 * Each peek joins the FIRST existing spot whose LEAD it is within SAME_SPOT of,
 * otherwise it opens a new one. Comparing against the lead only — never against
 * the other members — is what stops a chain of peeks each 3 apart from
 * swallowing the whole floor into one spot: with (0,0), (2.5,0), (5,0) the
 * third is 5 from the lead, so it starts its own spot.
 *
 * Input order is preserved: spots come out ordered by their leads and members
 * stay best-first, so a spot's pin number is its lead's rank. The input array
 * and its objects are not mutated.
 */
export function groupIntoSpots<T extends Point>(
  rankedBestFirst: T[]
): Spot<T>[] {
  const spots: Spot<T>[] = [];
  for (const peek of rankedBestFirst) {
    const home = spots.find((s) => isSameSpot(s.lead, peek));
    if (home) {
      home.members.push(peek);
    } else {
      spots.push({ lead: peek, members: [peek] });
    }
  }
  return spots;
}
