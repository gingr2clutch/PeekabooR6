"use client";

import { useState } from "react";

type Props = {
  href: string;
};

// Anchor-shaped button that tumbles its dice icon for 350ms before navigating
// to the /api/.../random-peek route. The redirect on the server still does
// the actual picking; the animation just makes the click feel like a roll.
export function RandomPeekButton({ href }: Props) {
  const [rolling, setRolling] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (rolling) {
      e.preventDefault();
      return;
    }
    // Modifier-clicks (cmd/ctrl/middle) should keep their default behavior so
    // power users can open the random peek in a new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setRolling(true);
    window.setTimeout(() => {
      window.location.href = href;
    }, 350);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      rel="nofollow"
      aria-busy={rolling}
      aria-disabled={rolling}
      className="inline-flex items-center gap-2 rounded-btn border border-brand/40 bg-brand/[0.06] px-3.5 py-1.5 text-sm font-medium text-brand transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-brand hover:bg-brand/10 hover:shadow-sm"
    >
      <span
        aria-hidden
        className={`inline-flex ${rolling ? "peek-dice-tumble" : ""}`}
      >
        <DiceIcon />
      </span>
      <span>{rolling ? "Rolling…" : "Random peek"}</span>
    </a>
  );
}

function DiceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
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
