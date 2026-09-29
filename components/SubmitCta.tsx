"use client";

import { usePathname } from "next/navigation";

// Slim submit prompt, rendered once in the root layout directly above the
// footer so every page carries it without per-page wiring.
//
// A normal block in flow — no fixed positioning, no scroll listener, nothing
// that animates size or position. It reserves its own space on first paint, so
// it cannot shift layout or move an ad.
//
// It is a client component only because the exclusion list needs the current
// path; there is no state and no effect.

// Where it would be redundant or out of place:
//   /            the real form is already on the page
//   /gadgets     same, the gadget form is at the bottom
//   /top         the same ask is now the first card in their ExploreNext row,
//   /underrated  so the bar would repeat it within one screen
//   /admin/*     internal tooling, not a place to recruit clips
//   auth pages   a login screen should ask for one thing only
const EXCLUDED_EXACT = new Set(["/", "/gadgets", "/top", "/underrated"]);
const EXCLUDED_PREFIXES = ["/admin"];
const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

// Map pages — /maps/coastline — and floor pages — /maps/coastline/first-floor.
// Both carry their own "Submit a clip" surface at lg, so the thin sitewide bar
// would repeat the same ask twice on one screen.
//
// NOT /trends or /attacking: those are the map's other tabs, they have no such
// surface, and they keep the bar at every width. The negative lookahead is what
// separates them from a floor slug, since both are one segment deep.
const MAP_ROOT = /^\/maps\/[^/]+$/;
const MAP_FLOOR = /^\/maps\/[^/]+\/(?!trends$|attacking$)[^/]+$/;

function isExcluded(pathname: string): boolean {
  if (EXCLUDED_EXACT.has(pathname)) return true;
  if (AUTH_PATHS.has(pathname)) return true;
  return EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function SubmitCta() {
  const pathname = usePathname();
  if (!pathname || isExcluded(pathname)) return null;

  // Gadget pages point at the gadget form; everything else at the homepage one.
  const href = pathname.startsWith("/gadgets")
    ? "/gadgets#submit-gadget"
    : "/#submit";

  // Hidden with a class rather than returned as null: below lg these pages have
  // no competing surface, and the bar has to stay exactly as it is on phones.
  const hideAtLg = MAP_ROOT.test(pathname) || MAP_FLOOR.test(pathname);

  return (
    // Almost no margin of its own — it used to add mt-8 on top of whatever
    // bottom padding the page already had, which stacked into a band of dead
    // space. The remaining 8px only stops it touching the content above.
    //
    // NOTE the page still contributes its own <main> padding-bottom, so the
    // visible gap is that plus this. Reducing it is a per-page change; the map
    // page does so, other pages still carry their original padding.
    <div
      className={`site-shell mt-2 px-4 sm:px-6${hideAtLg ? " lg:hidden" : ""}`}
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-card border border-border bg-card shadow-sm lg:max-w-none">
        {/* Two halves at EVERY width, not stacked on phones: the bar is one
            line of the page's height budget and doubling it on mobile to fit
            two asks would cost more than the second ask is worth. divide-x
            gives the hairline between them without a spacer element. */}
        <div className="grid grid-cols-2 divide-x divide-border">
          <Half
            tone="brand"
            icon={<CameraIcon />}
            title="Missing a peek?"
            href={href}
            cta="Submit a peek"
            ctaShort="Submit"
          />
          <Half
            tone="blue"
            icon={<GadgetIcon />}
            title="Know a gadget spot?"
            href="/gadgets#submit-gadget"
            cta="Submit a gadget"
            ctaShort="Submit"
          />
        </div>
      </div>
    </div>
  );
}

// One half of the bar. A real button, not a whole-card link: this sits near an
// ad on most pages, and a card-sized tap target next to one is exactly the
// accident you do not want. Hover is transform + opacity only, and
// motion-reduce drops the transform so the colour change is all that is left.
function Half({
  tone,
  icon,
  title,
  href,
  cta,
  ctaShort,
}: {
  tone: "brand" | "blue";
  icon: React.ReactNode;
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
        {/* Flat fill behind the icon. No glow, and nothing that changes size
            on hover. */}
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-btn ${chip}`}
        >
          {icon}
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

// Gadget glyph — a drone/deployable silhouette, drawn inline in the same style
// as CameraIcon so the two halves read as a pair rather than one icon set
// against another.
function GadgetIcon() {
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

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
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

function CameraIcon() {
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
