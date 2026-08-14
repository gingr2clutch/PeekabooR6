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
  /* Vertical rule between the two halves. They are side by side at every
     width, so this is always a left border. */
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
      className={`flex min-w-0 flex-col items-center gap-2 px-3 py-5 text-center sm:gap-3 sm:px-6 sm:py-8 ${
        divider ? "border-l border-border" : ""
      }`}
    >
      {wordmark}
      <p className="text-[10px] leading-snug text-muted sm:text-sm">{blurb}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        // Flat fill + elev-sm, matching the site's own buttons — deliberately
        // not the raised/3D treatment in the mock.
        className={`elev-sm mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-btn px-3 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150 ease-out sm:mt-1 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${btnClass}`}
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
      className="relative isolate overflow-hidden rounded-card"
    >
      <div aria-hidden className="ghost-mosaic" />

      {/* Tight horizontal padding at phone widths: the two columns have to fit
          a 320px screen, which leaves ~103px of content per side once the page
          gutter, this padding and the card padding are taken out. */}
      <div className="relative z-10 px-2 py-6 sm:px-4 sm:py-12">
        <h2
          id="more-from-us-heading"
          className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-brand sm:text-[11px] sm:tracking-[0.28em]"
        >
          More from us
        </h2>

        {/* Two-up at every width — never stacked.
            Shadow is written inline rather than using .elev-card: that token is
            shared with the map cards, the attacking page and BackToTop, so
            softening it globally would change all of them. Same geometry as the
            token (0 6px 20px), alpha eased .09 -> .08, which stays inside the
            .08–.10 range. Radius nudged 14px (rounded-card) -> 18px. */}
        <div
          className="mx-auto mt-4 grid max-w-2xl grid-cols-2 overflow-hidden rounded-[18px] border border-border bg-card sm:mt-6"
          // Inline rather than a shadow-[...] class: Tailwind did not emit that
          // arbitrary value (the commas inside rgba() defeat the scanner), which
          // silently left the card with no shadow at all. An inline style always
          // applies and is checkable in the served HTML.
          style={{ boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)" }}
        >
          <PromoCard
            href={HOW_IT_ENDS_URL}
            ariaLabel="HowItEnds — watch today's clip (opens in new tab)"
            blurb="Daily R6 clip game"
            cta="Watch"
            btnClass={BTN_PURPLE}
            wordmark={
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[13px] font-extrabold tracking-tight text-ink sm:text-2xl">
                  HowItEnds
                </span>
                {/* Bare purple play triangle — no circle or rounded-square
                    behind it, closer to the real HowItEnds mark. */}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-3 w-3 shrink-0 sm:h-5 sm:w-5"
                >
                  <path d="M5 3 L21 12 L5 21 Z" fill="#5a5ac9" />
                </svg>
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
              <span className="flex items-center gap-1 sm:gap-2">
                {/* MF monogram — serif, dark M against a red F. Shown at every
                    width now, so this side carries a mark like the HowItEnds
                    side does. Kept a step smaller than the wordmark on phones
                    (12px vs 13px) with a tighter gap: at 320px the column has
                    ~103px of content, and mark + wordmark comes to ~91px. */}
                <span
                  aria-hidden
                  className="shrink-0 font-serif text-[12px] font-bold leading-none tracking-tight sm:text-2xl"
                >
                  <span className="text-ink">M</span>
                  <span className="text-[#d92d20]">F</span>
                </span>
                <span className="text-[13px] font-extrabold tracking-tight sm:text-2xl">
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
