import Link from "next/link";
import {
  autoYDomain,
  axisTicks,
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
const BOX_DEFAULT: ChartBox = {
  width: 480,
  height: 150,
  padL: 34,
  padR: 14,
  padT: 12,
  padB: 22,
};

// endLabels variant: the names sit where the legend used to, so the plot gives
// up horizontal room for them — a wider overall box keeps the drawn plot close
// to its original width instead of squeezing the lines into the left half.
//
// Taller too. The labelled chart sits beside the "This week's top 5" card in a
// grid row, and dropping the legend took height out of the chart card that the
// list card still has, leaving the plot stranded at the top of a mostly empty
// box. The extra height also buys the labels vertical room to spread into
// before they start colliding.
const BOX_LABELLED: ChartBox = {
  ...BOX_DEFAULT,
  width: 660,
  height: 250,
  padR: 186,
};

// Smallest vertical gap between two end labels before they read as one block.
const LABEL_MIN_GAP = 11;

// Push labels apart without moving the lines they belong to.
//
// Lines that converge — which is exactly what a top-5 chart does near "today" —
// would otherwise stack their names on top of each other. Each label starts at
// its line's last y, then the set is spread: walk top-down enforcing the gap,
// then bottom-up to pull anything that overran the bottom edge back inside.
// Two passes settle it because the first only ever moves labels down and the
// second only ever moves them up.
function spreadLabels(
  items: { y: number }[],
  minY: number,
  maxY: number
): number[] {
  const order = items
    .map((it, i) => ({ i, y: it.y }))
    .sort((a, b) => a.y - b.y);

  for (let k = 0; k < order.length; k++) {
    const floor = k === 0 ? minY : order[k - 1].y + LABEL_MIN_GAP;
    if (order[k].y < floor) order[k].y = floor;
  }
  for (let k = order.length - 1; k >= 0; k--) {
    const ceil = k === order.length - 1 ? maxY : order[k + 1].y - LABEL_MIN_GAP;
    if (order[k].y > ceil) order[k].y = ceil;
  }

  const out = new Array<number>(items.length);
  for (const o of order) out[o.i] = o.y;
  return out;
}

export function MultiTrendChart({
  series,
  endLabels = false,
  className = "",
}: {
  series: TrendSeries[];
  // Applied to the component's own root, so a caller that wants the chart on
  // one breakpoint only does not have to add a wrapper element around it.
  className?: string;
  // Opt-in: name each line at its right end and drop the legend. Off by
  // default so the /trends page and every mobile render keep today's chart —
  // the labels need width this component does not always have.
  endLabels?: boolean;
}) {
  const BOX = endLabels ? BOX_LABELLED : BOX_DEFAULT;
  const allPoints = series.flatMap((s) => s.points);
  const domainDays = domainDaysFor(allPoints);
  const yDomain = autoYDomain(allPoints);
  const innerW = BOX.width - BOX.padL - BOX.padR;

  const yFor = (v: number) =>
    BOX.padT +
    (1 - (v - yDomain.min) / Math.max(1, yDomain.max - yDomain.min)) *
      (BOX.height - BOX.padT - BOX.padB);

  const ticks = axisTicks(yDomain.min, yDomain.max);

  // Laid out once, up front: the label pass needs every line's end point before
  // it can place any of them, and the draw pass would otherwise redo the work.
  const laidAll = series.map((s) => layoutSeries(s.points, BOX, domainDays, yDomain));
  const labelYs = endLabels
    ? spreadLabels(
        laidAll.map((l) => ({ y: l.length ? l[l.length - 1].y : BOX.padT })),
        BOX.padT + 4,
        BOX.height - BOX.padB - 2
      )
    : [];

  return (
    <div className={className}>
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

        {series.map((s, i) => {
          const laid = laidAll[i];
          const last = laid[laid.length - 1];
          const ly = labelYs[i];
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
              {endLabels && last && (
                <>
                  {/* Leader from the line's end to its displaced label, so a
                      spread label still reads as belonging to its line. */}
                  <line
                    x1={last.x + 3}
                    y1={last.y}
                    x2={BOX.width - BOX.padR + 6}
                    y2={ly}
                    stroke={s.color}
                    strokeWidth={1}
                    opacity={0.55}
                  />
                  <text
                    x={BOX.width - BOX.padR + 10}
                    y={ly + 3}
                    textAnchor="start"
                    fontSize={10}
                    fontWeight={600}
                    fill="#2e3029"
                  >
                    {s.label}
                  </text>
                </>
              )}
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
          the peek. Kept compact so all top-5 names fit cleanly inside the card.
          Suppressed under endLabels, where the names are already on the lines. */}
      {!endLabels && (
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
      )}
    </div>
  );
}
