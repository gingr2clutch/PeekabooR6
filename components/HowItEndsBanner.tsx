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
