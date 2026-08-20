import type { CSSProperties, ReactNode } from "react";

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
      className={`flex min-w-0 flex-col items-center gap-2.5 px-3 py-6 text-center sm:gap-4 sm:px-6 sm:py-10 lg:gap-5 ${
        divider ? "border-l border-border" : ""
      }`}
    >
      {wordmark}
      <p className="text-[10px] leading-snug text-muted sm:text-[15px] lg:text-[18px]">
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
        className="mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-bold text-white motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-out motion-safe:active:translate-y-[3px] sm:mt-1 sm:gap-2 sm:px-7 sm:py-3 sm:text-[16px] lg:px-9 lg:py-4 lg:text-[19px]"
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
// Placement is scattered, not gridded. Each column is still one tiled SVG
// pattern — that is what lets it cover any section height — but the tile is
// large (340x420) and holds a dozen-odd marks at varied position, size and
// rotation, so the repeat period is bigger than the area on screen and never
// reads as a grid. Positions come from a one-off jittered sample with a minimum
// separation, so nothing clumps or lines up; the values are baked in below
// rather than generated at runtime, so every visitor sees the same layout.
//
// Marks that fall near a tile edge are duplicated on the opposite side, which
// is why some coordinates sit outside 0..340 / 0..420. Without those wraps a
// glyph would be sliced at the seam, or an inset margin would leave regular
// empty gutters — either one gives the grid away.
//
// Nothing animates: this is placement only, so there is no motion for
// prefers-reduced-motion to suppress. Absolutely positioned, so it cannot shift
// layout.
const TILE_W = 340;
const TILE_H = 420;

const Q_MARKS = [
  { x: 337, y: 117, size: 20, rot: -5, o: 0.28 },
  { x: -3, y: 117, size: 20, rot: -5, o: 0.28 },
  { x: 303, y: 190, size: 28, rot: -2, o: 0.28 },
  { x: -37, y: 190, size: 28, rot: -2, o: 0.28 },
  { x: 46, y: 46, size: 24, rot: 6, o: 0.28 },
  { x: 46, y: 466, size: 24, rot: 6, o: 0.28 },
  { x: 386, y: 46, size: 24, rot: 6, o: 0.28 },
  { x: 323, y: 419, size: 28, rot: -17, o: 0.28 },
  { x: 323, y: -1, size: 28, rot: -17, o: 0.28 },
  { x: -17, y: 419, size: 28, rot: -17, o: 0.28 },
  { x: -17, y: -1, size: 28, rot: -17, o: 0.28 },
  { x: 215, y: 131, size: 20, rot: 14, o: 0.4 },
  { x: 186, y: 332, size: 40, rot: 16, o: 0.34 },
  { x: 84, y: 372, size: 40, rot: 9, o: 0.28 },
  { x: 84, y: -48, size: 40, rot: 9, o: 0.28 },
  { x: 141, y: 190, size: 32, rot: -9, o: 0.4 },
  { x: 317, y: 324, size: 28, rot: 14, o: 0.28 },
  { x: -23, y: 324, size: 28, rot: 14, o: 0.28 },
  { x: 49, y: 188, size: 40, rot: 20, o: 0.4 },
  { x: 389, y: 188, size: 40, rot: 20, o: 0.4 },
  { x: 180, y: 35, size: 44, rot: -15, o: 0.4 },
  { x: 180, y: 455, size: 44, rot: -15, o: 0.4 },
  { x: 218, y: 240, size: 24, rot: -21, o: 0.28 },
  { x: 54, y: 270, size: 20, rot: 8, o: 0.28 },
];

const CROSSHAIRS = [
  { x: 317, y: 77, r: 7, o: 0.34 },
  { x: -23, y: 77, r: 7, o: 0.34 },
  { x: 286, y: 177, r: 9, o: 0.34 },
  { x: 275, y: 335, r: 13, o: 0.28 },
  { x: 89, y: 104, r: 15, o: 0.28 },
  { x: 152, y: 218, r: 13, o: 0.4 },
  { x: 48, y: 408, r: 13, o: 0.34 },
  { x: 48, y: -12, r: 13, o: 0.34 },
  { x: 167, y: 409, r: 15, o: 0.34 },
  { x: 167, y: -11, r: 15, o: 0.34 },
  { x: 41, y: 187, r: 9, o: 0.4 },
  { x: 57, y: 305, r: 7, o: 0.4 },
  { x: 157, y: 317, r: 15, o: 0.28 },
];

function Crosshair({
  x,
  y,
  r,
  o,
  s,
}: {
  x: number;
  y: number;
  r: number;
  o: number;
  s: number;
}) {
  const cx = x * s;
  const cy = y * s;
  const rr = r * s;
  const tick = Math.max(4, r * 0.55) * s;
  const gap = 2 * s;
  return (
    <g stroke={RED} strokeWidth={2 * s} fill="none" opacity={o}>
      <circle cx={cx} cy={cy} r={rr} />
      <circle cx={cx} cy={cy} r={Math.max(1.4, rr * 0.24)} fill={RED} stroke="none" />
      <line x1={cx} y1={cy - rr - gap - tick} x2={cx} y2={cy - rr - gap} />
      <line x1={cx} y1={cy + rr + gap} x2={cx} y2={cy + rr + gap + tick} />
      <line x1={cx - rr - gap - tick} y1={cy} x2={cx - rr - gap} y2={cy} />
      <line x1={cx + rr + gap} y1={cy} x2={cx + rr + gap + tick} y2={cy} />
    </g>
  );
}

