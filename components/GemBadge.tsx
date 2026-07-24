// The "hidden gem" mark for a sitewide-underrated peek — a small faceted
// brilliant-cut diamond in our teal, NOT the 💎 emoji. One consistent glyph used
// everywhere a gem is surfaced (map lists, ranked rows, /underrated, map pins).
// Pass `className` to size it for the context (defaults to a card-row size).
export function GemBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Underrated hidden gem"
      className={`inline-block shrink-0 ${className ?? "h-3.5 w-3.5 md:h-4 md:w-4"}`}
    >
      <title>Underrated hidden gem</title>
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
  );
}
