"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Admin mode switch. Peeks mode shows only peek-side management, Gadgets mode
// only gadget-side, so the bar stops growing as both halves fill out.
//
// Mode is derived from the URL, not stored state: /admin/gadgets* is Gadgets,
// everything else is Peeks. That keeps a bookmarked or refreshed page in the
// mode its URL implies, and means the toggle needs no persistence.

const linkCls =
  "text-sm font-medium text-ink transition-colors sm:text-base";

const PEEK_LINKS = [
  { href: "/admin/maps", label: "Maps" },
  { href: "/admin/peeks", label: "Peeks" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/copy", label: "Copy" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/creators", label: "Creators" },
];

const GADGET_LINKS = [{ href: "/admin/gadgets", label: "Gadgets" }];

export function AdminNav() {
  const pathname = usePathname();
  const gadgets = !!pathname && pathname.startsWith("/admin/gadgets");
  const links = gadgets ? GADGET_LINKS : PEEK_LINKS;
  const accent = gadgets ? "hover:text-blue" : "hover:text-brand";

  return (
    <nav className="flex flex-wrap items-center gap-3 sm:gap-5">
      <div
        role="group"
        aria-label="Admin mode"
        className="inline-flex items-center rounded-btn border border-border bg-bg p-0.5"
      >
        {[
          { label: "Peeks", href: "/admin/peeks", on: !gadgets, dot: "bg-brand" },
          { label: "Gadgets", href: "/admin/gadgets", on: gadgets, dot: "bg-blue" },
        ].map((o) => (
          <Link
            key={o.label}
            href={o.href}
            aria-current={o.on ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs font-semibold transition-colors ${
              o.on ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${o.on ? o.dot : "bg-border"}`}
            />
            {o.label}
          </Link>
        ))}
      </div>

      {links.map((l) => (
        <Link key={l.href} href={l.href} className={`${linkCls} ${accent}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
