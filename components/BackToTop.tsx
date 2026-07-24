"use client";

import { useEffect, useState } from "react";

// A small circular "scroll to top" control that fades in after the reader has
// gone ~2 viewport heights down and back out near the top. It only toggles its
// OWN opacity in response to scroll — no content/card/row is animated on scroll,
// so scrolling stays perfectly stable. Pinned above the anchored ad slot so it
// never overlaps it (bottom-24 clears a standard bottom anchor unit).
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShow(window.scrollY > window.innerHeight * 2);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      className={`fixed bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-ink transition-opacity duration-300 ease-out hover:border-brand hover:text-brand elev-card ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-none stroke-current"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
