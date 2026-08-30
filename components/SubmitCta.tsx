"use client";

import { useEffect, useState } from "react";

type Props = {
  variant: "banner" | "floating";
  /* Gadget pages point at the gadget form; everything else at the homepage
     one. Both are anchors on pages that already exist. */
  gadgets?: boolean;
};

const PEEK_HREF = "/#submit";
const GADGET_HREF = "/gadgets#submit-gadget";

// Persistent entry points into the submission forms.
//
// Neither variant sits inside or beside an ad container. The banner renders at
// the end of page content, above the footer; the floating pill is
// position:fixed, so it is outside document flow entirely and cannot move an
// ad or shift layout.
export function SubmitCta({ variant, gadgets = false }: Props) {
  const href = gadgets ? GADGET_HREF : PEEK_HREF;

  if (variant === "banner") {
    return (
      <div className="mx-auto mt-12 max-w-3xl px-1">
        <a
          href={href}
          className="submit-cta-banner group flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 transition-colors duration-150 ease-out hover:border-brand"
        >
          <CameraIcon />
          <span className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
            Got a clip of a peek we&rsquo;re missing?{" "}
            <span className="font-semibold text-brand">Submit it →</span>
          </span>
        </a>
      </div>
    );
  }

  return <FloatingPill href={href} />;
}

function FloatingPill({ href }: { href: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShow(window.scrollY > 400);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href={href}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      // lg: only. Mediavine runs a bottom adhesion unit on phones and a fixed
      // bottom-right control would sit on top of it.
      //
      // bottom-[9.5rem] rather than the bottom-24 BackToTop uses: that value
      // was picked to clear the anchor unit, and BackToTop is 44px tall, so
      // this sits above it instead of overlapping. BackToTop appears on the
      // gadget operator page, where both are visible at once.
      className={`submit-cta-pill fixed bottom-[9.5rem] right-4 z-40 hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-ink elev-card transition-[opacity,transform] duration-300 ease-out hover:border-brand hover:text-brand lg:inline-flex ${
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <CameraIcon />
      <span>Submit your own peek</span>
    </a>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-brand"
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
