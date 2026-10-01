/**
 * Option 2 · TIFO — the /top hero, as a framework-free engine.
 *
 * A 1:1 port of tifo-reference.html (light version approved Oct 1 2026, kept
 * in the repo root as the design reference and never imported). Three
 * spray-stencilled canvas banners and a TOP PEEKS strip hang from two dark
 * rods straight on the site's cream page, drop one after another and ripple in
 * the wind.
 *
 * There is no night stadium any more: the two flares, the orange smoke, the
 * sparks, the crowd, the fence and the vignette are gone, and so is the 30 Hz
 * particle sim that drove them. Every frame is now a pure function of scene
 * time, which is why render() needs no dt and a still is just one draw.
 *
 * The frame the cloth hangs ON — both rods, the ropes and the ties — is
 * server-rendered SVG in components/TopTifo.tsx, so it is on screen before this
 * chunk is even fetched. The engine only ever draws the four cloth canvases.
 *
 * What the port deliberately leaves out: the mock nav (R6.nav) and its CSS, the
 * display-font picker table (production has one font config), and the
 * capture/__seek harness. What it adds: a cloth resolution that follows the
 * device instead of being pinned at 1.5.
 *
 * Nothing here injects CSS at runtime — the reference's `.o2` block lives in
 * globals.css under the `.tifo-*` names, the cloth drop shadow included.
 *
 * There are two scenes, chosen by the `layout` option: the 1100 x 800 desktop
 * one and a 780 x 596 phone one. Same banners, same rods, same timing — the
 * phone artwork just says less (rank, name, map, grade), because the eyebrow
 * and the votes line would paint at ~5px there.
 *
 * Coordinates are the reference's scene; see lib/tifo/layout.ts.
 */

import { gradeTierColor } from "@/lib/rate";
import {
  floorAbbrev,
  layoutFor,
  type DropGeo,
  type TifoDrop,
  type TifoLayout,
  type TifoLayoutName,
} from "@/lib/tifo/layout";

const CANVAS = "#e6dfcc";
const ORANGE = "#e9550f";
const INK = "#1c1d1a";

/** Banner art resolution. */
const ART = 2;

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

/** How long a drop takes to unroll once its rope is cut. */
const DROP_T = 0.55;

// --- helpers (R6.rng / clamp / prog / wobble) -------------------------------
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
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
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

type Cloth = {
  g: CanvasRenderingContext2D;
  art: HTMLCanvasElement;
  ox: number;
  oy: number;
  dark: HTMLCanvasElement;
  lite: HTMLCanvasElement;
};
type DropSlot = Cloth & { o: DropGeo };

export type TifoOptions = {
  /** The top three, best first. Missing ranks simply leave their banner out. */
  top3: TifoDrop[];
  /**
   * Which scene to build. The two are the same banners on the same rods with
   * the same timing; they differ in geometry and in how much the artwork says.
   */
  layout: TifoLayoutName;
  /**
   * Ready-to-use CSS family lists (what the page reads out of
   * --font-space-grotesk / --font-plex-mono, with a system fallback appended).
   */
  fonts: { display: string; label: string };
  /**
   * Current stage scale (box width / scene width). Fixes the cloth canvas
   * resolution at min(2, dpr x scale), so a retina desktop gets sharper
   * banners than the reference's hard-coded 1.5 and a small window does not
   * pay for pixels it cannot show.
   */
  scale?: number;
};

export type TifoHandle = {
  /** Draw the frame at scene time t. */
  render(t: number): void;
  /**
   * One deterministic frame at t. The same single draw render() does — with
   * the particle sim gone there is no state to wind forward first — but kept
   * under its own name because the two call sites mean different things by it.
   */
  drawStill(t: number): void;
  destroy(): void;
};

type State = {
  root: HTMLDivElement;
  drops: DropSlot[];
  strip: Cloth;
};

// --- engine ----------------------------------------------------------------

