"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string | null;
  initialX: number;
  initialY: number;
  name?: string;
};

// Click-to-place pin editor. Renders the bird's-eye image and lets the admin
// click anywhere on it to set x_pct/y_pct. The position is mirrored into two
// hidden inputs that get serialised when the parent form submits.
//
// If no bird's-eye image is uploaded yet, falls back to two numeric inputs so
// the admin can still seed coordinates (e.g. before the screenshot exists).
export function PinPlacer({ src, initialX, initialY, name }: Props) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });

  if (!src) {
    return (
      <div className="space-y-3">
        <div className="placeholder-stripes flex aspect-[16/10] w-full items-center justify-center rounded-inner">
          <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
            Upload a bird's-eye view first to click-to-place
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted">
            <span className="mb-1 block">X (%)</span>
            <input
              name="x_pct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={pos.x}
              onChange={(e) =>
                setPos({ ...pos, x: Number(e.target.value) || 0 })
              }
              className="w-full rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs text-muted">
            <span className="mb-1 block">Y (%)</span>
            <input
              name="y_pct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={pos.y}
              onChange={(e) =>
                setPos({ ...pos, y: Number(e.target.value) || 0 })
              }
              className="w-full rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[16/10] w-full cursor-crosshair overflow-hidden rounded-inner border border-border"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setPos({
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
          });
        }}
      >
        <Image
          src={src}
          alt={name ?? "Bird's-eye view"}
          fill
          sizes="(max-width: 1024px) 100vw, 600px"
          className="object-cover"
        />
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          <span className="block h-3.5 w-3.5 rounded-full bg-brand shadow-md ring-2 ring-white" />
        </span>
      </div>
      <p className="text-xs text-muted">
        Click anywhere on the image to move the pin. Current: {pos.x.toFixed(1)}
        %, {pos.y.toFixed(1)}%.
      </p>
      <input type="hidden" name="x_pct" value={pos.x} />
      <input type="hidden" name="y_pct" value={pos.y} />
    </div>
  );
}
