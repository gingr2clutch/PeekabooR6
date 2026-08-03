import styles from "./HowItEndsBanner.module.css";

// Homepage cross-promo: animated CSS-only showcase card for the daily clip
// game. Pure keyframes — no video/gif/JS timers. Height is deterministic
// (aspect-ratio panel + fixed text sizes), so it reserves its space and causes
// zero CLS; the animation is transform/opacity-only (progress fill uses scaleX,
// not width) and collapses to a static "frozen" frame under reduced-motion.
export function HowItEndsBanner() {
  return (
    <div className={styles.card}>
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
        <p className={styles.subtitle}>Daily predict-the-clip game</p>
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
