import { MapPin } from "lucide-react";

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

// A map pin, not the old sun/crosshair. A gadget submission is fundamentally
// "here, on this map", and the pin is the same idea the floor maps already use
// — the crosshair read as a setting or a target, which is neither. Sized and
// stroked to match CameraIcon exactly (17px box, 1.8) so the two chips read as
// a pair. Defined here, so every surface using SubmitSplit changes at once.
export function GadgetIcon() {
  return <MapPin size={17} strokeWidth={1.8} aria-hidden className="shrink-0" />;
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
  stack = false,
}: {
  tone: "brand" | "blue";
  title: string;
  href: string;
  cta: string;
  ctaShort: string;
  /**
   * Keep the label above the button at every width.
   *
   * The default goes label-left / button-right at lg, which is right for the
   * full-width sitewide bar. In a narrow column it is not: ExploreNext gives
   * each half ~274px, and after the icon chip, the gap and a ~150px button the
   * label was left with ~25px — so "Missing a peek?" broke onto three lines and
   * spilled out from under the button.
   */
  stack?: boolean;
}) {
  const chip =
    tone === "brand" ? "bg-brand/10 text-brand" : "bg-blue/10 text-blue";
  const button =
    tone === "brand"
      ? "bg-brand focus-visible:ring-brand"
      : "bg-blue focus-visible:ring-blue";

  return (
    <div
      className={`flex flex-col items-center gap-2.5 p-3 text-center sm:gap-3 sm:p-4 ${
        stack
          ? "lg:p-4"
          : "lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:p-5 lg:text-left"
      }`}
    >
      <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
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
        className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-btn px-3 py-2 text-[12.5px] font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-4 sm:text-[13px] ${
          stack ? "" : "lg:w-auto"
        } ${button}`}
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
export function SubmitSplit({
  className = "",
  stack = false,
}: {
  className?: string;
  /** Pass on narrow containers — see SubmitHalf's `stack`. */
  stack?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 divide-x divide-border ${className}`}>
      <SubmitHalf
        tone="brand"
        title="Missing a peek?"
        href={PEEK_HREF}
        cta="Submit a peek"
        ctaShort="Submit"
        stack={stack}
      />
      <SubmitHalf
        tone="blue"
        title="Know a gadget spot?"
        href={GADGET_HREF}
        cta="Submit a gadget"
        ctaShort="Submit"
        stack={stack}
      />
    </div>
  );
}
