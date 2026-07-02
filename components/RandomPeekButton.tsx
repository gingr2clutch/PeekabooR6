"use client";

import { useRef } from "react";

type Props = {
  href: string;
  // Optional per-map accent color. When set, it becomes the button background
  // (with auto-picked readable text); otherwise the default brand orange.
  accentColor?: string;
};

// Readable text color (white or dark ink) for a given background hex, chosen
// by the background's relative luminance so labels stay legible either way.
function readableOn(bg: string): string {
  const h = bg.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(
    (i) => parseInt(h.slice(i, i + 2), 16) / 255
  );
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.4 ? "#1e211d" : "#ffffff";
}

// Filled CTA on the map landing page — brand orange by default, or the map's
// accent color when provided. The dice idles with a subtle periodic wobble,
// tumbles on hover (desktop), and spins on tap. Navigation is the anchor's
// default behavior — the spin starts in parallel and is cut off by the page
// transition, which is exactly what we want.
export function RandomPeekButton({ href, accentColor }: Props) {
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
      className={`peek-rp-btn inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-semibold ${
        accentColor
          ? "hover:brightness-95"
          : "bg-brand text-white hover:bg-brand/90"
      }`}
      style={
        accentColor
          ? { backgroundColor: accentColor, color: readableOn(accentColor) }
          : undefined
      }
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
