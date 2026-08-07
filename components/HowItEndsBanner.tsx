import styles from "./HowItEndsBanner.module.css";

// Homepage cross-promo showcase card for the daily clip game. HowItEnds purple
// on a raised white surface so it reads as a product feature against peekaboo's
// cream page, not an ad banner. The left tile is a real gameplay still
// (public/howitends-promo-thumb.jpg) dressed as a poster frame; the ambient
// dot-grid behind the content is radially masked so it dissolves at the card
// edges. Deterministic height = zero CLS.
export function HowItEndsBanner() {
  return (
    <div className={styles.card}>
      {/* Ambient purple dot-grid. Three interleaved layers twinkle on their own
          slow, mutually-prime cycles so no pulse is ever in lockstep. The
          wrapper's radial mask fades every layer to nothing before the borders,
          so the grid has no hard edge. Opacity-only (composited, no repaint)
          and absolutely positioned, so it can neither jank nor shift layout. */}
      <div className={styles.dots} aria-hidden>
        <span className={styles.dotsA} />
        <span className={styles.dotsB} />
        <span className={styles.dotsC} />
      </div>

      {/* Timeline logo mark, top-right corner. */}
      <svg className={styles.cornerLogo} viewBox="0 0 100 100" fill="none" aria-hidden>
        <rect x="14" y="18" width="72" height="48" rx="12" stroke="#16181d" strokeWidth="6" />
        <path d="M44 32 L44 52 L60 42 Z" fill="#6d6de0" />
        <rect x="14" y="78" width="52" height="6" rx="3" fill="#16181d" />
        <rect x="70" y="78" width="16" height="6" rx="3" fill="#6d6de0" />
      </svg>

      {/* Gameplay still, framed like a video poster: TODAY badge + player-icon
          corner accent. Decorative, so the still is a CSS background — if the
          screenshot is ever missing the tile degrades to its dark poster
          treatment instead of a broken-image glyph. */}
      <div className={styles.tile} aria-hidden>
        <span className={styles.chip}>TODAY</span>
        <span className={styles.playerIcon}>
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="2.5" y="5" width="19" height="14" rx="3" fill="rgba(0,0,0,0.55)" />
            <path d="M10.4 9.6 L15.2 12 L10.4 14.4 Z" fill="#fff" />
          </svg>
        </span>
      </div>

      <div className={styles.head}>
        <p className={styles.title}>HowItEnds</p>
        <p className={styles.sub1}>DAILY RAINBOW SIX SIEGE</p>
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
        <span className={styles.streak}>
          <span aria-hidden>🔥</span> 1 DAY STREAK
        </span>
      </div>
    </div>
  );
}
