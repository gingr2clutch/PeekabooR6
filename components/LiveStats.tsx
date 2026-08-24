"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type StatIcon = "eye" | "check" | "pin" | "trophy";

export type StatCell = {
  label: string;
  value: number;
  // Small muted glyph sitting to the left of the number.
  icon?: StatIcon;
  // Teal ping dot after the number (for figures that change, e.g. Peeks/Votes).
  live?: boolean;
  plus?: boolean;
  // When set, the whole cell becomes a subtle link to this route (tappable stat).
  href?: string;
  // Positional order + divider classes for this cell's slot in the 2x2 / row.
  // Kept per-cell so a caller can lay out either the homepage counter (which
  // reshuffles the mobile order via CSS `order`) or the map counter (natural
  // order) without the component knowing which stats it shows.
  cellClass: string;
};

type Props = {
  cells: StatCell[];
  /* Which accent the labels, hover tint and load sweep use. Defaults to the
     site's orange, so every existing caller renders exactly as before; /gadgets
     passes "blue". Both class strings are written out literally because
     Tailwind cannot see an interpolated class name. */
  accent?: "brand" | "blue";
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
  // lg: (>=1024px) takes the number to 2x the mobile 1.125rem so the row holds
  // its own in a full-width card. The digit wheels are sized in `em`, so they
  // scale with the font-size automatically.
  return (
    <span className="text-lg font-bold tabular-nums tracking-tight text-ink sm:text-xl lg:text-[2.25rem]">
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

export function LiveStats({ cells, accent = "brand" }: Props) {
  // SSR + first render show the real values (crawlable, no-JS safe). On mount,
  // drop to 0 pre-paint (no transition); the roll itself waits until the bar
  // is actually on screen, so it isn't spent above the fold before it's seen.
  const [phase, setPhase] = useState<Phase>("final");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const A =
    accent === "blue"
      ? {
          label: "text-blue",
          scan: "via-blue/20",
          hover: "hover:bg-blue/[0.05]",
        }
      : {
          label: "text-brand",
          scan: "via-brand/20",
          hover: "hover:bg-brand/[0.05]",
        };

  // Pre-paint only: zero the digits so the roll has somewhere to start. Bail
  // for reduced-motion, and bail if IntersectionObserver is missing — in both
  // cases phase stays "final" and the real numbers render immediately, so the
  // counters can never get stranded at 0.
  useIsoLayoutEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // final values instantly, no roll
    if (typeof IntersectionObserver !== "function") return;
    setPhase("reset");
  }, []);

  // Roll once, when the bar scrolls into view. Disconnecting on the first hit
  // means it never replays on scroll-up.
  useEffect(() => {
    if (phase !== "reset") return;
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        raf = requestAnimationFrame(() => setPhase("roll"));
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  return (
    <div
      ref={rootRef}
      className="peek-stats elev-md relative w-full overflow-hidden rounded-card border border-border bg-card"
    >
      {/* One-time orange scan-line sweep on load (CSS; off for reduced-motion). */}
      <span
        aria-hidden
        className={`peek-stats-scan pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent to-transparent ${A.scan}`}
      />
      <div className="relative grid grid-cols-2 sm:grid-cols-4">
        {cells.map((c, i) => {
          // Content is identical whether or not the cell links; only the wrapper
          // differs (Link vs div). Padding/flex live on the wrapper so a linked
          // cell's whole area is the tap target.
          const inner = (
            <>
              <div className="flex items-center gap-1.5">
                {c.icon && <StatGlyph icon={c.icon} />}
                <Odometer
                  value={c.value}
                  plus={c.plus ?? false}
                  phase={phase}
                  cellDelay={i * CELL_STAGGER_MS}
                />
                {c.live && (
                  <span
                    className="relative flex h-2 w-2"
                    aria-label="Live"
                    title="Live"
                  >
                    <span className="absolute inline-flex h-full w-full rounded-full bg-teal opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.12em] lg:text-[13px] ${A.label}`}
              >
                {c.label}
              </span>
            </>
          );
          const wrapClass =
            // py-[5px] keeps the mobile card trimmed; lg: adds real vertical
            // breathing room so the desktop row reads as a stats bar.
            "flex h-full flex-col items-center justify-center gap-1 px-4 py-[5px] text-center lg:py-4";
          return (
            <div
              key={c.label}
              // Thin full-length dividers in faint teal-grey; each cell's
              // order + border classes (c.cellClass) lay out the 2x2 / row.
              className={`peek-stats-cell border-[#dfe4dd]/60 ${c.cellClass}`}
              style={{ animationDelay: `${i * CELL_STAGGER_MS}ms` }}
            >
              {c.href ? (
                <Link
                  href={c.href}
                  className={`${wrapClass} rounded-[10px] transition-colors duration-150 motion-safe:active:scale-[0.98] ${A.hover}`}
                >
                  {inner}
                </Link>
              ) : (
                <div className={wrapClass}>{inner}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Small, muted stat glyph (14px). Sits inside the number's line box so it never
// adds height to the trimmed stats card. Secondary/muted so it reads as a quiet
// accent, not a button.
function StatGlyph({ icon }: { icon: StatIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-3.5 w-3.5 shrink-0 fill-none stroke-current text-muted",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (icon) {
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22" />
          <path d="M14 14.7V17c0 .6.5 1 1 1.2C16.1 18.8 17 20.2 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
  }
}
