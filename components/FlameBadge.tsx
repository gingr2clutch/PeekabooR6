// The "top peek" mark — one of the very best peeks sitewide. A small two-tone
// flame in our brand orange, matching GemBadge's filled-glyph style. Shared:
// used on cards (via PeekBadge) and, scaled down, on map pins.
export function FlameBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Top peek"
      className={`inline-block shrink-0 ${className ?? "h-3.5 w-3.5 md:h-4 md:w-4"}`}
    >
      <title>Top peek</title>
      {/* Outer flame */}
      <path
        d="M12 2c3.5 3.5 5.5 6.2 5.5 9.6a5.5 5.5 0 0 1-11 0c0-1.6.6-3 1.6-4.2.2 1.2.9 1.9 1.8 2.1C9.6 7.4 10.6 4.7 12 2z"
        fill="#f2640e"
      />
      {/* Inner flame */}
      <path
        d="M12 11c1.7 1.7 2.6 3 2.6 4.4a2.6 2.6 0 0 1-5.2 0c0-1 .4-1.8 1.1-2.5 0 .7.3 1.2.8 1.4C11 13 11.3 12 12 11z"
        fill="#ffb454"
      />
    </svg>
  );
}
