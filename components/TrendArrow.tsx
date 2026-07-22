import type { TrendDirection } from "@/lib/trends";

// Tiny trend indicator shown next to a grade: ▲ rising (green), ▼ falling
// (red-orange), – stable (muted). Pure/server-safe. Render only when a
// direction exists (caller passes null → nothing) so cold-start peeks show no
// arrow at all.
const MAP: Record<
  TrendDirection,
  { glyph: string; color: string; label: string }
> = {
  up: { glyph: "▲", color: "#1f9d55", label: "rising" },
  down: { glyph: "▼", color: "#d1573a", label: "falling" },
  stable: { glyph: "–", color: "#8b8d86", label: "stable" },
};

export function TrendArrow({
  direction,
  className = "",
}: {
  direction: TrendDirection | null | undefined;
  className?: string;
}) {
  if (!direction) return null;
  const { glyph, color, label } = MAP[direction];
  return (
    <span
      role="img"
      aria-label={`Trend ${label}`}
      title={`Trend ${label} (last 7 days vs prior 7)`}
      style={{ color }}
      className={`inline-flex items-center text-[0.85em] font-bold leading-none ${className}`}
    >
      {glyph}
    </span>
  );
}
