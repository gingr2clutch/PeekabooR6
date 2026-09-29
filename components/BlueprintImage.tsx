"use client";

import { useState } from "react";
import { blueprintSrcSet, blueprintThumb } from "@/lib/cover-image";

// A floor blueprint, resized and never blank.
//
// A plain <img>, not next/image, on purpose. images.unoptimized is on (see
// next.config.js), which makes next/image emit a bare <img> with NO srcset —
// so the browser always fetched the full-size original off r2.dev. Writing the
// element directly is what lets us hand it real widths to choose from. It also
// keeps Vercel's image optimizer out of the path entirely, which is the whole
// point of unoptimized in the first place.
//
// Layout is unaffected: the image is absolutely filled inside a parent that
// already has its own size (a fixed-height card, or an aspect-ratio box), so
// it contributes nothing to layout and cannot shift anything. CLS stays 0.
export function BlueprintImage({
  src,
  widths,
  sizes,
  accent,
  className = "",
  placeholderClassName = "",
  eager = false,
}: {
  src: string;
  /** real widths to offer, smallest first */
  widths: number[];
  sizes: string;
  /** map accent, shown until the picture arrives */
  accent: string;
  /** classes for the <img> itself (opacity, object-fit tweaks) */
  className?: string;
  /** classes for the placeholder layer — lets a caller scope it to a breakpoint */
  placeholderClassName?: string;
  /** eager + low priority: start now, but never compete with the hero */
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {/* Accent wash behind the picture, so the card looks finished before it
          arrives rather than flashing an empty box. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${placeholderClassName}`}
        style={{ backgroundColor: accent }}
      />
      {/* The fade lives on a wrapper, not the <img>, so the image keeps its own
          opacity classes (the map card renders it at 0.16 below lg). */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blueprintThumb(src, widths[widths.length - 1])}
          srcSet={blueprintSrcSet(src, widths)}
          sizes={sizes}
          alt=""
          aria-hidden
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          // Lowercase attribute: React 18 does not map the camelCase prop for
          // <img>, and the lowercase spelling is what the browser reads.
          {...{ fetchpriority: eager ? "low" : undefined }}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full ${className}`}
        />
      </span>
    </>
  );
}
