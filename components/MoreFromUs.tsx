import type { ReactNode } from "react";

// Cross-promo block for the network's other sites, in the homepage hero. Two
// cards in one bubble: HowItEnds (daily clip game) and MainFinder (operator
// quiz).
//
// Built to match the supplied design mock literally, which deliberately
// overrides three earlier constraints on this component: it uses the
// question-mark/crosshair field rather than the ghost-mosaic ambient, raised
// gradient buttons rather than the site's flat ones, and puts the play triangle
// back inside a purple chip.
//
// Still a server component: no scripted hover, so colours live in inline style
// and Tailwind classes rather than event handlers.

// Exported so tomorrow's domain swap is a one-line change here, not a hunt
// through markup. Mirrors how DISCORD_INVITE is handled in DiscordButton.tsx.
export const MAIN_FINDER_URL = "https://main-finder.vercel.app";

const HOW_IT_ENDS_URL = "https://how-it-ends.com";

// Palette — both already present on the site, so the mock is matched without
// introducing new hues. Each button runs light -> base as a vertical gradient
// over a solid darker lip, which is what gives the raised look.
const PURPLE_LIGHT = "#7b7bec";
const PURPLE = "#5a5ac9";
const PURPLE_DARK = "#4a4ab5";
const RED_LIGHT = "#f0483c";
const RED = "#d92d20";
const RED_DARK = "#a81d12";

type CardProps = {
  href: string;
  wordmark: ReactNode;
  blurb: string;
  cta: string;
  light: string;
  base: string;
  dark: string;
  ariaLabel: string;
  divider?: boolean;
};

function PromoCard({
  href,
  wordmark,
  blurb,
  cta,
  light,
  base,
  dark,
  ariaLabel,
  divider = false,
}: CardProps) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-2.5 px-3 py-6 text-center sm:gap-4 sm:px-6 sm:py-10 ${
        divider ? "border-l border-border" : ""
      }`}
    >
      {wordmark}
      <p className="text-[10px] leading-snug text-muted sm:text-[15px]">
        {blurb}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        // Raised pill: vertical gradient over a solid darker lip, pressing down
        // on tap. The lip is a hard-edged box-shadow, not a blur, so it reads as
        // a 3D edge rather than a glow.
        className="mt-0.5 inline-flex translate-y-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-bold text-white transition-transform duration-100 ease-out active:translate-y-[3px] sm:mt-1 sm:gap-2 sm:px-7 sm:py-3 sm:text-[16px]"
        style={{
          backgroundImage: `linear-gradient(180deg, ${light} 0%, ${base} 100%)`,
          boxShadow: `0 4px 0 ${dark}, 0 6px 14px rgba(0, 0, 0, 0.18)`,
        }}
      >
        {cta}
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}

// The question-mark + crosshair field from the mock, as one tiled SVG pattern.
// Drawn rather than shipped as an image so it stays crisp at any size and costs
// no extra request. Both colours are the two brand hues already in this file.
function MarksField() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <pattern
          id="mfu-marks"
          width="150"
          height="150"
          patternUnits="userSpaceOnUse"
        >
          <text
            x="14"
            y="46"
            fontSize="40"
            fontWeight="800"
            fill={PURPLE}
            opacity="0.16"
          >
            ?
          </text>
          <text
            x="86"
            y="132"
            fontSize="28"
            fontWeight="800"
            fill={PURPLE}
            opacity="0.12"
            transform="rotate(14 86 132)"
          >
            ?
          </text>
          <text
            x="118"
            y="66"
            fontSize="22"
            fontWeight="800"
            fill={PURPLE}
            opacity="0.1"
          >
            ?
          </text>
          {/* Crosshair / target */}
          <g stroke={RED} strokeWidth="2" fill="none" opacity="0.14">
            <circle cx="104" cy="26" r="11" />
            <circle cx="104" cy="26" r="3" fill={RED} stroke="none" />
            <line x1="104" y1="9" x2="104" y2="16" />
            <line x1="104" y1="36" x2="104" y2="43" />
            <line x1="87" y1="26" x2="94" y2="26" />
            <line x1="114" y1="26" x2="121" y2="26" />
          </g>
          <g stroke={RED} strokeWidth="2" fill="none" opacity="0.1">
            <circle cx="34" cy="106" r="8" />
            <circle cx="34" cy="106" r="2.2" fill={RED} stroke="none" />
            <line x1="34" y1="93" x2="34" y2="99" />
            <line x1="34" y1="113" x2="34" y2="119" />
            <line x1="21" y1="106" x2="27" y2="106" />
            <line x1="41" y1="106" x2="47" y2="106" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mfu-marks)" />
    </svg>
  );
}

export function MoreFromUs() {
  return (
    <section
      aria-labelledby="more-from-us-heading"
      className="relative isolate overflow-hidden rounded-card"
    >
      <MarksField />

      {/* Tight horizontal padding at phone widths: the two columns have to fit
          a 320px screen, which leaves ~103px of content per side once the page
          gutter, this padding and the card padding are taken out. */}
      <div className="relative z-10 px-2 py-8 sm:px-4 sm:py-14">
        <h2
          id="more-from-us-heading"
          className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-brand sm:text-[13px] sm:tracking-[0.3em]"
        >
          More from us
        </h2>

        {/* Two-up at every width — never stacked. Radius and shadow follow the
            mock: a deeper 24px corner and a wide, soft lift. */}
        <div
          className="mx-auto mt-5 grid max-w-2xl grid-cols-2 overflow-hidden rounded-[24px] border border-border bg-card sm:mt-8"
          style={{ boxShadow: "0 18px 40px rgba(0, 0, 0, 0.10)" }}
        >
          <PromoCard
            href={HOW_IT_ENDS_URL}
            ariaLabel="HowItEnds — watch today's clip (opens in new tab)"
            blurb="Daily R6 clip game"
            cta="Watch"
            light={PURPLE_LIGHT}
            base={PURPLE}
            dark={PURPLE_DARK}
            wordmark={
              <span className="flex items-center gap-1.5 sm:gap-2.5">
                <span className="text-[13px] font-extrabold tracking-tight text-ink sm:text-[26px]">
                  HowItEnds
                </span>
                {/* Play triangle back inside a purple chip, as in the mock. */}
                <span
                  aria-hidden
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] sm:h-8 sm:w-8 sm:rounded-[10px]"
                  style={{
                    backgroundImage: `linear-gradient(180deg, ${PURPLE_LIGHT} 0%, ${PURPLE} 100%)`,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-2 w-2 sm:h-4 sm:w-4"
                    aria-hidden
                  >
                    <path d="M8 5.5 L18 12 L8 18.5 Z" fill="#fff" />
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
            light={RED_LIGHT}
            base={RED}
            dark={RED_DARK}
            divider
            wordmark={
              <span className="flex items-center gap-1 sm:gap-2">
                {/* MF monogram — serif, dark M against a red F, tucked tight as
                    in the mock. A step under the wordmark on phones so mark +
                    wordmark clears the ~103px column at 320px. */}
                <span
                  aria-hidden
                  className="shrink-0 font-serif text-[12px] font-bold leading-none tracking-[-0.06em] sm:text-[30px]"
                >
                  <span className="text-ink">M</span>
                  <span className="text-[#d92d20]">F</span>
                </span>
                <span className="text-[13px] font-extrabold tracking-tight sm:text-[26px]">
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
