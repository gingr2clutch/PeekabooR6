"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { coverThumb } from "@/lib/cover-image";

const IMG_SIZES =
  "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw";

// Map-grid cover image tuned for smooth scrolling:
//   • The parent card is aspect-square, so the box is fully reserved — zero
//     layout shift whether or not the image has loaded.
//   • A subtle solid placeholder fills that box immediately (server-rendered),
//     so there's never a blank/white flash while the image loads.
//   • Loading is gated by an IntersectionObserver with a GENEROUS rootMargin,
//     so images start fetching ~1000px before they scroll into view and are
//     usually ready by the time the card is visible — no pop-in.
//   • No scroll-triggered entrance animation; hover transforms live on the card
//     and are motion-safe only.
export function MapCardImage({
  src,
  published,
}: {
  src: string;
  published: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (old browsers / SSR hydration edge) → just load.
    if (!("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "1000px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} aria-hidden className="absolute inset-0 bg-[#e7e3d7]">
      {near && (
        <Image
          src={coverThumb(src, 500)}
          alt=""
          fill
          sizes={IMG_SIZES}
          className={`object-cover ${
            published
              ? "transition-transform duration-200 ease-out motion-safe:group-hover:scale-105"
              : "grayscale"
          }`}
        />
      )}
    </span>
  );
}
