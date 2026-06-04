"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";
import {
  mintManageToken,
  safeExtension,
  validateProfileInput,
} from "@/lib/creator-validation";

function normalizeCode(s: string): string {
  return s.trim().toUpperCase();
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

export type CreatorImageUploadResult =
  | { ok: true; uploadUrl: string; publicUrl: string }
  | { ok: false; error: string };

// Mirrors the floor-upload presign flow (see app/admin/(authed)/floors/[id]/
// upload-actions.ts). Gated on a valid + unclaimed code so the endpoint
// isn't a free public R2 ingress.
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

export type ClaimResult =
  | { ok: true; manage_token: string }
  | { ok: false; error: string };

// Step 2: atomic claim. The WHERE filter on claimed_at IS NULL is part
// of the UPDATE itself — so if a second tab claimed the same code in
// the gap between validate and submit, this update affects zero rows
// and we surface a friendly error.
//
// A fresh manage_token is minted at claim and overwrites whatever the
// migration backfilled — so the creator's manage link is unguessable
// from anyone who might have peeked at the pre-migration table.
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
  if (!code) return { ok: false, error: "Missing code." };

  const validated = validateProfileInput(input);
  if (!validated.ok) return { ok: false, error: validated.error };
  const fields = validated.fields;

  const manageToken = mintManageToken();

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .update({
      ...fields,
      manage_token: manageToken,
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
  return { ok: true, manage_token: manageToken };
}
