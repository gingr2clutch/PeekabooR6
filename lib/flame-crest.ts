// Flame crest — the static geometry behind the Top Peeks header fire.
//
// Everything here is computed ONCE at module load from a seeded PRNG, never at
// render time. That is what makes it SSR-safe: the server and the client run
// the identical deterministic sequence, so the markup matches and there is no
// hydration mismatch. Do not introduce Math.random() or Date into this file.
//
// WHY CLUSTERS OF HTML ELEMENTS, NOT ONE SVG
// v1 drew every tongue as a <path> inside one SVG and animated the paths.
// Transforms on SVG children are not composited in Blink: each animated path
// costs main-thread style + layout every frame, measured at ~305ms/3s with all
// of them moving, which is why v1 shipped with only 25% of them animating.
// Here neighbouring tongues are merged into ~40 (desktop) / ~16 (mobile)
// absolutely positioned HTML elements. Each is a plain div carrying the layer's
// gradient as a background and the merged tongue outline as `clip-path: path()`.
// A transform animation on a div IS composited, so every flame can move and the
// main thread stays out of it.
//
// The vertical budget, measured on /top with the eyebrow removed:
//   subline box bottom  ~103px above the rafter's bottom edge  <- lowest text
//   title box bottom    ~143px (390) / ~147px (1470)
// A flame whose rendered height stays under ~103px therefore cannot touch the
// text at ANY x. Taller clusters exist only where the text's glyphs are not.

export type Cluster = {
  /** left edge as a percentage of the crest width, so peaks track the title */
  left: string;
  /** box size in px; the clip-path is authored in this coordinate space */
  width: number;
  height: number;
  /** merged outline of the 2-3 tongues this element carries */
  path: string;
  dur: number;
  delay: number;
};

export type CrestLayer = {
  id: string;
  from: string;
  to: string;
  /** solid band along the bottom edge, so no cream shows under the flames */
  baseH: number;
  swayDur: number;
  swayDelay: number;
  clusters: Cluster[];
};

export type Ember = {
  left: string;
  size: number;
  from: number;
  drift: string;
  dur: number;
  delay: number;
};

export type Crest = { layers: CrestLayer[]; embers: Ember[] };

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
const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

// The most a cluster can ever grow past its own box: scaleY's top keyframe plus
// the bob. Heights below are authored as RENDERED maxima and divided by this,
// so what the profile promises is what actually paints.
export const MAX_SCALE_Y = 1.18;
export const BOB_PX = 3;

type Tongue = { x0: number; x1: number; xt: number; h: number };

/**
 * One tongue in the cluster's local coordinate space: curved sides rising to a
 * sharp tip that leans left or right. Two cubics — the low control points push
 * outward for the belly, the high ones pinch in so the tip comes to a point
 * rather than a dome.
 */
