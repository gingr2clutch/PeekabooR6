// Canvas engine for Peek Roulette, ported from peek-roulette-final.html.
//
// The wheel math, ball physics and landing logic are a direct port — the
// timings, easing, turn counts and phase boundaries below are the approved
// prototype's values and should not be "tidied". Only the surrounding shape
// changed: this is a framework-free class so the React component stays a thin
// wrapper, and grade colours now come from lib/rate instead of a hardcoded
// three-colour table (see COLOURS note below).

import { gradeTierColor } from "@/lib/rate";

// Pocket count follows the map's peek count, so every peek is its own wedge
// and the face is an honest picture of the pool. Clamped at both ends:
//   • below MIN, a 2- or 3-peek map would draw as a half or third circle and
//     read as a broken pie chart, so the pool repeats to fill the wheel.
//   • above MAX, wedges thin toward a hairline as peeks keep being added, so
//     the face samples a subset (the draw still covers the whole pool).
export const MIN_POCKETS = 6;
export const MAX_POCKETS = 20;

export function pocketCountFor(poolSize: number): number {
  if (poolSize <= 0) return MIN_POCKETS;
  if (poolSize >= MIN_POCKETS) return Math.min(poolSize, MAX_POCKETS);
  // Repeat the pool up to a whole multiple that clears MIN_POCKETS, so
  // duplicates are evenly distributed rather than lopsided.
  return poolSize * Math.ceil(MIN_POCKETS / poolSize);
}

export type RoulettePeek = {
  id: string;
  slug: string;
  name: string;
  floorName: string | null;
  // Full display label from rating() — "S+", "A", "B-", … not just a letter.
  gradeLabel: string;
  // Clip and optional poster frame, mirroring what the peek cards render.
  // poster_url is null on most rows, so video_url is the primary source.
  videoUrl: string | null;
  posterUrl: string | null;
};

/* ------------------------------- sound -------------------------------- */

// Muted by default. AudioContext is created lazily on the first user gesture,
// because browsers refuse to start one without it. The choice persists for the
// session only — a returning visitor is never surprised by sound.
const SOUND_KEY = "peek-roulette-sound";

class RouletteSound {
  on = false;
  private ctx: AudioContext | null = null;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.on = window.sessionStorage.getItem(SOUND_KEY) === "1";
    } catch {
      // Private-mode sessionStorage can throw. Stay muted.
    }
  }

  private ensureCtx() {
    if (this.ctx) return;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    } catch {
      // No Web Audio support — every method below no-ops.
    }
  }

  toggle(): boolean {
    this.ensureCtx();
    this.on = !this.on;
    try {
      window.sessionStorage.setItem(SOUND_KEY, this.on ? "1" : "0");
    } catch {
      // Non-fatal; the toggle still works for this page view.
    }
    if (this.on) this.chime();
    return this.on;
  }

  // Short square blip. Fires per pocket-pass, throttled by the caller so the
  // cadence slows as the wheel does.
  tick() {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = 1250;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.035);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 0.04);
  }

  // Two-note landing chime (G5 then D6).
  chime() {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const [freq, delay] of [
      [784, 0],
      [1175, 0.09],
    ] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(0.14, t + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.5);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t + delay);
      o.stop(t + delay + 0.55);
    }
  }
}

// One instance per page: the felt bar and any modal share a mute state, so
// toggling in one place applies everywhere.
export const rouletteSound = new RouletteSound();

/* ------------------------------- wheel -------------------------------- */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// `mini` is the homepage lure: thinner rim, larger hub, tighter ball orbit,
// and no top pointer. It no longer affects labelling — pockets are colour-only
// at every size.
export type WheelOptions = { mini?: boolean };

export class RouletteWheel {
  private ctx: CanvasRenderingContext2D;
  private W: number;
  private H: number;
  private R: number;
  private mini: boolean;
  // Set per-pool in setPool, since the pocket count now varies by map.
  private pockets = MIN_POCKETS;
  private seg = (2 * Math.PI) / MIN_POCKETS;

