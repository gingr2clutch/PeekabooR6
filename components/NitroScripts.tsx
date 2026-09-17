import { nitroEnabled } from "@/lib/ad-env";
import { NitroAnchorSlot } from "./NitroAnchorSlot";

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
//
// demo is passed to the anchor for the same reason it is passed to the slots:
// this whole subtree only renders outside production, so placeholder creatives
// cannot reach a real visitor.
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
      <NitroAnchorSlot demo />
    </>
  );
}
