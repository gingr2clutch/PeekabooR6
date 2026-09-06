"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  name: string;
  /** Public R2 URL from gadget_operators.icon_url. Null renders the disc. */
  iconUrl?: string | null;
  /** Rendered size in px. The box is reserved at this size before anything loads. */
  size?: number;
  /**
   * Fill the parent as a square instead of drawing a fixed-size circle. Used by
   * the picker grid, where the parent card owns the aspect ratio, the rounding
   * and the border — so this contributes only the image and the fallback.
   */
  fill?: boolean;
  className?: string;
};

// Operator portrait for the gadget picker and placements header.
//
// The icon comes from the database only — gadget_operators.icon_url, written by
// the uploader at /admin/gadgets/operators. An earlier version resolved icons
// by filename under public/operators/, which is gone: two sources of truth for
// one image meant an upload could be silently shadowed by a stale file.
//
// The fallback disc is always mounted and the image fades in over it once
// decoded, so a URL that 404s (a deleted object, a bad CDN moment) degrades to
// the letter rather than a broken-image glyph.
//
// The wrapper owns the dimensions, so the box is reserved on first paint
// whether or not an image arrives. Zero layout shift either way.
export function OperatorIcon({
  name,
  iconUrl,
  size = 56,
  fill = false,
  className = "",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const letter = (name.trim()[0] ?? "?").toUpperCase();

  // Icons are stored at 256 square. Passing that as the intrinsic size in both
  // modes keeps next/image's dimensions explicit; the box itself is reserved by
  // the wrapper (fixed size) or the parent card (aspect-square).
  const INTRINSIC = 256;

  return (
    <span
      className={
        fill
          ? `absolute inset-0 flex items-center justify-center bg-blue ${className}`
          : `relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-blue ${className}`
      }
      style={fill ? undefined : { width: size, height: size }}
    >
      <span
        aria-hidden
        className={`select-none font-semibold text-white ${
          fill ? "text-4xl lg:text-5xl" : ""
        }`}
        style={fill ? undefined : { fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>

      {iconUrl && !failed && (
        <Image
          src={iconUrl}
          alt=""
          width={fill ? INTRINSIC : size}
          height={fill ? INTRINSIC : size}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
