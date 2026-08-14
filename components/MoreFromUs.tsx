import type { ReactNode } from "react";

// Cross-promo block for the network's other sites, shown below the map grid on
// the homepage. Two cards in one bubble: HowItEnds (daily clip game) and
// MainFinder (operator quiz).
//
// The block sits on peekaboo's own cream + ghost-mosaic ambient rather than the
// question-mark field from the design mock — that motif is HowItEnds' theme and
// would read as another site's branding bleeding onto this page.
//
// No hover state is scripted, so this stays a server component: colours are
// baked into Tailwind classes rather than passed as inline style, which also
// keeps hover working with JS disabled.

// Exported so tomorrow's domain swap is a one-line change here, not a hunt
// through markup. Mirrors how DISCORD_INVITE is handled in DiscordButton.tsx.
export const MAIN_FINDER_URL = "https://main-finder.vercel.app";

const HOW_IT_ENDS_URL = "https://how-it-ends.com";

// Both brand colours are the darker end of their hue on purpose: white on
// #5a5ac9 is 5.6:1 and white on #d92d20 is 4.8:1, so both button labels clear
// WCAG AA. The lighter purple (#6d6de0) and a red matched literally to the mock
// would each land near 4.2:1 and fail it. #5a5ac9 is also the exact purple the
// HowItEnds hero card already ships.
const BTN_PURPLE = "bg-[#5a5ac9] hover:bg-[#4a4ab5]";
const BTN_RED = "bg-[#d92d20] hover:bg-[#c02418]";

type CardProps = {
  href: string;
  wordmark: ReactNode;
  blurb: string;
  cta: string;
  btnClass: string;
  ariaLabel: string;
  /* Divider between the two halves: a top rule while stacked, a left rule once
     they sit side by side. */
  divider?: boolean;
};

function PromoCard({
  href,
  wordmark,
  blurb,
  cta,
  btnClass,
  ariaLabel,
  divider = false,
}: CardProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 px-6 py-8 text-center ${
        divider ? "border-t border-border sm:border-l sm:border-t-0" : ""
      }`}
    >
      {wordmark}
      <p className="text-sm text-muted">{blurb}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        // Flat fill + elev-sm, matching the site's own buttons — deliberately
        // not the raised/3D treatment in the mock.
        className={`elev-sm mt-1 inline-flex items-center gap-2 rounded-btn px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 ease-out ${btnClass}`}
      >
        {cta}
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}

export function MoreFromUs() {
  return (
    <section
      aria-labelledby="more-from-us-heading"
      className="relative isolate mt-12 overflow-hidden rounded-card"
    >
      <div aria-hidden className="ghost-mosaic" />

      <div className="relative z-10 px-4 py-10 sm:py-12">
        <h2
          id="more-from-us-heading"
          className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-brand"
        >
          More from us
        </h2>

        <div className="elev-card mx-auto mt-6 grid max-w-2xl grid-cols-1 overflow-hidden rounded-card border border-border bg-card sm:grid-cols-2">
          <PromoCard
            href={HOW_IT_ENDS_URL}
            ariaLabel="HowItEnds — watch today's clip (opens in new tab)"
            blurb="Daily R6 clip game"
            cta="Watch"
            btnClass={BTN_PURPLE}
            wordmark={
              <span className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-ink">
                  HowItEnds
                </span>
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-inner bg-[#5a5ac9]"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M9 6.5 L17 12 L9 17.5 Z" fill="#fff" />
                  </svg>
                </span>
              </span>
            }
          />
          <PromoCard
            href={MAIN_FINDER_URL}
            ariaLabel="MainFinder — take the operator quiz (opens in new tab)"
            blurb="Operator quiz"
            cta="Quiz"
            btnClass={BTN_RED}
            divider
            wordmark={
              <span className="flex items-center gap-2">
                {/* MF monogram — serif, black M against a red F, as in the mock. */}
                <span
                  aria-hidden
                  className="font-serif text-2xl font-bold leading-none tracking-tight"
                >
                  <span className="text-ink">M</span>
                  <span className="text-[#d92d20]">F</span>
                </span>
                <span className="text-2xl font-extrabold tracking-tight">
                  <span className="text-ink">Main</span>
                  <span className="text-[#d92d20]">Finder</span>
                </span>
              </span>
            }
          />
        </div>
      </div>
    </section>
  );
}
