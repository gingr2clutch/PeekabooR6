// The "beginner-friendly" mark — a small two-tone green sprout, matching the
// filled-glyph style of GemBadge/FlameBadge. Shown on peek CARDS only (a low
// bar peeks meet often, so it would be too common on pins). Green is drawn from
// the palette's S-grade / low-risk greens so it reads as "safe / easy".
export function BeginnerBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Beginner-friendly"
      className={`inline-block shrink-0 ${className ?? "h-3.5 w-3.5 md:h-4 md:w-4"}`}
    >
      <title>Beginner-friendly</title>
      {/* Stem */}
      <path
        d="M12 21v-9"
        fill="none"
        stroke="#1f9d55"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Left leaf (lower) */}
      <path d="M12 15C8.7 15 6 12.8 5.5 9 8.8 9 11.5 11 12 15z" fill="#1f9d55" />
      {/* Right leaf (upper) */}
      <path d="M12 12c.4-3.3 2.8-5.3 5.7-5.3C17.3 9.9 15 12 12 12z" fill="#43b877" />
    </svg>
  );
}