function tongueSegment(t: Tongue, originX: number, boxH: number) {
  const x0 = t.x0 - originX;
  const x1 = t.x1 - originX;
  const xt = t.xt - originX;
  const w = t.x1 - t.x0;
  const yB = boxH;
  const yT = boxH - t.h;
  return (
    `M${r1(x0)} ${r1(yB)}` +
    `C${r1(x0 + w * 0.32)} ${r1(yB - t.h * 0.28)} ${r1(xt - w * 0.13)} ${r1(yB - t.h * 0.7)} ${r1(xt)} ${r1(yT)}` +
    `C${r1(xt + w * 0.13)} ${r1(yB - t.h * 0.7)} ${r1(x1 - w * 0.32)} ${r1(yB - t.h * 0.28)} ${r1(x1)} ${r1(yB)}` +
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
  /** how many tongues across the full width */
  count: number;
  swayDur: number;
  swayDelay: number;
};

function buildLayer(
  spec: LayerSpec,
  designW: number,
  profile: (t: number) => number,
  perCluster: number,
  rand: () => number
): CrestLayer {
  const step = designW / spec.count;
  const tongues: Tongue[] = [];

  // Run one tongue past each edge so the row never ends mid-canvas.
  for (let i = -1; i <= spec.count + 1; i++) {
    const cx = i * step + step / 2;
    const t = clamp01(cx / designW);
    // Generous width relative to step, so neighbours overlap at the base and no
    // gap opens when they flicker out of sync.
    const w = step * (1.45 + rand() * 0.7);
    // profile() is the RENDERED maximum; divide back out the growth the
    // animation will add, so the promise holds.
    const rendered = profile(t) * spec.scale * (0.84 + rand() * 0.16);
    const h = Math.max((rendered - BOB_PX) / MAX_SCALE_Y, 2);
    const lean = (rand() - 0.5) * w * 0.4;
    tongues.push({ x0: cx - w / 2, x1: cx + w / 2, xt: cx + lean, h });
  }

  // Merge neighbours into cluster elements.
  const clusters: Cluster[] = [];
  for (let i = 0; i < tongues.length; i += perCluster) {
    const group = tongues.slice(i, i + perCluster);
    if (!group.length) continue;
    const x0 = Math.min(...group.map((g) => g.x0));
    const x1 = Math.max(...group.map((g) => g.x1));
    const boxH = Math.max(...group.map((g) => g.h));
    clusters.push({
      left: `${r1((x0 / designW) * 100)}%`,
      width: Math.round(x1 - x0),
      height: Math.round(boxH),
      path: group.map((g) => tongueSegment(g, x0, boxH)).join(""),
      dur: r1(0.8 + rand() * 1.2), // 0.8-2s
      delay: r1(-rand() * 2), // negative: already mid-flicker on first paint
    });
  }

  return {
    id: spec.id,
    from: spec.from,
    to: spec.to,
    baseH: spec.baseH,
    swayDur: spec.swayDur,
    swayDelay: spec.swayDelay,
    clusters,
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
    const left = c + (rand() - 0.5) * 0.16;
    out.push({
      left: `${r1(Math.min(Math.max(left, 0.01), 0.985) * 100)}%`,
      size: 2 + Math.round(rand() * 2),
      from: Math.round(rise * (0.16 + rand() * 0.3)),
      drift: `${Math.round((rand() - 0.5) * 44)}px`,
      dur: r1(2.6 + rand() * 1.8),
      delay: r1(-rand() * 5),
    });
  }
  return out;
}

// --- the two crests --------------------------------------------------------

// Back to front: deep orange, orange, amber, short light core.
const LAYERS: Omit<LayerSpec, "swayDur" | "swayDelay" | "count">[] = [
  { id: "l1", from: "#d63d0a", to: "#ff6a1c", baseH: 22, scale: 1 },
  { id: "l2", from: "#ff7a1a", to: "#ff9a2e", baseH: 20, scale: 0.84 },
  { id: "l3", from: "#ffc24a", to: "#ffb03a", baseH: 17, scale: 0.6 },
  { id: "l4", from: "#ffe08a", to: "#ffe08a", baseH: 12, scale: 0.32 },
];
const SWAY: [number, number][] = [
  [6, -0],
  [5.4, -1.5],
  [6.6, -3],
  [5.8, -4.5],
];

const D_W = 1440;

/**
 * Desktop profile, in RENDERED px.
 *
 * A 40px bed under the text, twin clusters peaking at 190px out at 14%/86%, and
 * ~70px at the far edges instead of v1's thin taper.
 *
 * `taper` is the load-bearing part. A bare Gaussian's tail was still ~110px tall
 * where the subline's ink begins at 768 — the narrowest width that still uses
 * this crest — nowhere near the 40px of clearance the side clusters are meant to
 * keep. taper forces the hump to exactly zero by u = GUARD, so the drop into the
 * bed is quick and the clearance holds at every width, not only at wide ones.
 */
const GUARD = 0.205;
function desktopProfile(t: number) {
  const bed = 40;
  const peak = 190;
  const u = t <= 0.5 ? t : 1 - t; // mirror; the crest is symmetric
  const edge = 30 * Math.exp(-((u / 0.06) ** 2));
  if (u >= GUARD) return bed;
  const hump = Math.exp(-(((u - 0.14) / 0.06) ** 2));
  const taper = clamp01((GUARD - u) / 0.04);
  return bed + (peak - bed) * hump * taper + edge;
}

const M_W = 390;

/**
 * Mobile profile, in RENDERED px.
 *
 * 80px at the far edges, 25px through the middle. Dropping the eyebrow lifts
 * the subline to ~103px above the rafter's bottom edge, and every rendered
 * height here stays under that — so no flame can touch the text at ANY x, which
 * matters because on a 360px phone the subline's ink runs 7%-93% and leaves
 * only ~27px of clear space at each side.
 */
function mobileProfile(t: number) {
  const bed = 25;
  const peak = 80;
  const u = t <= 0.5 ? t : 1 - t;
  return bed + (peak - bed) * Math.exp(-((u / 0.085) ** 2));
}

function build(
  seed: number,
  designW: number,
  profile: (t: number) => number,
  counts: number[],
  perCluster: number,
  /** the solid base band has to stay well under the bed height, or the middle
      of the crest is a flat bar with no flame shapes showing above it */
  baseScale: number,
  emberCount: number,
  hotspots: number[],
  emberRise: number
): Crest {
  const rand = rng(seed);
  const layers = LAYERS.map((l, i) =>
    buildLayer(
      {
        ...l,
        baseH: Math.round(l.baseH * baseScale),
        count: counts[i],
        swayDur: SWAY[i][0],
        swayDelay: SWAY[i][1],
      },
      designW,
      profile,
      perCluster,
      rand
    )
  );
  return { layers, embers: buildEmbers(emberCount, hotspots, emberRise, rand) };
}

// 24+26+28+30 tongues merged 3 at a time => ~40 animated elements.
export const DESKTOP_CREST: Crest = build(
  0x5eed1,
  D_W,
  desktopProfile,
  [24, 26, 28, 30],
  3,
  1,
  24,
  [0.14, 0.86],
  180
);

// 10+11+12+13 tongues merged 3 at a time => ~16 animated elements.
export const MOBILE_CREST: Crest = build(
  0x5eed2,
  M_W,
  mobileProfile,
  [10, 11, 12, 13],
  3,
  0.42,
  10,
  [0.04, 0.96],
  140
);
