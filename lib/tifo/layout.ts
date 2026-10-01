/**
 * Scene geometry for the /top Tifo hero, plus the data shape it paints.
 *
 * Split out of engine.ts on purpose. The page server-renders the frame the
 * banners hang on — both rods, the ropes and the ties — plus three real <a>s
 * over the cloth, and needs these numbers for all of it; if it imported
 * engine.ts for them the whole canvas scene would be pulled into the main
 * bundle. Nothing in here touches the DOM.
 *
 * Coordinates are the reference's internal scene, with y = 0 at the top of the
 * mock nav strip that production framing crops off: 1100 x 800 with a 64px
 * strip cut away, so the visible stage is 1100 x 736.
 */

/** One banner's worth of peek data, as the engine paints it. */
export type TifoDrop = {
  slug: string;
  rank: 1 | 2 | 3;
  name: string;
  /** Map name, e.g. "Oregon" — uppercased when painted. */
  map: string;
  /** Full floor name, e.g. "Second floor" — abbreviated when painted. */
  floor: string;
  /** Grade label, e.g. "S+" — also keys the disc colour. */
  grade: string;
  votes: number;
  /** Success rate the peek page shows, whole number. */
  pct: number;
  /** An estimate has no vote count to quote, so the banner says ESTIMATE. */
  estimate: boolean;
};

export type DropGeo = {
  /** Which of the top three hangs here. The middle banner is #1. */
  rank: 1 | 2 | 3;
  cx: number;
  w: number;
  h: number;
  /** When the roll is cut loose. */
  t0: number;
  /** Ripple phase, so no two banners wave in step. */
  ph: number;
};

/** The TOP PEEKS strip tied under the drops. */
export type StripGeo = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** When the roll is cut loose. */
  t0: number;
};

export type TifoLayout = {
  /** Scene width, and full scene height including the cropped nav strip. */
  W: number;
  H: number;
  /** Height of the mock nav strip the production framing cuts away. */
  NAV_H: number;
  /** Visible stage height — H - NAV_H. */
  VIEW_H: number;
  /** Scene y of the rod the drops hang from. */
  RAIL_Y: number;
  /** Scene y of the banner tops (where the cloth hangs off the rail ropes). */
  TOP_Y: number;
  /** Scene y of the rod the TOP PEEKS strip hangs from. */
  FENCE_Y: number;
  /** x extent of the rod the drops hang from. */
  RODX: readonly [number, number];
  /** The three banners, in scene order (left to right): #2, #1, #3. */
  DROPS: readonly DropGeo[];
  STR: StripGeo;
};

export const DESKTOP: TifoLayout = {
  W: 1100,
  H: 800,
  NAV_H: 64,
  VIEW_H: 736,
  RAIL_Y: 106,
  TOP_Y: 116,
  FENCE_Y: 606,
  RODX: [104, 996],
  DROPS: [
    { rank: 2, cx: 250, w: 250, h: 392, t0: 1.2, ph: 0.4 },
    { rank: 1, cx: 550, w: 290, h: 442, t0: 1.62, ph: 2.1 },
    { rank: 3, cx: 850, w: 250, h: 392, t0: 1.38, ph: 4.2 },
  ],
  STR: { x: 78, y: 620, w: 944, h: 126, t0: 0.62 },
};

/**
 * A banner's cloth rectangle as percentages of the visible box, which is how
 * the links over it are positioned — so they follow the scene at every scale
 * without a single line of layout JS.
 */
export function dropRect(g: DropGeo, L: TifoLayout) {
  return {
    left: ((g.cx - g.w / 2) / L.W) * 100,
    width: (g.w / L.W) * 100,
    top: ((L.TOP_Y - L.NAV_H) / L.VIEW_H) * 100,
    height: (g.h / L.VIEW_H) * 100,
  };
}

/**
 * Floor label for the banner's MAP · FLOOR line. Short for the three numbered
 * floors, spelled out for the basement, and anything else painted as-is.
 */
export function floorAbbrev(floor: string): string {
  switch (floor.trim().toLowerCase()) {
    case "first floor":
      return "1F";
    case "second floor":
      return "2F";
    case "third floor":
      return "3F";
    case "basement":
      return "BASEMENT";
    default:
      return floor.toUpperCase();
  }
}
