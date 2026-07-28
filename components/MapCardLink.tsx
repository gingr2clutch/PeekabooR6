"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Map-card link with a 180ms CSS exit on click: scale to 0.97, orange border
// flash, orange radial glow blooming from the click point (clipped by the
// card), thumbnail pushed to 1.04. Navigation fires at 120ms (80ms reduced) so
// the motion finishes under the page transition and never gates the route.
// Route is prefetched on hover. Reduced motion → opacity fade only, no transforms.
export function MapCardLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const [exiting, setExiting] = useState(false);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Leave new-tab / modified / non-primary clicks to the browser.
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    e.preventDefault();
    if (exiting) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const el = ref.current;
    if (el && !reduce) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
    }

    // Tell the destination to play its entrance (forward nav only).
    try {
      sessionStorage.setItem("mapcard-enter", "1");
    } catch {}

    setExiting(true);
    window.setTimeout(() => router.push(href), reduce ? 80 : 120);
  }

  return (
    <a
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      className={`${className ?? ""} ${exiting ? "map-card--exiting" : ""}`}
    >
      {children}
    </a>
  );
}
