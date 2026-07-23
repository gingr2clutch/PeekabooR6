import {
  autoYDomain,
  axisTicks,
  domainDaysFor,
  layoutSeries,
  pathFromLayout,
  type ChartBox,
  type SnapshotPoint,
} from "@/lib/trends";

// Single-peek effectiveness line chart — pure server-rendered SVG (no
// hydration, fully crawlable). Orange line, subtle grid, cream theme. The
// caller guarantees >= 2 points (fewer shows "coming soon" instead).
const BOX: ChartBox = {
  width: 340,
  height: 150,
  padL: 34,
  padR: 12,
  padT: 12,
  padB: 22,
};

export function TrendChart({
  points,
  color = "#f2640e",
}: {
  points: SnapshotPoint[];
  color?: string;
}) {
  const domainDays = domainDaysFor(points);
  // Auto-zoom the y-axis to this peek's own low→high so day-to-day moves are
  // actually visible (same tight-fit + labelled ticks as the multi-line chart).
  const yDomain = autoYDomain(points);
  const laid = layoutSeries(points, BOX, domainDays, yDomain);
  const path = pathFromLayout(laid);
  const innerW = BOX.width - BOX.padL - BOX.padR;

  const yFor = (v: number) =>
    BOX.padT +
    (1 - (v - yDomain.min) / Math.max(1, yDomain.max - yDomain.min)) *
      (BOX.height - BOX.padT - BOX.padB);

  const ticks = axisTicks(yDomain.min, yDomain.max);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Effectiveness over time (${yDomain.min}% to ${yDomain.max}%)`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Horizontal grid + labelled y ticks across the auto-scaled domain. */}
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={BOX.padL}
            x2={BOX.width - BOX.padR}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke="#e2e0d5"
            strokeWidth={1}
          />
          <text
            x={BOX.padL - 6}
            y={yFor(v) + 3}
            textAnchor="end"
            fontSize={9}
            fill="#8b8d86"
          >
            {v}%
          </text>
        </g>
      ))}

      {/* The line. */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Point dots with accessible/hover titles. */}
      {laid.map((pt) => (
        <circle key={pt.point.date} cx={pt.x} cy={pt.y} r={2.6} fill={color}>
          <title>{`${pt.point.date}: ${pt.point.pct}% (${pt.point.grade})`}</title>
        </circle>
      ))}

      {/* X endpoints: oldest date (left) and Today (right). */}
      <text
        x={BOX.padL}
        y={BOX.height - 6}
        textAnchor="start"
        fontSize={9}
        fill="#8b8d86"
      >
        {first.date.slice(5)}
      </text>
      <text
        x={BOX.padL + innerW}
        y={BOX.height - 6}
        textAnchor="end"
        fontSize={9}
        fill="#8b8d86"
      >
        Today
      </text>
      {/* Screen-reader summary of the span. */}
      <desc>{`Effectiveness from ${first.pct}% on ${first.date} to ${last.pct}% on ${last.date}.`}</desc>
    </svg>
  );
}
