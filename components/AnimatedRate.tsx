"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  className?: string;
};

// Big success-rate number with a one-shot 0 → value count-up on mount.
// On subsequent prop changes (e.g. after a vote re-renders the page), the
// number snaps to the new value rather than re-animating from zero.
export function AnimatedRate({ value, className = "" }: Props) {
  const [display, setDisplay] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (hasAnimatedRef.current) {
      setDisplay(value);
      return;
    }
    hasAnimatedRef.current = true;
    const target = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={`tabular-nums ${className}`}>{display}%</span>;
}
