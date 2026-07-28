"use client";

import { useLayoutEffect, useRef } from "react";

// Adds `.map-entry` before first paint ONLY when the visitor arrived via a
// map-card click (the card sets sessionStorage "mapcard-enter"). Back-nav and
// direct loads leave the flag unset, so nothing animates. useLayoutEffect on a
// client-side nav runs before paint, so there's no flash.
export function MapEntryScope({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem("mapcard-enter")) {
        sessionStorage.removeItem("mapcard-enter");
        ref.current?.classList.add("map-entry");
      }
    } catch {}
  }, []);
  return <div ref={ref}>{children}</div>;
}