  private rot = 0;
  private ballA = -Math.PI / 2;
  private ballR: number;
  private ballShow = false;

  private face: RoulettePeek[] = [];
  private pool: RoulettePeek[] = [];

  spinning = false;
  private idle = false;
  private raf = 0;

  constructor(canvas: HTMLCanvasElement, pool: RoulettePeek[], opts: WheelOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;

    // DPR-scale for crispness, capped at 2 — beyond that the pixel cost buys
    // nothing visible and hurts on low-end phones.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width;
    const h = canvas.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    this.W = w;
    this.H = h;
    this.R = Math.min(w, h) / 2 - 3;
    this.mini = !!opts.mini;
    this.ballR = this.R - 10;

    this.setPool(pool);
    this.draw();
  }

  // Build the face: one pocket per peek, so a wedge IS a peek rather than a
  // sample of one. The winner-planting argument the prototype needed is gone —
  // with a 1:1 face, picking a uniform random pocket already is a uniform
  // random peek, so spin() just reads face[winIdx].
  setPool(pool: RoulettePeek[]) {
    this.pool = pool;
    this.pockets = pocketCountFor(pool.length);
    this.seg = (2 * Math.PI) / this.pockets;

    const face: RoulettePeek[] = [];
    if (pool.length > 0) {
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      // Above MAX_POCKETS this truncates; below MIN_POCKETS the modulo repeats
      // the pool evenly. In the common case it is an exact 1:1 mapping.
      for (let i = 0; i < this.pockets; i++) face.push(shuffled[i % shuffled.length]);
    }
    this.face = face;
  }

  draw() {
    const { ctx, W, H, R } = this;
    const cx = W / 2;
    const cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    if (this.face.length === 0) return;

    // Gold rim.
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 7);
    const rim = ctx.createRadialGradient(
      cx, cy, R - (this.mini ? 5 : 9),
      cx, cy, R
    );
    rim.addColorStop(0, "#8a6a2c");
    rim.addColorStop(0.5, "#d8b45e");
    rim.addColorStop(1, "#7a5c25");
    ctx.fillStyle = rim;
    ctx.fill();

