"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  mapSlug: string | null;
  floorSlug: string | null;
  birdsEyeUrl: string | null;
  value: { x: number; y: number } | null;
  onChange: (coords: { x: number; y: number }) => void;
};

// Compact overhead-image pin picker used on the public /submit form.
// Pointer events handle mouse + touch in one path. Coords reported as
// 0–1 fractions of the rendered image bounds, matching the convention
// used by the live FloorView pins.
export function MiniMapPicker({
  mapSlug,
  floorSlug,
  birdsEyeUrl,
  value,
  onChange,
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  // Whenever the image URL changes, reset the error state so a fresh
  // attempt isn't masked by a previous failure.
  useEffect(() => {
    setImageError(false);
  }, [birdsEyeUrl]);

  if (!mapSlug || !floorSlug) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-card border border-dashed border-border bg-bg px-4 text-center text-sm text-muted">
        Select a map and floor to drop a pin
      </div>
    );
  }

  if (!birdsEyeUrl) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-card border border-dashed border-border bg-bg px-4 text-center text-sm text-muted">
        Overhead map not available for this floor yet
      </div>
    );
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onChange({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  }

  return (
    <div>
      <div
        ref={surfaceRef}
        onPointerDown={handlePointerDown}
        className="relative aspect-[16/10] w-full cursor-crosshair touch-none select-none overflow-hidden rounded-card border border-border bg-card"
      >
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted">
            Couldn&apos;t load the floor image.
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={birdsEyeUrl}
            alt={`${mapSlug} ${floorSlug} overhead view`}
            draggable={false}
            onError={() => setImageError(true)}
            className="h-full w-full select-none object-cover"
          />
        )}
        {value && !imageError && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-md ring-2 ring-white"
            style={{
              left: `${value.x * 100}%`,
              top: `${value.y * 100}%`,
            }}
          />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {imageError
          ? "Image failed to load — the rest of the form still works."
          : value
            ? "Tap again to move the pin"
            : "Tap the map to drop a pin"}
      </p>
    </div>
  );
}
