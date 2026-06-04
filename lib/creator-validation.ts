import { randomBytes } from "node:crypto";

// Length caps — generous but bounded.
export const MAX_DISPLAY_NAME = 60;
export const MAX_TIKTOK = 32;
export const MAX_BIO = 500;
export const MAX_URL = 200;

// Allow-lists for the enum-ish fields. Kept in sync with the dropdowns
// in components/ClaimForm.tsx and components/CreatorManageForm.tsx —
// server-side check rejects anything else so a tampered request can't
// shove arbitrary strings into rank/region/platform. Empty/null is
// always allowed.
export const ALLOWED_RANKS = [
  "Copper",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Champion",
];
export const ALLOWED_REGIONS = ["NA", "EU", "LATAM", "APAC", "Oceania", "MENA"];
export const ALLOWED_PLATFORMS = ["PC", "PlayStation", "Xbox"];

export function normalizeTiktok(s: string): string {
  return s.trim().replace(/^@+/, "");
}

// Rejects anything that isn't a syntactically valid http/https URL.
// Empty string → null (caller treats null as "not provided"). Returns
// undefined on validation failure so the caller can surface an error.
export function normalizeHttpUrl(
  s: string | null | undefined
): string | null | undefined {
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

function pickFromAllowed(
  raw: string | null | undefined,
  allowed: string[]
): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  return allowed.includes(v) ? v : null;
}

export function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

// 24 random bytes → 32 base64url chars (no padding). URL-safe; lives
// directly in /manage/<token>. Sufficient entropy (192 bits) that
// guessing or birthday collisions are not concerns.
export function mintManageToken(): string {
  return randomBytes(24).toString("base64url");
}

export type ProfileInput = {
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
};

export type ValidatedProfile = {
  display_name: string;
  tiktok: string;
  bio: string | null;
  profile_image_url: string | null;
  rank: string | null;
  region: string | null;
  platform: string | null;
  youtube_url: string | null;
  twitch_url: string | null;
  x_url: string | null;
};

export type ValidateProfileResult =
  | { ok: true; fields: ValidatedProfile }
  | { ok: false; error: string };

// Single source of truth for the creator profile fields. Both the
// claim flow (first save) and the manage flow (subsequent edits) run
// raw input through this. Returns either the normalized field set
// ready to hand to a Supabase .update() call, or a user-facing error.
export function validateProfileInput(
  input: ProfileInput
): ValidateProfileResult {
  const displayName = input.display_name.trim();
  const tiktok = normalizeTiktok(input.tiktok);
  const bio = input.bio.trim();
  const profileImageUrl = (input.profile_image_url ?? "").trim() || null;

  if (!displayName) {
    return { ok: false, error: "Display name is required." };
  }
  if (!tiktok) {
    return { ok: false, error: "TikTok handle is required." };
  }
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

  const youtubeUrl = normalizeHttpUrl(input.youtube_url);
  if (youtubeUrl === undefined) {
    return { ok: false, error: "YouTube link must be a valid http(s) URL." };
  }
  const twitchUrl = normalizeHttpUrl(input.twitch_url);
  if (twitchUrl === undefined) {
    return { ok: false, error: "Twitch link must be a valid http(s) URL." };
  }
  const xUrl = normalizeHttpUrl(input.x_url);
  if (xUrl === undefined) {
    return { ok: false, error: "X link must be a valid http(s) URL." };
  }

  // Profile image must be an R2 public URL under our creators/ prefix —
  // the only thing the presign actions produce. Stops a hand-crafted
  // payload from pointing anywhere else.
  if (profileImageUrl) {
    const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    if (!base || !profileImageUrl.startsWith(`${base}/creators/`)) {
      return { ok: false, error: "Invalid profile image." };
    }
  }

  return {
    ok: true,
    fields: {
      display_name: displayName,
      tiktok,
      bio: bio || null,
      profile_image_url: profileImageUrl,
      rank: pickFromAllowed(input.rank, ALLOWED_RANKS),
      region: pickFromAllowed(input.region, ALLOWED_REGIONS),
      platform: pickFromAllowed(input.platform, ALLOWED_PLATFORMS),
      youtube_url: youtubeUrl,
      twitch_url: twitchUrl,
      x_url: xUrl,
    },
  };
}
