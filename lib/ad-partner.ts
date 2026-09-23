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
  /**
   * Whether that control is shown to EVERY visitor, or only to those in a
   * region whose law triggers it.
   *
   * Mediavine renders button.consumer-privacy-btn site-wide, so the policy can
   * tell any reader to use it. NitroPay's are conditional — the CCPA link is
   * California, the CMP consent button mainly GDPR — so the policy must not
   * promise a control most readers will never see. The email route is offered
   * either way and is the only universal one.
   *
   * Deliberately NOT folded into providesOptOutControl. One boolean carrying
   * both "a control exists" and "every reader sees it" is what would put
   * Mediavine's site-wide wording in front of NitroPay's regional links.
   */
  optOutControlReach: "every-visitor" | "by-region";
};

const PARTNERS: Record<ReturnType<typeof activeAdNetwork>, AdPartner> = {
  mediavine: {
    name: "Mediavine",
    hasOfficialDisclosure: true,
    providesOptOutControl: true,
    optOutControlReach: "every-visitor",
  },
  nitro: {
    name: "NitroPay",
    // UNVERIFIED — no official disclosure text on file. Must be settled before
    // this partner is live in production.
    hasOfficialDisclosure: false,
    // Confirmed 2026-09-23: NitroPay injects both the CMP consent link
    // (#ncmp-consent-link) and a CCPA opt-out link ([data-ccpa-link]) into
    // markup we provide — see components/NitroConsentLinks.tsx and the
    // containers in SiteFooter, the homepage and this policy.
    providesOptOutControl: true,
    // Regional, not site-wide: the CCPA link is shown to California visitors
    // and the CMP consent button mainly under GDPR. Most readers see neither,
    // which is why the policy points at email as the route that always works.
    optOutControlReach: "by-region",
  },
};

export function adPartner(): AdPartner {
  return PARTNERS[activeAdNetwork()];
}
