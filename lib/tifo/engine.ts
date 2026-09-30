/**
 * Option 2 · TIFO — the /top hero, as a framework-free engine.
 *
 * A 1:1 port of tifo-reference.html (approved Sep 30 2026, kept in the repo
 * root as the design reference and never imported). Ultras end at night: two
 * flares ignite behind the fence, orange smoke rolls up through the stand, and
 * three spray-stencilled canvas banners drop from the upper-tier rail and
 * ripple in the wind. The page title is the frontline banner tied to the fence.
 *
 * What the port deliberately leaves out: the mock nav (R6.nav) and its CSS, the
 * display-font picker table (production has one font config), and the
 * capture/__seek harness. What it adds: drawStill(), stopEmitters()/isSettled()
 * for the wind-down, and a cloth resolution that follows the device instead of
 * being pinned at 1.5.
 *
 * Nothing here injects CSS at runtime — the reference's `.o2` block lives in
 * globals.css under the `.tifo-*` names.
 *
 * Coordinates are the reference's 1100 x 800 scene; see lib/tifo/layout.ts.
 */

import { gradeTierColor } from "@/lib/rate";
import {
  DROP_GEO,
  H,
  NAV_H,
  TOP_Y,
  W,
  floorAbbrev,
  type DropGeo,
  type TifoDrop,
} from "@/lib/tifo/layout";

const RAIL_Y = 106;
const FENCE_Y = 606;
const CANVAS = "#e6dfcc";
const ORANGE = "#e9550f";
const INK = "#1c1d1a";

/** Banner art resolution, and the back/front smoke canvases'. */
const ART = 2;
const SMOKE = 0.5;

/**
 * Cloth column width in scene px. The reference redraws every banner in 2px
 * columns; these are the knob to turn if the per-frame JS cost goes over
 * budget (drops 3, strip 4). Measured at 4x CPU throttle — see the perf note
 * in the ship report.
 */
const COL_DROP = 2;
const COL_STRIP = 2;

/**
 * Stencil bridges cut through letters with a closed counter. Approved OFF —
 * the code stays so turning it back on is one line, not a rewrite.
 */
const STENCIL_CUTS = false;

/** Tracking (em) for the painted names, and for the TOP PEEKS strip. */
const TR = -0.01;
const TR_STRIP = 0.02;
/** Weight of the painted display font. */
const DW = 700;
/** Weight of the mono labels. */
const LW = 600;

const STR = { x: 78, y: 620, w: 944, h: 126, t0: 0.62 };
const DROP_T = 0.55;
const FLARE_SEED: ReadonlyArray<{ x: number; y: number; t0: number; fig: number }> = [
  { x: 136, y: 574, t0: 0.12, fig: 2 },
  { x: 968, y: 570, t0: 0.34, fig: 17 },
];

/** How long the flare glow takes to die once the emitters are cut. */
const FADE = 1.5;

// --- helpers (R6.rng / clamp / lerp / prog / smooth / wobble) ---------------

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Damped oscillation after an impulse at t = 0 (starts and ends at 0). */
const wobble = (t: number, f = 1.6, d = 2.2) =>
  t <= 0 ? 0 : Math.exp(-d * t) * Math.sin(2 * Math.PI * f * t);

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
function cnv(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}
function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext("2d");
  if (!g) throw new Error("tifo: no 2d context");
  return g;
}

/** Paint grain. Deterministic, so one copy serves every instance. */
let NOISE: HTMLCanvasElement | null = null;
function noise(): HTMLCanvasElement {
  if (NOISE) return NOISE;
  const c = cnv(192, 192);
  const g = ctx2d(c);
  const im = g.createImageData(192, 192);
  const rnd = rng(7);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = rnd();
    im.data[i] = im.data[i + 1] = im.data[i + 2] = 0;
    im.data[i + 3] = v > 0.55 ? Math.floor((v - 0.55) * 560) : 0;
  }
  g.putImageData(im, 0, 0);
  return (NOISE = c);
}

let MC: CanvasRenderingContext2D | null = null;
function measureCtx(): CanvasRenderingContext2D {
  return (MC = MC || ctx2d(cnv(4, 4)));
}

/** Width per px of font size, and cap ascent per px — the two numbers fitPx needs. */
function metrics(text: string, fam: string, weight: number, tr: number) {
  const g = measureCtx();
  g.font = `${weight} 100px ${fam}`;
  g.letterSpacing = tr * 100 + "px";
  const m = g.measureText(text);
  return { w: m.width / 100, asc: (m.actualBoundingBoxAscent || 70) / 100 };
}

/** Font size that gives `text` a cap height of capH and keeps it inside maxW. */
function fitPx(
  text: string,
  fam: string,
  weight: number,
  tr: number,
  capH: number,
  maxW: number
) {
  const m = metrics(text, fam, weight, tr);
  return Math.min(capH / m.asc, maxW / m.w);
}

// --- smoke sprites ---------------------------------------------------------

/** Fractal value noise, used to give each puff its wisps. */
function vnoise(seed: number) {
  const rnd = rng(seed);
  const tab = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) tab[i] = rnd();
  const at = (x: number, y: number) => tab[((y & 255) << 8) | (x & 255)];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function puff(color: string, seed: number): HTMLCanvasElement {
  const s = 128;
  const c = cnv(s, s);
  const g = ctx2d(c);
  const im = g.createImageData(s, s);
  const n = vnoise(seed);
  const k = parseInt(color.slice(1), 16);
  const cr = k >> 16;
  const cg = (k >> 8) & 255;
  const cb = k & 255;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = (x - s / 2) / (s / 2);
      const dy = (y - s / 2) / (s / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      let f = 0;
      let amp = 0.5;
      let fr = 1 / 18;
      for (let o = 0; o < 4; o++) {
        f += amp * n(x * fr + seed * 31, y * fr + seed * 17);
        amp *= 0.5;
        fr *= 2;
      }
      const fall = Math.max(0, 1 - d);
      const a = Math.pow(fall, 1.3) * clamp(0.15 + 1.25 * (f - 0.3));
      const i = (y * s + x) * 4;
      im.data[i] = cr;
      im.data[i + 1] = cg;
      im.data[i + 2] = cb;
      im.data[i + 3] = Math.round(a * 200);
    }
  g.putImageData(im, 0, 0);
  return c;
}

