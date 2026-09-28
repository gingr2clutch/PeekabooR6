// Flame crest — the static geometry behind the Top Peeks header fire.
//
// Everything here is computed ONCE at module load from a seeded PRNG, never at
// render time. That is what makes it SSR-safe: the server and the client run
// the identical deterministic sequence, so the markup matches and there is no
// hydration mismatch. Do not introduce Math.random() or Date into this file.
//
// Heights are in viewBox units, and the SVGs are rendered at a FIXED pixel
// height with preserveAspectRatio="none" (see .crest-svg in globals.css), so
// 1 viewBox unit == 1 CSS pixel vertically at every viewport width. Only the
// horizontal axis stretches. That is deliberate: it means the tongue heights
// below are exact pixel promises, which is how the "no flame touches the
// eyebrow, title or subline" constraint is actually held.
//
// The vertical budget it is held against, measured on /top:
//   subline bottom  56px above the rafter's bottom edge  <- the lowest text
//   title bottom   100px
//   eyebrow bottom 164-180px
// The bed under the title is 15px, so the centre of the crest clears the
// lowest text by ~41px. The tall tongues only rise where the text glyphs are
// not: 20% / 80% on desktop, the far edges on mobile.

export type Tongue = {
  d: string;
  /** false => rendered as a plain static path, with no per-frame cost at all */
  anim: boolean;
  dur: number;
  delay: number;
};

export type CrestLayer = {
  id: string;
  from: string; // gradient stop at the base
  to: string; // gradient stop at the tip
  baseH: number; // solid band along the bottom edge, so no cream shows through
  driftDur: number;
  driftDelay: number;
  tongues: Tongue[];
};

export type Ember = {
  left: string;
  size: number;
  from: number;
  drift: string;
  dur: number;
  delay: number;
};

export type Crest = {
  width: number;
  height: number;
  layers: CrestLayer[];
  embers: Ember[];
};

// --- deterministic helpers -------------------------------------------------

/** mulberry32 — small, fast, stable across engines. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Bell centred on `c`; `w` controls how quickly it falls off. */
const bump = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));

/**
 * One tongue: curved sides rising to a sharp tip that leans left or right.
 * Two cubics — the low control points push outward to give the belly, the
 * high ones pinch in toward the tip so it comes to a point rather than a dome.
 */
function tonguePath(cx: number, w: number, h: number, lean: number, H: number) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const xt = cx + lean;
  const yT = H - h;
  return (
    `M${r1(x0)},${H}` +
    `C${r1(x0 + w * 0.32)},${r1(H - h * 0.28)} ${r1(xt - w * 0.13)},${r1(H - h * 0.7)} ${r1(xt)},${r1(yT)}` +
    `C${r1(xt + w * 0.13)},${r1(H - h * 0.7)} ${r1(x1 - w * 0.32)},${r1(H - h * 0.28)} ${r1(x1)},${H}` +
    `Z`
  );
}

type LayerSpec = {
  id: string;
  from: string;
  to: string;
  baseH: number;
  /** fraction of the profile height this layer reaches */
  scale: number;
  /** nominal tongue width before jitter */
  tw: number;
  driftDur: number;
  driftDelay: number;
};

function buildLayer(
  spec: LayerSpec,
  width: number,
  height: number,
  profile: (t: number) => number,
  rand: () => number
): CrestLayer {
  const tongues: Tongue[] = [];
  // Neighbours advance by less than their own width, so the bases always
  // overlap and no gap opens up when they flicker out of sync.
  const step = spec.tw * 0.66;
  // start off-canvas on both sides so the row never ends mid-edge
  for (let cx = -spec.tw * 0.4; cx <= width + spec.tw * 0.4; cx += step) {
    const t = cx / width;
    const w = spec.tw * (0.72 + rand() * 0.62);
    const h = profile(Math.min(Math.max(t, 0), 1)) * spec.scale * (0.82 + rand() * 0.34);
    if (h < 3) continue;
    const lean = (rand() - 0.5) * w * 0.42;
    // Only some tongues animate. Transforms on SVG children are NOT composited
    // in Blink — each animated path costs main-thread style + layout every
    // frame — so animating all ~160 of them made this crest 2.8x more expensive
    // than the blurred fire it replaces. Keeping every tongue in the silhouette
    // but flickering a seeded ~40% of them looks the same in motion (the eye
    // reads the moving ones) at a fraction of the cost.
    tongues.push({
      d: tonguePath(cx, w, h, lean, height),
      anim: rand() < 0.25,
      dur: r1(1 + rand() * 2), // 1-3s
      delay: r1(-rand() * 3), // negative: already mid-flicker on first paint
    });
  }
  return {
    id: spec.id,
    from: spec.from,
    to: spec.to,
    baseH: spec.baseH,
    driftDur: spec.driftDur,
    driftDelay: spec.driftDelay,
    tongues,
  };
}

