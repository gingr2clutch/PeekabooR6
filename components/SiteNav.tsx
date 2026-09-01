"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Flame,
  Gem,
  Handshake,
  Map,
  Menu,
  Plus,
  Scale,
  Swords,
  Target,
  X,
} from "lucide-react";
import { Wordmark } from "./Wordmark";
// Imported for the URL constant only, so tomorrow's domain swap stays a
// one-line change in MoreFromUs.tsx even though that component is no longer
// rendered on the homepage.
import { MAIN_FINDER_URL } from "./MoreFromUs";
import { AuthNavIcon } from "./AuthNavIcon";
import { SiteSearch } from "./SiteSearch";
import { ModeToggle } from "./ModeToggle";
import { DISCORD_INVITE } from "./DiscordButton";
import { SubmitPeekButton } from "./SubmitPeekButton";

const ENTER_MS = 320;
const EXIT_MS = 220;

const TIKTOK_URL = "https://www.tiktok.com/@peekaboo_r6";

type IconType = ComponentType<{ size?: number | string }>;

type MenuItem = {
  href: string;
  label: string;
  subtitle: string;
  Icon: IconType;
  external?: boolean;
  pro?: boolean; // gradient icon chip
  badge?: string; // small pill after the title (e.g. "NEW"); omit to remove
};

// Sections use ONLY existing destinations (no new routes). Kept grouped so the
// menu reads as organised rather than crammed.
const SECTIONS: { label: string; items: MenuItem[] }[] = [
  {
    label: "Discover",
    items: [
      { href: "/", label: "Maps", subtitle: "Browse every map", Icon: Map },
      { href: "/top", label: "Top peeks", subtitle: "Highest-rated angles", Icon: Flame },
      { href: "/underrated", label: "Underrated", subtitle: "Hidden gems, few votes", Icon: Gem },
    ],
  },
  {
    label: "Community",
    items: [
      // Points at the homepage submission section, not the old /submit page.
      // That page and its route are left in place; removing them is a separate
      // cleanup.
      { href: "/#submit", label: "Submit a clip", subtitle: "Add your own angle", Icon: Plus },
      { href: DISCORD_INVITE, label: "Discord", subtitle: "Join the community", Icon: DiscordGlyph, external: true },
      { href: "/sponsor", label: "Partner", subtitle: "Work with us", Icon: Handshake },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/blog", label: "Guides", subtitle: "Tips & strategy", Icon: BookOpen },
      { href: "/compare", label: "Compare maps", subtitle: "Map vs map", Icon: Scale },
      { href: "/attacking", label: "Attacker Guides", subtitle: "Counter every spawn peek", Icon: Swords },
    ],
  },
];

const FOCUSABLE_SELECTOR =
  "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