type Sprites = {
  hot: HTMLCanvasElement[];
  warm: HTMLCanvasElement[];
  dust: HTMLCanvasElement[];
};
/**
 * Nine 128px puffs, each ~65k four-octave noise samples. They are fixed art,
 * so they are built once per page rather than once per mount.
 */
let SPRITES: Sprites | null = null;
function sprites(): Sprites {
  if (SPRITES) return SPRITES;
  return (SPRITES = {
    hot: [puff("#ff7a34", 1), puff("#ff8a3c", 2), puff("#ff6a28", 7)],
    warm: [puff("#e0642e", 3), puff("#e3773f", 4), puff("#d9602c", 8)],
    dust: [puff("#9a7466", 5), puff("#8a6f68", 6), puff("#a17c6c", 9)],
  });
}

/** Vertical alpha ramps for fold shading (taut at the top / bellied in the middle). */
function ramp(h: number, mode: "hang" | "belly", color: string) {
  const c = cnv(2, Math.ceil(h));
  const g = ctx2d(c);
  const gr = g.createLinearGradient(0, 0, 0, h);
  if (mode === "hang") {
    gr.addColorStop(0, rgba(color, 0.2));
    gr.addColorStop(0.25, rgba(color, 0.55));
    gr.addColorStop(1, rgba(color, 1));
  } else {
    gr.addColorStop(0, rgba(color, 0.15));
    gr.addColorStop(0.5, rgba(color, 1));
    gr.addColorStop(1, rgba(color, 0.25));
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 2, h);
  return c;
}

// --- cloth -----------------------------------------------------------------

function clothBase(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  scallop: number
) {
  const rnd = rng(seed);
  const segs = Math.max(3, Math.round(w / (scallop || 64)));
  const gx = (i: number) => 9 + (i * (w - 18)) / segs;
  g.beginPath();
  g.moveTo(0, 2);
  g.lineTo(gx(0), 1.5);
  for (let i = 0; i < segs; i++)
    g.quadraticCurveTo((gx(i) + gx(i + 1)) / 2, 6.5, gx(i + 1), 1.5);
  g.lineTo(w, 2);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.save();
  g.clip();
  g.fillStyle = CANVAS;
  g.fillRect(0, 0, w, h);
  // weave
  g.globalAlpha = 0.05;
  g.fillStyle = "#6b5e45";
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  g.globalAlpha = 0.035;
  for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h);
  // stains
  for (let i = 0; i < 5; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 30 + rnd() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(90,70,40,.07)");
    gr.addColorStop(1, "rgba(90,70,40,0)");
    g.globalAlpha = 1;
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 0.09;
  g.fillStyle = g.createPattern(noise(), "repeat") as CanvasPattern;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  // hems + stitches
  g.fillStyle = "rgba(60,45,20,.07)";
  g.fillRect(0, 0, w, 15);
  g.fillRect(0, h - 11, w, 11);
  g.strokeStyle = "rgba(70,55,30,.45)";
  g.lineWidth = 1;
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(0, 15.5);
  g.lineTo(w, 15.5);
  g.moveTo(0, h - 11.5);
  g.lineTo(w, h - 11.5);
  g.moveTo(6.5, 16);
  g.lineTo(6.5, h - 12);
  g.moveTo(w - 6.5, 16);
  g.lineTo(w - 6.5, h - 12);
  g.stroke();
  g.setLineDash([]);
  g.restore();
  return { segs, gx };
}

function grommets(
  g: CanvasRenderingContext2D,
  gx: (i: number) => number,
  segs: number,
  y: number
) {
  for (let i = 0; i <= segs; i++) {
    const x = gx(i);
    g.fillStyle = "#9c7a3c";
    g.beginPath();
    g.arc(x, y, 4.4, 0, 7);
    g.fill();
    g.fillStyle = "#d9b86e";
    g.beginPath();
    g.arc(x - 0.8, y - 0.8, 3.2, 0, 7);
    g.fill();
    g.fillStyle = "#2a241a";
    g.beginPath();
    g.arc(x, y, 2, 0, 7);
    g.fill();
  }
}

function fold(x: number, t: number, ph: number) {
  return (
    0.55 * Math.sin(0.043 * x - 1.7 * t + ph) +
    0.3 * Math.sin(0.107 * x + 1.25 * t + ph * 1.7) +
    0.15 * Math.sin(0.23 * x - 2.9 * t + ph * 0.3)
  );
}

// --- types -----------------------------------------------------------------

type SprayOpts = {
  weight?: number;
  family?: string;
  ls?: number;
  align?: "center";
  haloA?: number;
  blur?: number;
  cut?: boolean;
  grain?: number;
  alpha?: number;
};

type Smoke = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r0: number;
  r1: number;
  life: number;
  age: number;
  sp: number;
  front: boolean;
  hot: boolean;
  ph: number;
};
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  s: number;
};
type Fig = { ph: number; f: number; a: number; hr: number; x: number; y: number };
type Flare = { x: number; y: number; t0: number; fig: number };
type Cloth = {
  g: CanvasRenderingContext2D;
  art: HTMLCanvasElement;
  ox: number;
  oy: number;
  dark: HTMLCanvasElement;
  lite: HTMLCanvasElement;
};
type DropSlot = Cloth & { o: DropGeo };
type FlareSlot = {
  f: Flare;
  el: HTMLElement;
  spill: HTMLElement;
  halo: HTMLElement;
  core: HTMLElement;
};

