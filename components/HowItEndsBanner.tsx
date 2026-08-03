import styles from "./HowItEndsBanner.module.css";

// Homepage cross-promo: animated CSS-only showcase card for the daily clip
// game. Pure keyframes — no video/gif/JS timers. Height is deterministic
// (aspect-ratio panel + fixed text sizes), so it reserves its space and causes
// zero CLS; the animation is transform/opacity-only (progress fill uses scaleX,
// not width) and collapses to a static "frozen" frame under reduced-motion.
export function HowItEndsBanner() {
  return (
    <div className={styles.card}>
      {/* HowItEnds "Timeline" logo mark — corner accent, decorative. */}
      <svg
        className={styles.logo}
        viewBox="0 0 100 100"
        width={34}
        height={34}
        fill="none"
        aria-hidden
      >
        <rect x="14" y="18" width="72" height="48" rx="12" stroke="#16181d" strokeWidth="6" />
        <path d="M44 32 L44 52 L60 42 Z" fill="#6d6de0" />
        <rect x="14" y="78" width="52" height="6" rx="3" fill="#16181d" />
        <rect x="70" y="78" width="16" height="6" rx="3" fill="#6d6de0" />
      </svg>

      {/* Decorative mini-player animation — hidden from a11y tree. */}
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

      <div className={styles.text}>
        <p className={styles.title}>HowItEnds</p>
        <p className={styles.subtitle}>Daily Rainbow Six Siege predict-the-clip game</p>
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
