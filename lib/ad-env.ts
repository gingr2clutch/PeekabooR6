// Which ad network loads, by environment.
//
// EXACTLY ONE network may load on a page. Two loaders compete for the same
// inventory and both anchors stack at the bottom of the viewport, which is
// what happened on the first staging deploy.
//
// That invariant is expressed as a single function with two derived booleans
// rather than two independent environment checks. Two checks can drift — flip
// one condition and you get both networks, or neither, and nothing in the code
// says that is wrong. Here it is unrepresentable: activeAdNetwork() returns one
// value, so mediavineEnabled() and nitroEnabled() cannot both be true.
//
// WENT LIVE 2026-09-26: Nitro in every environment, production included. The
// Mediavine script is gone from app/layout.tsx as of the same commit, so there
// is no second loader left to collide with.
//
// The function is kept — rather than deleting the module and inlining `true` —
// for two reasons. It is the single switch the go-live reverts through, and
// mediavineEnabled() still gates the verbatim Mediavine disclosure block in the
// privacy policy, which stays in the file against a rollback. That block now
// renders nowhere, which is correct: the site no longer loads their script.
//
// Delete this module once the switch has held and the Mediavine block is cut
// from app/privacy-policy/page.tsx for good.

export type AdNetwork = "mediavine" | "nitro";

export function activeAdNetwork(): AdNetwork {
  return "nitro";
}

export function mediavineEnabled(): boolean {
  return activeAdNetwork() === "mediavine";
}

export function nitroEnabled(): boolean {
  return activeAdNetwork() === "nitro";
}

// Nitro's placeholder creatives — NEVER in production.
//
// Read here, on the server, where VERCEL_ENV is actually set. Vercel defines it
// as "production" only on the production domain; "preview" on branch deploys;
// undefined locally. So the safe value is the one a missing variable produces:
// anything that is not literally "production" gets demo ads, and only the real
// production domain gets real ones.
//
// This used to be implicit. Every Nitro surface was gated on nitroEnabled(),
// which was itself "not production", so call sites could hardcode `demo` and be
// correct by accident. Flipping production to Nitro broke that coupling — those
// same hardcoded flags would have shipped placeholder creatives to live
// traffic. demo is now its own question with its own answer, asked separately
// from which network loads.
export function adDemoMode(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

// Whether an in-content slot may collapse to zero when it looks unfilled.
//
// OFF in production, as of 2026-09-26. Go-live showed the anchor serving real
// ads while every in-content slot reserved its box, collapsed, and never came
// back. AdSlot decides filled-vs-empty once, GRACE_MS after the slot comes
// NEAR the viewport (rootMargin 600px) — but that clock starts when Nitro
// starts requesting, not when the auction returns, and a real auction can take
// longer than the grace period. Slots were being judged empty mid-auction and
// then never re-checked, so a creative arriving afterwards had nowhere to go.
//
// The stopgap is to stop collapsing rather than to lengthen the timer: any
// fixed timeout is the same bet, just with different odds, and the cost of
// losing it is unsold inventory on every page. An unfilled slot now holds its
// reserved box — visible whitespace, but whitespace that a late creative can
// still fill.
//
// Kept ON outside production so the collapse path stays exercisable while the
// proper fix is built: collapse only when Nitro reports no fill, and re-expand
// if an ad arrives late. This function goes away with it.
export function adCollapseUnfilled(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY — Nitro domain-casing workaround.
//
// Site 2632's config at Nitro has the domain recorded as "peekabooR6.com" with
// a capital R. Their createAd path compares that against location.hostname
// case-sensitively, so on first load every unit fails with
// "domain mismatch: ad unit not created" and nothing renders.
//
// window.nitroAds.navigate() — their public SPA entry point — refreshes the
// units that are already registered and does NOT repeat that check, so they
// fill. Confirmed on production with ?nitroads_debug=1: after navigate(),
// pkb-content-1 filled (msft 970x250).
//
// TURN THIS OFF THE DAY NITRO LOWERCASES THE DOMAIN ON SITE 2632. Once
// createAd succeeds on its own, this call stops being a rescue and becomes a
// SECOND auction on every unit, on every page view — which is exactly the
// invalid-traffic pattern that gets a publisher looked at.
//
// Production only. Preview and local are on the same broken config, but
// leaving the workaround off there keeps an environment where the real
// behaviour is observable, which is how we will know Nitro has shipped the fix.
// ─────────────────────────────────────────────────────────────────────────────
export const NITRO_DOMAIN_WORKAROUND = true;

export function nitroDomainWorkaround(): boolean {
  return NITRO_DOMAIN_WORKAROUND && process.env.VERCEL_ENV === "production";
}
