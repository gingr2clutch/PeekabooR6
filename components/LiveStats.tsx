"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type Props = {
  mapsLive: number;
  gradedPeeks: number;
  communityVotes: number;
  sTierPeeks: number;
};

const ROLL_MS = 1100; // roll duration per digit
const CELL_STAGGER_MS = 130; // delay between the 4 cells
const DIGIT_STAGGER_MS = 55; // delay between digits within a number

// Two 0-9 sequences: a digit rolls a full turn (0→9) then lands on its target
// in the second sequence, so every wheel gets a satisfying spin.
const ROLL_DIGITS = Array.from({ length: 20 }, (_, i) => i % 10);

// useLayoutEffect on the client (runs before paint, so the drop-to-0 happens
// without a flash of the final value); useEffect during SSR (avoids React's
// "useLayoutEffect does nothing on the server" warning).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Phase = "final" | "reset" | "roll";

function DigitRoll({
  digit,
  atZero,
  animate,
  delay,
}: {
  digit: number;
  atZero: boolean;
  animate: boolean;
  delay: number;
}) {
  const y = atZero ? 0 : 10 + digit; // target sits in the 2nd 0-9 sequence
  return (
    <span className="inline-block h-[1em] overflow-hidden">
      <span
        className="flex flex-col"
        style={{
          transform: `translateY(-${y}em)`,
          transition: animate
            ? `transform ${ROLL_MS}ms cubic-bezier(0.2, 0.75, 0.25, 1) ${delay}ms`
            : "none",
        }}
      >
        {ROLL_DIGITS.map((n, i) => (
          <span
            key={i}
            className="flex h-[1em] items-center justify-center leading-none"
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

function Odometer({
  value,
  plus,
  phase,
  cellDelay,
}: {
  value: number;
  plus: boolean;
  phase: Phase;
  cellDelay: number;
}) {
  const chars = value.toLocaleString("en-US").split("");
  const atZero = phase === "reset";
  const animate = phase === "roll";
  let d = 0;
  return (
    <span className="text-2xl font-bold tabular-nums tracking-tight text-ink sm:text-3xl">
      {/* Real value for screen readers + crawlers; the rolling glyphs below are
          decorative. */}
      <span className="sr-only">
        {value.toLocaleString("en-US")}
        {plus ? "+" : ""}
      </span>
      <span aria-hidden className="inline-flex items-center leading-none">
        {chars.map((ch, i) => {
          if (ch >= "0" && ch <= "9") {
            const delay = cellDelay + d * DIGIT_STAGGER_MS;
            d += 1;
            return (
              <DigitRoll
                key={i}
                digit={Number(ch)}
                atZero={atZero}
                animate={animate}
                delay={delay}
              />
            );
          }
          return (
            <span key={i} className="inline-flex h-[1em] items-center">
              {ch}
            </span>
          );
        })}
        {plus && <span className="inline-flex h-[1em] items-center">+</span>}
      </span>
    </span>
  );
}

export function LiveStats({
  mapsLive,
  gradedPeeks,
  communityVotes,
  sTierPeeks,
}: Props) {
  const cells = [
    { label: "Maps", value: mapsLive, live: false, plus: false },
    { label: "Peeks", value: gradedPeeks, live: false, plus: false },
    { label: "Votes", value: communityVotes, live: false, plus: false },
    { label: "S-Tier", value: sTierPeeks, live: false, plus: false },
  ];

  // SSR + first render show the real values (crawlable, no-JS safe). On mount,
  // drop to 0 pre-paint (no transition) then roll each odometer up to target.
  const [phase, setPhase] = useState<Phase>("final");

  useIsoLayoutEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // final values instantly, no roll
    setPhase("reset");
    const id = requestAnimationFrame(() => setPhase("roll"));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="peek-stats relative w-full overflow-hidden">
      {/* One-time orange scan-line sweep on load (CSS; off for reduced-motion). */}
      <span
        aria-hidden
        className="peek-stats-scan pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-brand/20 to-transparent"
      />
      <div className="relative grid grid-cols-2 sm:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.label}
            // Short, low-opacity divider (centered, ~44% tall) on the left of
            // every cell except the first in its row — none after the last.
            // Mobile (2 cols): even cells; desktop (4 cols): all but the first.
            className="peek-stats-cell relative flex flex-col items-center justify-center gap-1 px-4 py-4 text-center before:pointer-events-none before:absolute before:left-0 before:top-1/2 before:hidden before:h-[44%] before:w-px before:-translate-y-1/2 before:bg-ink/10 before:content-[''] [&:nth-child(even)]:before:block sm:[&:not(:first-child)]:before:block"
            style={{ animationDelay: `${i * CELL_STAGGER_MS}ms` }}
          >
            <div className="flex items-center gap-1.5">
              <Odometer
                value={c.value}
                plus={c.plus}
                phase={phase}
                cellDelay={i * CELL_STAGGER_MS}
              />
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
