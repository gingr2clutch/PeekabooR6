"use client";

import { useRef } from "react";

type Props = {
  href: string;
};

// Filled orange CTA on the map landing page. The dice idles with a subtle
// periodic wobble, tumbles on hover (desktop), and spins on tap. Navigation
// is the anchor's default behavior — the spin starts in parallel and is
// cut off by the page transition, which is exactly what we want.
export function RandomPeekButton({ href }: Props) {
  const diceRef = useRef<HTMLSpanElement>(null);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Modifier-clicks open in a new tab — let those pass through untouched.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const el = diceRef.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Re-trigger by removing then re-adding the class. The reflow read
    // between them is the canonical way to restart a CSS animation.
    el.classList.remove("peek-rp-tap-spin");
    void el.offsetWidth;
    el.classList.add("peek-rp-tap-spin");
    const onEnd = () => {
      el.classList.remove("peek-rp-tap-spin");
      el.removeEventListener("animationend", onEnd);
    };
    el.addEventListener("animationend", onEnd);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      rel="nofollow"
      className="peek-rp-btn inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
    >
      <span ref={diceRef} aria-hidden className="peek-rp-btn-dice inline-flex">
        <DiceIcon />
      </span>
      <span>Random peek</span>
    </a>
  );
}

function DiceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