function buildEmbers(
  count: number,
  hotspots: number[],
  rise: number,
  rand: () => number
): Ember[] {
  const out: Ember[] = [];
  for (let i = 0; i < count; i++) {
    const c = hotspots[i % hotspots.length];
    const left = Math.min(Math.max(c + (rand() - 0.5) * 0.14, 0.01), 0.985);
    out.push({
      left: `${r1(left * 100)}%`,
      size: 2 + Math.round(rand() * 2),
      from: Math.round(rise * (0.3 + rand() * 0.35)),
      drift: `${Math.round((rand() - 0.5) * 34)}px`,
      dur: r1(3 + rand() * 1.6),
      delay: r1(-rand() * 5),
    });
  }
  return out;
}

// --- the two crests --------------------------------------------------------

// Back to front: deep orange, orange, amber, light core. The light core is
// deliberately short so it reads as the hot centre of the fire, not a 4th
// full-height row.
const LAYERS: Omit<LayerSpec, "driftDur" | "driftDelay">[] = [
  { id: "l1", from: "#d63d0a", to: "#ff6a1c", baseH: 18, scale: 1, tw: 78 },
  { id: "l2", from: "#ff7a1a", to: "#ff9a2e", baseH: 16, scale: 0.82, tw: 64 },
  { id: "l3", from: "#ffc24a", to: "#ffb03a", baseH: 14, scale: 0.58, tw: 52 },
  { id: "l4", from: "#ffe08a", to: "#ffe08a", baseH: 10, scale: 0.3, tw: 44 },
];
const DRIFT: [number, number][] = [
  [6, -0],
  [6, -1.5],
  [6, -3],
  [6, -4.5],
];

const D_W = 1440;
const D_H = 200;

/**
 * Desktop profile: a 15px bed under the title, twin peaks at 20% and 80%
 * (either side of the title glyphs), tapering to ~47px at the far edges.
 */
function desktopProfile(t: number) {
  const bed = 15;
  const peak = 160;
  // sigma 0.055, not 0.075: at 768 (the narrowest width that still uses this
  // desktop crest) the subline's ink starts at 27.6%, and a wider falloff was
  // still 67px tall there — over the 60px the subline box leaves free.
  const twin = (peak - bed) * (bump(t, 0.2, 0.055) + bump(t, 0.8, 0.055));
  const edge = 32 * bump(t, 0, 0.1) + 26 * bump(t, 1, 0.1);
  return bed + twin + edge;
}

const M_W = 390;
const M_H = 100;

/**
 * Mobile profile: same idea, smaller, with the tall tongues out near the left
 * and right edges so the centre stays a low bed under a title that occupies
 * most of the width.
 *
 * The peaks sit at 7%/93% rather than 0%/100% so a tall tongue is not sliced in
 * half by the viewport edge, and the falloff is tight (0.055) because the text
 * starts early here: at 390 the subline's ink runs ~13%-87% and its box bottom
 * is only 56px up, so the profile has to be back under that by 13%. It is —
 * ~36px there.
 */
function mobileProfile(t: number) {
  const bed = 15;
  // 40, not the 80 the mock suggests. On a phone the subline runs ~80% of the
  // viewport width and its box bottom is only 58px above the rafter's bottom
  // edge, so there is no horizontal room for a tall tongue to rise beside it.
  // Worst case here is peak * 1.16 (size jitter) * 1.1 (flicker) = 51px, which
  // clears 58px. Going taller means crossing the subline at 360 and 390.
  const peak = 40;
  return bed + (peak - bed) * (bump(t, 0.07, 0.055) + bump(t, 0.93, 0.055));
}

function build(
  seed: number,
  width: number,
  height: number,
  profile: (t: number) => number,
  twScale: number,
  suffix: string,
  emberCount: number,
  hotspots: number[],
  emberRise: number
): Crest {
  const rand = rng(seed);
  const layers = LAYERS.map((l, i) =>
    buildLayer(
      {
        ...l,
        id: `${l.id}${suffix}`,
        tw: l.tw * twScale,
        baseH: Math.round(l.baseH * (height / D_H) * 1.25),
        driftDur: DRIFT[i][0],
        driftDelay: DRIFT[i][1],
      },
      width,
      height,
      profile,
      rand
    )
  );
  return { width, height, layers, embers: buildEmbers(emberCount, hotspots, emberRise, rand) };
}

export const DESKTOP_CREST: Crest = build(
  0x5eed1,
  D_W,
  D_H,
  desktopProfile,
  1,
  "d",
  14,
  [0.2, 0.8],
  120
);

export const MOBILE_CREST: Crest = build(
  0x5eed2,
  M_W,
  M_H,
  mobileProfile,
  0.42, // tongues land at ~25-40px wide, per the mock
  "m",
  6,
  [0.05, 0.95],
  90
);
