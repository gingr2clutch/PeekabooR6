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
      {/* Outer flame — fuller/bolder so it reads at a glance next to the grade. */}
      <path
        d="M12 1.6c1.3 4.3 3.7 5.9 5.1 8.5.9 1.6 1.4 3.2 1.4 4.7a6.5 6.5 0 0 1-13 0c0-2.3 1-4.3 2.7-5.7-.1 1.8.8 2.9 2 3.3C9.2 8.9 10.2 5.2 12 1.6z"
        fill="#f2640e"
      />
      {/* Inner flame */}
      <path
        d="M12 10c2 2 3.1 3.6 3.1 5.3a3.1 3.1 0 0 1-6.2 0c0-1.2.5-2.2 1.4-3 0 .9.4 1.6 1.1 1.8-.5-1.5.1-2.9 1.6-4.1z"
        fill="#ffb454"
      />
    </svg>
  );
}
