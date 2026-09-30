"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { DROP_GEO, W, dropRect, type TifoDrop } from "@/lib/tifo/layout";
import type { TifoHandle } from "@/lib/tifo/engine";

/**
 * The /top hero: two flares, orange smoke, and the top three hanging as
 * spray-stencilled banners. See tifo-reference.html (repo root) for the
 * approved design and lib/tifo/engine.ts for the scene itself.
 *
 * Everything expensive is deferred. The box, its dark background and the three
 * banner links are server-rendered; the engine is a dynamic import that only
 * happens at md and up, only once the box is near the viewport, and only when
 * the browser is idle. Phones never download it.
 */

/** Seconds of VISIBLE play before the flares are cut and the scene winds down. */
const PLAY_S = 45;
/** Until the banners have dropped, every frame counts; after it, 30fps does. */
const SETTLE_S = 3;
/** Frame the reduced-motion / Save-Data still is taken at (the reference's `still`). */
const STILL_T = 6;

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

export function TopTifo({
  top3,
  className = "",
}: {
  /** The top three, best first. */
  top3: TifoDrop[];
  className?: string;
}) {
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
      scale = Math.min(1, w / W);
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

    // Phones get nothing but the dark box and the three links: no chunk, no
    // canvas, no work during hydration.
    if (!window.matchMedia("(min-width: 768px)").matches) return cleanup;

    // QA hook: /top?tifo_t=4.5 draws exactly the frame
    // tifo-reference.html?t=4.5 draws, and never starts a loop.
    const qs = new URLSearchParams(window.location.search).get("tifo_t");
    const qaT = qs === null ? NaN : parseFloat(qs);
    const qaStill = Number.isFinite(qaT);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Nav).connection?.saveData === true;

    // --- the loop ---------------------------------------------------------
    let t = 0; // scene time
    let visT = 0; // visible play time, which is what the wind-down counts
    let pend = 0; // dt not yet handed to the engine
    let last = 0;
    let other = false; // 30fps toggle
    let inView = false;
    let stopped = false;
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
      pend += dt;
      if (!stopped && visT > PLAY_S) {
        stopped = true;
        e.stopEmitters();
      }
      // Half the frames once the banners are hanging. render() takes the
      // accumulated dt, so the 30 Hz particle sim runs exactly as before.
      other = !other;
      if (t > SETTLE_S && other) return;
      e.render(t, pend);
      pend = 0;
      if (stopped && e.isSettled()) {
        done = true;
        stop();
      }
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
      // Frame 0 straight away — the rolls tied to the rail — so the scene is
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
  }, [top3]);

  const byRank = new Map(top3.map((d) => [d.rank, d]));
  // Tab order follows the ranking, not the left-to-right podium.
  const hits = DROP_GEO.filter((g) => byRank.has(g.rank)).sort(
    (a, b) => a.rank - b.rank
  );

  return (
    <div
      ref={boxRef}
      className={`tifo mx-auto w-full max-w-[1100px] overflow-hidden rounded-card ${className}`}
    >
      <div ref={stageRef} className="tifo-stage">
        <div className="tifo-bg" />
      </div>
      {hits.map((g) => {
        const d = byRank.get(g.rank) as TifoDrop;
        const r = dropRect(g);
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
