import type { EffectivenessLevel } from "@/lib/rate";

// Colour pairs per effectiveness band: a bordered pill for chips, and a
// standalone text colour for the large hero figure.
const STYLES: Record<EffectivenessLevel, { pill: string; text: string }> = {
  High: {
    pill: "text-emerald-700 bg-emerald-50 border-emerald-200",
    text: "text-emerald-600",
  },
  Reliable: {
    pill: "text-sky-700 bg-sky-50 border-sky-200",
    text: "text-sky-600",
  },
  Situational: {
    pill: "text-amber-700 bg-amber-50 border-amber-200",
    text: "text-amber-600",
  },
  Risky: {
    pill: "text-rose-700 bg-rose-50 border-rose-200",
    text: "text-rose-600",
  },
};

export function effectivenessTextColor(level: EffectivenessLevel): string {
  return STYLES[level].text;
}

// Pill rendering of an effectiveness band. Pure presentational — safe in both
// server and client components.
export function EffectivenessBadge({
  level,
  className = "",
}: {
  level: EffectivenessLevel;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-btn border px-2 py-0.5 text-xs font-medium ${STYLES[level].pill} ${className}`}
    >
      {level}
    </span>
  );
}
