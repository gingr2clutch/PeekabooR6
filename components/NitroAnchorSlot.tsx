"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { REPORT_CONFIG } from "./AdSlot";

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

export function NitroAnchorSlot({ demo = false }: { demo?: boolean }) {
  const created = useRef(false);
  const adRef = useRef<NitroAd | null>(null);
  const pathname = usePathname();
  const seenPath = useRef<string | null>(null);

  useEffect(() => {
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
      })
      .catch(() => {
        // Never surface an ad failure to a reader.
      });
  }, [demo]);

  useEffect(() => {
    if (seenPath.current === null) {
      seenPath.current = pathname;
      return;
    }
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    adRef.current?.onNavigate?.();
  }, [pathname]);

  return null;
}
