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
