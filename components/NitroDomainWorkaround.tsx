"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { armPageView } from "@/lib/nitro-refresh";
import { isAdminPath } from "@/lib/ad-routes";

// Drives one nitroAds.navigate() per page view while Nitro's domain casing is
// wrong. See NITRO_DOMAIN_WORKAROUND in lib/ad-env.ts and lib/nitro-refresh.ts.
//
// Mounted in the root layout AFTER {children}, which is what makes the ordering
// work: React runs effects depth-first, so every AdSlot on the page has already
// issued its createAd by the time this arms the view. The slots then report back
// as their registrations resolve.
//
// `active` is a prop rather than a call to nitroDomainWorkaround() here, because
// this is a client component and VERCEL_ENV does not exist in the browser —
// the same reason `demo` is passed in. Reading it here would evaluate to "not
// production" IN production, which would disable the workaround on the one site
// that needs it.
//
// DELETE THIS COMPONENT with the workaround.
export function NitroDomainWorkaround({ active }: { active: boolean }) {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    const first = isFirst.current;
    isFirst.current = false;
    // Never on admin: no units are created there, so there is nothing to
    // refresh, and arming the view would fire the anchor's refresh at a page
    // that deliberately has no anchor. See lib/ad-routes.ts.
    armPageView(active && !isAdminPath(pathname), first);
  }, [active, pathname]);

  return null;
}
