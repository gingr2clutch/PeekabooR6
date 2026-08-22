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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg?v=2"
        alt=""
        width={36}
        height={36}
        className="h-8 w-8 md:h-9 md:w-9"
      />
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
