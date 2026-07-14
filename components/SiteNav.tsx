"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Crown,
  Flame,
  Handshake,
  Map,
  Menu,
  Plus,
  ShoppingBag,
  Sparkles,
  // Users, // re-add when /creators tab is unhidden
  X,
} from "lucide-react";
import { Wordmark } from "./Wordmark";
import { DiscordButton } from "./DiscordButton";
import { AuthNavIcon } from "./AuthNavIcon";

const ICON_SIZE = 16;
const ICON_STROKE = 2;
const DRAWER_DURATION_MS = 250;

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Map;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Maps", Icon: Map },
  { href: "/top", label: "Top", Icon: Flame },
  { href: "/whats-new", label: "New", Icon: Sparkles },
  { href: "/pro", label: "Pro", Icon: Crown },
  // Hidden from nav for now — /creators route still serves directly.
  // { href: "/creators", label: "Creators", Icon: Users },
  { href: "/blog", label: "Guides", Icon: BookOpen },
  { href: "/submit", label: "Submit a peek", Icon: Plus },
  { href: "/gear", label: "Shop for gear", Icon: ShoppingBag },
  { href: "/sponsor", label: "Partner", Icon: Handshake },
];

const desktopLinkCls =
  "inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:text-brand sm:text-base";

const mobileLinkCls =
  "inline-flex w-full items-center gap-3 rounded-btn px-4 py-4 text-xl font-medium text-ink transition-colors hover:bg-ink/[0.06] hover:text-brand";

const FOCUSABLE_SELECTOR =
  "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export function SiteNav() {
  // `open` controls mount; `show` lags by one frame so the entry transition
  // animates from closed → open instead of mounting already-open.
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  function openDrawer() {
    setOpen(true);
    // Two RAFs so the initial closed state is painted before we add the
    // open classes — otherwise the browser may batch and skip the transition.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShow(true));
    });
  }

  function closeDrawer() {
    setShow(false);
    window.setTimeout(() => setOpen(false), DRAWER_DURATION_MS);
  }

  // While the drawer is open: lock body scroll, trap focus inside,
  // close on Escape, and restore focus to whatever the user had focused
  // when it unmounts.
  useEffect(() => {
    if (!open) return;

    const lastActive = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the drawer after it mounts.
    requestAnimationFrame(() => {
      const first =
        drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShow(false);
        window.setTimeout(() => setOpen(false), DRAWER_DURATION_MS);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusables = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKey);
      lastActive?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      {/* Desktop inline nav — unchanged. */}
      <nav className="hidden items-center gap-4 sm:gap-6 md:flex">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={desktopLinkCls}>
            <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
        <DiscordButton />
        <AuthNavIcon iconSize={20} />
      </nav>

      {/* Mobile: profile icon + hamburger, top-right. */}
      <div className="flex items-center gap-0.5 md:hidden">
        <AuthNavIcon />
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand"
        >
          <Menu size={22} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* Mobile drawer. Full-screen overlay matches the brand's minimal
          aesthetic better than a side-slide. */}
      {open && (
        <div
          ref={drawerRef}
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDrawer();
          }}
          style={{ transitionDuration: `${DRAWER_DURATION_MS}ms` }}
          className={`fixed inset-0 z-50 overflow-hidden bg-bg/95 backdrop-blur-sm transition-opacity ease-out md:hidden ${
            show ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            style={{ transitionDuration: `${DRAWER_DURATION_MS}ms` }}
            className={`flex h-[100dvh] flex-col transition-transform ease-out ${
              show ? "translate-y-0" : "-translate-y-2"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
              <Wordmark />
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand"
              >
                <X size={22} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6">
              <div className="mx-auto w-full max-w-sm space-y-1">
                {NAV_ITEMS.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className={mobileLinkCls}
                  >
                    <Icon size={22} strokeWidth={2} aria-hidden />
                    <span>{label}</span>
                  </Link>
                ))}
                <DiscordButton
                  variant="teal"
                  onClick={closeDrawer}
                  className="mt-3 w-full py-4 text-base"
                />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
