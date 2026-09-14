"use client";

import { useEffect, useRef } from "react";
import { REPORT_CONFIG } from "./AdSlot";

// pkb-anchor — the site-wide bottom anchor.
//
// Script-only by design: an anchor is fixed to the viewport, so it has no
// container in the document flow and therefore cannot cause layout shift. That
// is also why it does not use AdSlot, which exists to reserve in-flow space.
//
// It does overlay the bottom of the page. The site already has a fixed
// SubmitCta banner above the footer, so watch for the two stacking on top of
// each other on a phone — that is a visual conflict to check on staging, not
// something this component can detect.

const ANCHOR_CONFIG = {
  format: "anchor-v2",
  anchor: "bottom",
  anchorBgColor: "rgb(0 0 0 / 80%)",
  anchorClose: true,
  anchorPersistClose: false,
  anchorStickyOffset: 0,
  report: REPORT_CONFIG,
  mediaQuery:
    "(min-width: 1025px), (min-width: 768px) and (max-width: 1024px), (min-width: 320px) and (max-width: 767px)",
};

export function NitroAnchor() {
  const created = useRef(false);

  useEffect(() => {
    // Guarded against StrictMode's double-invoke in dev, same as AdSlot: two
    // createAd calls for one anchor id would request the slot twice.
    if (created.current) return;
    created.current = true;

    window.nitroAds
      ?.createAd("pkb-anchor", ANCHOR_CONFIG)
      .catch(() => {
        // Never surface an ad failure to a reader.
      });

    // No cleanup. The anchor is site-wide and should persist across
    // client-side navigation rather than being torn down and re-requested on
    // every route change — unlike the in-content slots, which are per-page.
  }, []);

  return null;
}
