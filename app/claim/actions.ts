"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

// Length caps — generous but bounded.
const MAX_DISPLAY_NAME = 60;
const MAX_TIKTOK = 32;
const MAX_BIO = 500;
const MAX_URL = 200;

// Allow-lists for the enum-ish fields. Kept in sync with the dropdowns
// in components/ClaimForm.tsx — server-side check rejects anything else
// so a tampered request can't shove arbitrary strings into rank/region/
// platform. Empty/null is always allowed.
const ALLOWED_RANKS = [
  "Copper",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Champion",
];
const ALLOWED_REGIONS = ["NA", "EU", "LATAM", "APAC", "Oceania", "MENA"];
const ALLOWED_PLATFORMS = ["PC", "PlayStation", "Xbox"];

// Rejects anything that isn't a syntactically valid http/https URL.
// Empty string → null (caller treats null as "not provided"). Returns
// undefined on validation failure so the caller can surface an error.
function normalizeHttpUrl(s: string | null | undefined): string | null | undefined {
  const trimmed = (s ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_URL) return undefined;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
  return u.toString();
}

function normalizeCode(s: string): string {
  return s.trim().toUpperCase();
}

function normalizeTiktok(s: string): string {
  // Strip leading @s so the DB stores just the handle. Phase 3 (public
  // /creators page) can re-add the @ when rendering.
  return s.trim().replace(/^@+/, "");
}

export type ValidateResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

// Step 1: confirm the code exists and is unclaimed. Service-role read —
// the creators table has RLS with no policies so anon keys see nothing.
export async function validateCodeAction(
  raw: string
): Promise<ValidateResult> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: "Enter your code." };

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .select("code, claimed_at")
    .eq("code", code)
    .maybeSingle();

  if (error) return { ok: false, error: "Could not verify the code." };
  if (!data) {
    return { ok: false, error: "Code not found. Double-check and try again." };
  }
  if (data.claimed_at) {
    return { ok: false, error: "This code has already been used." };
  }
  return { ok: true, code: data.code };
}

// Mirrors the floor-upload presign flow (see app/admin/(authed)/floors/[id]/
// upload-actions.ts). Gated on a valid + unclaimed code so the endpoint
// isn't a free public R2 ingress.
function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export type CreatorImageUploadResult =
  | { ok: true; uploadUrl: string; publicUrl: string }
  | { ok: false; error: string };

export async function createCreatorImageUploadUrl(
  rawCode: string,
  filename: string,
  contentType: string
): Promise<CreatorImageUploadResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Missing code." };

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .select("code, claimed_at")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Code not found." };
  if (data.claimed_at) {
    return { ok: false, error: "This code has already been used." };
  }

  const ext = safeExtension(filename, contentType);
  const key = `creators/${code}-${Date.now()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 600 });
  return { ok: true, uploadUrl, publicUrl: r2PublicUrl(key) };
}

export type ClaimResult = { ok: true } | { ok: false; error: string };

// Step 2: atomic claim. The WHERE filter on claimed_at IS NULL is part
// of the UPDATE itself — so if a second tab claimed the same code in
// the gap between validate and submit, this update affects zero rows
// and we surface a friendly error.
//
// Touches only display_name, tiktok, bio, claimed_at. Nothing else
// about the row changes (id, code, approved_at all preserved).
export async function claimCodeAction(input: {
  code: string;
  display_name: string;
  tiktok: string;
  bio: string;
  profile_image_url?: string | null;
  rank?: string | null;
  region?: string | null;
  platform?: string | null;
  youtube_url?: string | null;
  twitch_url?: string | null;
  x_url?: string | null;
}): Promise<ClaimResult> {
  const code = normalizeCode(input.code);
  const displayName = input.display_name.trim();
  const tiktok = normalizeTiktok(input.tiktok);
  const bio = input.bio.trim();
  const profileImageUrl = (input.profile_image_url ?? "").trim() || null;

  // Allow-list check: empty/null is fine, but any non-empty value must
  // be one of the known options. Anything else → null (silently drop).
  function pickFromAllowed(
    raw: string | null | undefined,
    allowed: string[]
  ): string | null {
    const v = (raw ?? "").trim();
    if (!v) return null;
    return allowed.includes(v) ? v : null;
  }
  const rank = pickFromAllowed(input.rank, ALLOWED_RANKS);
  const region = pickFromAllowed(input.region, ALLOWED_REGIONS);
  const platform = pickFromAllowed(input.platform, ALLOWED_PLATFORMS);

  const youtubeUrl = normalizeHttpUrl(input.youtube_url);
  const twitchUrl = normalizeHttpUrl(input.twitch_url);
  const xUrl = normalizeHttpUrl(input.x_url);
  if (youtubeUrl === undefined) {
    return { ok: false, error: "YouTube link must be a valid http(s) URL." };
  }
  if (twitchUrl === undefined) {
    return { ok: false, error: "Twitch link must be a valid http(s) URL." };
  }
  if (xUrl === undefined) {
    return { ok: false, error: "X link must be a valid http(s) URL." };
  }

  if (!code) return { ok: false, error: "Missing code." };
  if (!displayName) {
    return { ok: false, error: "Display name is required." };
  }
  if (!tiktok) return { ok: false, error: "TikTok handle is required." };
  if (displayName.length > MAX_DISPLAY_NAME) {
    return {
      ok: false,
      error: `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`,
    };
  }
  if (tiktok.length > MAX_TIKTOK) {
    return {
      ok: false,
      error: `TikTok handle must be ${MAX_TIKTOK} characters or fewer.`,
    };
  }
  if (bio.length > MAX_BIO) {
    return {
      ok: false,
      error: `Bio must be ${MAX_BIO} characters or fewer.`,
    };
  }
  // Must be an R2 public URL — the only thing createCreatorImageUploadUrl
  // can produce. Stops a hand-crafted payload from pointing anywhere else.
  if (profileImageUrl) {
    const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    if (!base || !profileImageUrl.startsWith(`${base}/creators/`)) {
      return { ok: false, error: "Invalid profile image." };
    }
  }

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .update({
      display_name: displayName,
      tiktok,
      bio: bio || null,
      profile_image_url: profileImageUrl,
      rank,
      region,
      platform,
      youtube_url: youtubeUrl,
      twitch_url: twitchUrl,
      x_url: xUrl,
      claimed_at: new Date().toISOString(),
    })
    .eq("code", code)
    .is("claimed_at", null)
    .select("id");

  if (error) return { ok: false, error: "Something went wrong, try again." };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "This code is no longer valid — it may have just been claimed.",
    };
  }
  return { ok: true };
}
