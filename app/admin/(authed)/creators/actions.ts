"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

// Trimmed alphabet — no 0, 1, I, O — keeps codes readable when spoken or
// copy-pasted into chat. 31 chars × 8 positions ≈ 8.5e11 combinations,
// collision-resistant for a small admin tool.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".replace(/[IO]/g, "");
const CODE_LENGTH = 8;
const MAX_RETRIES = 5;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export type GenerateResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

// Inserts a new creators row with a fresh code. On the rare chance of a
// uniqueness collision (Postgres error 23505), retries up to MAX_RETRIES
// times before surfacing the error. Revalidates the admin page so the
// new row appears at the top of the list immediately.
export async function generateCreatorCodeAction(): Promise<GenerateResult> {
  const sb = supabaseAdmin();
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateCode();
    const { error } = await sb.from("creators").insert({ code });
    if (!error) {
      revalidatePath("/admin/creators");
      return { ok: true, code };
    }
    if (error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }
  return {
    ok: false,
    error: "Could not generate a unique code after several attempts — try again.",
  };
}

// Form-action toggle for the admin table. Reads the current approved_at,
// flips it (null → now / now → null), writes back. Idempotent enough that
// a double-click is harmless.
export async function toggleCreatorApprovalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const sb = supabaseAdmin();

  const { data: current, error: readErr } = await sb
    .from("creators")
    .select("approved_at")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !current) return;

  const next = current.approved_at ? null : new Date().toISOString();
  const { error: writeErr } = await sb
    .from("creators")
    .update({ approved_at: next })
    .eq("id", id);
  if (writeErr) return;

  revalidatePath("/admin/creators");
}
