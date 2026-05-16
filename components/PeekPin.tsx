import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  xPct: number;
  yPct: number;
  number: number;
  isNew?: boolean;
};

type Placement =
  | { side: "below" | "above"; align: "start" | "center" | "end" }
  | { side: "left" | "right" };

// Pick where the tooltip should sit relative to the pin so it never spills
// off the bird's-eye image. Pins near the right edge get a left tooltip,
// near the bottom an above tooltip, and so on. For below/above placements we
// also choose start/center/end horizontal alignment so a near-edge pin
// doesn't push the tooltip past the image bounds.
function tooltipPlacement(xPct: number, yPct: number): Placement {
  if (yPct > 78) return { side: "above", align: alignFor(xPct) };
  if (xPct > 82) return { side: "left" };
  if (xPct < 12) return { side: "right" };
  return { side: "below", align: alignFor(xPct) };
}

function alignFor(xPct: number): "start" | "center" | "end" {
  if (xPct < 22) return "start";
  if (xPct > 78) return "end";
  return "center";
}

function tooltipClass(placement: Placement): string {
  // Vertical placements (below/above) — use horizontal alignment.
  if (placement.side === "below" || placement.side === "above") {
    const v =
      placement.side === "below" ? "top-full mt-2" : "bottom-full mb-2";
    if (placement.align === "start") {
      // Tooltip's left edge sits at the pin's centre.
      return `${v} left-1/2`;
    }
    if (placement.align === "end") {
      // Tooltip's right edge sits at the pin's centre.
      return `${v} right-1/2`;
    }
    return `${v} left-1/2 -translate-x-1/2`;
  }
  // Horizontal placements — vertically centred against the pin.
  if (placement.side === "left") {
    return "right-full mr-2 top-1/2 -translate-y-1/2";
  }
  return "left-full ml-2 top-1/2 -translate-y-1/2";
}

// A numbered pin overlaid on the bird's-eye view. Position is the centre of
// the dot. The hit target wraps the visible circle so phones aren't fiddly:
// 36px on mobile, 32px from sm and up.
export function PeekPin({
  slug,
  name,
  xPct,
  yPct,
  number,
  isNew = false,
}: Props) {
  const placement = tooltipPlacement(xPct, yPct);

  return (
    <Link
      href={`/peeks/${slug}`}
      className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      aria-label={`${number}. ${name}`}
    >
      <span className="absolute h-12 w-12 rounded-full" />
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white shadow-md ring-2 ring-white transition-all duration-150 group-hover:scale-[1.2] group-hover:shadow-[0_0_12px_rgba(255,106,0,0.6)] md:h-8 md:w-8 md:text-xs">
        {number}
      </span>
      <span
        className={`pointer-events-none absolute z-20 max-w-[140px] rounded-btn bg-ink px-2.5 py-1 text-center text-[13px] leading-tight text-white opacity-0 shadow transition-opacity duration-150 [hyphens:none] group-hover:opacity-100 md:text-xs ${tooltipClass(placement)}`}
      >
        {name}
        {isNew && (
          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-500 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white align-middle">
            New
          </span>
        )}
      </span>
    </Link>
  );
}
