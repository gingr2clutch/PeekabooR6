"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  mapsLive: number;
  gradedPeeks: number;
  communityVotes: number;
  sTierPeeks: number;
};

const COUNT_MS = 1200; // count-up duration per cell
const STAGGER_MS = 140; // delay between cells

// useLayoutEffect on the client (runs before paint, so the reset-to-0 happens
// without a flash of the final number), useEffect on the server render (avoids
// React's "useLayoutEffect does nothing on the server" warning).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function LiveStats({
  mapsLive,
  gradedPeeks,
  communityVotes,
  sTierPeeks,
}: Props) {
  const cells = [
    { label: "Maps live", value: mapsLive, live: false },
    { label: "Graded peeks", value: gradedPeeks, live: true },
    { label: "Community votes", value: communityVotes, live: true },
    { label: "S-tier peeks", value: sTierPeeks, live: false },
  ];

  // SSR + first client render show the real values (crawlable, no-JS safe).
  const [display, setDisplay] = useState<number[]>(() => [
    mapsLive,
    gradedPeeks,
    communityVotes,
    sTierPeeks,
  ]);
  const rafRef = useRef<number | null>(null);

  useIsoLayoutEffect(() => {
    const targets = [mapsLive, gradedPeeks, communityVotes, sTierPeeks];
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // keep the final values, no animation

    setDisplay(targets.map(() => 0));
    let startTs: number | null = null;
    const tick = (now: number) => {
      if (startTs === null) startTs = now;
      let done = true;
      const next = targets.map((target, i) => {
        const t = Math.min(
          1,
          Math.max(0, (now - (startTs as number) - i * STAGGER_MS) / COUNT_MS)
        );
        if (t < 1) done = false;
        return Math.round(easeOutCubic(t) * target);
      });
      setDisplay(next);
      if (!done) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mapsLive, gradedPeeks, communityVotes, sTierPeeks]);

  return (
    <div className="peek-stats relative w-full overflow-hidden rounded-card border border-border bg-card">
      {/* One-time orange scan-line sweep on load (CSS; off for reduced-motion). */}
      <span
        aria-hidden
        className="peek-stats-scan pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-brand/20 to-transparent"
      />
      <div className="relative grid grid-cols-2 sm:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className="peek-stats-cell flex flex-col items-center justify-center gap-1 border-border px-4 py-5 text-center [&:nth-child(n+3)]:border-t sm:[&:not(:first-child)]:border-l sm:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l"
            style={{ animationDelay: `${i * STAGGER_MS}ms` }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold tabular-nums tracking-tight text-ink sm:text-3xl">
                {display[i].toLocaleString("en-US")}
              </span>
              {c.live && (
                <span
                  className="relative flex h-2 w-2"
                  aria-label="Live"
                  title="Live"
                >
                  <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
