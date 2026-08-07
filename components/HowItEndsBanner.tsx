import styles from "./HowItEndsBanner.module.css";

// Homepage cross-promo showcase card for the daily clip game. Leans hard on the
// HowItEnds purple over a raised near-white surface so it reads as a product
// feature against peekaboo's cream page, not an ad banner. The left tile is a
// real gameplay still (public/howitends-promo-thumb.jpg) under a translucent "?"
// — the outcome is the thing you're being invited to guess. The ambient
// dot-grid behind the content is radially masked so it dissolves at the card
// edges. Deterministic height = zero CLS.
export function HowItEndsBanner() {
  return (
    <div className={styles.card}>
      {/* Ambient purple dot-grid: one even 26px lattice, scattered across five
          phase groups so the shimmer reads as individual dots catching light
          rather than a sheet pulsing in unison.

          Two nested wrappers on purpose. A single radial mask cannot hug all
          four edges of a rectangle — the corners sit ~41% further from centre
          than the side midpoints, so any radius that fills the corners spills
          dots through the sides. Instead the outer element fades horizontally
          and the inner fades vertically; masks on nested elements multiply, so
          the result dims toward every edge and every corner without needing
          mask-composite. Opacity-only (composited, no repaint) and absolutely
          positioned, so it can neither jank nor shift layout. */}
      <div className={styles.dots} aria-hidden>
        <div className={styles.dotsInner}>
          <span className={styles.dots1} />
          <span className={styles.dots2} />
          <span className={styles.dots3} />
          <span className={styles.dots4} />
          <span className={styles.dots5} />
        </div>
      </div>

      {/* Timeline logo mark, top-right corner. */}
      <svg className={styles.cornerLogo} viewBox="0 0 100 100" fill="none" aria-hidden>
        <rect x="14" y="18" width="72" height="48" rx="12" stroke="#16181d" strokeWidth="6" />
        <path d="M44 32 L44 52 L60 42 Z" fill="#6d6de0" />
        <rect x="14" y="78" width="52" height="6" rx="3" fill="#16181d" />
        <rect x="70" y="78" width="16" height="6" rx="3" fill="#6d6de0" />
      </svg>

      {/* Gameplay still, framed like a video poster: TODAY badge, translucent
          "?" over the action, player-icon corner accent. Decorative, so the
          still is a CSS background — if the screenshot is ever missing the tile
          degrades to its dark poster treatment, not a broken-image glyph. */}
      <div className={styles.tile} aria-hidden>
        {/* Drawn in a 100x100 viewBox so the mark scales with the tile at every
            breakpoint instead of needing a per-size font-size. The thin dark
            stroke keeps it legible over bright frames without resorting to a
            glow. */}
        <svg className={styles.mysteryMark} viewBox="0 0 100 100" aria-hidden>
          <text
            x="50"
            y="53"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
            fontSize="88"
            fontWeight="900"
            fill="#6d6de0"
            fillOpacity="0.78"
            stroke="rgba(16,17,24,0.38)"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            ?
          </text>
        </svg>
        <span className={styles.chip}>TODAY</span>
        <span className={styles.playerIcon}>
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="2.5" y="5" width="19" height="14" rx="3" fill="rgba(74,74,181,0.82)" />
            <path d="M10.4 9.6 L15.2 12 L10.4 14.4 Z" fill="#fff" />
          </svg>
        </span>
      </div>

      <div className={styles.head}>
        {/* Two-tone wordmark, matching how-it-ends.com: the middle "It" carries
            the purple. The spans add no whitespace, so the accessible name is
            still the single word "HowItEnds". */}
        <p className={styles.title}>
          How<span className={styles.titleAccent}>It</span>Ends
        </p>
        {/* Broken 2-and-2 — "DAILY RAINBOW" over "SIX SIEGE" — rather than left
            to wrap, so the break holds at every width. The <br> is a line break
            only: the text still reads as one phrase to screen readers. */}
        <p className={styles.sub1}>
          DAILY RAINBOW
          <br />
          SIX SIEGE GAME
        </p>
      </div>

      <div className={styles.body}>
        <a
          className={styles.cta}
          href="https://how-it-ends.com"
          target="_blank"
          rel="noopener"
        >
          PLAY TODAY&apos;S CLIP →
        </a>
      </div>
    </div>
  );
}
