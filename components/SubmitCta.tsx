"use client";

import { usePathname } from "next/navigation";
import { SubmitSplit } from "@/components/SubmitSplit";

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
//   /top         the same ask is now the first card in their ExploreNext row,
//   /underrated  so the bar would repeat it within one screen
//   /admin/*     internal tooling, not a place to recruit clips
//   auth pages   a login screen should ask for one thing only
const EXCLUDED_EXACT = new Set(["/", "/gadgets", "/top", "/underrated"]);
const EXCLUDED_PREFIXES = ["/admin"];
const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

// Map pages — /maps/coastline — and floor pages — /maps/coastline/first-floor.
// Both carry their own "Submit a clip" surface at lg, so the thin sitewide bar
// would repeat the same ask twice on one screen.
//
// NOT /trends or /attacking: those are the map's other tabs, they have no such
// surface, and they keep the bar at every width. The negative lookahead is what
// separates them from a floor slug, since both are one segment deep.
const MAP_ROOT = /^\/maps\/[^/]+$/;
const MAP_FLOOR = /^\/maps\/[^/]+\/(?!trends$|attacking$)[^/]+$/;

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

  // Hidden with a class rather than returned as null: below lg these pages have
  // no competing surface, and the bar has to stay exactly as it is on phones.
  const hideAtLg = MAP_ROOT.test(pathname) || MAP_FLOOR.test(pathname);

  return (
    // Almost no margin of its own — it used to add mt-8 on top of whatever
    // bottom padding the page already had, which stacked into a band of dead
    // space. The remaining 8px only stops it touching the content above.
    //
    // NOTE the page still contributes its own <main> padding-bottom, so the
    // visible gap is that plus this. Reducing it is a per-page change; the map
    // page does so, other pages still carry their original padding.
    <div
      className={`site-shell mt-2 px-4 sm:px-6${hideAtLg ? " lg:hidden" : ""}`}
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-card border border-border bg-card shadow-sm lg:max-w-none">
        <SubmitSplit />
      </div>
    </div>
  );
}
