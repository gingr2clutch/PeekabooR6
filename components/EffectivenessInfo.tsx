"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

// Small "ⓘ" disclosure next to the Effectiveness label on the peek stat tile.
// Opens on desktop hover, on tap (mobile), and on keyboard focus/Enter; closes
// on Escape, blur, or a tap/click outside. Pointer-vs-keyboard is tracked so a
// tap doesn't both focus-open and click-close.
export function EffectivenessInfo() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const pointerRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // Hover lives on the wrapper so moving from the icon onto the popover
    // (a descendant) doesn't trip mouseleave and close it.
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="How Effectiveness is graded"
        aria-expanded={open}
        aria-describedby={open ? "effectiveness-info-popover" : undefined}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted/70 transition-colors hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        onPointerDown={() => {
          pointerRef.current = true;
        }}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => {
          if (!pointerRef.current) setOpen(true);
        }}
        onBlur={() => {
          pointerRef.current = false;
          setOpen(false);
        }}
      >
        <Info size={13} strokeWidth={2} aria-hidden />
      </button>

      {open && (
        // top-full + pt-2 (not mt-2) keeps a hover bridge across the gap.
        <span className="absolute left-1/2 top-full z-50 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 pt-2">
          <span
            id="effectiveness-info-popover"
            role="tooltip"
            className="block rounded-card border border-border bg-card p-3 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-ink shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
          >
            <span className="block">
              Effectiveness is how often this peek gets the kill.
            </span>
            <span className="mt-2 block text-muted">
              New peeks show a grade based on our estimate. Once a peek gets 5+
              community votes (Worked / Didn&apos;t work), the grade becomes
              player-voted — recalculated from real player votes instead of our
              estimate.
            </span>
            <span className="mt-2 block font-medium">
              S = 85+ · A = 70–84 · B = 55–69 · C = below 55
            </span>
          </span>
        </span>
      )}
    </span>
  );
}
