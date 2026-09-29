// Map cover images live in R2 as full-size PNGs (~1 MB each). Route them through
// the free, Cloudflare-backed images.weserv.nl resizer so they come back
// display-sized WebP instead — a ~1 MB PNG becomes ~25 KB. The first request per
// size is resized+cached on their CDN; every visitor after gets the small file.
//
// Covers were the first user. Floor BLUEPRINTS now go through it too (see
// blueprintThumb below): they were being served full-size straight off
// pub-*.r2.dev, which is Cloudflare's development URL for a bucket — no CDN
// cache and rate-limited. The comment in next.config.js assumed R2 was
// CDN-served; on r2.dev it is not.
//
// Peek posters are still left alone: they are already compressed WebP at
// upload, and a proxy hiccup should not be able to reach the peek page.
//
// Flip USE_PROXY to false to instantly serve the R2 originals again.
const USE_PROXY = true;

export function coverThumb(
  url: string | null | undefined,
  width: number,
  quality = 78
): string {
  if (!USE_PROXY || !url || !/^https?:\/\//.test(url)) return url ?? "";
  // weserv wants the source without its scheme, prefixed with ssl: for https.
  const source = encodeURIComponent(`ssl:${url.replace(/^https?:\/\//, "")}`);
  // &we = never upscale past the source's real dimensions.
  return `https://wsrv.nl/?url=${source}&w=${width}&output=webp&q=${quality}&we`;
}


// Floor blueprints. Higher quality than covers on purpose: a cover is
// decorative art behind text, a blueprint is the thing the pins sit on, and
// wall lines are exactly what a low-q WebP smears first. 82 was compared
// against the r2.dev original at 1470 before being settled on.
const BLUEPRINT_QUALITY = 82;

export function blueprintThumb(
  url: string | null | undefined,
  width: number,
  quality = BLUEPRINT_QUALITY
): string {
  return coverThumb(url, width, quality);
}

/**
 * A srcset of real widths for a blueprint.
 *
 * Needed as an explicit attribute because images.unoptimized is on: next/image
 * emits a bare <img> with no srcset in that mode, so the browser has no way to
 * pick a size. `&we` in coverThumb stops wsrv upscaling past the source, so a
 * width larger than the original simply returns the original.
 */
export function blueprintSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality = BLUEPRINT_QUALITY
): string {
  if (!url) return "";
  return widths.map((w) => `${blueprintThumb(url, w, quality)} ${w}w`).join(", ");
}
