"use client";

import { useEffect, useRef, useState } from "react";

// One Nitro ad placement.
//
// Raw <script> tags in JSX do not execute on client-side navigation, so every
// placement goes through createAd from an effect instead. The stub in the base
// script queues the call if the loader has not arrived yet, so this is safe to
// run before ads-2632.js finishes downloading.
//
// ───────────────────────────── sizing ──────────────────────────────────────
// The slot has three states, and which one it is in decides its box:
//
//   reserved  height is committed at first paint, before any script runs. This
//             is what protects CLS while the ad is in flight.
//   filled    height:auto — the box is the creative and nothing more. No
//             padding of our own stacked on top of it.
//   empty     height 0, margins stripped. An unsold slot is invisible, not a
//             gap.
//
// ─────────────────────── why shrinking is deferred ─────────────────────────
// Collapsing a 250px box to 0 IS a layout shift: everything below it moves up.
// Doing that while the reader is looking at the slot would trade a blank
// rectangle for a CLS penalty, which is a bad deal on a page that lives on
// search traffic.
//
// So a shrink only happens while the slot is OUT of the viewport. An unfilled
// slot the reader has already scrolled past collapses silently; one currently
// on screen keeps its reservation until it scrolls away, then collapses. Growth
// is never deferred — a filled slot can take its space immediately, because
// that space was already reserved.
//
// The consequence, stated plainly: an unsold slot sitting in the first viewport
// stays a gap until the reader scrolls. That is deliberate. CLS is the thing
// that cannot regress.

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
  /** Reserved height in px while the ad is in flight. */
  height?: number;
  /** Margins only — spacing from the content around it. */
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

// TIMEOUT FALLBACK — 4 seconds.
//
// Nitro documents no "this slot went unfilled" callback. createAd returns a
// Promise, but its resolution is undocumented for fill status and it resolves
// the same way whether or not a creative came back, so it cannot be used to
// tell the two apart. onNavigate is an SPA re-request hook, not a fill signal.
//
// So: wait, then look once. Deliberately NOT a MutationObserver polling loop —
// a single timeout plus one read, with an IntersectionObserver only to decide
// WHEN it is safe to apply the result.
//
// 4s is long enough to cover a slow fill on a phone connection and short enough
// that a below-the-fold slot is usually still below the fold when it fires,
// which is what lets it collapse for free.
const GRACE_MS = 4000;

type SlotState = "reserved" | "filled" | "empty";

export function AdSlot({
  id,
  height = 250,
  className = "",
  config,
}: AdSlotProps) {
  const created = useRef(false);
  const [state, setState] = useState<SlotState>("reserved");

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
        // A failed ad must never surface to a reader or break the page.
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
      // until the slot is off screen.
      if (decision === "empty" && onScreen) return;
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
  }, [id]);

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
