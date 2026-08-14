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
        // motion-safe: the press-down is the only movement in this block, and
        // it is suppressed entirely under prefers-reduced-motion — those users
        // get the same button with no transform and no transition.
        className="mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-bold text-white motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-out motion-safe:active:translate-y-[3px] sm:mt-1 sm:gap-2 sm:px-7 sm:py-3 sm:text-[16px]"
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

// Vertical fade so each column of motifs dissolves before the section's top and
// bottom edges — the top fade is also what keeps them off the "MORE FROM US"
// heading. Applied to the side wrappers, not the SVGs, so the patterns
// themselves stay simple.
const EDGE_FADE =
  "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)";

// The two motifs live in separate columns rather than one mixed field: purple
// question marks down the left third, red crosshairs down the right third,
// nothing in the centre. The centre stays clear so the heading and the card's
// text never sit over a motif.
//
// Drawn as tiled SVG patterns rather than shipped images: crisp at any size, no
// extra request. Both colours are the two brand hues already in this file, and
// nothing here animates — there is no motion for prefers-reduced-motion to
// suppress. Absolutely positioned, so it cannot shift layout.
function MarksField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Left third — purple question marks */}
      <div
        className="absolute inset-y-0 left-0 w-1/3"
        style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
      >
        <svg className="h-full w-full">
          <defs>
            <pattern
              id="mfu-q"
              width="86"
              height="130"
              patternUnits="userSpaceOnUse"
            >
              <text x="10" y="44" fontSize="38" fontWeight="800" fill={PURPLE} opacity="0.11">
                ?
              </text>
              <text
                x="52"
                y="104"
                fontSize="26"
                fontWeight="800"
                fill={PURPLE}
                opacity="0.08"
                transform="rotate(12 52 104)"
              >
                ?
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mfu-q)" />
        </svg>
      </div>

      {/* Right third — red crosshairs */}
      <div
        className="absolute inset-y-0 right-0 w-1/3"
        style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
      >
        <svg className="h-full w-full">
          <defs>
            <pattern
              id="mfu-x"
              width="86"
              height="130"
              patternUnits="userSpaceOnUse"
            >
              <g stroke={RED} strokeWidth="2" fill="none" opacity="0.11">
                <circle cx="26" cy="34" r="11" />
                <circle cx="26" cy="34" r="3" fill={RED} stroke="none" />
                <line x1="26" y1="17" x2="26" y2="24" />
                <line x1="26" y1="44" x2="26" y2="51" />
                <line x1="9" y1="34" x2="16" y2="34" />
                <line x1="36" y1="34" x2="43" y2="34" />
              </g>
              <g stroke={RED} strokeWidth="2" fill="none" opacity="0.08">
                <circle cx="64" cy="98" r="8" />
                <circle cx="64" cy="98" r="2.2" fill={RED} stroke="none" />
                <line x1="64" y1="85" x2="64" y2="91" />
                <line x1="64" y1="105" x2="64" y2="111" />
                <line x1="51" y1="98" x2="57" y2="98" />
                <line x1="71" y1="98" x2="77" y2="98" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mfu-x)" />
        </svg>
      </div>
    </div>
  );
}

export function MoreFromUs() {
  return (
    <section
      aria-labelledby="more-from-us-heading"
      className="relative isolate overflow-hidden rounded-card"
    >
      {/* No ghost-mosaic here. That layer is greyscale map thumbnails, so at any
          opacity it reads as a grey wash rather than neutral texture, and this
          section sat visibly darker than the cream page around it. Removed from
          this section only — the class and its rule in globals.css are
          untouched, and /dev/mosaic still uses them.

          The section itself sets no background, so the page cream shows
          straight through. Layer order is now just the side motifs (-z-10)
          behind the content (z-10); `isolate` keeps that negative z-index
          contained here rather than letting it fall behind the page. */}
      <MarksField />

      {/* Tight horizontal padding at phone widths: the two columns have to fit
          a 320px screen, which leaves ~103px of content per side once the page
          gutter, this padding and the card padding are taken out. */}
      <div className="relative z-10 px-2 py-8 sm:px-4 sm:py-14">
        <h2
          id="more-from-us-heading"
          className="text-center font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-brand sm:text-[18px] sm:tracking-[0.3em]"
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
                {/* Solid purple play triangle — no square, no circle. */}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 sm:h-7 sm:w-7"
                >
                  <path d="M5 3 L21 12 L5 21 Z" fill={PURPLE} />
                </svg>
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
              <span className="flex items-center gap-1.5 sm:gap-3.5">
                {/* MF monogram — serif, dark M against a red F. Set larger than
                    the wordmark (it reads as a mark, not text) with real space
                    before it rather than butting up against "MainFinder". The
                    M/F pair keeps its own tight kerning; the gap-* above is
                    what separates mark from wordmark. */}
                <span
                  aria-hidden
                  className="shrink-0 font-serif text-[16px] font-bold leading-none tracking-[-0.08em] sm:text-[36px]"
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
