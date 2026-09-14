import { nitroEnabled } from "@/lib/ad-env";
import { NitroAnchor } from "./NitroAnchor";

// Nitro base loader + the site-wide anchor.
//
// ─────────────────────────────────────────────────────────────────────────────
// STAGING ONLY. Renders nothing when VERCEL_ENV === "production".
//
// Mediavine is still serving live ads in production until 2026-09-29, and two
// ad loaders on one page would compete for the same inventory. The gate is an
// environment check rather than a branch so that merging this to main cannot
// put Nitro in front of a real visitor by accident — the safe state is the
// default, and turning it on is a deliberate act.
//
// Vercel sets VERCEL_ENV automatically: "production" on the production domain,
// "preview" on every branch deploy. Locally it is undefined, so ads render in
// dev, which is what makes them testable.
//
// TO GO LIVE on 2026-09-29: delete this gate and remove the Mediavine script
// from app/layout.tsx in the same commit. Never both loaders at once.
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
      {/*
        TODO — CONFIRM WITH NITRO BEFORE GO-LIVE: data-spa="auto"

        This is an App Router SPA. Client-side navigation does not reload the
        page, so without a re-request hook we serve one impression per visit
        against ~8.5 pages per session — roughly an 88% loss of inventory.
        data-spa="auto" is documented by Nitro as the fix, but it is NOT in the
        setup guide we were given, so it is unverified.

        Two things to check with them, because the failure modes differ:
          - Does the attribute actually re-request on route change here?
          - If it is silently ignored, we need a manual re-createAd on
            navigation instead, and AdSlot's cleanup already clears the
            container for that.
        Confirm before 2026-09-29. Do not assume it works because it is present.
      */}
      <script
        data-cfasync="false"
        async
        data-spa="auto"
        src="https://s.nitropay.com/ads-2632.js"
      />
      <NitroAnchor />
    </>
  );
}
