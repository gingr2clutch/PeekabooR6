import Image from "next/image";
import type { PeekWithContext } from "@/lib/db";

type Props = {
  peek: PeekWithContext;
  /** next/image sizes hint — the box is supplied by the caller. */
  sizes: string;
};

// The preview image for a peek, as a three-step cascade:
//
//   1. the clip's own first frame (#t=0.1, muted + non-interactive)
//   2. the map's cover image
//   3. the stripes placeholder
//
// Extracted from BestPeek so the map page's desktop Top Peek card renders the
// SAME thumbnail rather than a second implementation that drifts. It is the
// media only — no box, no border, no rounding — because the two call sites
// frame it differently (a 96/128px rail row vs a full-width 16:9 card). That
// keeps BestPeek's own markup byte-identical to what it was.
//
// poster_url is deliberately NOT in the cascade: it is null on 192 of 193
// peeks, which is exactly why the desktop card was rendering blank.
export function PeekThumb({ peek, sizes }: Props) {
  const map = peek.floors?.maps ?? null;

  if (peek.video_url) {
    return (
      <video
        src={`${peek.video_url}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        aria-hidden
        {...{ "webkit-playsinline": "true" }}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  if (map?.cover_image_url) {
    return (
      <Image
        src={map.cover_image_url}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
    );
  }

  return <div className="placeholder-stripes h-full w-full" />;
}
