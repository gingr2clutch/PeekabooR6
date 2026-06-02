"use server";

import { supabaseAdmin } from "@/lib/supabase";

// Length caps — generous but bounded.
const MAX_DISPLAY_NAME = 60;
const MAX_TIKTOK = 32;
const MAX_BIO = 500;

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
}): Promise<ClaimResult> {
  const code = normalizeCode(input.code);
  const displayName = input.display_name.trim();
  const tiktok = normalizeTiktok(input.tiktok);
  const bio = input.bio.trim();

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

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .update({
      display_name: displayName,
      tiktok,
      bio: bio || null,
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