    // Pockets. COLOURS: the prototype hardcoded three (A/B/C) because its
    // stand-in data only had three grades. Real peeks reach S/D/F too, and
    // collapsing those into A/C would merge distinct tiers, so this asks
    // lib/rate for the tier colour instead. B is identical either way.
    const rIn = R - (this.mini ? 5 : 9);
    for (let i = 0; i < this.pockets; i++) {
      const a0 = -Math.PI / 2 + i * this.seg + this.rot;
      const a1 = a0 + this.seg;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rIn, a0, a1);
      ctx.closePath();
      ctx.fillStyle = gradeTierColor(this.face[i].gradeLabel);
      ctx.fill();
      ctx.strokeStyle = "rgba(18,28,20,.5)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Felt hub.
    const hubR = rIn * (this.mini ? 0.42 : 0.33);
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 7);
    const hub = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, hubR);
    hub.addColorStop(0, "#1c5540");
    hub.addColorStop(1, "#0d2b21");
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.strokeStyle = "rgba(201,162,75,.6)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Ball.
    if (this.ballShow) {
      const bx = cx + Math.cos(this.ballA) * this.ballR;
      const by = cy + Math.sin(this.ballA) * this.ballR;
      ctx.beginPath();
      ctx.arc(bx, by, R * 0.06, 0, 7);
      const bg = ctx.createRadialGradient(bx - 1.5, by - 1.5, 0.5, bx, by, R * 0.065);
      bg.addColorStop(0, "#fff");
      bg.addColorStop(1, "#d6c9ad");
      ctx.fillStyle = bg;
      ctx.shadowColor = "rgba(0,0,0,.45)";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Top pointer — the reference the landing math targets.
    if (!this.mini) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - R - 1);
      ctx.lineTo(cx - 6, cy - R + 10);
      ctx.lineTo(cx + 6, cy - R + 10);
      ctx.closePath();
      ctx.fillStyle = "#f4ecdd";
      ctx.strokeStyle = "#a5813a";
      ctx.lineWidth = 1.3;
      ctx.fill();
      ctx.stroke();
    }
  }

  startIdle() {
    // Reduced motion kills ambient rotation outright — one static draw.
    if (prefersReducedMotion()) {
      this.draw();
      return;
    }
    if (this.idle) return;
    this.idle = true;
    const loop = () => {
      if (!this.idle) return;
      this.rot += 0.01;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stopIdle() {
    this.idle = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stopIdle();
    cancelAnimationFrame(this.raf);
  }

  /**
   * Reshuffles the face, then lands on a uniformly random pocket. With one
   * peek per pocket that is a uniform draw over the pool, so the result is
   * still pure random — and unlike the planted-winner approach it cannot
   * disagree with what the wedge shows.
   *
   * The two clamped cases stay fair for the same reason: below MIN_POCKETS the
   * pool is repeated a whole number of times, so every peek holds an equal
   * share of pockets; above MAX_POCKETS the face is a fresh random sample each
   * spin, so every peek is equally likely to be on it.
   */
  spin(done: (winner: RoulettePeek) => void) {
    if (this.spinning || this.pool.length === 0) return;
    this.spinning = true;
    this.stopIdle();

    this.setPool(this.pool);
    const winIdx = Math.floor(Math.random() * this.pockets);
    const winner = this.face[winIdx];

    // A pocket centre sits under the top pointer when rot = -winIdx*seg - seg/2.
    const target = -winIdx * this.seg - this.seg / 2;

    if (prefersReducedMotion()) {
      this.rot = target;
      this.ballShow = true;
      this.ballA = -Math.PI / 2;
      this.ballR = this.R * 0.52;
      this.draw();
      this.spinning = false;
      rouletteSound.chime();
      done(winner);
      return;
    }

    const start = this.rot;
    const base = start + 5 * 2 * Math.PI; // five full turns before settling
    const delta = (((target - base) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const rotEnd = base + delta;

    // Ball orbits the opposite way. Start and end are both -PI/2 separated by
    // a whole number of turns, so the eased angle arrives exactly on the top
    // pointer at t=1 with no correction needed — the wheel has already brought
    // the winning pocket under that same point.
    const BALL_TURNS = 7;
    const bStart = -Math.PI / 2;
    const bEnd = bStart - BALL_TURNS * 2 * Math.PI;
    const rOut = this.R - (this.mini ? 6 : 10);
    const rMid = this.R * 0.52;

    const dur = 3600;
    const t0 = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    this.ballShow = true;
    let lastTick = 0;

    const step = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      const e = ease(t);

      this.rot = start + (rotEnd - start) * e;
      this.ballA = bStart + (bEnd - bStart) * e;
      // Rides the outer rim to 70%, then drops inward over the last 30%.
      this.ballR = t < 0.7 ? rOut : rOut + (rMid - rOut) * ease((t - 0.7) / 0.3);
      // No final-settle correction. The prototype lerped ballA toward -PI/2
      // over the last 10%, but ballA is a multi-turn accumulated angle (~-44
      // rad near the end) while the target is ~-1.57 — blending between them
      // whipped the ball through several positions, which is the stutter. The
      // turn count above makes the landing exact by construction instead.

      // Tick cadence stretches from 40ms to 260ms as the wheel slows.
      const spd = 1 - e;
      if (now - lastTick > 40 + 220 * e && spd > 0.02) {
        rouletteSound.tick();
        lastTick = now;
      }

      this.draw();

      if (t < 1) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.rot = target;
        this.ballA = -Math.PI / 2;
        this.ballR = rMid;
        this.draw();
        this.spinning = false;
        rouletteSound.chime();
        done(winner);
      }
    };

    this.raf = requestAnimationFrame(step);
  }
}
