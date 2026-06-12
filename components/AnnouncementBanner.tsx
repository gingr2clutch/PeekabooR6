"use client";

import { useEffect, useState } from "react";

// Tied to this specific announcement so future banners get their own
// dismissal state instead of inheriting a previous user's "dismissed".
const STORAGE_KEY = "pbr6.banner.tiktok-creators.v1";

// Renders a small dismissible notice strip. State starts as `null` and
// only flips after localStorage is read, so a returning visitor never
// sees the banner flash in before being hidden.
export function AnnouncementBanner() {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
      setShow(!dismissed);
    } catch {
      // Private mode or storage disabled — just show the banner.
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Best-effort persistence; user can dismiss again next visit.
    }
  }

  if (!show) return null;

  return (
    <div className="mx-auto mb-6 flex max-w-3xl items-center gap-3 rounded-card border border-brand/30 bg-brand/[0.06] px-3 py-2 text-sm text-ink shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-4 sm:py-2.5">
      <span className="inline-flex shrink-0 items-center rounded-btn bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
        New
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        Community peeks from TikTok creators are now live — look for the
        purple pins on the map.
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-btn text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden
          className="fill-none stroke-current"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}
