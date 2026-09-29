// Where media actually lives.
//
// Everything (floor blueprints, peek posters, clip video files) is uploaded to
// one R2 bucket and stored in the database with its pub-*.r2.dev address.
// r2.dev is Cloudflare's DEVELOPMENT url for a bucket: it is deliberately not
// CDN-cached and it is rate-limited, which is exactly what you do not want in
// front of the images on the busiest pages.
//
// The fix is a custom domain on the bucket. That is a DNS change, not a code
// change — so this rewrites the stored r2.dev prefix to MEDIA_HOST whenever
// that variable is set, and leaves every URL untouched when it is not. Nothing
// changes until the domain exists.
//
// Do NOT rewrite by editing the stored rows: the r2.dev address is what the
// admin upload path writes back, and a half-migrated table is worse than a
// prefix swap at read time.

const R2_DEV_ORIGIN = "https://pub-c11cdf7d63734d52945843745d8e60a8.r2.dev";

// Server-side only. There is no NEXT_PUBLIC_ twin on purpose — every consumer
// reads rows through lib/db.ts, which runs on the server.
const MEDIA_HOST = (process.env.MEDIA_HOST ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

/** The origin media is actually served from — used for the preconnect hint. */
export const MEDIA_ORIGIN = MEDIA_HOST ? `https://${MEDIA_HOST}` : R2_DEV_ORIGIN;

/** Swap the r2.dev origin for the custom host. No-op when MEDIA_HOST is unset. */
export function withMediaHost<T extends string | null | undefined>(url: T): T {
  if (!MEDIA_HOST || !url) return url;
  return (
    url.startsWith(R2_DEV_ORIGIN)
      ? `${MEDIA_ORIGIN}${url.slice(R2_DEV_ORIGIN.length)}`
      : url
  ) as T;
}

/**
 * Walk a Supabase result and rewrite every media URL in it.
 *
 * Applied once per read in lib/db.ts, at the point rows come out, so blueprints,
 * posters and video_url all move hosts together — rather than at each of the
 * dozens of call sites, where the next new one would silently miss it.
 *
 * Keyed on the `_url` suffix the schema already uses (birds_eye_url,
 * poster_url, video_url, cover_image_url, preview_image_url, ...), so a column
 * added later is covered without touching this file.
 */
export function withMediaHostDeep<T>(value: T): T {
  if (!MEDIA_HOST || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = withMediaHostDeep(value[i]);
    return value;
  }

  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    const v = row[key];
    if (typeof v === "string") {
      if (key.endsWith("_url")) row[key] = withMediaHost(v);
    } else if (v !== null && typeof v === "object") {
      row[key] = withMediaHostDeep(v);
    }
  }
  return value;
}
