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

export function ModeToggle({
  className,
  onNavigate,
  home = false,
  variant = "segmented",
}: {
  /* Header passes "hidden sm:inline-flex": at 320px the header row is already
     over budget before this exists (wordmark + three 44px icons ≈ 294px in
     288px), so the toggle cannot live there on a phone. The drawer copy passes
     nothing and is always visible. */
  className?: string;
  /* Drawer usage closes itself on navigate — the drawer's open state is local
     and would otherwise survive the route change. */
  onNavigate?: () => void;
  /* Homepage header only: one size step at lg to match the larger wordmark
     there. Defaults false, so every other page and the drawer are unchanged. */
  home?: boolean;
  /* "segmented" is the compact pill for the header. "split" renders the two
     modes as separate side-by-side cards in the drawer's own card language —
     each a full 44px tap target with its accent, instead of two tiny options
     crammed into one pill. */
  variant?: "segmented" | "split";
}) {
  const pathname = usePathname();
  const gadgets = isGadgetsPath(pathname);

  const options = [
    { label: "Peeks", href: "/", active: !gadgets },
    { label: "Gadgets", href: "/gadgets", active: gadgets },
  ];

  if (variant === "split") {
    return (
      <div role="group" aria-label="Content mode" className={`grid grid-cols-2 gap-2 ${className ?? ""}`}>
        {options.map((o) => {
          const accent =
            o.label === "Gadgets"
              ? { dot: "bg-blue", card: "border-blue/40 bg-blue/[0.05]" }
              : { dot: "bg-brand", card: "border-brand/40 bg-brand/[0.05]" };
          return (
            <Link
              key={o.label}
              href={o.href}
              aria-current={o.active ? "page" : undefined}
              onClick={onNavigate}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border p-2.5 text-[14px] font-semibold transition-[transform,background-color,border-color] duration-[120ms] ease-out active:scale-[0.98] ${
                o.active
                  ? `${accent.card} text-ink`
                  : "border-border bg-card text-muted active:bg-ink/[0.04]"
              }`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${o.active ? accent.dot : "bg-border"}`}
              />
              {o.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Content mode"
      // Compact enough to sit beside the nav icons at 320px.
      className={`shrink-0 items-center rounded-btn border border-border bg-card p-[2px] ${
        className ?? "inline-flex"
      }`}
    >
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          onClick={onNavigate}
          className={`inline-flex items-center gap-1 rounded-btn px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-150 ease-out sm:px-2 sm:text-[11px] ${
            home ? "lg:px-2.5 lg:py-1 lg:text-[13px]" : ""
          } ${o.active ? "text-ink" : "text-muted hover:text-ink"}`}
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
