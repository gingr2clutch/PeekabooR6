import { adDemoMode, nitroEnabled } from "@/lib/ad-env";
import { NitroAnchorSlot } from "./NitroAnchorSlot";

// Nitro base loader + the site-wide anchor.
//
// ─────────────────────────────────────────────────────────────────────────────
// LIVE EVERYWHERE as of 2026-09-26. This used to render nothing in production
// because Mediavine was still serving there and two ad loaders on one page
// would compete for the same inventory. That script is gone from
// app/layout.tsx, so the gate below is now simply "is Nitro the active
// network", which it always is — see lib/ad-env.ts.
//
// The gate stays rather than being deleted so there is still one switch that
// turns the whole Nitro surface off, and so this file does not have to change
// again on a rollback.
//
// demo is the part that did NOT survive the flip unchanged. It used to be a
// bare `demo` on the anchor below, which was safe only because this entire
// subtree was non-production; the same flag under the new gate would have put
// placeholder creatives in front of live traffic. It is now asked as its own
// question — adDemoMode(), which is VERCEL_ENV !== "production" — evaluated
// here on the server, because VERCEL_ENV does not exist in the browser and a
// client-side read would resolve to "not production" IN production.
// ─────────────────────────────────────────────────────────────────────────────

// The stub queues createAd calls made before ads-2632.js lands, so slot
// components never have to care whether the loader has arrived. Copied
// verbatim from Nitro's setup guide — do not reformat it into something
// "cleaner"; it is their contract, not our code.
const NITRO_STUB = `window.nitroAds=window.nitroAds||{createAd:function(){return new Promise(e=>{window.nitroAds.queue.push(["createAd",arguments,e])})},addUserToken:function(){window.nitroAds.queue.push(["addUserToken",arguments])},queue:[]};`;

export function NitroScripts() {
  if (!nitroEnabled()) return null;

  return (
    <>
      <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: NITRO_STUB }} />
      {/* SPA route changes are handled per-slot with onNavigate() on the ad
          object returned by createAd — see AdSlot. data-spa="auto" was the
          earlier guess and Nitro confirmed it is not the mechanism, so the
          attribute is gone rather than left on as a hopeful no-op. */}
      <script
        data-cfasync="false"
        async
        src="https://s.nitropay.com/ads-2632.js"
      />
      <NitroAnchorSlot demo={adDemoMode()} />
    </>
  );
}
