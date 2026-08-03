import styles from "./HowItEndsBanner.module.css";

// Homepage cross-promo: a showcase card for the daily clip game. Left column is
// a CSS-only animated player panel; right column has the branding, feature
// chips, and CTA. CSS grid gives the desktop (panel left / content right) and
// mobile (title → subtitles → panel → chips → CTA) orders from one DOM.
// Deterministic height = zero CLS; animation is transform/opacity-only and
// collapses to a static frozen frame under reduced-motion.
export function HowItEndsBanner() {
  return (
    <div className={styles.card}>
      <span className={styles.watermark} aria-hidden>
        ?
      </span>

      <div className={styles.head}>
        <div className={styles.titleRow}>
          {/* HowItEnds "Timeline" logo mark. */}
          <svg className={styles.logo} viewBox="0 0 100 100" fill="none" aria-hidden>
            <rect x="14" y="18" width="72" height="48" rx="12" stroke="#16181d" strokeWidth="6" />
            <path d="M44 32 L44 52 L60 42 Z" fill="#6d6de0" />
            <rect x="14" y="78" width="52" height="6" rx="3" fill="#16181d" />
            <rect x="70" y="78" width="16" height="6" rx="3" fill="#6d6de0" />
          </svg>
          <p className={styles.title}>HowItEnds</p>
        </div>
        <p className={styles.sub1}>DAILY RAINBOW SIX SIEGE</p>
        <p className={styles.sub2}>PREDICT-THE-CLIP GAME</p>
      </div>

      {/* Decorative CSS-only player animation. */}
      <div className={styles.panel} aria-hidden>
        <span className={styles.playTri} />
        <div className={styles.track}>
          <span className={styles.fill} />
        </div>
        <div className={styles.scanlines} />
        <span className={styles.chip}>FROZEN</span>
        <div className={styles.pills}>
          <span className={`${styles.pill} ${styles.pillClutch}`}>CLUTCH?</span>
          <span className={`${styles.pill} ${styles.pillDies}`}>DIES?</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.features}>
          <div className={styles.feature}>
            {/* clock-arrow */}
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
            {/* head outline */}
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
              Guess the ending<small>Before it happens</small>
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
