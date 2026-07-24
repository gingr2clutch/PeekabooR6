"use client";

import Link from "next/link";
import { GemBadge } from "@/components/GemBadge";

type Props = {
  slug: string;
  name: string;
  xPct: number;
  yPct: number;
  number: number;
  isNew?: boolean;
  hasTiktok?: boolean;
  ratingText?: string;
  // One of the sitewide top-10 hidden gems — gets a small gem badge on the pin.
  isGem?: boolean;
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
  isNew = false,
  hasTiktok = false,
  ratingText,
  isGem = false,
  isSelected = false,
  onSelect,
}: Props) {
  const placement = tooltipPlacement(xPct, yPct);

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
  // Selected pins grow, pick up a brand-orange ring, and emit a soft glow.
  // Transitions animate via .peek-pin-pressable so it eases in smoothly.
  const ringCls = isSelected ? "ring-[3px] ring-brand" : "ring-2 ring-white";
  const selectedStyle = isSelected
    ? "scale-[1.2] shadow-[0_0_16px_rgba(242,100,14,0.55)]"
    : "";

  return (
    <Link
      href={`/peeks/${slug}`}
      onClick={handleClick}
      className={`group absolute ${zCls} flex -translate-x-1/2 -translate-y-1/2 items-center justify-center`}
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      aria-label={`${number}. ${name}`}
      aria-pressed={isSelected || undefined}
    >
      <span className="absolute h-12 w-12 rounded-full" />
      <span
        className="peek-pin-in"
        style={{ animationDelay: `${(number - 1) * 100}ms` }}
      >
        <span
          className={`peek-pin-pressable relative flex h-6 w-6 items-center justify-center rounded-full ${
            hasTiktok
              ? "bg-gradient-to-br from-purple-500 to-brand"
              : "bg-brand"
          } text-[10px] font-bold text-white shadow-md ${ringCls} group-hover:scale-[1.2] group-hover:shadow-[0_0_12px_rgba(242,100,14,0.6)] group-active:scale-[0.92] md:h-7 md:w-7 md:text-[11px] ${selectedStyle}`}
        >
          {number}
          {hasTiktok && (
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white text-ink shadow-sm md:h-3.5 md:w-3.5"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-2 w-2 fill-current md:h-2.5 md:w-2.5"
                aria-hidden
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
              </svg>
            </span>
          )}
          {/* Hidden-gem mark — top-right corner (TikTok owns bottom-right). On a
              white disc so the teal gem reads on any pin colour. */}
          {isGem && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-white md:h-3.5 md:w-3.5"
            >
              <GemBadge className="h-2 w-2 md:h-2.5 md:w-2.5" />
            </span>
          )}
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
        {ratingText && (
          <span className="mt-0.5 block text-[11px] font-normal text-white/75">
            {ratingText}
          </span>
        )}
      </span>
    </Link>
  );
}
