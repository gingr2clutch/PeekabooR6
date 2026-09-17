"use client";

import { useEffect } from "react";

// Keeps ad units out of the admin.
//
// The ad loader lives in the root layout, which wraps /admin as well as the
// public site. That was harmless while admin screens were plain forms, but its
// adhesion unit is a viewport-fixed bar at the bottom of the page — and the
// quick-add screen puts its Save button there. The ad sat on top and swallowed
// the tap: a real click against it timed out, it is not a theoretical clash.
//
// Removing rather than offsetting is deliberate. The first attempt measured the
// ad container and lifted the Save bar above it, which was worse — the
// container wraps Mediavine's universal player and reports around 450px, so the
// bar floated halfway up the screen over the selectors. Any offset is a guess
// about a box we do not control.
//
// No revenue is lost. Admin pages are behind a password, are noindex, and are
// viewed by exactly one person; impressions here are worth nothing and may
// actively hurt, since invalid traffic on internal tooling is the kind of thing
// networks flag. This mounts only inside the authed admin layout, so the public
// site is untouched.
//
// A MutationObserver is needed because the loader re-injects after route
// changes and after its own refresh timers; removing once is not enough.

const AD_SELECTORS = [
  "#fixed_container_bottom",
  "[data-slot-rendered-adhesion]",
  "[data-slot-rendered-universalplayer]",
  "#mv-grow-sticky",
  ".mv-sticky-video",
];

export function NoAdsHere() {
  useEffect(() => {
    const sweep = () => {
      for (const sel of AD_SELECTORS) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => el.remove());
      }
    };
    sweep();
    const mo = new MutationObserver(sweep);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return null;
}
