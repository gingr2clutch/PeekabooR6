import { createHash } from "node:crypto";

// Shared abuse limits for the community submission flow. Both the upload-URL
// route and the insert route apply the same 5-per-hour cap per IP; keeping the
// constants and the hash in one place stops the two from drifting.

export const RATE_LIMIT = 5;
export const RATE_WINDOW_MS = 60 * 60 * 1000;

/** Prefix every pending upload lives under. */
export const PENDING_PREFIX = "pending";

/**
 * Hashed, never stored raw: the address is only ever compared, so keeping it in
 * the clear would be personal data with no added use. Salted with a server-only
 * secret so the hashes are not reversible from a list of candidate IPs.
 *
 * Returns null when no address can be determined, which callers must treat as a
 * failure rather than a free pass.
 */
export function hashIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  if (!ip) return null;
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Storage key for a pending upload.
 *
 * The IP hash is part of the path on purpose. Object storage has no other way
 * to attribute an upload to a caller, and without attribution the upload-URL
 * route cannot be rate limited at all: an attacker who requests URLs and
 * uploads files but never submits creates no database rows, so a row-count
 * check would never trip. Listing this prefix gives an exact count of what one
 * caller has uploaded recently.
 *
 * The hash is a salted SHA-256 of the caller's own address, and the bucket is
 * private, so the only party who ever sees a given value is the caller it
 * belongs to.
 */
export function pendingKey(ipHash: string, uuid: string, ext: string): string {
  return `${PENDING_PREFIX}/${ipHash}/${uuid}.${ext}`;
}

/**
 * Split a stored file_path into the directory to list and the object name.
 *
 * Handles both shapes: the nested `pending/<hash>/<uuid>.<ext>` written now,
 * and the flat `pending/<uuid>.<ext>` written before uploads were attributable.
 * Rows created under the old scheme still have to preview and sweep correctly.
 */
export function splitStoragePath(
  filePath: string
): { dir: string; name: string } | null {
  if (!filePath.startsWith(`${PENDING_PREFIX}/`)) return null;
  if (filePath.includes("..")) return null;
  const idx = filePath.lastIndexOf("/");
  if (idx <= 0) return null;
  return { dir: filePath.slice(0, idx), name: filePath.slice(idx + 1) };
}
