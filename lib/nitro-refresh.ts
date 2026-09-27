// One nitroAds.navigate() per page view — the domain-casing workaround.
//
// WHY THIS EXISTS: see NITRO_DOMAIN_WORKAROUND in lib/ad-env.ts. Short version:
// Nitro has our domain stored as "peekabooR6.com" and checks it case-sensitively
// inside createAd, so every unit fails to be created on first load. navigate()
// refreshes the registered units without that check and they fill.
//
// ───────────────────────── why a coordinator at all ─────────────────────────
// navigate() is global: one call refreshes every registered unit. So it must be
// called ONCE per page view, not once per slot — a page with three slots calling
// it three times would run three auctions on each of them.
//
// The other half is timing, and it is the part that is easy to get wrong.
// navigate() only helps units that are already registered, so it has to land
// AFTER this page view's createAd calls have resolved. Firing on a fixed delay
// from the route change does NOT work: measured on a real SPA navigation, the
// incoming page's units register later than that, so the call went out while
// the only registered units were the outgoing page's and the new slots — the
// ones that needed it — were skipped.
//
// So the call is debounced off REGISTRATIONS, not off the navigation:
//
//   every noteUnitCreated()  pushes the deadline to now + SETTLE_MS
//   the call fires           SETTLE_MS after the last unit reports in
//
// with one fallback. A route change may legitimately register nothing: the
// slot ids repeat across pages (every page uses pkb-content-1), so React
// reconciles the AdSlot components instead of remounting them, createAd is not
// re-issued, and the already-registered units still need their one refresh.
// FALLBACK_MS covers exactly that case, and any registration cancels it.
//
// The first view gets no fallback on purpose: createAd does not resolve until
// ads-2632.js has downloaded and drained the stub's queue, which is unbounded,
// so there is no honest deadline to set. It waits for a real registration.
//
// ─────────────────────── why the anchor is special-cased ────────────────────
// navigate() cannot reach the anchor. Read out of ads-2632.js:
//
//   function X(){ Z(), we.forEach(e => { e.onNavigate() }) }
//   function Z(){ let e = we.length; for(;e--;){ const t = we[e];
//     document.getElementById(t.id) || (t?.clear(),
//       debug(`[${we[e].id}] is no longer tracking since the element does not
//              exist`), we.splice(e, 1)) } }
//
// Z() runs FIRST and drops every unit whose element is missing. NitroAnchorSlot
// renders null — the anchor is script-only, Nitro injects its own fixed
// container and there is no #pkb-anchor in the document — so the anchor is
// spliced out before the forEach and never gets onNavigate() from navigate().
// That is the "[pkb-anchor] is no longer tracking" line in the debug console.
//
// It never comes back, either: the only `we.push` in the bundle is inside
// createAd. So this is not a first-page-view special case — the anchor needs
// its own call on EVERY page view, which is what registerAnchorRefresh is for.
//
// Doing it here rather than in NitroAnchorSlot's own pathname effect is what
// keeps it to exactly one auction per page view: run() fires once per view, so
// the anchor is refreshed once per view, on the first view included. The
// anchor's own route-change call stays suppressed.
//
// Ordering is deliberate — navigate() first, then the anchor. navigate()'s Z()
// pass clears the anchor unit, so asking it to refresh beforehand would be
// torn down immediately afterwards.
//
// Safe to call on a unit Z() has dropped: for anchor formats onNavigate()
// takes the refresh path rather than the teardown path —
//   (0,c.zI)(format) → u = e => e === Anchor || e === AnchorV2
//   → `issuing refresh for format=...`; this.refreshCounter = -1; this.refresh()
// — so it re-runs the auction in place on the object we still hold.
//
// Nitro's own SPA watcher is not a second caller: the 100ms href poll that
// calls X() is gated on `document.currentScript.dataset.spa == "auto"`, and our
// tag deliberately does not set data-spa.
//
// DELETE THIS FILE with the workaround.

/** Quiet period after the last registration before the refresh goes out. */
const SETTLE_MS = 300;

/**
 * How long to wait on a route change that registers nothing before refreshing
 * the units that are already there. Long enough that a page which IS going to
 * register new units gets to cancel it first.
 */
const FALLBACK_MS = 1500;

let enabled = false;
let timer: number | undefined;
// Starts "already fired" so nothing can run before a page view is armed.
let fired = true;
// The anchor's own refresh, which navigate() cannot perform — see above.
let anchorRefresh: (() => void) | null = null;

function clear() {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
}

function run() {
  timer = undefined;
  if (fired) return;
  fired = true;
  try {
    window.nitroAds?.navigate?.();
  } catch {
    // An ad refresh must never surface to a reader or break a navigation.
  }
  // Second, and only after navigate() has run its prune pass. Separately
  // guarded: if navigate() throws, the anchor should still get its one refresh.
  try {
    anchorRefresh?.();
  } catch {
    // Same rule.
  }
}

function schedule(delay: number) {
  if (!enabled || fired) return;
  clear();
  timer = window.setTimeout(run, delay);
}

/**
 * Start a page view. Called on mount and on every pathname change.
 *
 * `isFirstView` decides whether the fallback is armed — see the note above.
 */
export function armPageView(on: boolean, isFirstView: boolean): void {
  enabled = on;
  clear();
  if (!on) {
    fired = true;
    return;
  }
  fired = false;
  if (!isFirstView) schedule(FALLBACK_MS);
}

/**
 * Report that a unit has been registered with Nitro.
 *
 * Call this from createAd's .then(), not immediately after issuing it: before
 * ads-2632.js lands the call is only sitting in the stub's queue, and
 * navigate() cannot refresh a unit that does not exist yet.
 *
 * Each call resets the deadline, so a page registering four units refreshes
 * once, SETTLE_MS after the fourth — not four times.
 */
export function noteUnitCreated(): void {
  schedule(SETTLE_MS);
}

/**
 * Hand the anchor's refresh to the coordinator, so it happens exactly once per
 * page view instead of once per route change.
 *
 * Pass null on unmount. Only one anchor exists, so this is a single slot rather
 * than a list — a second registration would mean a second anchor, which is
 * itself the bug.
 */
export function registerAnchorRefresh(fn: (() => void) | null): void {
  anchorRefresh = fn;
}
