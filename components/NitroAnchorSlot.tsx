"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { REPORT_CONFIG } from "./AdSlot";
import { isAdminPath } from "@/lib/ad-routes";

// pkb-anchor — the site-wide bottom anchor.
//
// Replaces the old NitroAnchor.tsx, which tried to MEASURE the anchor's height
// off the DOM and feed it into a CSS variable so the footer could clear it.
// That is deleted, not fixed: Nitro does not publish the anchor's element id or
// class, injects it with no target div of ours, and advises against targeting
// it in CSS because it can change without notice. The selector was always a
// guess and it never matched.
//
// anchorStickyOffset is the supported way to say where it sits, so it is the
// only positioning control here. No observers, no CSS variable, no measuring.
//
// Script-only: an anchor is fixed to the viewport, so it has no container in
// the document flow and cannot cause layout shift. That is also why it does not
// use AdSlot, which exists to reserve in-flow space.
//
// Like AdSlot, this never captures window.nitroAds.createAd — the library
// reassigns it on load — and it holds the resolved ad object so route changes
// can call onNavigate().

const ANCHOR_CONFIG = {
  format: "anchor-v2",
  anchor: "bottom",
  anchorBgColor: "rgb(0 0 0 / 80%)",
  anchorClose: true,
  anchorPersistClose: false,
  anchorStickyOffset: 0,
  renderVisibleOnly: false,
  report: REPORT_CONFIG,
  mediaQuery:
    "(min-width: 1025px), (min-width: 768px) and (max-width: 1024px), (min-width: 320px) and (max-width: 767px)",
};

type NitroAd = { onNavigate?: () => void };

export function NitroAnchorSlot({
  demo = false,
  // ── WORKAROUND-ONLY (delete with NITRO_DOMAIN_WORKAROUND) ──
  // Call this unit's own onNavigate() once, right after createAd resolves.
  // Nitro's domain check fails inside createAd so the anchor never renders on
  // its own; onNavigate() does not repeat that check and, for anchor formats,
  // refreshes in place. See NITRO_DOMAIN_WORKAROUND in lib/ad-env.ts.
  //
  // This covers the page view that created the anchor — the FIRST one, which
  // the route-change effect below cannot cover because it returns on mount.
  // The anchor is created once and then lives in the layout, so every later
  // page view is covered by that effect instead. Exactly one per view either
  // way.
  refreshOnCreate = false,
}: {
  demo?: boolean;
  refreshOnCreate?: boolean;
}) {
  const created = useRef(false);
  const adRef = useRef<NitroAd | null>(null);
  const pathname = usePathname();
  const seenPath = useRef<string | null>(null);
  // Admin pages get no ad unit at all — the anchor is fixed to the bottom of
  // the viewport and the quick-add screen puts its Save button there. See
  // lib/ad-routes.ts. This is permanent, NOT part of the workaround.
  const onAdmin = isAdminPath(pathname);

  useEffect(() => {
    if (onAdmin) return;
    // Guarded against StrictMode's double-invoke in dev: two createAd calls on
    // one anchor id would request the slot twice.
    if (created.current) return;
    created.current = true;

    window.nitroAds
      ?.createAd("pkb-anchor", {
        ...ANCHOR_CONFIG,
        ...(demo ? { demo: true } : {}),
      })
      .then((ad) => {
        adRef.current = ad;
        // WORKAROUND-ONLY — see refreshOnCreate above.
        if (refreshOnCreate) ad?.onNavigate?.();
      })
      .catch(() => {
        // Never surface an ad failure to a reader.
      });
    // onAdmin is a dep rather than a bail-once so that arriving on the public
    // site from /admin still creates the anchor.
  }, [demo, onAdmin, refreshOnCreate]);

  useEffect(() => {
    if (seenPath.current === null) {
      seenPath.current = pathname;
      return;
    }
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    // The anchor never unmounts, so this is its refresh on every page view
    // after the one that created it. Cannot double up with refreshOnCreate:
    // this branch is unreachable on the run that records the first path.
    adRef.current?.onNavigate?.();
  }, [pathname]);

  return null;
}
