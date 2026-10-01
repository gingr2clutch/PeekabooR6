"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  dropRect,
  layoutFor,
  type DropGeo,
  type TifoDrop,
  type TifoLayout,
  type TifoLayoutName,
} from "@/lib/tifo/layout";
import type { TifoHandle } from "@/lib/tifo/engine";

/**
 * The /top hero: the top three hanging as spray-stencilled canvas banners from
 * two dark rods, straight on the page's own cream. See tifo-reference.html
 * (repo root) for the approved design and lib/tifo/engine.ts for the scene.
 *
 * No flares and no smoke any more — the night stadium is gone, so the only
 * moving parts left are the four cloth canvases.
 *
 * The frame the cloth hangs on is server-rendered: both rods, the ropes, the
 * ties and the three banner links are in the HTML, so the scene is on screen
 * before any JS runs and the hero is three crawlable, keyboard-reachable links
 * with JS off. The engine is a dynamic import that only happens once the box
 * is near the viewport, and only when the browser is idle.
 *
 * The page mounts this twice — a phone scene below md and a desktop one at md
 * and up — but each instance bails out immediately at the width it is not for,
 * so a visit downloads and runs at most ONE scene.
 */

/**
 * Seconds of VISIBLE play before the scene draws its last frame and stops.
 * Desktop keeps swaying in the wind for a while; a phone plays the drop and
 * settles, and is never worth 45s of a battery.
 */
const PLAY_S = { desktop: 45, phone: 3.5 };
/**
 * Until the banners have dropped, every frame counts; after it, 30fps does.
 * The phone scene is over before this would bite, so it never halves.
 */
const SETTLE_S = { desktop: 3, phone: Infinity };
/** Frame the reduced-motion / Save-Data still is taken at (the reference's `still`). */
const STILL_T = 6;

/** The rod, and the cord the cloth hangs off it by — the reference's initBare(). */
const ROD = "#2b2c27";
const ROD_HI = "#6f716a";
const CORD = "#8a7b5c";

type Nav = Navigator & { connection?: { saveData?: boolean } };

/**
 * Wait for the two painted weights, but never hang on them: a blocked font file
 * must not mean a blank hero, so the art is painted with whatever is available
 * after 3.5s.
 */
function fontsReady(specs: string[]): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.race([
    Promise.all(
      specs.map((s) =>
        Promise.resolve()
          .then(() => document.fonts.load(s))
          .catch(() => null)
      )
    ),
    new Promise((r) => setTimeout(r, 3500)),
  ]);
}

