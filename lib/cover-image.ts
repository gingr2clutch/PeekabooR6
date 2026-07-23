// Map cover images live in R2 as full-size PNGs (~1 MB each). Route them through
// the free, Cloudflare-backed images.weserv.nl resizer so they come back
// display-sized WebP instead — a ~1 MB PNG becomes ~25 KB. The first request per
// size is resized+cached on their CDN; every visitor after gets the small file.
//
// Deliberately SCOPED to cover images only (homepage grid + map header), so a
// proxy hiccup can never affect any other image on the site. Floor blueprints
// and peek posters are already compressed WebP at upload, so they're left as-is.
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
