import Link from "next/link";
import {
  domainDaysFor,
  layoutSeries,
  pathFromLayout,
  type ChartBox,
  type SnapshotPoint,
} from "@/lib/trends";

// Multi-line effectiveness chart for a map's top peeks — pure server-rendered
// SVG + a compact legend. Each series is one peek in a distinct color. The
// caller filters to series with >= 2 points.
export type TrendSeries = {
  label: string;
  href: string;
  color: string;
  points: SnapshotPoint[];
};

const BOX: ChartBox = {
  width: 360,
  height: 180,
  padL: 30,
  padR: 12,
  padT: 12,
  padB: 22,
};

const GRID = [0, 25, 50, 75, 100];

export function MultiTrendChart({ series }: { series: TrendSeries[] }) {
  // Shared X domain across every series so lines are comparable.
  const allPoints = series.flatMap((s) => s.points);
  const domainDays = domainDaysFor(allPoints);
  const innerW = BOX.width - BOX.padL - BOX.padR;

  const yFor = (v: number) =>
    BOX.padT + (1 - v / 100) * (BOX.height - BOX.padT - BOX.padB);

  return (
    <div>
      <svg
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Effectiveness over time for this map's top peeks"
        preserveAspectRatio="xMidYMid meet"
      >
        {GRID.map((v) => (
          <g key={v}>
            <line
              x1={BOX.padL}
              x2={BOX.width - BOX.padR}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#e2e0d5"
              strokeWidth={1}
            />
            {(v === 0 || v === 50 || v === 100) && (
              <text
                x={BOX.padL - 6}
                y={yFor(v) + 3}
                textAnchor="end"
                fontSize={9}
                fill="#8b8d86"
              >
                {v}
              </text>
            )}
          </g>
        ))}

        {series.map((s) => {
          const laid = layoutSeries(s.points, BOX, domainDays);
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

      {/* Legend — color swatch + peek name, each linking to the peek. */}
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink transition-colors hover:text-brand"
            >
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: s.color }}
              />
              <span className="max-w-[10rem] truncate">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