function isActivePath(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/maps");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav({
  version,
  home = false,
}: {
  version?: string;
  /* Homepage header only: one size step at lg, matching the wordmark. */
  home?: boolean;
}) {
  // `open` controls mount; `show` lags a frame so the entry transition animates
  // from closed → open instead of mounting already-open.
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [reduce, setReduce] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const onChange = () => setReduce(m.matches);
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);

  function openDrawer() {
    setOpen(true);
  }

  // Flip `show` once the panel has mounted, so the entry transition animates
  // from closed instead of mounting already-open. This used to be a nested
  // requestAnimationFrame inside openDrawer; the timeout is a guarantee that
  // `show` becomes true even if rAF is throttled or coalesced, which would
  // otherwise strand the panel at translateX(100%) — mounted and focus-trapping,
  // but parked off-screen with nothing visible.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShow(true));
    const fallback = window.setTimeout(() => setShow(true), 60);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [open]);

  function closeDrawer() {
    setShow(false);
    window.setTimeout(() => setOpen(false), EXIT_MS + 20);
  }

  // While open: lock body scroll, trap focus, close on Escape, restore focus.
  useEffect(() => {
    if (!open) return;
    const lastActive = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    const originalPadRight = document.body.style.paddingRight;
    // Compensate for the scrollbar the lock removes. Desktop has a classic
    // scrollbar, so without this the page behind (and the header above) jumps
    // ~15px wider the moment the drawer opens. Phones use overlay scrollbars,
    // where the gap is 0 and this is a no-op.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    // Focus the dialog container itself (tabIndex -1, outline-none) rather than
    // the first link, so opening the drawer doesn't paint a focus ring around
    // the logo. The trap below still cycles Tab through the real controls.
    requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
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
      document.body.style.paddingRight = originalPadRight;
      document.removeEventListener("keydown", onKey);
      lastActive?.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Running index across labels + cards → one continuous cascade.
  let stagger = 0;
  const revealStyle = (i: number) => ({
    opacity: show ? 1 : 0,
    transform: reduce ? "none" : show ? "translateY(0)" : "translateY(8px)",
    transition: reduce
      ? "opacity 200ms ease-out"
      : "opacity 250ms ease-out, transform 250ms cubic-bezier(0.32,0.72,0,1)",
    transitionDelay: reduce || !show ? "0ms" : `${i * 40}ms`,
  });

  return (
    <>
      {/* One nav row at every width: the drawer is now the only link surface,
          so the inline desktop list is gone. Everything it held (Maps, Top,
          Underrated, Partner) already appears in SECTIONS below, so nothing is
          lost. Order puts the hamburger last, i.e. hard right. */}
      {/* Reveals as one unit after the intro flip — AuthNavIcon and
          SiteSearch take no className, so the cluster staggers together
          rather than icon by icon. Inert off the homepage. */}
      <div className="reveal flex items-center gap-0.5">
        {/* Compact Discord button, desktop only. Below lg: the homepage keeps
            its full-width Discord bar instead (app/page.tsx hides that bar at
            lg:), so the two never both appear. */}
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join the peekabooR6 Discord (opens in new tab)"
          title="Join our Discord"
          className={`mr-1.5 hidden items-center gap-1.5 rounded-btn bg-gradient-to-r from-[#57938b] to-[#497f75] px-2.5 py-1.5 text-xs font-semibold text-white transition-[filter] duration-150 ease-out hover:brightness-95 lg:inline-flex ${
            home ? "lg:px-3 lg:py-2 lg:text-sm" : ""
          }`}
        >
          <DiscordGlyph size={15} />
          <span>Join</span>
        </a>
        {/* Same lg: gate as the Discord button above. At 360px the row already
            runs to ~308px of its 328px, so a ~124px button here would overflow
            and squeeze the wordmark — but neither button exists below 1024px,
            so narrow widths are untouched. */}
        <SubmitPeekButton className="mr-1.5 hidden lg:inline-flex" />
        <AuthNavIcon />
        <SiteSearch />
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

      {/* Portalled to <body>. The drawer is position:fixed with z-[100], but
          z-index only ranks it inside its own stacking context — and on the
          homepage SiteNav sits inside a [data-pin] wrapper whose pin-drop
          animates transform, which makes that wrapper a stacking context. The
          Discord bar and stats card are later [data-pin] siblings with
          contexts of their own, so they painted over the whole header subtree
          and the drawer went behind them. No z-index can escape an ancestor
          context; moving the node out is the fix, and it holds no matter where
          SiteNav is mounted in future. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
          {/* Backdrop */}
          <div
            aria-hidden
            onClick={closeDrawer}
            className="fixed inset-0 z-[90]"
            style={{
              backgroundColor: "rgba(20,20,18,0.45)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              opacity: show ? 1 : 0,
              transition: "opacity 200ms ease-out",
            }}
          />

          {/* Panel — slides in from the right */}
          <div
            ref={panelRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            tabIndex={-1}
            // Width is set at both ends because the item text was ellipsing at
            // both. 85vw left only ~130px of text column at a 320px viewport
            // (the 40px icon chip, chevron, gaps and padding take 142px), and
            // the 400px desktop cap left ~258px. 92vw and 460px give ~152px and
            // ~318px. The max-w caps out at a 435px viewport, so the vw change
            // only ever affects phones. The drawer is a fixed overlay, so none
            // of this moves the page behind it.
            className="fixed inset-y-0 right-0 z-[100] flex w-[92vw] max-w-[400px] flex-col rounded-l-2xl bg-bg shadow-[-8px_0_30px_rgba(0,0,0,0.14)] outline-none lg:max-w-[460px]"
            style={{
              transform: reduce ? "none" : show ? "translateX(0)" : "translateX(100%)",
              opacity: reduce ? (show ? 1 : 0) : 1,
              transitionProperty: "transform, opacity",
              transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)",
              transitionDuration: `${show ? ENTER_MS : EXIT_MS}ms`,
              // Top inset here (clears the notch); the bottom inset lives on the
              // scroll area so the footer clears the home indicator exactly once.
              paddingTop: "env(safe-area-inset-top)",
            }}
          >
            {/* Header */}
            <div className="shrink-0 px-5 pt-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href="/"
                  onClick={closeDrawer}
                  className="flex items-center gap-2.5"
                  aria-label="peekabooR6 home"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.svg?v=2" alt="" width={32} height={32} className="h-8 w-8" />
                  <span className="text-lg font-semibold tracking-tight">
                    <span className="text-ink">peekaboo</span>
                    <span className="text-brand">R6</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close navigation menu"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink transition-transform duration-150 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:bg-ink/[0.05] active:scale-[0.92]"
                >
                  <X size={20} strokeWidth={2} aria-hidden />
                </button>
              </div>
              <p className="mt-3 max-w-[15rem] text-[13px] leading-snug text-muted">
                The community spawn-peek database for Rainbow Six Siege.
              </p>
            </div>

            {/* Scrollable content (sections + footer) */}
            <div
              className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5"
              // Extra bottom padding so the list scrolls past its last item
              // rather than stopping flush against it — "More from us" ends
              // with room below instead of hard against the drawer edge. Still
              // adds the safe-area inset on top, so it clears the home
              // indicator on iOS exactly once.
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
            >
              <div className="flex min-h-full flex-col">
                {/* Mode switch lives here on phones: the header row has no
                    space for it at 320px, and this is where phone users come
                    to navigate anyway. Hidden at sm: and up, where the header
                    copy takes over. */}
                <div className="mb-5 sm:hidden" style={revealStyle(stagger++)}>
                  <ModeToggle className="flex w-full justify-center" onNavigate={closeDrawer} />
                </div>

                {SECTIONS.map((section) => {
                  const labelIdx = stagger++;
                  return (
                    <div key={section.label} className="mb-5">
                      <div
                        className="mb-2.5 flex items-center gap-3"
                        style={revealStyle(labelIdx)}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
                          {section.label}
                        </span>
                        <hr className="h-px flex-1 border-0 bg-border" />
                      </div>
                      <div className="space-y-2">
                        {section.items.map((item) => {
                          const cardIdx = stagger++;
                          const active = isActivePath(item.href, pathname);
                          return (
                            <MenuCard
                              key={item.href}
                              item={item}
                              active={active}
                              style={revealStyle(cardIdx)}
                              onNavigate={closeDrawer}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* More from us — cross-promo to the sister site. Same section
                    label + divider + item styling as above; NEW pill is the
                    only accent. */}
                <div className="mb-5">
                  <div
                    className="mb-2.5 flex items-center gap-3"
                    style={revealStyle(stagger++)}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
                      More from us
                    </span>
                    <hr className="h-px flex-1 border-0 bg-border" />
                  </div>
                  <div className="space-y-2">
                    <a
                      href="https://how-it-ends.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      style={revealStyle(stagger++)}
                      className="relative flex min-h-[44px] items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-[transform,background-color] duration-[120ms] ease-out active:scale-[0.98] active:bg-ink/[0.04]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04]">
                        <HowItEndsLogo size={22} />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate text-[16px] font-semibold text-ink">
                          HowItEnds
                        </span>
                        <span className="shrink-0 rounded-full bg-[#6d6de0] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white">
                          New
                        </span>
                      </span>
                      <ArrowUpRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </a>
                    {/* Same shell as the row above, minus the badge: a plain
                        menu item, with the drawer's standard lucide glyph
                        rather than a brand mark. No new colours. */}
                    <a
                      href={MAIN_FINDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      style={revealStyle(stagger++)}
                      className="relative flex min-h-[44px] items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-[transform,background-color] duration-[120ms] ease-out active:scale-[0.98] active:bg-ink/[0.04]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04]">
                        <Target size={22} className="text-muted" aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate text-[16px] font-semibold text-ink">
                          MainFinder
                        </span>
                      </span>
                      <ArrowUpRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </a>
                  </div>
                </div>

                {/* Footer — pinned to the bottom of the scroll content */}
                <div className="mt-auto" style={revealStyle(stagger++)}>
                  <hr className="my-5 h-px border-0 bg-border" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.svg?v=2" alt="" width={24} height={24} className="h-6 w-6" />
                      <span className="text-xs text-muted">
                        <span className="font-semibold text-ink/70">peekabooR6</span>
                        {version ? ` v${version}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <a
                        href={DISCORD_INVITE}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="peekabooR6 on Discord"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-teal transition-opacity duration-150 active:opacity-60"
                      >
                        <DiscordGlyph size={18} />
                      </a>
                      <a
                        href={TIKTOK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="peekabooR6 on TikTok"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-teal transition-opacity duration-150 active:opacity-60"
                      >
                        <TikTokGlyph size={18} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>,
          document.body
        )}
    </>
  );
}

function MenuCard({
  item,
  active,
  style,
  onNavigate,
}: {
  item: MenuItem;
  active: boolean;
  style: React.CSSProperties;
  onNavigate: () => void;
}) {
  const { Icon } = item;
  const chipCls = active
    ? "bg-brand/10 text-brand"
    : item.pro
      ? "bg-gradient-to-br from-brand/20 to-amber-400/25 text-brand"
      : "bg-teal/[0.08] text-teal";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      {...(item.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      style={style}
      className={`relative flex min-h-[44px] items-center gap-3 rounded-xl border p-2.5 transition-[transform,background-color] duration-[120ms] ease-out active:scale-[0.98] ${
        active
          ? "border-brand/25 bg-card active:bg-ink/[0.03]"
          : "border-border bg-card active:bg-ink/[0.04]"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-1 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-brand"
        />
      )}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chipCls}`}
      >
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[16px] font-semibold text-ink">
            {item.label}
          </span>
          {item.badge && (
            <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white">
              {item.badge}
            </span>
          )}
        </span>
        {/* Wraps rather than truncating. The width bump above gets 320px to
            ~152px of text column, which is within measurement error of what
            the longest subtitle needs — so relying on width alone would leave
            it ellipsing on the narrowest phones. Wrapping is exact. The label
            above keeps truncate: those are short, and a two-line title would
            read as a different item. min-h-[44px] already sets the row floor,
            so a wrapped row grows rather than breaking the layout. */}
        <span className="mt-0.5 block text-[13px] leading-snug text-muted">
          {item.subtitle}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

// HowItEnds "Timeline" logo mark (shared with the promo card).
function HowItEndsLogo({ size = 20 }: { size?: number | string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden>
      <rect x="14" y="18" width="72" height="48" rx="12" stroke="#16181d" strokeWidth="6" />
      <path d="M44 32 L44 52 L60 42 Z" fill="#6d6de0" />
      <rect x="14" y="78" width="52" height="6" rx="3" fill="#16181d" />
      <rect x="70" y="78" width="16" height="6" rx="3" fill="#6d6de0" />
    </svg>
  );
}

function DiscordGlyph({ size = 20 }: { size?: number | string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="fill-current">
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TikTokGlyph({ size = 20 }: { size?: number | string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="fill-current">
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.08-.14 1.62.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}
