"use client";

import { useEffect, useState } from "react";

// Tied to this specific announcement so future banners get their own
// dismissal state instead of inheriting a previous user's "dismissed".
// v2 because the visual was revamped — old v1 dismissals should re-see
// the new banner once.
const STORAGE_KEY = "pbr6.banner.tiktok-creators.v2";

// Renders a vivid dismissible notice. State starts as `null` and only
// flips after localStorage is read, so a returning visitor never sees
// the banner flash in before being hidden.
export function AnnouncementBanner() {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
      setShow(!dismissed);
    } catch {
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Best-effort; user can dismiss again next visit.
    }
  }

  if (!show) return null;

  return (
    <div className="relative mx-auto mb-3 max-w-2xl overflow-hidden rounded-card bg-gradient-to-r from-purple-600 via-fuchsia-500 to-brand text-white shadow-[0_4px_16px_rgba(168,85,247,0.25)]">
      {/* Diagonal shimmer sweep layered above the gradient. */}
      <span
        aria-hidden
        className="peek-banner-shimmer pointer-events-none absolute inset-0"
      />
      <div className="relative flex items-center gap-2.5 px-3 py-2 sm:px-4">
        <PinGlyph />
        <span className="peek-banner-badge inline-flex shrink-0 items-center rounded-btn bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-purple-700">
          New
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold drop-shadow-sm sm:text-sm">
          TikTok creator peeks are live — look for the purple pins.
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-btn text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden
            className="fill-none stroke-current"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Map-pin teardrop with a small TikTok glyph nested inside the head —
// echoes the public floor-pin styling so the banner reads as "the new
// purple pins" at a glance.
function PinGlyph() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center drop-shadow-sm"
    >
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 h-full w-full fill-white"
      >
        <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="relative h-2.5 w-2.5 -translate-y-[2px] fill-purple-700"
      >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
      </svg>
    </span>
  );
}
