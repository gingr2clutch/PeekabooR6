"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// The scroll container and its dots. Everything visible inside is passed in as
// `children` and stays server-rendered — this component exists only to track
// which card is centred and to scroll to one when a dot is tapped.
//
// IntersectionObserver, not a scroll listener: the browser reports the crossing
// on its own thread, so swiping never runs our JS per frame. There is one
// observer for the whole row.
export function TopThreeScroller({
  children,
  count,
  accent,
  label = "Top three",
}: {
  children: ReactNode;
  count: number;
  /** dot colour for the active card — brand on /top, gem teal on /underrated */
  accent: string;
  label?: string;
}) {
  const rowRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof IntersectionObserver === "undefined") return;
    const cards = Array.from(row.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        // Most-visible card wins, so a half-swipe does not flicker the dots.
        let best: { i: number; ratio: number } | null = null;
        for (const e of entries) {
          const i = cards.indexOf(e.target as HTMLElement);
          if (i < 0) continue;
          if (!best || e.intersectionRatio > best.ratio) {
            best = { i, ratio: e.intersectionRatio };
          }
        }
        if (best && best.ratio > 0.5) setActive(best.i);
      },
      { root: row, threshold: [0.5, 0.75, 1] }
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  function goTo(i: number) {
    const row = rowRef.current;
    const card = row?.children[i] as HTMLElement | undefined;
    if (!row || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left: card.offsetLeft - row.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="t3">
      <ul ref={rowRef} className="t3-row" aria-label={label}>
        {children}
      </ul>
      <div className="t3-footer">
        <div className="t3-dots">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to number ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`t3-dot${i === active ? " t3-dot--on" : ""}`}
              style={i === active ? { backgroundColor: accent } : undefined}
            />
          ))}
        </div>
        <span className="t3-hint" aria-hidden>
          Swipe for #2 and #3 →
        </span>
      </div>
    </div>
  );
}
