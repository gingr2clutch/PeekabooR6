"use client";

import Image from "next/image";
import { useState } from "react";

export type PlacedPin = { x: number; y: number };

type Props = {
  src: string | null;
  /** Pins to start with, in display order. */
  initial?: PlacedPin[];
  /** Name of the hidden input carrying the JSON payload. */
  inputName?: string;
  label?: string;
};

// Multi-pin editor for a gadget setup.
//
// PinPlacer is not reused here and cannot be: it holds a single {x, y} in state
// and mirrors it into two fixed hidden inputs. A setup has an arbitrary number
// of pins, so the payload has to be a list. That is a real difference in shape,
// not a styling preference — hence a separate component rather than a prop on
// the old one, which the peek forms depend on and which should not grow a
// second mode for this.
//
// The pins serialise to JSON in one hidden input. Named inputs cannot express a
// variable-length list without index gymnastics, and the server parses it back
// with clamping, so a malformed payload degrades to fewer pins rather than bad
// coordinates.
//
// Order is placement order, and that is meaningful: the numbers drawn here are
// the numbers the viewer sees on the public blueprint, which the clip refers to
// in sequence.
export function MultiPinPlacer({
  src,
  initial = [],
  inputName = "pins",
  label = "Tap the blueprint to drop a pin. Tap a pin to remove it.",
}: Props) {
  const [pins, setPins] = useState<PlacedPin[]>(initial);

  const add = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    setPins((p) => [...p, { x, y }]);
  };

  const removeAt = (i: number) => setPins((p) => p.filter((_, n) => n !== i));

  return (
    <div className="space-y-2">
      {src ? (
        <div
          onClick={add}
          className="relative aspect-[16/10] w-full cursor-crosshair overflow-hidden rounded-inner border border-border"
        >
          <Image
            src={src}
            alt="Blueprint"
            fill
            sizes="(max-width: 1024px) 100vw, 600px"
            className="object-cover"
          />
          {pins.map((p, i) => (
            <button
              key={`${p.x}-${p.y}-${i}`}
              type="button"
              // Stop the click reaching the container, which would drop a new
              // pin on top of the one being removed.
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              aria-label={`Remove pin ${i + 1}`}
              className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue text-[11px] font-bold text-white ring-2 ring-white transition-transform hover:scale-110"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : (
        <div className="placeholder-stripes flex aspect-[16/10] w-full items-center justify-center rounded-inner">
          <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted">
            This site has no blueprint — set its floor first.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>
          {pins.length} pin{pins.length === 1 ? "" : "s"}
        </span>
        {pins.length > 0 && (
          <button
            type="button"
            onClick={() => setPins([])}
            className="rounded-btn border border-border px-2 py-1 hover:border-blue hover:text-blue"
          >
            Clear all
          </button>
        )}
        <span className="min-w-0 flex-1">{label}</span>
      </div>

      <input type="hidden" name={inputName} value={JSON.stringify(pins)} />
    </div>
  );
}
