import Link from "next/link";
import {
  autoYDomain,
  domainDaysFor,
  layoutSeries,
  pathFromLayout,
  type ChartBox,
  type SnapshotPoint,
} from "@/lib/trends";

// Multi-line effectiveness chart for a map's top peeks — pure server-rendered
// SVG + a compact legend. Each series is one peek in a distinct color. The
// caller filters to series with >= 2 points.
//
// The y-axis auto-scales to the plotted data range (see autoYDomain), so a
// peek moving 78% → 81% shows a real slope instead of a flat line near the top
// of a 0–100 axis. Tick values are labelled so the zoom level is unambiguous.
export type TrendSeries = {
  label: string;
  href: string;
  color: string;
  points: SnapshotPoint[];
};

// Wide/short aspect so the chart reads as a compact banner at full card width
// (not a tall graph that dwarfs the stats box next to it).
const BOX: ChartBox = {
  width: 480,
  height: 150,
  padL: 34,
  padR: 14,
  padT: 12,
  padB: 22,
};

// Axis ticks for a tight domain: always the min and max (so the exact zoomed
// range is labelled, e.g. 71%–84%), plus nice interior multiples (1/2/5/10…
// steps sized to the range) — dropping any that would crowd an endpoint. Narrow
// ranges get 1% or 2% steps.
function axisTicks(min: number, max: number): number[] {
  const range = Math.max(1, max - min);
  const step = [1, 2, 5, 10, 20, 25, 50].find((s) => range / s <= 5) ?? 100;
  const ticks: number[] = [min];
  const first = Math.ceil(min / step) * step;
  for (let v = first; v < max; v += step) {
    if (v - min >= step / 2 && max - v >= step / 2 && !ticks.includes(v)) {
      ticks.push(v);
    }
  }
  if (!ticks.includes(max)) ticks.push(max);
  return ticks.sort((a, b) => a - b);
}

export function MultiTrendChart({ series }: { series: TrendSeries[] }) {
  const allPoints = series.flatMap((s) => s.points);
  const domainDays = domainDaysFor(allPoints);
  const yDomain = autoYDomain(allPoints);
  const innerW = BOX.width - BOX.padL - BOX.padR;

  const yFor = (v: number) =>
    BOX.padT +
    (1 - (v - yDomain.min) / Math.max(1, yDomain.max - yDomain.min)) *
      (BOX.height - BOX.padT - BOX.padB);

  const ticks = axisTicks(yDomain.min, yDomain.max);

  return (
    <div>
      <svg
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Effectiveness over time (${yDomain.min}% to ${yDomain.max}%) for this map's top peeks`}
        preserveAspectRatio="xMidYMid meet"
      >
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

        {series.map((s) => {
          const laid = layoutSeries(s.points, BOX, domainDays, yDomain);
          const last = laid[laid.length - 1];
          return (
            <g key={s.label}>
              <path
                d={pathFromLayout(laid)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {last && <circle cx={last.x} cy={last.y} r={2.8} fill={s.color} />}
            </g>
          );
        })}

        <text
          x={BOX.padL + innerW}
          y={BOX.height - 6}
          textAnchor="end"
          fontSize={9}
          fill="#8b8d86"
        >
          Today
        </text>
      </svg>

      {/* Legend — small color swatch + (truncated) peek name, each linking to
          the peek. Kept compact so all top-5 names fit cleanly inside the card. */}
      <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {series.map((s) => (
          <li key={s.label} className="min-w-0">
            <Link
              href={s.href}
              className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-ink transition-colors hover:text-brand"
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: s.color }}
              />
              <span className="max-w-[6.5rem] truncate">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
