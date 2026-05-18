import type { PeekType } from "./db";

// Single source of truth for peek-type presentation. Every consumer
// (PeekPin, FloorView legend, admin form) reads from here so colours and
// labels never drift between surfaces — and adding a fourth type later
// means editing one file.
//
// Tailwind class strings are written out verbatim — interpolated class
// names ("bg-" + color) would bypass the JIT scanner and get purged.

export type PeekTypeMeta = {
  value: PeekType;
  label: string;
  letter: string; // single-character glyph shown inside the pin and legend
  pinBg: string; // pin background colour
  pinText: string; // pin glyph colour (chosen for contrast against pinBg)
  legendDot: string; // legend swatch (same colour as pinBg, used as a dot)
  selectedShadow: string; // hover/selected glow class — type-coloured
  hoverShadow: string; // same glow scoped to group-hover so the JIT
  // scanner sees the full prefixed class literal
};

export const PEEK_TYPES: Record<PeekType, PeekTypeMeta> = {
  spawn: {
    value: "spawn",
    label: "Spawn",
    letter: "S",
    pinBg: "bg-brand",
    pinText: "text-white",
    legendDot: "bg-brand",
    selectedShadow: "shadow-[0_0_12px_rgba(255,106,0,0.6)]",
    hoverShadow: "group-hover:shadow-[0_0_12px_rgba(255,106,0,0.6)]",
  },
  runout: {
    value: "runout",
    label: "Runout",
    letter: "R",
    pinBg: "bg-red-600",
    pinText: "text-white",
    legendDot: "bg-red-600",
    selectedShadow: "shadow-[0_0_12px_rgba(220,38,38,0.6)]",
    hoverShadow: "group-hover:shadow-[0_0_12px_rgba(220,38,38,0.6)]",
  },
  mid_game: {
    value: "mid_game",
    label: "Mid game",
    letter: "M",
    pinBg: "bg-yellow-400",
    pinText: "text-ink",
    legendDot: "bg-yellow-400",
    selectedShadow: "shadow-[0_0_12px_rgba(250,204,21,0.7)]",
    hoverShadow: "group-hover:shadow-[0_0_12px_rgba(250,204,21,0.7)]",
  },
};

export const PEEK_TYPE_ORDER: PeekType[] = ["spawn", "runout", "mid_game"];

export function peekTypeMeta(t: PeekType | null | undefined): PeekTypeMeta {
  return PEEK_TYPES[t ?? "spawn"];
}
