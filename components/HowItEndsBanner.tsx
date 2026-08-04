import styles from "./HowItEndsBanner.module.css";

// Homepage cross-promo showcase card for the daily clip game. The left tile is
// a static app-icon (the CSS animation is paused — its keyframes are kept,
// commented, in the stylesheet to re-attach later). Deterministic height = zero
// CLS. Desktop keeps its structure; mobile (<480px) restacks.
export function HowItEndsBanner() {
  return (
    <div className={styles.card}>
      <span className={styles.watermark} aria-hidden>
        ?
      </span>

      {/* Timeline logo mark, top-right corner. */}
      <svg className={styles.cornerLogo} viewBox="0 0 100 100" fill="none" aria-hidden>
        <rect x="14" y="18" width="72" height="48" rx="12" stroke="#16181d" strokeWidth="6" />
        <path d="M44 32 L44 52 L60 42 Z" fill="#6d6de0" />
        <rect x="14" y="78" width="52" height="6" rx="3" fill="#16181d" />
        <rect x="70" y="78" width="16" height="6" rx="3" fill="#6d6de0" />
      </svg>

      {/* Static app-icon tile (animation removed for now). */}
      <div className={styles.tile} aria-hidden>
        <svg className={styles.tileGlyph} viewBox="0 0 100 100" fill="none">
          <rect x="16" y="28" width="68" height="44" rx="13" stroke="#fff" strokeWidth="8" />
          <path d="M42 40 L42 60 L62 50 Z" fill="#fff" />
        </svg>
      </div>

      <div className={styles.head}>
        <p className={styles.title}>HowItEnds</p>
        <p className={styles.sub1}>DAILY RAINBOW SIX SIEGE</p>
        <p className={styles.sub2}>PREDICT-THE-CLIP GAME</p>
      </div>

      <div className={styles.body}>
        <div className={styles.features}>
          <div className={styles.feature}>
            {/* clock */}
            <svg
              width={17}
              height={17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 6 18 6" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            <span className={styles.featText}>
              New clip<small>Every 24 hours</small>
            </span>
          </div>

          <div className={styles.featDivider} />

          <div className={styles.feature}>
            {/* person */}
            <svg
              width={17}
              height={17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
            </svg>
            <span className={styles.featText}>
              Call the ending<small>Before it lands</small>
            </span>
          </div>
        </div>

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
