"use client";

import Link from "next/link";
import type { PeekType } from "@/lib/db";
import { peekTypeMeta } from "@/lib/peek-types";

type Props = {
  slug: string;
  name: string;
  xPct: number;
  yPct: number;
  number: number;
  peekType: PeekType;
  isNew?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
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
  if (yPct < 14) return { side: "below", align: alignFor(xPct) };
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
  if (placement.side === "left") {
    return "right-full mr-2 top-1/2 -translate-y-1/2";
  }
  return "left-full ml-2 top-1/2 -translate-y-1/2";
}

// A numbered pin overlaid on the bird's-eye view. Two interaction models:
//   - Devices with a fine pointer + hover: click navigates straight to
//     /peeks/<slug>, hovering shows a floating tooltip with the name.
//   - Touch devices: clicking is intercepted and toggles selection on a
//     parent FloorView, which surfaces a fixed detail card below the
//     map. The tooltip is hidden entirely so we never see a clipped or
//     z-fighting label.
export function PeekPin({
  slug,
  name,
  xPct,
  yPct,
  number,
  peekType,
  isNew = false,
  isSelected = false,
  onSelect,
}: Props) {
  const placement = tooltipPlacement(xPct, yPct);
  const type = peekTypeMeta(peekType);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Always stop propagation so the parent backdrop click (which
    // deselects) doesn't fire when tapping directly on a pin.
    e.stopPropagation();
    // On touch devices intercept the navigation so the tap toggles
    // selection instead. Desktop / fine-pointer users still navigate
    // immediately via Link's default behavior.
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      e.preventDefault();
      onSelect?.();
    }
  }

  // Active or hovered pins float above siblings so their tooltip /
  // highlight ring is never covered by adjacent pins.
  const zCls = isSelected ? "z-40" : "z-20 hover:z-40";
  const selectedExtra = isSelected ? `scale-[1.2] ${type.selectedShadow}` : "";

  // White ring against the pin colour, dark hairline outside the ring so the
  // pin still pops on light/sandy maps (Border especially), and a regular
  // drop shadow for lift. Each glow on hover/select is type-coloured.
  const pinShadow =
    "shadow-[0_0_0_1px_rgba(26,26,26,0.85),0_2px_4px_rgba(0,0,0,0.35)]";

  return (
    <Link
      href={`/peeks/${slug}`}
      onClick={handleClick}
      className={`group absolute ${zCls} flex -translate-x-1/2 -translate-y-1/2 items-center justify-center`}
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      aria-label={`${number}. ${name} — ${type.label}`}
      aria-pressed={isSelected || undefined}
    >
      <span className="absolute h-12 w-12 rounded-full" />
      <span
        className={`relative flex h-8 w-8 flex-col items-center justify-center rounded-full ${type.pinBg} ${type.pinText} ring-2 ring-white ${pinShadow} transition-all duration-150 group-hover:scale-[1.2] ${type.hoverShadow} md:h-9 md:w-9 ${selectedExtra}`}
      >
        <span className="text-[8px] font-bold leading-none tracking-wide">
          {type.letter}
        </span>
        <span className="mt-px text-[11px] font-bold leading-none md:text-xs">
          {number}
        </span>
      </span>
      {/* Floating tooltip — desktop hover only. Hidden on mobile so we
          rely on the fixed detail card surfaced by FloorView. */}
      <span
        className={`pointer-events-none absolute z-50 hidden max-w-[140px] rounded-btn bg-ink px-2.5 py-1 text-center text-[13px] leading-tight text-white opacity-0 shadow transition-opacity duration-150 [hyphens:none] group-hover:opacity-100 md:block md:text-xs ${tooltipClass(placement)}`}
      >
        {name}
        {isNew && (
          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-500 px-1 py-px align-middle text-[8px] font-semibold uppercase tracking-wider text-white">
            New
          </span>
        )}
      </span>
    </Link>
  );
}
