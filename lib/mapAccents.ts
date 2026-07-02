// Per-map accent color for the map-page stats counter — applied to the stat
// LABELS (PEEKS/VOTES/S-TIER/A-TIER) and the "LIVE" badge only. The big stat
// numbers stay the default dark ink. Keyed by map slug; maps not listed fall
// back to the default label/badge colors.
//
// Labels and the badge are small text, so colors are darkened where needed to
// keep ~4.5:1 contrast (WCAG AA) on the white card; the design source is noted
// inline where adjusted.
export const MAP_ACCENT_COLORS: Record<string, string> = {
  "calypso-casino": "#7c3aed", // purple (neon casino signage)
  oregon: "#b0543a",
  clubhouse: "#3f6d86",
  "nighthaven-labs": "#278378", // darkened for contrast (source #2f9d8f)
  bank: "#917134", // darkened for contrast (source #c9a86a)
  border: "#9b6d39", // darkened for contrast (source #c2915a)
  chalet: "#577992", // darkened for contrast (source #6d8fa8)
  coastline: "#db3263", // darkened for contrast (source #e0507a)
  consulate: "#6b7784", // darkened for contrast (source #8a94a0)
  "kafe-dostoyevsky": "#b36037", // darkened for contrast (source #c46a3d)
  outback: "#b35f2f", // darkened for contrast (source #c76a34)
  skyscraper: "#b65e1f", // darkened for contrast (source #e08a4c)
};

// The accent hex for a map slug, or undefined to use the default colors.
export function mapAccentColor(slug: string): string | undefined {
  return MAP_ACCENT_COLORS[slug];
}
