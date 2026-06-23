import { gradeColor } from "@/lib/rate";

const SIZES = {
  sm: "h-6 min-w-6 px-1.5 text-sm",
  lg: "h-12 min-w-12 px-3 text-3xl md:h-16 md:min-w-16 md:text-5xl",
} as const;

// Solid grade badge coloured from the shared worse→better scale by the grade's
// position on the bar (`score`), so the letter colour always matches the bar.
// Pure presentational — safe in both server and client components.
export function GradeBadge({
  label,
  score,
  size = "sm",
  className = "",
}: {
  label: string;
  score: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const color = gradeColor(score);
  return (
    <span
      aria-label={`Grade ${label}`}
      style={{ backgroundColor: color, borderColor: color }}
      className={`inline-flex items-center justify-center rounded-btn border font-bold leading-none tracking-tight text-white ${SIZES[size]} ${className}`}
    >
      {label}
    </span>
  );
}
