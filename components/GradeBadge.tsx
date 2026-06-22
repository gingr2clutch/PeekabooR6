import type { Grade } from "@/lib/rate";

// Tier-list badge per grade, strongest → muted, using existing design tokens:
// S is a solid brand fill (the headline rating), A/B are tinted, C is muted.
const STYLES: Record<Grade, string> = {
  S: "bg-brand text-white border-brand",
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-amber-50 text-amber-700 border-amber-200",
  C: "bg-bg text-muted border-border",
};

const SIZES = {
  sm: "h-6 min-w-6 px-1.5 text-sm",
  lg: "h-12 min-w-12 px-3 text-3xl md:h-16 md:min-w-16 md:text-5xl",
} as const;

// Pure presentational — safe in both server and client components.
export function GradeBadge({
  grade,
  size = "sm",
  className = "",
}: {
  grade: Grade;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-label={`Grade ${grade}`}
      className={`inline-flex items-center justify-center rounded-btn border font-bold leading-none tracking-tight ${STYLES[grade]} ${SIZES[size]} ${className}`}
    >
      {grade}
    </span>
  );
}
