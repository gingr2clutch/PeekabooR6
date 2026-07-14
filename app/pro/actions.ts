"use server";

import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export type WaitlistState = { error?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Add an email to the pre-launch Pro waitlist. Writes with the service role
// (RLS blocks client access to the table). Duplicate emails are treated as
// success — the unique constraint makes re-signups idempotent.
export async function joinWaitlistAction(
  _prev: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email." };
  }

  // Attach the user id when signed in (best-effort; never blocks the signup).
  let userId: string | null = null;
  try {
    userId = (await getCurrentUser())?.id ?? null;
  } catch {
    userId = null;
  }

  const { error } = await supabaseAdmin()
    .from("pro_waitlist")
    .upsert(
      { email, user_id: userId },
      { onConflict: "email", ignoreDuplicates: true }
    );
  if (error) {
    return { error: "Couldn't add you right now — please try again." };
  }

  return { message: "You're on the list — we'll email you when Pro launches." };
}
