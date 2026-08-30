"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Every route starts at the top, on every navigation method.
//
// Next already scrolls to top on client-side navigation, and nothing here
// opts out of that (no scroll={false}, and the window is the scroll container).
// This is the backstop for the paths its default does not cover: the browser
// restoring a position on reload and back/forward, and the delayed
// router.push() in MapCardLink, which fires 120ms after the click.
//
// Keyed on pathname only, deliberately not search params. The map page uses
// ?view=ranked to swap its list in place — scrolling to top on that would
// yank the reader away from the toggle they just pressed. It also avoids
// useSearchParams, which would force every page under this into client-side
// rendering.
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // A hash is an explicit request for a position. /#maps from the Browse
    // Maps links and #vote on peek pages both depend on this.
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
