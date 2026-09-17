"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// One Nitro ad placement.
//
// Raw <script> tags in JSX do not execute on client-side navigation, so every
// placement goes through createAd from an effect instead. The stub in the base
// script queues the call if the loader has not arrived yet, so this is safe to
// run before ads-2632.js finishes downloading.
//
// ──────────────────────── never hold createAd ──────────────────────────────
// The library REASSIGNS window.nitroAds.createAd when it loads. Capturing that
// function — or the object it hangs off — into a local, a ref or a wrapper
// means later calls hit the stub that was replaced, and ads orphan across
// navigations. Every call below reads window.nitroAds.createAd at call time.
// Do not refactor that back into a variable; it was one before, and that was
// the bug Nitro warned about.
//
// The ad OBJECT that createAd resolves with is a different thing and is safe to
// hold: it is the documented handle for onNavigate.
//
// ───────────────────────────── SPA handling ────────────────────────────────
// This site averages 8.2 pages a session, so one impression per visit would
// waste most of the inventory. Route changes are handled by holding the
// resolved ad object and calling onNavigate() when the pathname changes.
//
// That is ONE of Nitro's two approaches, chosen deliberately. The other is full
// teardown — the container "completely removed and not just hidden" — which is
// what the previous innerHTML wipe was reaching for. Doing both is incoherent:
// the wipe would destroy the very object onNavigate needs. The wipe is gone.
//
// ───────────────────────────── sizing ──────────────────────────────────────
//   reserved  height committed at first paint, before any script runs. Protects
//             CLS while the ad is in flight.
//   filled    height:auto — the box is the creative and nothing more.
//   empty     height 0, margins stripped. An unsold slot is invisible.
//
// Shrinking is deferred until the slot is off screen, because collapsing a
// visible box shifts everything below it. collapseWhenVisible overrides that
// for call sites where the cost has been measured at zero.

type NitroAd = { onNavigate?: () => void };

declare global {
  interface Window {
    nitroAds?: {
      createAd: (id: string, config: Record<string, unknown>) => Promise<NitroAd>;
      addUserToken?: (...args: unknown[]) => void;
      queue: unknown[];
    };
  }
}

export type AdSlotProps = {
  /** DOM id Nitro targets. Must be unique on the page. */
  id: string;
  /** Reserved height in px while the ad is in flight. */
  height?: number;
  /** Margins only — spacing from the content around it. */
  className?: string;
  /** Merged into the createAd config. */
  config?: Record<string, unknown>;
  /**
   * Collapse even while the slot is on screen.
   *
   * Off by default, because collapsing a visible box shifts everything below
   * it. Turn it on only where the cost has been MEASURED at zero — see the
   * floor-page call site, the one page where the slot can never scroll out of
   * view and so would otherwise leave a permanent gap.
   */
  collapseWhenVisible?: boolean;
  /**
   * Nitro placeholder creatives.
   *
   * Passed in from the server gate rather than read here. This is a client
   * component, so process.env.VERCEL_ENV is undefined in the browser — reading
   * it here would evaluate to "not production" IN production, which is exactly
   * backwards for the one flag that must never ship live.
   */
  demo?: boolean;
};

/** Shared across every in-content slot, per the placement spec. */
export const REPORT_CONFIG = {
  enabled: true,
  icon: true,
  wording: "Report Ad",
  position: "top-right",
} as const;

// TIMEOUT FALLBACK — 4 seconds.
//
// Nitro documents no "this slot went unfilled" callback. createAd's promise
// resolves the same way whether or not a creative came back, so it cannot tell
// the two apart. So: wait, then read the container once. Deliberately not a
// MutationObserver polling loop.
const GRACE_MS = 4000;

type SlotState = "reserved" | "filled" | "empty";

export function AdSlot({
  id,
  height = 250,
  className = "",
  config,
  collapseWhenVisible = false,
  demo = false,
}: AdSlotProps) {
  const created = useRef(false);
  const adRef = useRef<NitroAd | null>(null);
  const pathname = usePathname();
  const seenPath = useRef<string | null>(null);
  const [state, setState] = useState<SlotState>("reserved");

  useEffect(() => {
    // React 18 StrictMode runs effects twice in development. createAd twice on
    // one id makes Nitro request the same slot twice, so guard on a ref rather
    // than trusting the effect to run once.
    if (created.current) return;
    created.current = true;

    // Read through window at call time — never captured. See the note above.
    window.nitroAds
      ?.createAd(id, {
        height,
        // Defers the request until the slot approaches the viewport, at Nitro's
        // default visibleMargin. Their stated single biggest blocking-time
        // lever, so it is on everywhere rather than tuned per slot.
        renderVisibleOnly: true,
        ...(demo ? { demo: true } : {}),
        report: REPORT_CONFIG,
        ...config,
      })
      .then((ad) => {
        adRef.current = ad;
      })
      .catch(() => {
        // A failed ad must never surface to a reader or break the page.
      });

    // No teardown: onNavigate is the chosen approach and needs this ad object
    // to survive route changes.
  }, [id, height, config, demo]);

  // Route change → tell the ad to refresh itself.
  useEffect(() => {
    if (seenPath.current === null) {
      // Skip the run that fires on mount; the ad was just created.
      seenPath.current = pathname;
      return;
    }
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    adRef.current?.onNavigate?.();
  }, [pathname]);

  // Decide filled vs empty, then apply it when applying it is free.
  useEffect(() => {
    let settled = false;
    let io: IntersectionObserver | null = null;
    let onScreen = false;

    const inner = () => document.getElementById(id);

    // "Filled" means Nitro put something with real height in the container.
    // Checking childNodes alone is not enough: it injects wrapper elements that
    // can sit at zero height when no creative was returned.
    const isFilled = () => {
      const el = inner();
      if (!el) return false;
      if (el.childElementCount === 0) return false;
      return Array.from(el.children).some(
        (c) => (c as HTMLElement).offsetHeight > 0
      );
    };

    const el = inner();
    if (el) {
      io = new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
          if (settled && !onScreen) apply();
        },
        // A slot partly on screen still counts as on screen — shifting the
        // visible sliver is as bad as shifting the whole thing.
        { threshold: 0 }
      );
      io.observe(el.parentElement ?? el);
    }

    let decision: SlotState = "reserved";
    const apply = () => {
      if (decision === "reserved") return;
      // Growing is always safe: the space is already reserved. Shrinking waits
      // until the slot is off screen — unless this call site has opted in after
      // measuring that collapsing while visible costs nothing there.
      if (decision === "empty" && onScreen && !collapseWhenVisible) return;
      setState(decision);
    };

    const timer = window.setTimeout(() => {
      settled = true;
      decision = isFilled() ? "filled" : "empty";
      apply();
    }, GRACE_MS);

    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [id, collapseWhenVisible]);

  const collapsed = state === "empty";

  return (
    <div
      // No margin of its own. The call site supplies spacing that matches the
      // rhythm of the section it sits between, so the visible gap is the ad and
      // not ad-plus-whitespace. When collapsed even that is dropped, so an
      // unsold slot leaves no trace — not the box, not the gap around it.
      className={collapsed ? "" : className}
      style={
        collapsed
          ? { height: 0, overflow: "hidden" }
          : {
              // reserved: the committed height. filled: exactly the creative.
              height: state === "filled" ? "auto" : height,
              maxWidth: "100%",
              overflow: "hidden",
            }
      }
      // aria-hidden: an empty or ad-filled box is not content a screen reader
      // should announce as part of the page.
      aria-hidden="true"
    >
      <div id={id} style={state === "filled" ? undefined : { height }} />
    </div>
  );
}
