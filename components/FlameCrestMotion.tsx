"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Pauses the crest's animations while the header is off screen.
//
// This exists ONLY to flip a data attribute. The flames themselves are the
// server-rendered SVG passed in as `children` — React keeps a server
// component's output server-rendered when it is handed to a client component
// as a slot, so nothing about the fire's markup moves into the client bundle.
//
// `paused` starts false on both the server and the first client render, so the
// attribute matches on hydration. The observer only ever downgrades it.
export function FlameCrestMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="arena-crest"
      data-paused={paused ? "true" : "false"}
      aria-hidden
    >
      {children}
    </div>
  );
}
