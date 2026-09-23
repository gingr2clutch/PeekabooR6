"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Nitro's consent + CCPA controls, re-armed after client-side navigation.
//
// Nitro injects into markup we render — #ncmp-consent-link in the footer,
// [data-ccpa-link] on the pages that carry it — but only when asked. A SPA
// route change mounts a fresh, empty span, so asking once is not enough.
//
// ──────────────────── why this polls instead of calling once ────────────────
// Both APIs arrive with ads-2632.js, which is async. On a cold load this effect
// runs BEFORE the script lands, so a bare `if (window.__cmp)` is false and a
// one-shot call injects nothing at all until the reader navigates. Nitro ships
// no queueing stub for these the way it does for createAd (see AdSlot), so the
// waiting is ours. Bounded, not indefinite: if the script is blocked the API
// never appears and the page must not hold a timer open forever.
//
// Read through window at call time, never captured — same rule as createAd.

declare global {
  interface Window {
    __cmp?: (command: string, ...args: unknown[]) => void;
    __uspapi?: (command: string, version: number, ...args: unknown[]) => void;
  }
}

const POLL_MS = 250;
const MAX_WAIT_MS = 15_000;

export function NitroConsentLinks() {
  const pathname = usePathname();

  useEffect(() => {
    let timer: number | undefined;
    let waited = 0;

    // Empty container = nothing injected yet. The footer never unmounts, so an
    // unconditional addConsentLink would stack a second link under the first on
    // every route change. The CCPA spans DO remount, which is what makes the
    // re-call necessary at all.
    const needsConsentLink = () =>
      document.getElementById("ncmp-consent-link")?.childElementCount === 0;
    const needsCcpaLink = () =>
      Array.from(document.querySelectorAll("[data-ccpa-link]")).some(
        (el) => el.childElementCount === 0
      );

    const tick = () => {
      const cmp = window.__cmp;
      const usp = window.__uspapi;

      if (cmp && needsConsentLink()) cmp("addConsentLink");
      if (usp && needsCcpaLink()) usp("addLink", 1);

      // Done once both APIs exist — whether or not they chose to inject.
      if (cmp && usp) return;
      waited += POLL_MS;
      if (waited >= MAX_WAIT_MS) return;
      timer = window.setTimeout(tick, POLL_MS);
    };

    tick();
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
