"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sitewide Peeks / Gadgets switch. Rendered from PageHeader, which every public
// page already mounts, so it appears everywhere without touching those 29 files.
//
// The two modes are real routes, not client state, so each is server-rendered
// and crawlable and carries its own metadata. That also means the active mode is
// derived from the URL rather than held in state: usePathname resolves during
// the server render of a client component, so the blue accent is correct on
// first paint with no flash.
//
// Links rather than buttons: middle-click and open-in-new-tab behave normally,
// and prefetch makes the switch feel immediate.

export function isGadgetsPath(pathname: string | null): boolean {
  return !!pathname && (pathname === "/gadgets" || pathname.startsWith("/gadgets/"));
}

export function ModeToggle() {
  const pathname = usePathname();
  const gadgets = isGadgetsPath(pathname);

  const options = [
    { label: "Peeks", href: "/", active: !gadgets },
    { label: "Gadgets", href: "/gadgets", active: gadgets },
  ];

  return (
    <div
      role="group"
      aria-label="Content mode"
      // Compact enough to sit beside the nav icons at 320px.
      className="inline-flex shrink-0 items-center rounded-btn border border-border bg-card p-[2px]"
    >
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          className={`inline-flex items-center gap-1 rounded-btn px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-150 ease-out sm:px-2 sm:text-[11px] ${
            o.active ? "text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {/* The dot is the mode signal: orange on Peeks, blue on Gadgets. Only
              the active side shows a filled dot. */}
          <span
            aria-hidden
            className={`h-1 w-1 shrink-0 rounded-full ${
              o.active
                ? o.label === "Gadgets"
                  ? "bg-blue"
                  : "bg-brand"
                : "bg-border"
            }`}
          />
          {o.label}
        </Link>
      ))}
    </div>
  );
}
