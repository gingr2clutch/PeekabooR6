"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";
import {
  safeExtension,
  validateProfileInput,
} from "@/lib/creator-validation";

export type ManageImageUploadResult =
  | { ok: true; uploadUrl: string; publicUrl: string }
  | { ok: false; error: string };

// Presigned PUT for replacing the profile image from /manage/<token>.
// Token must resolve to a claimed creator row; otherwise we don't issue
// a URL — keeps the endpoint from becoming a free public R2 ingress.
export async function createManageImageUploadUrl(
  token: string,
  filename: string,
  contentType: string
): Promise<ManageImageUploadResult> {
  const t = (token ?? "").trim();
  if (!t) return { ok: false, error: "Missing manage link." };

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .select("id, claimed_at")
    .eq("manage_token", t)
    .maybeSingle();
  if (error || !data || !data.claimed_at) {
    return { ok: false, error: "Invalid manage link." };
  }

  const ext = safeExtension(filename, contentType);
  const key = `creators/${data.id}-${Date.now()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 600 });
  return { ok: true, uploadUrl, publicUrl: r2PublicUrl(key) };
}

export type ManageUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

// Updates ONLY the creator row whose manage_token matches. The .eq()
// filter against the unique-indexed column scopes the UPDATE to at
// most one row regardless of input — never touches any other creator.
//
// Approval status (approved_at), the code, the manage_token itself,
// is_founder, and timestamps are all explicitly NOT in the update set,
// so an edit can't promote, demote, rotate the token, or break audit
// state.
export async function updateCreatorByTokenAction(input: {
  token: string;
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
}): Promise<ManageUpdateResult> {
  const token = (input.token ?? "").trim();
  if (!token) return { ok: false, error: "Missing manage link." };

  const validated = validateProfileInput(input);
  if (!validated.ok) return { ok: false, error: validated.error };
  const fields = validated.fields;

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .update(fields)
    .eq("manage_token", token)
    .not("claimed_at", "is", null)
    .select("id");

  if (error) return { ok: false, error: "Something went wrong, try again." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Invalid manage link." };
  }
  return { ok: true };
}
