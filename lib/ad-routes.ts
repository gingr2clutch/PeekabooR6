// Where ad units may exist, by route.
//
// Not part of the Nitro domain workaround — this outlives it. Kept separate
// from ad-env.ts on purpose: that module reads VERCEL_ENV, which does not
// exist in the browser, and this one is imported by client components. A pure
// path predicate cannot be mis-called the way an env read can.

/**
 * Admin pages, where no ad unit may ever be created.
 *
 * Two reasons, and the second is the one that matters. The anchor is fixed to
 * the bottom of the viewport and the quick-add screen puts its Save button
 * there — the ad sat on top and swallowed the tap. And admin is behind a
 * password, noindex, and viewed by one person, so impressions there are worth
 * nothing and are exactly the kind of internal traffic a network flags.
 *
 * This replaces NoAdsHere.tsx, which swept Mediavine's containers out of the
 * DOM after the fact. That only ever worked because the selectors were
 * Mediavine's; under Nitro nothing matched, and removing a rendered ad is
 * worse than never asking for one. Not creating the unit is the fix.
 */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
