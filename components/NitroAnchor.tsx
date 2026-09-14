"use client";

import { useEffect, useRef } from "react";
import { REPORT_CONFIG } from "./AdSlot";

// pkb-anchor — the site-wide bottom anchor, plus the bottom spacing it needs.
//
// Script-only: an anchor is fixed to the viewport, so it has no container in
// the document flow and cannot itself cause layout shift. That is why it does
// not use AdSlot, which exists to reserve in-flow space.
//
// What it DOES do is cover the bottom of the viewport. SubmitCta is a normal
// in-flow block directly above the footer, so once you scroll to the end of a
// page the anchor sits on top of it. The fix is to give the document that much
// extra room at the bottom.
//
// The height is MEASURED, never assumed. Nitro's anchor height varies by
// breakpoint and by creative, and the reader can dismiss it (anchorClose is
// on), so any hardcoded offset would be wrong at least some of the time — too
// small and it still overlaps, too large and there is a dead gap under the
// footer. A ResizeObserver tracks the real element and writes its height to a
// CSS variable; a MutationObserver waits for Nitro to inject it in the first
// place, since createAd resolves before the DOM node necessarily exists.
//
// Production renders none of this: NitroScripts gates the whole subtree.

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

const VAR = "--nitro-anchor-h";

/*
  TODO — CONFIRM ON STAGING: the anchor's container selector.

  Nitro is not documented on what it injects for an anchor, so this tries the
  id we passed to createAd first and falls back to scanning for a bottom-fixed
  element Nitro owns. If neither matches, the offset stays 0 and the page
  behaves exactly as it does today — the anchor may overlap SubmitCta, which is
  visible and reportable, rather than the page gaining a phantom gap. Degrading
  toward "no change" is deliberate: a wrong offset is harder to notice than a
  missing one.

  Once you can inspect a real anchor on staging, replace this with the actual
  selector and delete the fallback.
*/
function findAnchor(): HTMLElement | null {
  const byId = document.getElementById("pkb-anchor");
  if (byId) return byId;

  const candidates = document.querySelectorAll<HTMLElement>(
    '[id*="nitro"], [class*="nitro"], [id^="pkb-anchor"]'
  );
  for (const el of Array.from(candidates)) {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" && cs.bottom === "0px" && el.offsetHeight > 0) {
      return el;
    }
  }
  return null;
}

export function NitroAnchor() {
  const created = useRef(false);

  useEffect(() => {
    // Guarded against StrictMode's double-invoke in dev: two createAd calls on
    // one anchor id would request the slot twice.
    if (!created.current) {
      created.current = true;
      window.nitroAds?.createAd("pkb-anchor", ANCHOR_CONFIG).catch(() => {
        // Never surface an ad failure to a reader.
      });
    }

    const root = document.documentElement;
    const setOffset = (px: number) => {
      root.style.setProperty(VAR, `${Math.max(0, Math.round(px))}px`);
    };

    let ro: ResizeObserver | null = null;
    let tracked: HTMLElement | null = null;

    const track = (el: HTMLElement) => {
      if (tracked === el) return;
      ro?.disconnect();
      tracked = el;
      ro = new ResizeObserver(() => {
        // offsetHeight is 0 once the reader closes the anchor, which collapses
        // the offset back to nothing — exactly what should happen.
        setOffset(el.offsetHeight);
      });
      ro.observe(el);
      setOffset(el.offsetHeight);
    };

    const existing = findAnchor();
    if (existing) track(existing);

    // The anchor arrives asynchronously, after the loader resolves the bid.
    const mo = new MutationObserver(() => {
      const el = findAnchor();
      if (el) track(el);
      else if (tracked && !tracked.isConnected) {
        ro?.disconnect();
        tracked = null;
        setOffset(0);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      ro?.disconnect();
      root.style.removeProperty(VAR);
    };
  }, []);

  return null;
}
