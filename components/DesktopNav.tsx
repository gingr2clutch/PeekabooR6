"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isGadgetsPath } from "./ModeToggle";

/** Event that asks SiteNav to open its drawer. */
export const OPEN_NAV_EVENT = "pbr6:open-nav";

// The four links that earn a place on the bar. Everything else lives behind
// "More", which opens the drawer that already holds the full set — so this is
// a shortcut to the common destinations, not a second navigation to maintain.
// `foldAt` marks a link that drops into the More menu when the bar runs out of
// room. The drawer already lists Guides, so hiding it here loses nothing.
const LINKS: { href: string; label: string; foldable?: boolean }[] = [
  { href: "/", label: "Maps" },
  { href: "/top", label: "Top peeks" },
  { href: "/underrated", label: "Underrated" },
  { href: "/blog", label: "Guides", foldable: true },
];

function isCurrent(pathname: string, href: string): boolean {
  // "/" would otherwise match every route.
  if (href === "/") return pathname === "/" || pathname.startsWith("/maps");
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Inline links for the desktop bar. lg-only — below it the drawer is still the
// only link surface, exactly as before.
//
// "More" dispatches an event rather than taking the drawer's setter as a prop:
// the drawer's state lives in SiteNav, which sits in the bar's RIGHT cluster
// while these links sit on the left. Threading state up through PageHeader to
// come back down would couple three components to satisfy one button.
export function DesktopNav() {
  const pathname = usePathname() ?? "";
  const gadgets = isGadgetsPath(pathname);
  // The underline is the bar's accent, so it follows the mode like everything
  // else — orange on Peeks, blue on Gadgets.
  const accent = gadgets ? "bg-blue" : "bg-brand";

  return (
    <nav
      aria-label="Primary"
      className="hidden lg:flex lg:h-full lg:min-w-0 lg:items-stretch lg:gap-0 min-[1400px]:lg:gap-1"
    >
      {/* The links clip HERE, inside their own box. "More" sits outside it and
          is shrink-0, so under any pressure a link is what disappears — never
          the menu that holds everything else. Clipping "More" would hide the
          only route to the rest of the nav. */}
      <div className="flex min-w-0 items-stretch overflow-hidden lg:gap-0 min-[1400px]:lg:gap-1">
      {LINKS.map((l) => {
        const current = isCurrent(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={current ? "page" : undefined}
            className={`relative inline-flex h-full shrink-0 items-center whitespace-nowrap rounded-btn px-1.5 text-[13px] min-[1400px]:px-2.5 ${
              l.foldable ? "hidden min-[1460px]:inline-flex" : ""
            } font-semibold outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              current ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
            {/* Sits on the bar's bottom edge. Rendered only for the current
                page, so it can never be mistaken for a hover state. */}
            {current && (
              <span
                aria-hidden
                className={`absolute inset-x-2 bottom-0 h-[3px] rounded-t-full ${accent}`}
              />
            )}
          </Link>
        );
      })}
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_NAV_EVENT))}
        aria-haspopup="dialog"
        className="inline-flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-btn px-1.5 text-[13px] min-[1400px]:px-2.5 font-semibold text-muted outline-none transition-colors duration-150 ease-out hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        More
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </nav>
  );
}
