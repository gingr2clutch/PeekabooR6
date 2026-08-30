"use client";

import { usePathname } from "next/navigation";

// Slim submit prompt, rendered once in the root layout directly above the
// footer so every page carries it without per-page wiring.
//
// A normal block in flow — no fixed positioning, no scroll listener, nothing
// that animates size or position. It reserves its own space on first paint, so
// it cannot shift layout or move an ad.
//
// It is a client component only because the exclusion list needs the current
// path; there is no state and no effect.

// Where it would be redundant or out of place:
//   /            the real form is already on the page
//   /gadgets     same, the gadget form is at the bottom
//   /admin/*     internal tooling, not a place to recruit clips
//   auth pages   a login screen should ask for one thing only
const EXCLUDED_EXACT = new Set(["/", "/gadgets"]);
const EXCLUDED_PREFIXES = ["/admin"];
const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

function isExcluded(pathname: string): boolean {
  if (EXCLUDED_EXACT.has(pathname)) return true;
  if (AUTH_PATHS.has(pathname)) return true;
  return EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function SubmitCta() {
  const pathname = usePathname();
  if (!pathname || isExcluded(pathname)) return null;

  // Gadget pages point at the gadget form; everything else at the homepage one.
  const href = pathname.startsWith("/gadgets")
    ? "/gadgets#submit-gadget"
    : "/#submit";

  return (
    // Matches the footer's own width and gutters so the two read as one block.
    <div className="mt-16 px-4 sm:px-6">
      <a
        href={href}
        className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 rounded-card border border-border bg-card px-4 py-3 text-center transition-colors duration-150 ease-out hover:border-brand"
      >
        <CameraIcon />
        <span className="text-[14px] leading-snug text-ink">
          Got a clip of a peek we&rsquo;re missing?{" "}
          <span className="font-semibold text-brand">Submit it →</span>
        </span>
      </a>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-brand"
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
