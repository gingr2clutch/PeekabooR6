"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  slug: string;
  name: string;
  /** Rendered size in px. The box is reserved at this size before anything loads. */
  size?: number;
  className?: string;
};

// Operator portrait, found by slug at public/operators/<slug>.webp (or .png).
// Adding an image is a drop-in: no code change, no database column — there is
// no icon field on gadget_operators, so the filename IS the wiring.
//
// The fallback is rendered FIRST and the image fades in over it once it has
// actually decoded. That ordering is deliberate:
//   • a missing file never shows a broken-image glyph — nothing appears, and
//     the fallback simply stays;
//   • there is no flash of empty space while the file loads;
//   • it needs no filesystem check, which matters because public/ is not
//     reliably readable from a serverless function — an fs.existsSync guard
//     would work locally and silently hide every icon in production.
//
// The wrapper owns the dimensions, so the box is reserved on first paint
// whether or not an image ever arrives. Zero layout shift either way.
export function OperatorIcon({ slug, name, size = 56, className = "" }: Props) {
  // .webp first, .png second, then give up and leave the fallback showing.
  const sources = [`/operators/${slug}.webp`, `/operators/${slug}.png`];
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const src = sources[attempt];
  const letter = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-blue ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Fallback: steel-blue disc with the initial. Always mounted, so it is
          what shows until (and unless) a real image decodes on top. */}
      <span
        aria-hidden
        className="select-none font-semibold text-white"
        style={{ fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>

      {src && (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          // Sits over the fallback and only becomes visible once decoded.
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setAttempt((n) => n + 1)}
        />
      )}
    </span>
  );
}