export type TifoOptions = {
  /** The top three, best first. Missing ranks simply leave their banner out. */
  top3: TifoDrop[];
  /**
   * Ready-to-use CSS family lists (what the page reads out of
   * --font-space-grotesk / --font-plex-mono, with a system fallback appended).
   */
  fonts: { display: string; label: string };
  /**
   * Current stage scale (box width / 1100). Fixes the cloth canvas resolution
   * at min(2, dpr x scale), so a retina desktop gets sharper banners than the
   * reference's hard-coded 1.5 and a small window does not pay for pixels it
   * cannot show.
   */
  scale?: number;
};

export type TifoHandle = {
  /** Advance the sim by dt and draw the frame at scene time t. */
  render(t: number, dt: number): void;
  reset(): void;
  /**
   * One deterministic frame at t: steps the sim up to t WITHOUT drawing, then
   * draws once. (The reference's still() draws every intermediate frame, which
   * costs ~180 full redraws for the same picture.)
   */
  drawStill(t: number): void;
  /** Cut the flares, sparks and background smoke; the glow then fades out. */
  stopEmitters(): void;
  /** True once the glow has faded and the last particle has expired. */
  isSettled(): boolean;
  destroy(): void;
};

type State = {
  root: HTMLDivElement;
  bg: CanvasRenderingContext2D;
  fg: CanvasRenderingContext2D;
  xg: CanvasRenderingContext2D;
  drops: DropSlot[];
  strip: Cloth;
  flares: FlareSlot[];
  tint: HTMLElement;
  figEls: SVGGElement[];
  figData: Fig[];
  sprites: Sprites;
  smoke: Smoke[];
  sparks: Spark[];
  acc: number;
  simT: number;
  lastT: number;
  rnd: () => number;
  emit: number[];
  stopped: boolean;
  stopT: number;
};

// --- engine ----------------------------------------------------------------

