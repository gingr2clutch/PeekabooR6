import type { PeekType } from "./db";

// Single source of truth for peek-type presentation. Every consumer
// (PeekPin, FloorView legend, peek detail label, admin form) reads from
// here so colors/labels never drift between surfaces and so adding a
// fourth type later means editing one file.
//
// Tailwind class strings are written out verbatim — interpolated class
// names ("bg-" + color) would bypass the JIT scanner and get purged.

export type PeekTypeMeta = {
  value: PeekType;
  label: string; // full label, e.g. "Spawn peek"
  short: string; // compact label for tight UI
  letter: string; // single-character identifier used inside the pin
  pinBg: string; // pin background colour
  pinText: string; // pin glyph colour (chosen for contrast against pinBg)
  legendDot: string; // legend swatch
  selectedShadow: string; // hover/selected glow class — type-coloured
  hoverShadow: string; // same glow but scoped to group-hover so the JIT
  // scanner sees the full prefixed class literal
};

export const PEEK_TYPES: Record<PeekType, PeekTypeMeta> = {
  spawn: {
    value: "spawn",
    label: "Spawn peek",
    short: "Spawn",
    letter: "S",
    pinBg: "bg-brand",
    pinText: "text-white",
    legendDot: "bg-brand",
    selectedShadow: "shadow-[0_0_12px_rgba(255,106,0,0.6)]",
    hoverShadow: "group-hover:shadow-[0_0_12px_rgba(255,106,0,0.6)]",
  },
  runout: {
    value: "runout",
    label: "Run-out",
    short: "Run-out",
    letter: "R",
    pinBg: "bg-red-600",
    pinText: "text-white",
    legendDot: "bg-red-600",
    selectedShadow: "shadow-[0_0_12px_rgba(220,38,38,0.6)]",
    hoverShadow: "group-hover:shadow-[0_0_12px_rgba(220,38,38,0.6)]",
  },
  mid_round: {
    value: "mid_round",
    label: "Mid-round peek",
    short: "Mid-round",
    letter: "M",
    pinBg: "bg-yellow-400",
    pinText: "text-ink",
    legendDot: "bg-yellow-400",
    selectedShadow: "shadow-[0_0_12px_rgba(250,204,21,0.7)]",
    hoverShadow: "group-hover:shadow-[0_0_12px_rgba(250,204,21,0.7)]",
  },
};

export const PEEK_TYPE_ORDER: PeekType[] = ["spawn", "runout", "mid_round"];

export function peekTypeMeta(t: PeekType | null | undefined): PeekTypeMeta {
  return PEEK_TYPES[t ?? "spawn"];
}
