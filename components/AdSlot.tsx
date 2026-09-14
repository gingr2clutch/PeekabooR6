"use client";

import { useEffect, useRef } from "react";

// One Nitro ad placement.
//
// Raw <script> tags in JSX do not execute on client-side navigation, so every
// placement goes through createAd from an effect instead. The stub in the base
// script queues the call if the loader has not arrived yet, so this is safe to
// run before ads-2632.js finishes downloading.
//
// ZERO LAYOUT SHIFT is the whole reason this component reserves its box in the
// markup rather than letting Nitro size the container. `height` is applied as
// an inline style on the div at first paint, before any script runs, so the
// space is already committed when the creative arrives. Never remove that
// height, and never let a slot collapse to auto — either would reintroduce the
// shift this is built to avoid.
//
// The wrapper is `overflow-hidden` so a creative that comes back taller than
// the reserved box is clipped rather than pushing the page down.

declare global {
  interface Window {
    nitroAds?: {
      createAd: (id: string, config: Record<string, unknown>) => Promise<unknown>;
      addUserToken?: (...args: unknown[]) => void;
      queue: unknown[];
    };
  }
}

export type AdSlotProps = {
  /** DOM id Nitro targets. Must be unique on the page. */
  id: string;
  /** Reserved height in px. Committed before any script runs. */
  height?: number;
  /** Extra classes on the outer wrapper, e.g. margins. */
  className?: string;
  /** Merged into the createAd config. */
  config?: Record<string, unknown>;
};

/** Shared across every in-content slot, per the placement spec. */
export const REPORT_CONFIG = {
  enabled: true,
  icon: true,
  wording: "Report Ad",
  position: "top-right",
} as const;

export function AdSlot({
  id,
  height = 250,
  className = "",
  config,
}: AdSlotProps) {
  const created = useRef(false);

  useEffect(() => {
    // React 18 StrictMode runs effects twice in development. createAd twice on
    // one id makes Nitro request the same slot twice, so guard on a ref rather
    // than trusting the effect to run once.
    if (created.current) return;
    created.current = true;

    const nitro = window.nitroAds;
    if (!nitro) return;

    nitro
      .createAd(id, {
        height,
        delayLoading: true,
        report: REPORT_CONFIG,
        ...config,
      })
      .catch(() => {
        // A failed ad must never surface to a reader or break the page. The
        // reserved box stays empty, which looks like nothing happened.
      });

    return () => {
      created.current = false;
      // Nitro exposes no documented destroy for a single slot. Emptying the
      // container is what stops a stale creative from persisting across a
      // client-side route change in this SPA.
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    };
  }, [id, height, config]);

  return (
    <div
      className={`mx-auto overflow-hidden ${className}`}
      style={{ height, maxWidth: "100%" }}
      // aria-hidden: an empty or ad-filled box is not content a screen reader
      // should announce as part of the page.
      aria-hidden="true"
    >
      <div id={id} style={{ height }} />
    </div>
  );
}
