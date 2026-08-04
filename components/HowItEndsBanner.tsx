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

      {/* Animated video tile: play -> freeze -> CLUTCH?/DIES? -> loop. */}
      <div className={styles.tile} aria-hidden>
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
        {/* Tactical lock-on reticle + glitch flash at the freeze moment. */}
        <span className={styles.flash} />
        <svg className={styles.reticle} viewBox="0 0 100 100" fill="none" aria-hidden>
          <circle cx="50" cy="50" r="28" stroke="#f2640e" strokeWidth="4" />
          <line x1="50" y1="8" x2="50" y2="24" stroke="#f2640e" strokeWidth="4" />
          <line x1="50" y1="76" x2="50" y2="92" stroke="#f2640e" strokeWidth="4" />
          <line x1="8" y1="50" x2="24" y2="50" stroke="#f2640e" strokeWidth="4" />
          <line x1="78" y1="50" x2="92" y2="50" stroke="#f2640e" strokeWidth="4" />
          <circle cx="50" cy="50" r="3" fill="#f2640e" />
        </svg>
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
      </div>
    </div>
  );
}