export function createTifo(stage: HTMLElement, opts: TifoOptions): TifoHandle {
  const L: TifoLayout = layoutFor(opts.layout);
  const PH = opts.layout === "phone";
  const dispFam = opts.fonts.display;
  const labelFam = opts.fonts.label;
  const byRank = new Map<number, TifoDrop>(opts.top3.map((d) => [d.rank, d]));
  const geos = L.DROPS.filter((g) => byRank.has(g.rank));
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
    if (PH) return dropArtPhone(o, d, idx);
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

  /**
   * Phone banner: rank numeral, name, map, grade disc. The TOP PEEK eyebrow and
   * the votes line are left off — at this size they would paint at ~5px. Sizes
   * are scene px, so x0.5 on a 390 phone.
   */
  function dropArtPhone(o: DropGeo, d: TifoDrop, idx: number): HTMLCanvasElement {
    const { w, h } = o;
    const c = cnv(w * ART, h * ART);
    const g = ctx2d(c);
    g.scale(ART, ART);
    const { segs, gx } = clothBase(g, w, h, 20 + idx, 62);
    const cx = w / 2;
    // rank numeral
    const capN = d.rank === 1 ? 108 : 94;
    const num = String(d.rank);
    let y = 34 + capN;
    spray(g, num, cx, y, fitPx(num, dispFam, DW, 0, capN, w * 0.78), ORANGE, {
      align: "center",
      family: dispFam,
      weight: DW,
      blur: 10,
      cut: STENCIL_CUTS,
    });
    // peek name: one size for both lines, never more than two
    const capM = 21;
    const maxW = w - 30;
    const lines = nameLines(d.name, capM, maxW);
    const npx = Math.min(
      ...lines.map((s) => fitPx(s, dispFam, DW, TR, capM, maxW))
    );
    y += 26 + capM;
    lines.forEach((ln, i) => {
      spray(g, ln, cx, y, npx, INK, {
        align: "center",
        family: dispFam,
        weight: DW,
        ls: TR * npx,
        blur: 2.5,
        cut: STENCIL_CUTS,
      });
      if (i < lines.length - 1) y += npx * 0.95;
    });
    // map only — no floor, and no votes line
    const map = d.map.toUpperCase();
    const l = monoFit(map, 18, 1.2, w - 34);
    spray(g, map, cx, y + 30, l.px, INK, {
      align: "center",
      family: labelFam,
      weight: LW,
      ls: l.ls,
      grain: 0.2,
      blur: 1.2,
      alpha: 0.85,
    });
    sprayDisc(g, cx, h - 42, 25, gradeTierColor(d.grade), d.grade, 20);
    grommets(g, gx, segs, 8);
    return c;
  }

  function stripArt(): HTMLCanvasElement {
    const { w, h } = L.STR;
    const c = cnv(w * ART, h * ART);
    const g = ctx2d(c);
    g.scale(ART, ART);
    const { segs, gx } = clothBase(g, w, h, 90, 94);
    const tp = fitPx("TOP PEEKS", dispFam, DW, TR_STRIP, PH ? 60 : 74, w - (PH ? 250 : 290));
    spray(g, "TOP PEEKS", w / 2, PH ? 89 : 102, tp, ORANGE, {
      align: "center",
      family: dispFam,
      weight: DW,
      ls: TR_STRIP * tp,
      blur: 7,
      cut: STENCIL_CUTS,
    });
    // stencilled crest at both ends
    const cs = PH ? 76 : 90; // painted at 90 either way, drawn at this size
    (PH ? [58, w - 58] : [70, w - 70]).forEach((x, i) => {
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
      g.drawImage(s, x - cs / 2, h / 2 - cs / 2 + 2 + (i ? 1 : -1), cs, cs);
    });
    grommets(g, gx, segs, 8);
    return c;
  }

  // --- scene ---------------------------------------------------------------

  let S: State | null = null;

  function build(): State {
    const root = document.createElement("div");
    // The scene keeps its 1100x800 coordinates; production framing shifts it up
    // 64px inside the 1100x736 stage, so the mock nav strip is simply cut off.
    // (CSS does the shift — see .tifo-scene in globals.css.)
    root.className = "tifo-scene";
    stage.appendChild(root);

    // Every canvas left in the scene is cloth, so every one of them carries the
    // warm drop shadow the banners hang on. The rods, ropes and ties they hang
    // FROM are server-rendered — the engine never builds them.
    const mk = (x: number, y: number, w: number, h: number) => {
      const c = document.createElement("canvas");
      c.className = "tifo-canvas tifo-cloth";
      c.width = Math.ceil(w * CL);
      c.height = Math.ceil(h * CL);
      c.style.left = x + "px";
      c.style.top = y + "px";
      c.style.width = w + "px";
      c.style.height = h + "px";
      root.appendChild(c);
      return c;
    };

    const drops: DropSlot[] = geos.map((o, i) => {
      const cw = o.w + 80;
      const chh = o.h + 50;
      const c = mk(o.cx - cw / 2, L.TOP_Y - 6, cw, chh);
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

    const strip: Cloth = {
      g: ctx2d(mk(L.STR.x - 20, L.STR.y - 12, L.STR.w + 40, L.STR.h + 36)),
      art: stripArt(),
      ox: 20,
      oy: 12,
      dark: ramp(L.STR.h, "belly", "#000000"),
      lite: ramp(L.STR.h, "belly", "#fff3dc"),
    };

    return { root, drops, strip };
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
      // the roll, tied until it is cut loose, then unwinding as it falls.
      // Canvas-toned, not dark-edged: it sits on the cream page, not a night stage.
      const full = Math.min(34, 14 + w * 0.05);
      const rh = 10 + (full - 10) * (1 - clamp(reveal / h));
      const y = Math.min(reveal, h) - rh * 0.3;
      const gr = g.createLinearGradient(0, y, 0, y + rh);
      gr.addColorStop(0, "#9a907a");
      gr.addColorStop(0.25, "#cfc6af");
      gr.addColorStop(0.45, "#efe8d6");
      gr.addColorStop(0.65, "#d6cdb6");
      gr.addColorStop(1, "#958b75");
      g.globalAlpha = clamp(1 - (reveal - h) / 30);
      g.fillStyle = gr;
      g.beginPath();
      g.roundRect(-3, y, w + 6, rh, 4);
      g.fill();
      // spiral ends
      g.strokeStyle = "rgba(90,78,55,.45)";
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

  /** One frame. Pure in t — there is no sim state left to advance. */
  function draw(t: number) {
    if (!S) return;
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
      const u = prog(t, L.STR.t0, L.STR.t0 + 0.42);
      const reveal = (u <= 0 ? 0 : Math.min(1, 0.15 * u + 0.85 * u * u)) * (L.STR.h + 30);
      const done = L.STR.t0 + 0.42;
      const stretch = t > done ? 1 + 0.04 * wobble(t - done, 2.8, 6) : 1;
      drawCloth(s.g, s.art, L.STR.w, L.STR.h, t * 0.8, 1.3, 0.45 + 0.2 * gust, 0, reveal, stretch, s.ox, s.oy, s, COL_STRIP);
    }
  }

  S = build();

  return {
    render(t: number) {
      draw(t);
    },
    drawStill(t: number) {
      draw(t);
    },
    destroy() {
      if (!S) return;
      S.root.remove();
      S = null;
    },
  };
}