// One pair of columns at a given scale. `s` shrinks the whole tile — marks and
// spacing together — so a smaller tile fits proportionally more marks into the
// same strip of screen. `uid` keeps the two instances' pattern ids distinct.
//
// Each column is a masked, clipped box holding a drifting inner layer. The mask
// stays on the outer box so the top/bottom fade holds still while the motifs
// pass through it; only the inner layer moves. That inner layer is one tile
// taller than the column and pans up by exactly one tile, so the loop is
// seamless and nothing empties out at the bottom.
function MarkColumns({ s, uid }: { s: number; uid: string }) {
  const qid = `mfu-q-${uid}`;
  const xid = `mfu-x-${uid}`;
  const tileH = TILE_H * s;
  // ~2.5px/second at either scale — one tile every few minutes.
  const driftStyle = {
    height: `calc(100% + ${tileH}px)`,
    "--mfu-shift": `-${tileH}px`,
    "--mfu-dur": `${Math.round(tileH / 2.5)}s`,
  } as CSSProperties;

  return (
    <>
      {/* Left third — purple question marks */}
      <div
        className="absolute inset-y-0 left-0 w-1/3 overflow-hidden"
        style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
      >
        <div className="mfu-drift absolute inset-x-0 top-0" style={driftStyle}>
          <svg className="h-full w-full">
            <defs>
              <pattern
                id={qid}
                width={TILE_W * s}
                height={tileH}
                patternUnits="userSpaceOnUse"
              >
                {Q_MARKS.map((m, i) => (
                  <text
                    key={i}
                    x={m.x * s}
                    y={m.y * s}
                    fontSize={m.size * s}
                    fontWeight="800"
                    fill={PURPLE}
                    opacity={m.o}
                    transform={`rotate(${m.rot} ${m.x * s} ${m.y * s})`}
                  >
                    ?
                  </text>
                ))}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${qid})`} />
          </svg>
        </div>
      </div>

      {/* Right third — red crosshairs */}
      <div
        className="absolute inset-y-0 right-0 w-1/3 overflow-hidden"
        style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
      >
        <div className="mfu-drift absolute inset-x-0 top-0" style={driftStyle}>
          <svg className="h-full w-full">
            <defs>
              <pattern
                id={xid}
                width={TILE_W * s}
                height={tileH}
                patternUnits="userSpaceOnUse"
              >
                {CROSSHAIRS.map((c, i) => (
                  <Crosshair key={i} {...c} s={s} />
                ))}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${xid})`} />
          </svg>
        </div>
      </div>
    </>
  );
}

// Two instances, one per breakpoint. On a phone the card covers both columns
// horizontally, so motifs only show in the ~32px bands above and below it — an
// 85px-wide slice of the full-size tile lands barely one mark there. The mobile
// instance runs the same scatter at half scale, which fits roughly four times
// as many marks into that strip. Desktop is unchanged at 1:1.
function MarksField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 sm:hidden">
        <MarkColumns s={0.5} uid="m" />
      </div>
      <div className="absolute inset-0 hidden sm:block">
        <MarkColumns s={1} uid="d" />
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

        {/* Two-up at every width — never stacked. No drop shadow: the card is
            defined by its hairline border against the cream instead, which also
            stops a dark band sitting under the box. Keeps the 24px corner. */}
        <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 overflow-hidden rounded-[24px] border border-border bg-card sm:mt-8">
          <PromoCard
            href={HOW_IT_ENDS_URL}
            ariaLabel="HowItEnds — watch today's clip (opens in new tab)"
            blurb="Daily R6 clip game"
            cta="Watch"
            light={PURPLE_LIGHT}
            base={PURPLE}
            dark={PURPLE_DARK}
            wordmark={
              <span className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3">
                <span className="text-[13px] font-extrabold tracking-tight text-ink sm:text-[26px] lg:text-[32px]">
                  HowItEnds
                </span>
                {/* Solid purple play triangle — no square, no circle. */}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
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
              <span className="flex items-center gap-1.5 sm:gap-3.5 lg:gap-4">
                {/* MF monogram — serif, dark M against a red F. Set larger than
                    the wordmark (it reads as a mark, not text) with real space
                    before it rather than butting up against "MainFinder". The
                    M/F pair keeps its own tight kerning; the gap-* above is
                    what separates mark from wordmark. */}
                <span
                  aria-hidden
                  className="shrink-0 font-serif text-[16px] font-bold leading-none tracking-[-0.08em] sm:text-[36px] lg:text-[44px]"
                >
                  <span className="text-ink">M</span>
                  <span className="text-[#d92d20]">F</span>
                </span>
                <span className="text-[13px] font-extrabold tracking-tight sm:text-[26px] lg:text-[32px]">
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