export function createTifo(stage: HTMLElement, opts: TifoOptions): TifoHandle {
  const dispFam = opts.fonts.display;
  const labelFam = opts.fonts.label;
  const byRank = new Map<number, TifoDrop>(opts.top3.map((d) => [d.rank, d]));
  const geos = DROP_GEO.filter((g) => byRank.has(g.rank));
  const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
  const CL = Math.max(1, Math.min(2, dpr * (opts.scale || 1)));

  // --- painting ------------------------------------------------------------

  /** Spray-stencil text: overspray halo + grain knocked out of the paint. */
  function spray(
    g: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    px: number,
    color: string,
    o: SprayOpts = {}
  ) {
    const font = `${o.weight || 900} ${px}px ${o.family || dispFam}`;
    const m0 = measureCtx();
    m0.font = font;
    m0.letterSpacing = o.ls ? o.ls + "px" : "0px";
    const tw = m0.measureText(text).width;
    const pad = Math.ceil(px * 0.3);
    const cw = tw + pad * 2;
    const ch = px * 1.2 + pad * 2;
    const c = cnv(cw * ART, ch * ART);
    const tg = ctx2d(c);
    tg.scale(ART, ART);
    tg.font = font;
    if (o.ls) tg.letterSpacing = o.ls + "px";
    const bx = pad;
    const by = pad + px * 0.95;
    tg.fillStyle = color;
    tg.shadowColor = rgba(color, o.haloA != null ? o.haloA : 0.55);
    tg.shadowBlur = (o.blur != null ? o.blur : px * 0.07) * ART;
    tg.fillText(text, bx, by);
    tg.shadowBlur = 0;
    tg.fillText(text, bx, by);
    tg.globalCompositeOperation = "destination-out";
    if (o.cut) {
      // Cut stencil bridges through every letter with a closed counter (O splits
      // into two halves, P/R/B/D lose the bowl from the stem, A loses its apex),
      // so any font becomes a stencil. Off in production — see STENCIL_CUTS.
      const capH = tg.measureText(text).actualBoundingBoxAscent || px * 0.7;
      const bw = Math.max(1.6, capH * 0.075);
      const halo = o.blur != null ? o.blur : px * 0.07;
      const ls = o.ls || 0;
      let x0 = 0;
      for (let i = 0; i < text.length; i++) {
        const x1 = tg.measureText(text.slice(0, i + 1)).width;
        if ("OPRBDAQ04689".includes(text[i])) {
          tg.fillRect(
            bx + (x0 + x1 - ls) / 2 - bw / 2,
            by - capH - halo,
            bw,
            capH + halo * 2
          );
        }
        x0 = x1;
      }
    }
    tg.globalAlpha = o.grain != null ? o.grain : 0.32;
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.fillStyle = tg.createPattern(noise(), "repeat") as CanvasPattern;
    tg.fillRect(0, 0, c.width, c.height);
    const ax = o.align === "center" ? x - tw / 2 - bx : x - bx;
    g.globalAlpha = o.alpha != null ? o.alpha : 1;
    g.drawImage(c, ax, y - by, cw, ch);
    g.globalAlpha = 1;
  }

  /** Sprayed disc with the grade knocked out of it (the stencil left bare canvas). */
  function sprayDisc(
    g: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: string,
    label: string,
    capH: number
  ) {
    const s = r * 2 + 30;
    const c = cnv(s * ART, s * ART);
    const tg = ctx2d(c);
    tg.scale(ART, ART);
    tg.fillStyle = color;
    tg.shadowColor = rgba(color, 0.5);
    tg.shadowBlur = 7 * ART;
    tg.beginPath();
    tg.arc(s / 2, s / 2, r, 0, 7);
    tg.fill();
    tg.shadowBlur = 0;
    tg.globalCompositeOperation = "destination-out";
    const px = fitPx(label, dispFam, DW, 0, capH, r * 1.45);
    tg.font = `${DW} ${px}px ${dispFam}`;
    tg.textAlign = "center";
    tg.fillText(label, s / 2, s / 2 + capH / 2);
    tg.globalAlpha = 0.28;
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.fillStyle = tg.createPattern(noise(), "repeat") as CanvasPattern;
    tg.fillRect(0, 0, c.width, c.height);
    g.drawImage(c, cx - s / 2, cy - s / 2, s, s);
  }

  /**
   * The peek name, uppercased, on one line if it fits at the reference size and
   * otherwise on two. The split is the space that leaves the two halves closest
   * in width; a tie takes the later space, which is how the reference breaks
   * "Folding screen / window". Never more than two lines.
   */
  function nameLines(name: string, capH: number, maxW: number): string[] {
    const up = name.toUpperCase();
    const m = metrics(up, dispFam, DW, TR);
    if (m.w * (capH / m.asc) <= maxW) return [up];
    const parts = up.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return [up];
    let cut = 1;
    let best = Infinity;
    for (let i = 1; i < parts.length; i++) {
      const a = metrics(parts.slice(0, i).join(" "), dispFam, DW, TR).w;
      const b = metrics(parts.slice(i).join(" "), dispFam, DW, TR).w;
      const d = Math.abs(a - b);
      if (d <= best) {
        best = d;
        cut = i;
      }
    }
    return [parts.slice(0, cut).join(" "), parts.slice(cut).join(" ")];
  }

  /**
   * A mono label at its reference size, shrunk to fit the cloth rather than
   * wrapped. Tracking shrinks with it so the line keeps its shape.
   */
  function monoFit(text: string, px: number, ls: number, maxW: number) {
    const w = metrics(text, labelFam, LW, ls / px).w * px;
    const k = w <= maxW ? 1 : maxW / w;
    return { px: px * k, ls: ls * k };
  }

  function dropArt(o: DropGeo, d: TifoDrop, idx: number): HTMLCanvasElement {
    const { w, h } = o;
    const k = w / 290;
    const c = cnv(w * ART, h * ART);
    const g = ctx2d(c);
    g.scale(ART, ART);
    const { segs, gx } = clothBase(g, w, h, 20 + idx, 62);
    const cx = w / 2;
    const maxW = w - 46 * k;
    // eyebrow + stats in the site's label style: Plex Mono, uppercase, tracked out
    const eb = monoFit("TOP PEEK", 13.5 * k, 4 * k, maxW);
    spray(g, "TOP PEEK", cx, 46 * k, eb.px, INK, {
      align: "center",
      family: labelFam,
      weight: LW,
      ls: eb.ls,
      grain: 0.22,
      blur: 1.5,
      alpha: 0.88,
    });
    // rank numeral
    const num = String(d.rank);
    spray(g, num, cx, 252 * k, fitPx(num, dispFam, DW, 0, 160 * k, w * 0.78), ORANGE, {
      align: "center",
      family: dispFam,
      weight: DW,
      blur: 11 * k,
      cut: STENCIL_CUTS,
    });
    // peek name: one size for all lines of a banner, fitted to the cloth
    const lines = nameLines(d.name, 26 * k, maxW);
    const npx = Math.min(
      ...lines.map((s) => fitPx(s, dispFam, DW, TR, 26 * k, maxW))
    );
    let y = 300 * k;
    lines.forEach((ln) => {
      spray(g, ln, cx, y, npx, INK, {
        align: "center",
        family: dispFam,
        weight: DW,
        ls: TR * npx,
        blur: 3,
        cut: STENCIL_CUTS,
      });
      y += 35 * k;
    });
    y += -35 * k + 28 * k;
    const loc = `${d.map.toUpperCase()} · ${floorAbbrev(d.floor)}`;
    const l1 = monoFit(loc, 12.5 * k, 1.5 * k, maxW);
    spray(g, loc, cx, y, l1.px, INK, {
      align: "center",
      family: labelFam,
      weight: LW,
      ls: l1.ls,
      grain: 0.2,
      blur: 1.2,
      alpha: 0.85,
    });
    // An estimate has no vote count to quote, so say so rather than print "0 VOTES".
    const stat = d.estimate ? "ESTIMATE" : `${d.votes} VOTES · ${d.pct}%`;
    const l2 = monoFit(stat, 11.5 * k, 0.9 * k, maxW);
    spray(g, stat, cx, y + 18 * k, l2.px, INK, {
      align: "center",
      family: labelFam,
      weight: LW,
      ls: l2.ls,
      grain: 0.2,
      blur: 1.2,
      alpha: 0.62,
    });
    // Grade colour is the site's own per-tier colour, keyed on the letter.
    sprayDisc(g, cx, h - 36 * k, 21 * k, gradeTierColor(d.grade), d.grade, 17 * k);
    grommets(g, gx, segs, 8);
    return c;
  }

  function stripArt(): HTMLCanvasElement {
    const { w, h } = STR;
    const c = cnv(w * ART, h * ART);
    const g = ctx2d(c);
    g.scale(ART, ART);
    const { segs, gx } = clothBase(g, w, h, 90, 94);
    const tp = fitPx("TOP PEEKS", dispFam, DW, TR_STRIP, 74, w - 290);
    spray(g, "TOP PEEKS", w / 2, 102, tp, ORANGE, {
      align: "center",
      family: dispFam,
      weight: DW,
      ls: TR_STRIP * tp,
      blur: 7,
      cut: STENCIL_CUTS,
    });
    // stencilled crest at both ends
    [70, w - 70].forEach((x, i) => {
      const s = cnv(90 * ART, 90 * ART);
      const tg = ctx2d(s);
      tg.scale(ART, ART);
      tg.translate(45, 45);
      tg.strokeStyle = INK;
      tg.lineWidth = 6.5;
      tg.lineCap = "round";
      tg.lineJoin = "round";
      tg.shadowColor = rgba(INK, 0.45);
      tg.shadowBlur = 3 * ART;
      const L = 22;
      const q = 8;
      tg.beginPath();
      tg.moveTo(-L, -q);
      tg.lineTo(-L, -L);
      tg.lineTo(-q, -L);
      tg.moveTo(q, -L);
      tg.lineTo(L, -L);
      tg.lineTo(L, -q);
      tg.moveTo(L, q);
      tg.lineTo(L, L);
      tg.lineTo(q, L);
      tg.moveTo(-q, L);
      tg.lineTo(-L, L);
      tg.lineTo(-L, q);
      tg.stroke();
      tg.fillStyle = ORANGE;
      tg.shadowColor = rgba(ORANGE, 0.5);
      tg.beginPath();
      tg.arc(0, 0, 7.5, 0, 7);
      tg.fill();
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.globalCompositeOperation = "destination-out";
      tg.globalAlpha = 0.3;
      tg.fillStyle = tg.createPattern(noise(), "repeat") as CanvasPattern;
      tg.fillRect(0, 0, s.width, s.height);
      g.drawImage(s, x - 45, h / 2 - 45 + 2 + (i ? 1 : -1), 90, 90);
    });
    grommets(g, gx, segs, 8);
    return c;
  }

  // --- scene ---------------------------------------------------------------

  const FLARES: Flare[] = FLARE_SEED.map((f) => ({ ...f }));
  let S: State | null = null;

  function build(): State {
    const root = document.createElement("div");
    // The scene keeps its 1100x800 coordinates; production framing shifts it up
    // 64px inside the 1100x736 stage, so the mock nav strip is simply cut off.
    // (CSS does the shift — see .tifo-scene in globals.css.)
    root.className = "tifo-scene";
    stage.appendChild(root);

    const mk = (
      x: number,
      y: number,
      w: number,
      h: number,
      sc: number,
      z?: number
    ) => {
      const c = document.createElement("canvas");
      c.className = "tifo-canvas";
      c.width = Math.ceil(w * sc);
      c.height = Math.ceil(h * sc);
      c.style.left = x + "px";
      c.style.top = y + "px";
      c.style.width = w + "px";
      c.style.height = h + "px";
      if (z) c.style.zIndex = String(z);
      root.appendChild(c);
      return c;
    };

    // back smoke, drawn at half resolution
    const back = mk(0, NAV_H, W, H - NAV_H, SMOKE);
    // upper-tier rail + posts + ropes
    let posts = "";
    for (let x = 30; x < W; x += 116)
      posts += `<rect x="${x}" y="64" width="7" height="${RAIL_Y - 60}" fill="#1c1d19"/>`;
    let ropes = "";
    geos.forEach((o) => {
      const segs = Math.max(3, Math.round(o.w / 62));
      for (let i = 0; i <= segs; i++) {
        const x = o.cx - o.w / 2 + 9 + (i * (o.w - 18)) / segs;
        ropes += `<path d="M${x} ${RAIL_Y + 3} q2 6 0 ${TOP_Y + 8 - RAIL_Y - 3}" stroke="#8a7b5c" stroke-width="1.6" fill="none"/>`;
      }
    });
    root.insertAdjacentHTML(
      "beforeend",
      `<svg width="${W}" height="140" viewBox="0 0 ${W} 140">${posts}` +
        `<rect x="0" y="${RAIL_Y - 4}" width="${W}" height="8" rx="4" fill="#262822"/>` +
        `<rect x="0" y="${RAIL_Y - 4}" width="${W}" height="1.6" fill="#6d7680"/>${ropes}</svg>`
    );

    // drop banners (cloth canvases)
    const drops: DropSlot[] = geos.map((o, i) => {
      const cw = o.w + 80;
      const chh = o.h + 50;
      const c = mk(o.cx - cw / 2, TOP_Y - 6, cw, chh, CL);
      return {
        o,
        g: ctx2d(c),
        art: dropArt(o, byRank.get(o.rank) as TifoDrop, i),
        ox: 40,
        oy: 6,
        dark: ramp(o.h, "hang", "#000000"),
        lite: ramp(o.h, "hang", "#fff3dc"),
      };
    });

    const front = mk(0, NAV_H, W, H - NAV_H, SMOKE);

    // crowd behind the fence
    const rnd = rng(99);
    let figs = "";
    const figData: Fig[] = [];
    for (let i = 0; i < 20; i++) {
      const x = 40 + i * 53 + (rnd() - 0.5) * 18;
      const hr = 12 + rnd() * 4;
      const y = 594 + rnd() * 16;
      const arm = FLARES.some((f) => f.fig === i) ? "flare" : rnd() < 0.3 ? "up" : "";
      let s = `<g><circle cx="${x}" cy="${y}" r="${hr}"/><path d="M${x - hr * 2.3} ${y + hr * 4} Q${x - hr * 2.2} ${y + hr * 1.1} ${x} ${y + hr * 1.05} Q${x + hr * 2.2} ${y + hr * 1.1} ${x + hr * 2.3} ${y + hr * 4} Z"/>`;
      if (arm === "flare")
        s += `<path d="M${x + hr * 1.3} ${y + hr * 1.6} L${x + hr * 0.3} ${y - hr * 1.2}" stroke="#070807" stroke-width="${hr * 0.9}" stroke-linecap="round"/>`;
      else if (arm === "up") {
        const dir = rnd() < 0.5 ? -1 : 1;
        s += `<path d="M${x + dir * hr * 1.4} ${y + hr * 1.6} L${x + dir * hr * 2.0} ${y - hr * 1.7}" stroke="#070807" stroke-width="${hr * 0.85}" stroke-linecap="round"/>`;
      }
      figs += s + "</g>";
      figData.push({ ph: rnd() * 6.28, f: 1.8 + rnd() * 0.5, a: 3 + rnd() * 6, hr, x, y });
    }
    root.insertAdjacentHTML(
      "beforeend",
      `<svg class="tifo-crowd" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="#070807">${figs}</svg>`
    );
    const figEls = Array.from(
      root.querySelectorAll<SVGGElement>("svg.tifo-crowd > g")
    );

    const tint = document.createElement("div");
    tint.className = "tifo-tint";
    root.appendChild(tint);

    const flares: FlareSlot[] = FLARES.map((f) => {
      const el = document.createElement("div");
      el.className = "tifo-fl";
      el.innerHTML =
        '<div class="tifo-spill"></div><div class="tifo-stick"></div><div class="tifo-halo"></div><div class="tifo-core"></div>';
      root.appendChild(el);
      const fd = figData[f.fig];
      f.x = fd.x + fd.hr * 0.3;
      f.y = fd.y - fd.hr * 1.2 - 8;
      el.style.left = f.x + "px";
      el.style.top = f.y + "px";
      return {
        f,
        el,
        spill: el.querySelector(".tifo-spill") as HTMLElement,
        halo: el.querySelector(".tifo-halo") as HTMLElement,
        core: el.querySelector(".tifo-core") as HTMLElement,
      };
    });

    // fence
    let fposts = "";
    for (let x = 22; x < W; x += 108)
      fposts += `<rect x="${x}" y="${FENCE_Y}" width="8" height="${H - FENCE_Y}" fill="#141512"/>`;
    root.insertAdjacentHTML(
      "beforeend",
      `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fposts}` +
        `<rect x="0" y="${FENCE_Y - 5}" width="${W}" height="9" rx="4.5" fill="#1e1f1b"/>` +
        `<rect x="0" y="${FENCE_Y - 5}" width="${W}" height="1.6" fill="#57402c"/>` +
        `<rect x="0" y="770" width="${W}" height="8" rx="4" fill="#1a1b17"/></svg>`
    );

    const stripCanvas = mk(STR.x - 20, STR.y - 12, STR.w + 40, STR.h + 36, CL);
    const strip: Cloth = {
      g: ctx2d(stripCanvas),
      art: stripArt(),
      ox: 20,
      oy: 12,
      dark: ramp(STR.h, "belly", "#000000"),
      lite: ramp(STR.h, "belly", "#fff3dc"),
    };
    // ties from fence to the striscione grommets
    {
      const segs = Math.max(3, Math.round(STR.w / 94));
      let ties = "";
      for (let i = 0; i <= segs; i++) {
        const x = STR.x + 9 + (i * (STR.w - 18)) / segs;
        ties += `<path d="M${x} ${FENCE_Y + 2} L${x} ${STR.y + 9}" stroke="#8a7b5c" stroke-width="1.6"/>`;
      }
      root.insertAdjacentHTML(
        "beforeend",
        `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="z-index:5">${ties}</svg>`
      );
      stripCanvas.style.zIndex = "4";
    }

    const fx = mk(0, NAV_H, W, H - NAV_H, 1, 6);
    const vig = document.createElement("div");
    vig.className = "tifo-vig";
    vig.style.zIndex = "7";
    root.appendChild(vig);

    return {
      root,
      bg: ctx2d(back),
      fg: ctx2d(front),
      xg: ctx2d(fx),
      drops,
      strip,
      flares,
      tint,
      figEls,
      figData,
      sprites: sprites(),
      smoke: [],
      sparks: [],
      acc: 0,
      simT: 0,
      lastT: 0,
      rnd: rng(2024),
      emit: [],
      stopped: false,
      stopT: 0,
    };
  }

  function reset() {
    if (!S) return;
    S.smoke = [];
    S.sparks = [];
    S.acc = 0;
    S.simT = 0;
    S.lastT = 0;
    S.rnd = rng(2024);
    S.emit = FLARES.map(() => 0).concat([0, 0]);
    S.stopped = false;
    S.stopT = 0;
  }

  function flareLevel(t: number, f: Flare) {
    const u = t - f.t0;
    if (u < 0) return 0;
    const pop = u < 0.12 ? 1.6 : u < 0.3 ? lerp(1.6, 1, (u - 0.12) / 0.18) : 1;
    return pop * (0.86 + 0.14 * Math.sin(t * 31 + f.x) * Math.sin(t * 17.3 + f.y));
  }

  function step(t: number, dt: number) {
    if (!S) return;
    const rnd = S.rnd;
    const wind = 26 + 16 * Math.sin(t * 0.35) + 10 * Math.sin(t * 1.1);
    if (!S.stopped) {
      // emit
      FLARES.forEach((f, i) => {
        if (t < f.t0) return;
        S!.emit[i] += dt * 34;
        while (S!.emit[i] >= 1) {
          S!.emit[i] -= 1;
          S!.smoke.push({
            x: f.x + (rnd() - 0.5) * 6,
            y: f.y - 4,
            vx: (rnd() - 0.5) * 60,
            vy: -120 - rnd() * 60,
            r0: 9 + rnd() * 8,
            r1: 110 + rnd() * 90,
            life: 3.6 + rnd() * 2.2,
            age: 0,
            sp: Math.floor(rnd() * 3),
            front: rnd() < 0.3,
            hot: true,
            ph: rnd() * 6.28,
          });
        }
        const sparkRate = 46;
        const n = dt * sparkRate + (rnd() < (dt * sparkRate) % 1 ? 1 : 0);
        for (let j = 0; j < Math.floor(n); j++) {
          const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2;
          const v = 70 + rnd() * 170;
          S!.sparks.push({
            x: f.x,
            y: f.y - 6,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.35 + rnd() * 0.7,
            age: 0,
            s: 1 + rnd() * 1.6,
          });
        }
      });
      // off-screen smoke banks at the bottom corners keep the stand hazy
      ([[-60, 830], [W + 60, 830]] as const).forEach(([x, y], i) => {
        if (t < 0.2) return;
        S!.emit[2 + i] += dt * 5;
        while (S!.emit[2 + i] >= 1) {
          S!.emit[2 + i] -= 1;
          S!.smoke.push({
            x: x + (rnd() - 0.5) * 60,
            y,
            vx: (i ? -30 : 50) + (rnd() - 0.5) * 30,
            vy: -45 - rnd() * 25,
            r0: 90,
            r1: 260 + rnd() * 90,
            life: 7 + rnd() * 3,
            age: 0,
            sp: Math.floor(rnd() * 3),
            front: rnd() < 0.25,
            hot: false,
            ph: rnd() * 6.28,
          });
        }
      });
    }
    S.smoke.forEach((p) => {
      p.age += dt;
      p.vx +=
        (wind * 0.9 - p.vx) * 0.35 * dt +
        Math.sin(p.y * 0.012 + t * 0.7 + p.ph) * 22 * dt;
      p.vy += (-42 - p.vy) * 0.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    S.smoke = S.smoke.filter((p) => p.age < p.life);
    S.sparks.forEach((s) => {
      s.age += dt;
      s.vy += 260 * dt;
      s.vx *= 0.99;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    });
    S.sparks = S.sparks.filter((s) => s.age < s.life);
  }

  function drawSmoke(g: CanvasRenderingContext2D, front: boolean) {
    if (!S) return;
    g.setTransform(SMOKE, 0, 0, SMOKE, 0, -NAV_H * SMOKE);
    g.clearRect(0, NAV_H, W, H);
    for (const p of S.smoke) {
      if (p.front !== front) continue;
      const u = p.age / p.life;
      const r = p.r0 + (p.r1 - p.r0) * Math.pow(u, 0.55);
      let a = clamp(p.age / 0.25) * Math.pow(1 - u, 1.4) * (front ? 0.42 : 0.8);
      if (p.y < 300) a *= clamp((p.y - 40) / 260);
      const sp = p.sp;
      if (p.hot && p.age < 0.6) {
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = a * (1 - p.age / 0.6) * 0.5;
        g.drawImage(S.sprites.hot[sp], p.x - r, p.y - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = "source-over";
      const warmW = p.hot ? clamp(1 - (p.age - 0.4) / 2.2) : 0.25;
      g.globalAlpha = a * warmW;
      if (warmW > 0.01)
        g.drawImage(S.sprites.warm[sp], p.x - r, p.y - r, r * 2, r * 2);
      g.globalAlpha = a * (1 - warmW) * 0.9;
      g.drawImage(S.sprites.dust[sp], p.x - r, p.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  /**
   * Draw a hanging cloth in `col`-wide columns: each column stretches a touch
   * (wavy hem) and takes fold shading that grows toward the free edge.
   * reveal = how much has unrolled so far.
   */
  function drawCloth(
    g: CanvasRenderingContext2D,
    art: HTMLCanvasElement,
    w: number,
    h: number,
    t: number,
    ph: number,
    amp: number,
    shear: number,
    reveal: number,
    stretch: number,
    ox: number,
    oy: number,
    sh: { dark: HTMLCanvasElement; lite: HTMLCanvasElement },
    col: number
  ) {
    g.setTransform(CL, 0, 0, CL, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.translate(ox, oy);
    g.transform(1, 0, shear, 1, 0, 0);
    const vis = Math.min(reveal, h);
    if (vis > 0.5) {
      for (let x = 0; x < w; x += col) {
        const s = fold(x, t, ph) * amp;
        const hh = vis * (1 + 0.013 * s * (vis / h)) * stretch;
        g.drawImage(art, x * ART, 0, col * ART, vis * ART, x, 0, col + 0.6, hh);
        const a = Math.abs(s);
        if (a > 0.03) {
          g.globalCompositeOperation = "source-atop";
          g.globalAlpha = Math.min(1, a) * (s < 0 ? 0.34 : 0.2);
          g.drawImage(s < 0 ? sh.dark : sh.lite, 0, 0, 2, vis, x, 0, col + 0.6, hh);
          g.globalAlpha = 1;
          g.globalCompositeOperation = "source-over";
        }
      }
    }
    if (reveal < h + 30) {
      // the roll, tied until it is cut loose, then unwinding as it falls
      const full = Math.min(34, 14 + w * 0.05);
      const rh = 10 + (full - 10) * (1 - clamp(reveal / h));
      const y = Math.min(reveal, h) - rh * 0.3;
      const gr = g.createLinearGradient(0, y, 0, y + rh);
      gr.addColorStop(0, "#2e2a23");
      gr.addColorStop(0.25, "#7f7664");
      gr.addColorStop(0.45, "#b3aa95");
      gr.addColorStop(0.65, "#8e8571");
      gr.addColorStop(1, "#2a261f");
      g.globalAlpha = clamp(1 - (reveal - h) / 30);
      g.fillStyle = gr;
      g.beginPath();
      g.roundRect(-3, y, w + 6, rh, 4);
      g.fill();
      // spiral ends
      g.strokeStyle = "rgba(40,34,26,.55)";
      g.lineWidth = 1;
      ([[-3, 1], [w + 3, -1]] as const).forEach(([ex, dir]) => {
        g.beginPath();
        g.ellipse(ex + dir * 2.5, y + rh / 2, 2.5, rh / 2 - 1, 0, 0, 7);
        g.stroke();
        g.beginPath();
        g.ellipse(ex + dir * 2.5, y + rh / 2, 1.2, rh / 4, 0, 0, 7);
        g.stroke();
      });
      if (reveal <= 0.01) {
        g.strokeStyle = "#6e5f45";
        g.lineWidth = 2.2;
        [0.18, 0.5, 0.82].forEach((f) => {
          const x = w * f;
          g.beginPath();
          g.moveTo(x - 3, y - 1);
          g.quadraticCurveTo(x + 2, y + rh / 2, x - 3, y + rh + 1);
          g.stroke();
        });
      }
      g.globalAlpha = 1;
    }
  }

  /** The fixed-step half of a frame: advance the 30 Hz sim by dt. */
  function advance(dt: number) {
    if (!S) return;
    S.acc += Math.min(dt, 0.1);
    while (S.acc >= 1 / 30) {
      S.acc -= 1 / 30;
      S.simT += 1 / 30;
      step(S.simT, 1 / 30);
    }
  }

  function draw(t: number) {
    if (!S) return;
    S.lastT = t;
    // Once the emitters are cut the flare glow dies over FADE seconds; the
    // banners stay hanging.
    const fade = S.stopped ? clamp(1 - (t - S.stopT) / FADE) : 1;

    // flares + light
    let lvSum = 0;
    S.flares.forEach(({ f, el, spill, halo, core }) => {
      const lv = flareLevel(t, f);
      lvSum += Math.min(1, lv);
      el.style.opacity = lv > 0 ? String(fade) : "0";
      halo.style.transform = `scale(${(0.8 + 0.35 * lv).toFixed(3)})`;
      halo.style.opacity = Math.min(1, lv).toFixed(3);
      spill.style.opacity = (0.75 * Math.min(1.2, lv)).toFixed(3);
      core.style.transform = `scale(${(0.9 + 0.2 * Math.sin(t * 40 + f.x)).toFixed(3)})`;
    });
    S.tint.style.opacity = ((lvSum / S.flares.length) * fade).toFixed(3);

    // jumping crowd (starts once the flares are lit)
    const jump = smooth(prog(t, 0.5, 1.4));
    const st = S;
    st.figEls.forEach((g, i) => {
      const fd = st.figData[i];
      const y = -jump * fd.a * Math.abs(Math.sin(Math.PI * fd.f * t + fd.ph));
      g.setAttribute("transform", `translate(0 ${y.toFixed(2)})`);
      st.flares.forEach((fl) => {
        if (fl.f.fig === i) fl.el.style.transform = `translateY(${y.toFixed(2)}px)`;
      });
    });

    drawSmoke(S.bg, false);
    drawSmoke(S.fg, true);

    const gust = 0.5 + 0.3 * Math.sin(t * 0.55) + 0.2 * Math.sin(t * 1.7);
    S.drops.forEach(({ o, g, art, ox, oy, dark, lite }) => {
      const u = prog(t, o.t0, o.t0 + DROP_T);
      const p = u <= 0 ? 0 : Math.min(1, 0.1 * u + 0.9 * u * u);
      const done = o.t0 + DROP_T;
      const reveal = p * (o.h + 30);
      const flap =
        u > 0 && u < 1 ? 1.1 : t > done ? 0.35 + 0.65 * Math.exp(-(t - done) * 1.6) : 0.4;
      const amp = Math.max(flap, 0.28 + 0.28 * gust);
      const shear =
        (0.018 * Math.sin(t * 0.8 + o.ph) + 0.012 * gust) * (t > done ? 1 : p) +
        (t > done ? 0.03 * wobble(t - done, 1.1, 2.4) : 0);
      const stretch = t > done ? 1 + 0.03 * wobble(t - done, 2.4, 5) : 1;
      drawCloth(g, art, o.w, o.h, t, o.ph, amp, shear, reveal, stretch, ox, oy, { dark, lite }, COL_DROP);
    });
    {
      const s = S.strip;
      const u = prog(t, STR.t0, STR.t0 + 0.42);
      const reveal = (u <= 0 ? 0 : Math.min(1, 0.15 * u + 0.85 * u * u)) * (STR.h + 30);
      const done = STR.t0 + 0.42;
      const stretch = t > done ? 1 + 0.04 * wobble(t - done, 2.8, 6) : 1;
      drawCloth(s.g, s.art, STR.w, STR.h, t * 0.8, 1.3, 0.45 + 0.2 * gust, 0, reveal, stretch, s.ox, s.oy, s, COL_STRIP);
    }

    // sparks
    const x = S.xg;
    x.setTransform(1, 0, 0, 1, 0, -NAV_H);
    x.clearRect(0, NAV_H, W, H);
    x.globalCompositeOperation = "lighter";
    for (const s of S.sparks) {
      const u = s.age / s.life;
      x.globalAlpha = (1 - u) * 0.95;
      x.fillStyle = u < 0.3 ? "#fff1c2" : u < 0.6 ? "#ffb04a" : "#ff6a26";
      x.beginPath();
      x.arc(s.x, s.y, s.s * (1 - u * 0.5), 0, 7);
      x.fill();
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
  }

  S = build();
  reset();

  return {
    render(t: number, dt: number) {
      advance(dt);
      draw(t);
    },
    reset,
    drawStill(t: number) {
      reset();
      // Same fixed-step path the live loop takes, so a still at t is the frame
      // the loop would have drawn at t — just without the 30 redraws a second
      // on the way there.
      for (let u = 0; u <= t + 1e-9; u += 1 / 30) advance(1 / 30);
      draw(t);
    },
    stopEmitters() {
      if (!S || S.stopped) return;
      S.stopped = true;
      S.stopT = S.lastT;
    },
    isSettled() {
      if (!S || !S.stopped) return false;
      return (
        S.smoke.length === 0 &&
        S.sparks.length === 0 &&
        S.lastT - S.stopT >= FADE
      );
    },
    destroy() {
      if (!S) return;
      S.root.remove();
      S = null;
    },
  };
}
