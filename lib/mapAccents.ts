// Per-map accent color for the map-page stats counter — applied to the stat
// NUMBERS only (labels, dividers, LIVE badge, card, etc. are untouched). Keyed
// by map slug. Maps not listed here fall back to the default dark ink.
//
// Some colors were darkened from the design source so the numbers stay legible
// (≥ ~3.2:1 contrast) on the white counter card; the original is noted inline.
export const MAP_ACCENT_COLORS: Record<string, string> = {
  "calypso-casino": "#c3810e", // adjusted for contrast (source #f0a92e)
  oregon: "#b0543a",
  clubhouse: "#3f6d86",
  "nighthaven-labs": "#2f9d8f",
  bank: "#ad873f", // adjusted for contrast (source #c9a86a)
  border: "#bb8547", // adjusted for contrast (source #c2915a)
  chalet: "#6d8fa8",
  coastline: "#e0507a",
  consulate: "#848f9b", // adjusted for contrast (source #8a94a0)
  "kafe-dostoyevsky": "#c46a3d",
  outback: "#c76a34",
  skyscraper: "#da7329", // adjusted for contrast (source #e08a4c)
};

// The accent hex for a map slug, or undefined to use the default number color.
export function mapAccentColor(slug: string): string | undefined {
  return MAP_ACCENT_COLORS[slug];
}
