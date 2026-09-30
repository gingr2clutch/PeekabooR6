/**
 * Scene geometry for the /top Tifo hero, plus the data shape it paints.
 *
 * Split out of engine.ts on purpose. The page renders three real <a>s over the
 * banners server-side and needs the cloth rectangles to place them; if it
 * imported engine.ts for those numbers the whole canvas scene would be pulled
 * into the main bundle — including on phones, which must never download it.
 * Nothing in here touches the DOM.
 *
 * Coordinates are the reference's internal 1100 x 800 scene, with y = 0 at the
 * top of the mock nav strip that production framing crops off. The visible
 * stage is therefore y 64..800, i.e. 1100 x 736.
 */

export const W = 1100;
export const H = 800;
/** Height of the mock nav strip the production framing cuts away. */
export const NAV_H = 64;
/** Visible stage height. */
export const VIEW_H = H - NAV_H; // 736
/** Scene y of the banner tops (where the cloth hangs from the rail ropes). */
export const TOP_Y = 116;

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

/** The three banners, in scene order (left to right): #2, #1, #3. */
export const DROP_GEO: readonly DropGeo[] = [
  { rank: 2, cx: 250, w: 250, h: 392, t0: 1.2, ph: 0.4 },
  { rank: 1, cx: 550, w: 290, h: 442, t0: 1.62, ph: 2.1 },
  { rank: 3, cx: 850, w: 250, h: 392, t0: 1.38, ph: 4.2 },
];

/**
 * A banner's cloth rectangle as percentages of the visible box, which is how
 * the links over it are positioned — so they follow the scene at every scale
 * without a single line of layout JS.
 */
export function dropRect(g: DropGeo) {
  return {
    left: ((g.cx - g.w / 2) / W) * 100,
    width: (g.w / W) * 100,
    top: ((TOP_Y - NAV_H) / VIEW_H) * 100,
    height: (g.h / VIEW_H) * 100,
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
