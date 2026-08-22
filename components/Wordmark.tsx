"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isGadgetsPath } from "./ModeToggle";

type Props = {
  href?: string;
  showText?: boolean;
};

export function Wordmark({ href = "/", showText = false }: Props) {
  // Derived from the route rather than a prop: PageHeader is mounted by 29
  // separate pages, so threading a mode prop would mean editing all of them.
  // usePathname resolves during SSR, so the colour is right on first paint.
  const gadgets = isGadgetsPath(usePathname());
  return (
    <Link
      href={href}
      aria-label="peekabooR6 home"
      className="flex items-center gap-2.5 text-xl font-semibold tracking-tight transition-colors"
    >
      {/* Inlined from public/logo.svg so the centre dot can follow the mode —
          an <img> can't be recoloured. Everything else is byte-for-byte the
          original, and the Peeks dot keeps the logo's own #ff6a00, which is
          deliberately NOT the brand token (#f2640e); using the token here would
          have shifted the icon's colour on every existing page.
          public/logo.svg still ships and is still used by SiteNav and the
          favicons — this only changes how the header draws it. */}
      <svg
        viewBox="0 0 64 64"
        width={36}
        height={36}
        aria-hidden
        className="h-8 w-8 md:h-9 md:w-9"
      >
        <rect width="64" height="64" rx="12" fill="#ffffff" />
        <path d="M 14 24 L 14 14 L 24 14" fill="none" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 40 14 L 50 14 L 50 24" fill="none" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 50 40 L 50 50 L 40 50" fill="none" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 24 50 L 14 50 L 14 40" fill="none" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {/* The orange is a presentation attribute, not a Tailwind class:
            fill-[#ff6a00] silently failed to emit and left the dot unfilled.
            CSS beats presentation attributes, so .fill-blue overrides it in
            Gadgets mode and the token stays the single source for the blue. */}
        <circle cx="32" cy="32" r="6" fill="#ff6a00" className={gadgets ? "fill-blue" : undefined} />
      </svg>
      {/* Gadget pages always show the text, even though they don't pass
          showText: the blue "R6" is the mode signal, and an icon-only logo
          would hide it. Deciding it here rather than at the 29 call sites keeps
          every page file untouched. */}
      {(showText || gadgets) && (
        <span>
          <span className="text-ink">peekaboo</span>
          <span className={gadgets ? "text-blue" : "text-brand"}>R6</span>
        </span>
      )}
    </Link>
  );
}
