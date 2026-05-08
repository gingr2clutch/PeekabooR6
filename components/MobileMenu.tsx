"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const itemCls =
  "flex min-h-[44px] items-center gap-3 rounded-btn px-3 py-3 text-base font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06]"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-card border border-border bg-card p-2 shadow-lg"
          >
            <Link
              role="menuitem"
              href="/"
              className={itemCls}
              onClick={() => setOpen(false)}
            >
              <GridIcon />
              <span>Maps</span>
            </Link>
            <Link
              role="menuitem"
              href="/popular"
              className={itemCls}
              onClick={() => setOpen(false)}
            >
              <FlameIcon />
              <span>Popular</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className="fill-current"
    >
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className="fill-current"
    >
      <path d="M8.5 0.5c0.4 1.6-0.2 2.7-1 3.7-0.9 1.1-2 2.1-2 4.1 0 2.5 2 4.7 4.5 4.7s4.5-2 4.5-4.7c0-2.6-1.7-4.6-2.6-5.6-0.4 0.7-1 1-1.5 0.7C9.4 3 9.2 1.6 8.5 0.5zM8 8.5c0.6 0.6 1 1 1 1.8 0 1-0.7 1.7-1.7 1.7s-1.8-0.8-1.8-1.8c0-0.7 0.4-1.2 0.8-1.6C6.7 8.2 7.2 8 7.5 7.4 7.6 7.7 7.7 8.2 8 8.5z" />
    </svg>
  );
}
