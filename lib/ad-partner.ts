import { activeAdNetwork } from "./ad-env";

// Who the advertising partner is, for anything user-facing that has to NAME
// them — the privacy policy, chiefly.
//
// Driven by activeAdNetwork() so the name cannot drift from the script that is
// actually loading. On 2026-09-29 the gate in lib/ad-env.ts flips and this
// follows it in the same commit, rather than being a second place to remember.
//
// Separate module from ad-env.ts on purpose: that one decides which SCRIPT
// loads and is imported by the layout on every render. This is prose about a
// legal relationship. Keeping them apart means editing privacy copy cannot
// touch ad rendering.

export type AdPartner = {
  /** How the partner is named in prose. */
  name: string;
  /**
   * Whether we hold their official, verbatim disclosure text.
   *
   * Mediavine publishes a block their Privacy Policy Health Check matches
   * literally. Anything else has to supply its own before launch — see the
   * PLACEHOLDER note in app/privacy-policy/page.tsx.
   */
  hasOfficialDisclosure: boolean;
  /**
   * Whether the partner injects its own "Do Not Sell or Share My Personal
   * Information" control into the page.
   *
   * Mediavine does: button.consumer-privacy-btn inside
   * #consumer-privacy-footer-wrapper, verified on the live site 2026-09-22.
   * That button IS the site's opt-out mechanism today, and it goes away when
   * Mediavine does — which is why the privacy policy describes it as the ad
   * partner's control rather than as ours.
   */
  providesOptOutControl: boolean;
};

const PARTNERS: Record<ReturnType<typeof activeAdNetwork>, AdPartner> = {
  mediavine: {
    name: "Mediavine",
    hasOfficialDisclosure: true,
    providesOptOutControl: true,
  },
  nitro: {
    name: "NitroPay",
    // UNVERIFIED — no official disclosure text on file, and nobody has
    // confirmed NitroPay renders an opt-out control. Both must be settled
    // before this partner is live in production.
    hasOfficialDisclosure: false,
    providesOptOutControl: false,
  },
};

export function adPartner(): AdPartner {
  return PARTNERS[activeAdNetwork()];
}
