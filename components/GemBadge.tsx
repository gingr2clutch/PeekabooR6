// The "hidden gem" mark for a sitewide-underrated peek — a small faceted
// brilliant-cut diamond in our teal, NOT the 💎 emoji. One consistent component
// used on every peek card/row (map lists, ranked rows, /underrated). Kept tiny
// so it sits beside the grade badge without crowding it.
export function GemBadge({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Underrated hidden gem"
      title="Underrated hidden gem"
      className={`inline-flex shrink-0 ${className ?? ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden>
        {/* Stone body */}
        <path d="M6 3h12l4 6-10 12L2 9z" fill="#3f978b" />
        {/* Facets — soft white lines: girdle, crown edges, pavilion. */}
        <path
          d="M2 9h20M6 3l3 6M18 3l-3 6M9 9h6M9 9l3 12M15 9l-3 12"
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.7}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
