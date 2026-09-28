import Link from "next/link";
import { ChevronRight, Flame, Gem, Map, Video } from "lucide-react";

// "Where to next" row for the Top Peeks / Underrated pages. Those two are the
// only callers.
//
// It is one row: the submit card first, then the two link cards. The sitewide
// SubmitCta bar is suppressed on these two pages (see components/SubmitCta.tsx)
// because its ask now lives here — otherwise the same "Got a clip?" prompt
// would appear twice within one screen.
//
// The section deliberately has NO width of its own. Top Peeks and Underrated
// use different content widths (max-w-3xl vs the 970px column), and this row is
// supposed to line up with the list above it on both, so each page wraps this
// in the same container its list uses.
//
// Icons are named rather than passed as components: the pages are server
// components, and passing a component across a server/client boundary would
// break if this ever became a client component.
const ICONS = { gem: Gem, map: Map, flame: Flame } as const;

export type ExploreCard = {
  href: string;
  icon: keyof typeof ICONS;
  label: string;
  subtitle: string;
};

export function ExploreNext({
  line,
  cards,
  submitHref = "/#submit",
}: {
  line: string;
  cards: ExploreCard[];
  submitHref?: string;
}) {
  return (
    <section className="mt-16">
      <p className="text-[16px] leading-relaxed text-muted">{line}</p>

      {/* Equal heights come free: grid items stretch by default. */}
      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.7fr_1fr_1fr] lg:gap-5">
        {/* Submit card. Not a whole-card link — the button is the target, so a
            big tap area does not sit under an ad. Same href as the sitewide
            bar used here. */}
        <div className="flex flex-col gap-3 rounded-card border border-[#f7cfb3] bg-[#fff6ef] p-4 lg:flex-row lg:items-center lg:gap-4 lg:p-5">
          <div className="flex items-start gap-3 lg:flex-1">
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
            >
              <Video size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold leading-snug text-ink">
                Got a clip of a peek we&rsquo;re missing?
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-muted">
                Send it in and the community grades it.
              </span>
            </span>
          </div>
          <a
            href={submitHref}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-btn bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:w-auto"
          >
            Submit a clip
            <ArrowIcon />
          </a>
        </div>

        {/* Link cards, in the More drawer's item style. */}
        {cards.map((c) => {
          const Icon = ICONS[c.icon];
          return (
            <Link
              key={c.href}
              href={c.href}
              className="peek-lift group flex items-center gap-3 rounded-card border border-border bg-card p-4 hover:border-brand lg:p-5"
            >
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal/[0.08] text-teal"
              >
                <Icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink group-hover:text-brand">
                  {c.label}
                </span>
                <span className="mt-1 block truncate text-[13px] text-muted">
                  {c.subtitle}
                </span>
              </span>
              <ChevronRight
                size={18}
                aria-hidden
                className="shrink-0 text-muted transition-colors group-hover:text-brand"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ArrowIcon() {
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