/** One rod with round finials, exactly as the reference's rod() draws it. */
function Rod({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  return (
    <>
      <rect x={x0} y={y - 4} width={x1 - x0} height={8} rx={4} fill={ROD} />
      <rect
        x={x0 + 4}
        y={y - 3.4}
        width={x1 - x0 - 8}
        height={1.4}
        rx={0.7}
        fill={ROD_HI}
        opacity={0.7}
      />
      <circle cx={x0} cy={y} r={8} fill={ROD} />
      <circle cx={x1} cy={y} r={8} fill={ROD} />
      <circle cx={x0 - 2} cy={y - 2.5} r={2.2} fill={ROD_HI} opacity={0.6} />
      <circle cx={x1 - 2} cy={y - 2.5} r={2.2} fill={ROD_HI} opacity={0.6} />
    </>
  );
}

/**
 * The cords from the top rod to each banner's grommets. Only for banners that
 * exist: a missing rank leaves its rod span bare rather than hanging cords off
 * nothing.
 */
function ropePaths(L: TifoLayout, geos: readonly DropGeo[]) {
  const out: string[] = [];
  geos.forEach((o) => {
    const segs = Math.max(3, Math.round(o.w / 62));
    for (let i = 0; i <= segs; i++) {
      const x = o.cx - o.w / 2 + 9 + (i * (o.w - 18)) / segs;
      out.push(`M${x} ${L.RAIL_Y + 3} q2 6 0 ${L.TOP_Y + 8 - L.RAIL_Y - 3}`);
    }
  });
  return out;
}

/** The ties from the bottom rod down to the TOP PEEKS strip. */
function tiePaths(L: TifoLayout) {
  const out: string[] = [];
  const segs = Math.max(3, Math.round(L.STR.w / 94));
  for (let i = 0; i <= segs; i++) {
    const x = L.STR.x + 9 + (i * (L.STR.w - 18)) / segs;
    out.push(`M${x} ${L.FENCE_Y + 2} L${x} ${L.STR.y + 9}`);
  }
  return out;
}

export function TopTifo({
  top3,
  layout = "desktop",
  className = "",
}: {
  /** The top three, best first. */
  top3: TifoDrop[];
  /** Which scene to hang. Below md the page asks for "phone". */
  layout?: TifoLayoutName;
  className?: string;
}) {
  const phone = layout === "phone";
  const L = layoutFor(layout);
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const stage = stageRef.current;
    if (!box || !stage) return;

    // --- scale ------------------------------------------------------------
    // The box's height comes from an aspect-ratio, never from JS, so this can
    // never shift the page. Below md the box is display:none and clientWidth is
    // 0 — leave the last good scale alone rather than collapse the stage.
    let scale = 1;
    const fit = () => {
      const w = box.clientWidth;
      if (!w) return;
      scale = Math.min(1, w / L.W);
      stage.style.transform = `scale(${scale})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);

    let dead = false;
    let engine: TifoHandle | null = null;
    let raf = 0;
    let idleId = 0;
    let idleIsRIC = false;
    let loadIO: IntersectionObserver | null = null;
    let playIO: IntersectionObserver | null = null;
    let onVis: (() => void) | null = null;

    const cleanup = () => {
      dead = true;
      ro.disconnect();
      loadIO?.disconnect();
      playIO?.disconnect();
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      if (raf) cancelAnimationFrame(raf);
      if (idleId) {
        if (idleIsRIC) window.cancelIdleCallback(idleId);
        else clearTimeout(idleId);
      }
      engine?.destroy();
      engine = null;
    };

    // One scene per device. The desktop instance runs only at md and up and the
    // phone one only below it, so the wrong one costs nothing but its
    // server-rendered frame: no chunk, no canvas, no work during hydration.
    if (window.matchMedia("(min-width: 768px)").matches === phone) return cleanup;

    // QA hook: /top?tifo_t=4.5 draws exactly the frame
    // tifo-reference.html?t=4.5 draws, and never starts a loop.
    const qs = new URLSearchParams(window.location.search).get("tifo_t");
    const qaT = qs === null ? NaN : parseFloat(qs);
    const qaStill = Number.isFinite(qaT);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Nav).connection?.saveData === true;

    // --- the loop ---------------------------------------------------------
    const playS = phone ? PLAY_S.phone : PLAY_S.desktop;
    const settleS = phone ? SETTLE_S.phone : SETTLE_S.desktop;
    let t = 0; // scene time
    let visT = 0; // visible play time, which is what the wind-down counts
    let last = 0;
    let other = false; // 30fps toggle
    let inView = false;
    let done = false;

    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const start = () => {
      if (raf || done || !engine) return;
      // Resume from the clock we paused on, so pausing never jumps the scene.
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const playable = () => !done && inView && !document.hidden;

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      const e = engine;
      if (!e) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      visT += dt;
      // Wind-down: one last frame, and the loop is finished for good. The
      // banners just keep hanging in it.
      if (visT > playS) {
        done = true;
        e.render(t);
        stop();
        return;
      }
      // Half the frames once the banners are hanging.
      other = !other;
      if (t > settleS && other) return;
      e.render(t);
    }

    const play = () => {
      playIO = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            inView = e.isIntersecting;
          });
          if (playable()) start();
          else stop();
        },
        { threshold: 0 }
      );
      playIO.observe(box);
      onVis = () => {
        if (playable()) start();
        else stop();
      };
      document.addEventListener("visibilitychange", onVis);
    };

    const load = async () => {
      if (dead) return;
      // The painted fonts are the page's own, read off the box so there is one
      // source of truth. An empty variable falls back to the system stack and
      // the scene still renders.
      const cs = getComputedStyle(box);
      const fam = (v: string, fb: string) => {
        const s = cs.getPropertyValue(v).trim();
        return s ? `${s}, ${fb}` : fb;
      };
      const display = fam("--font-space-grotesk", "system-ui, sans-serif");
      const label = fam("--font-plex-mono", "ui-monospace, monospace");

      const [mod] = await Promise.all([
        import("@/lib/tifo/engine"),
        fontsReady([`700 40px ${display}`, `600 12px ${label}`]),
      ]);
      if (dead) return;
      engine = mod.createTifo(stage, {
        top3,
        layout,
        fonts: { display, label },
        scale,
      });
      if (qaStill) {
        engine.drawStill(qaT);
        return;
      }
      if (reduce || saveData) {
        engine.drawStill(STILL_T);
        return;
      }
      // Frame 0 straight away — the rolls tied to the rod — so the scene is
      // never a half-built stand while we wait to be scrolled into view.
      engine.drawStill(0);
      play();
    };

    const whenIdle = (fn: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        idleIsRIC = true;
        idleId = window.requestIdleCallback(fn, { timeout: 2000 });
      } else {
        idleIsRIC = false;
        idleId = window.setTimeout(fn, 200);
      }
    };

    loadIO = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        loadIO?.disconnect();
        loadIO = null;
        whenIdle(() => {
          void load();
        });
      },
      { rootMargin: "200px" }
    );
    loadIO.observe(box);

    return cleanup;
  }, [L, layout, phone, top3]);

  const byRank = new Map(top3.map((d) => [d.rank, d]));
  const present = L.DROPS.filter((g) => byRank.has(g.rank));
  // Tab order follows the ranking, not the left-to-right podium.
  const hits = present.slice().sort((a, b) => a.rank - b.rank);
  // The viewBox is the VISIBLE stage, so the frame lines up with the scaled
  // stage at every width without a line of layout JS.
  const viewBox = `0 ${L.NAV_H} ${L.W} ${L.VIEW_H}`;

  return (
    <div
      ref={boxRef}
      className={`tifo overflow-hidden ${
        phone ? "tifo--phone w-full" : "mx-auto w-full max-w-[1100px]"
      } ${className}`}
    >
      {/* Top rod + cords: under the drops, so the cord ends disappear behind
          the cloth exactly as they do in the reference. */}
      <svg className="tifo-frame tifo-frame--back" viewBox={viewBox} aria-hidden>
        <Rod x0={L.RODX[0]} x1={L.RODX[1]} y={L.RAIL_Y} />
        {ropePaths(L, present).map((d, i) => (
          <path key={i} d={d} stroke={CORD} strokeWidth={1.6} fill="none" />
        ))}
      </svg>
      <div ref={stageRef} className="tifo-stage" />
      {/* Bottom rod + ties: over the strip, so the ties cross its top hem. */}
      <svg className="tifo-frame tifo-frame--front" viewBox={viewBox} aria-hidden>
        <Rod x0={L.STR.x - 14} x1={L.STR.x + L.STR.w + 14} y={L.FENCE_Y} />
        {tiePaths(L).map((d, i) => (
          <path key={i} d={d} stroke={CORD} strokeWidth={1.6} />
        ))}
      </svg>
      {hits.map((g) => {
        const d = byRank.get(g.rank) as TifoDrop;
        const r = dropRect(g, L);
        return (
          <Link
            key={d.slug}
            href={`/peeks/${d.slug}`}
            aria-label={`#${d.rank} ${d.name}, ${d.map} ${d.floor}, grade ${d.grade}`}
            className="tifo-hit"
            style={{
              left: `${r.left}%`,
              top: `${r.top}%`,
              width: `${r.width}%`,
              height: `${r.height}%`,
            }}
          />
        );
      })}
    </div>
  );
}
