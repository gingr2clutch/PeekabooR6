"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { REPORT_CONFIG } from "./AdSlot";
import { noteUnitCreated, registerAnchorRefresh } from "@/lib/nitro-refresh";
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
  // While the workaround is on, the anchor's refresh is driven by the
  // coordinator instead of by this component's own route-change effect, so it
  // happens exactly once per page view — see lib/nitro-refresh.ts for why
  // navigate() cannot do it and why once-per-view is the rule.
  workaroundActive = false,
}: {
  demo?: boolean;
  workaroundActive?: boolean;
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
        // Registered with the real library, so navigate() can now refresh it.
        // No-op unless the workaround is on.
        noteUnitCreated();
      })
      .catch(() => {
        // Never surface an ad failure to a reader.
      });
    // onAdmin is a dep rather than a bail-once so that arriving on the public
    // site from /admin still creates the anchor.
  }, [demo, onAdmin]);

  // ── WORKAROUND-ONLY (delete with NITRO_DOMAIN_WORKAROUND) ──
  // Lend the coordinator this anchor's refresh. It calls it once per page view,
  // immediately after navigate(), which is the only way the anchor serves while
  // Nitro's domain casing is wrong.
  useEffect(() => {
    if (!workaroundActive || onAdmin) return;
    registerAnchorRefresh(() => adRef.current?.onNavigate?.());
    return () => registerAnchorRefresh(null);
  }, [workaroundActive, onAdmin]);

  useEffect(() => {
    if (seenPath.current === null) {
      seenPath.current = pathname;
      return;
    }
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    // Updated either way, so the anchor resumes refreshing itself as soon as
    // the workaround comes off. While it is on, the coordinator owns this —
    // doing both would be two auctions on one impression.
    if (workaroundActive) return;
    adRef.current?.onNavigate?.();
  }, [pathname, workaroundActive]);

  return null;
}
