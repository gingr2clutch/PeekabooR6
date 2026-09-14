import { AdSlot, type AdSlotProps } from "./AdSlot";
import { nitroEnabled } from "./NitroScripts";

// Environment-gated wrapper around AdSlot.
//
// A server component, so the gate is evaluated during render and a production
// build ships no slot markup at all — not a hidden div, not a reserved box,
// nothing. Pages import this rather than AdSlot directly so the production
// check lives in exactly one place and cannot be forgotten at a call site.
//
// The corollary matters for CLS testing: because production renders nothing,
// the reserved 250px box exists ONLY where ads exist. There is no empty gap on
// the live site, and equally no un-reserved space on staging.
export function NitroAdSlot(props: AdSlotProps) {
  if (!nitroEnabled()) return null;
  return <AdSlot {...props} />;
}
