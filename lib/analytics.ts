"use client";

import { sendGAEvent } from "@next/third-parties/google";

// Custom GA4 events. This is the first one in the codebase — before this,
// @next/third-parties only rendered the pageview tag in app/layout.tsx and
// nothing fired custom events. Adds no dependency: sendGAEvent ships with the
// package already installed.
//
// Every event is declared in EventMap below rather than accepting a free-form
// name, so a typo is a type error instead of a metric that silently never
// arrives in GA.

// Where a roulette interaction happened. Kept separate from the wheel's
// visual `variant` ('compact' | 'full' | 'mini') on purpose: the same variant
// could appear in two places, and analytics cares about the placement.
export type RoulettePlacement = "map_page" | "homepage";

// Which submission form fired the event.
export type SubmitKind = "peek" | "gadget";

type EventMap = {
  roulette_opened: { placement: RoulettePlacement };
  roulette_spin_started: { placement: RoulettePlacement; map: string };
  roulette_peek_landed: {
    placement: RoulettePlacement;
    map: string;
    peek_id: string;
    // Computed label (S/A/B/C…) from lib/rate, not a database column.
    grade: string;
  };
  roulette_go_to_peek: {
    placement: RoulettePlacement;
    map: string;
    peek_id: string;
  };

  // Community submissions. `kind` matches community_submissions.kind.
  submit_started: { kind: SubmitKind };
  submit_step: { kind: SubmitKind; step: number };
  submit_completed: { kind: SubmitKind; map: string; is_new_spot: boolean };
};

/**
 * Fire a GA4 event.
 *
 * Safe to call when GA is absent — sendGAEvent pushes to a dataLayer that the
 * tag creates, and app/layout.tsx only renders <GoogleAnalytics> when
 * NEXT_PUBLIC_GA_ID is set. That variable is unset in local dev, so this is a
 * no-op there rather than an error. The try/catch covers the remaining case:
 * an ad or privacy blocker removing gtag mid-session. Analytics must never be
 * able to break a spin.
 */
export function track<K extends keyof EventMap>(
  name: K,
  params: EventMap[K]
): void {
  try {
    sendGAEvent("event", name, params);
  } catch {
    // Swallowed deliberately. A dropped metric is not worth a broken UI.
  }
}
