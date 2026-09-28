import { gradeTierColor } from "@/lib/rate";

const SIZES = {
  sm: "h-6 min-w-6 px-1.5 text-sm",
  // Overlay badges sit on artwork and have to read at a glance from across the
  // card. A size key rather than a className override: SIZES and className are
  // concatenated into one class list, so an override like "h-10" ties with
  // "h-6" on specificity and loses or wins on stylesheet order, not intent.
  md: "h-11 min-w-11 px-3 text-[28px]",
  lg: "h-12 min-w-12 px-3 text-3xl md:h-16 md:min-w-16 md:text-5xl",
} as const;

// Solid grade badge coloured by its GRADE TIER (S/A/B/C) via the shared
// gradeTierColor, so every +/base/- within a tier shares one color site-wide.
// Pure presentational — safe in both server and client components.
export function GradeBadge({
  label,
  size = "sm",
  className = "",
}: {
  label: string;
  // Accepted for back-compat with existing call sites; the color now derives
  // from the grade tier (label), not the score.
  score?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const color = gradeTierColor(label);
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
