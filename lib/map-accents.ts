// Per-map accent colours.
//
// Hand-picked from each map's own art, used for the hero's border on desktop.
// Nothing else reads these yet — they are deliberately a lookup with a
// fallback rather than a required column, so a map added tomorrow renders the
// ordinary border instead of breaking or forcing a data migration.

/** Accent per map slug. Maps not listed here fall back to the normal border. */
export const MAP_ACCENTS: Record<string, string> = {
  bank: "#919191",
  border: "#b8742e",
  "calypso-casino": "#c2185b",
  chalet: "#5aa0d8",
  clubhouse: "#5f7f8f",
  coastline: "#c95b7a",
  consulate: "#ebebeb",
  "emerald-plains": "#2e9d63",
  fortress: "#b8742e",
  "kafe-dostoyevsky": "#e0443a",
  kanal: "#5f7f8f",
  lair: "#444f5e",
  "nighthaven-labs": "#aaaaaa",
  oregon: "#b8742e",
  outback: "#d9772b",
  skyscraper: "#e0443a",
  "theme-park": "#e0443a",
  villa: "#8e2c3a",
};

/** The site's ordinary border colour — the fallback for unlisted maps. */
export const DEFAULT_BORDER = "#e2e0d5";

/**
 * Accent for a map, or the ordinary border colour when the map has none.
 *
 * Always returns a usable colour, so callers never branch on presence and a
 * new map can never render a missing border.
 */
export function mapAccent(slug: string | null | undefined): string {
  if (!slug) return DEFAULT_BORDER;
  return MAP_ACCENTS[slug] ?? DEFAULT_BORDER;
}
