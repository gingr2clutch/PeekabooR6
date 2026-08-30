"use client";

import { usePathname } from "next/navigation";

type Props = {
  // Extra classes for layout overrides (e.g. full-width in the mobile drawer).
  className?: string;
  // Lets the mobile drawer close itself when the link is tapped.
  onClick?: () => void;
  // Colour tone. "orange" is the filled default; "outline" is the quieter
  // treatment for surfaces that already carry a filled button.
  variant?: "orange" | "outline";
};

export const SUBMIT_HREF = "/#submit";

// Filled orange CTA pointing at the homepage submission form. Geometry is
// deliberately identical to DiscordButton — same inline-flex, gap, radius,
// padding, text size and weight, and the same motion-safe hover/active
// transitions — so the two sit side by side without one looking heavier.
//
// Same-origin, so no target="_blank" and no rel: this is an in-site anchor,
// not an outbound invite.
export function SubmitPeekButton({
  className = "",
  onClick,
  variant = "orange",
}: Props) {
  const pathname = usePathname();

  const tone =
    variant === "outline"
      ? "border border-border bg-card text-ink hover:border-brand hover:text-brand"
      : "bg-brand text-white hover:bg-[#d95a0c]";

  // Already on the homepage: scroll rather than navigate. A plain hash href
  // would jump, and letting the router handle it would re-run the page for no
  // reason when the target is a few thousand pixels down the same document.
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.();
    if (pathname !== "/") return; // different page — let the browser navigate
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    const el = document.getElementById("submit");
    if (!el) return; // nothing to scroll to; fall through to the href

    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Keep the URL honest without triggering another scroll.
    history.replaceState(null, "", "#submit");
  }

  return (
    <a
      href={SUBMIT_HREF}
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-btn ${tone} px-3 py-1.5 text-xs font-semibold transition-[background-color,box-shadow,transform] duration-150 ease-out motion-safe:hover:scale-[1.04] motion-safe:hover:shadow-md motion-safe:active:scale-[0.98] ${className}`}
    >
      <UploadIcon />
      <span>Submit a peek</span>
    </a>
  );
}

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v13" />
    </svg>
  );
}
