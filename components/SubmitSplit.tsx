// The two submit asks — peek and gadget — as one shared pair.
//
// Three surfaces render this: the sitewide bar (SubmitCta), the bottom row on
// /top and /underrated (ExploreNext), and the map page's dark aside. They used
// to be three separate copies of "submit a clip", which is how the map page
// ended up with a different headline and the bar ended up pointing the PEEK
// half at the gadget form on /gadgets/*.
//
// Copy, icons, colours and hrefs live here so all three move together.

export const PEEK_HREF = "/#submit";
export const GADGET_HREF = "/gadgets#submit-gadget";

export function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

// Gadget glyph, drawn inline in the same style as CameraIcon so the two halves
// read as a pair rather than one icon set against another.
export function GadgetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22" />
      <path d="M5.6 5.6l2.4 2.4M16 16l2.4 2.4M18.4 5.6L16 8M8 16l-2.4 2.4" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// One half. A real button, not a whole-card link: these sit near an ad on most
// pages, and a card-sized tap target beside one is exactly the misclick you do
// not want. Hover is transform + opacity only, and motion-reduce drops the
// transform so the colour change is all that is left.
export function SubmitHalf({
  tone,
  title,
  href,
  cta,
  ctaShort,
}: {
  tone: "brand" | "blue";
  title: string;
  href: string;
  cta: string;
  ctaShort: string;
}) {
  const chip =
    tone === "brand" ? "bg-brand/10 text-brand" : "bg-blue/10 text-blue";
  const button =
    tone === "brand"
      ? "bg-brand focus-visible:ring-brand"
      : "bg-blue focus-visible:ring-blue";

  return (
    <div className="flex flex-col items-center gap-2.5 p-3 text-center sm:gap-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:p-5 lg:text-left">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Flat fill behind the icon. No glow, nothing that resizes on hover. */}
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-btn ${chip}`}
        >
          {tone === "brand" ? <CameraIcon /> : <GadgetIcon />}
        </span>
        <p className="min-w-0 text-[12.5px] font-medium leading-snug text-ink sm:text-[13px]">
          {title}
        </p>
      </div>
      <a
        href={href}
        className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-btn px-3 py-2 text-[12.5px] font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-4 sm:text-[13px] lg:w-auto ${button}`}
      >
        {/* Short label on the narrowest screens so two buttons and a divider
            still fit on one 390px line without wrapping. */}
        <span className="sm:hidden">{ctaShort}</span>
        <span className="hidden sm:inline">{cta}</span>
        <ArrowIcon />
      </a>
    </div>
  );
}

/**
 * Both halves side by side with a hairline between them.
 *
 * Two halves at EVERY width, not stacked on phones: this is one line of the
 * page's height budget, and doubling its height on mobile to fit a second ask
 * would cost more than the second ask is worth.
 */
export function SubmitSplit({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 divide-x divide-border ${className}`}>
      <SubmitHalf
        tone="brand"
        title="Missing a peek?"
        href={PEEK_HREF}
        cta="Submit a peek"
        ctaShort="Submit"
      />
      <SubmitHalf
        tone="blue"
        title="Know a gadget spot?"
        href={GADGET_HREF}
        cta="Submit a gadget"
        ctaShort="Submit"
      />
    </div>
  );
}
