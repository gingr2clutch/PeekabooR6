import { AdSlot, type AdSlotProps } from "./AdSlot";
import {
  adCollapseUnfilled,
  adDemoMode,
  nitroDomainWorkaround,
  nitroEnabled,
} from "@/lib/ad-env";

// Environment-gated wrapper around AdSlot.
//
// A server component, so both decisions below are evaluated during render and
// no client bundle ever sees them. Pages import this rather than AdSlot
// directly so the gate and the demo flag live in exactly one place and cannot
// be forgotten at a call site.
//
// Two SEPARATE questions, and keeping them separate is the point:
//
//   nitroEnabled()  does this slot render at all
//   adDemoMode()    if it renders, are the creatives placeholders
//
// Until go-live they were the same question — Nitro rendered only outside
// production, so `demo` could be hardcoded and was still correct. That is no
// longer true: as of 2026-09-26 Nitro renders in production too. A bare `demo`
// here would now request placeholder creatives on the live site, earning
// nothing on every impression. See lib/ad-env.ts.
//
// Both environment flags are passed LAST, after the spread, so a call site
// cannot override either one from its own props. That is load-bearing for
// collapseUnfilled: the floor page passes collapseWhenVisible, and the two
// must not be able to argue.
export function NitroAdSlot(props: AdSlotProps) {
  if (!nitroEnabled()) return null;
  return (
    <AdSlot
      {...props}
      demo={adDemoMode()}
      collapseUnfilled={adCollapseUnfilled()}
      skipOwnNavigate={nitroDomainWorkaround()}
    />
  );
}
