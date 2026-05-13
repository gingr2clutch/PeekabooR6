"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Public, no-auth endpoint. Reads the current success_rate, applies +1 (kill)
// or -1 (no kill), clamps to 0-100, writes back, returns the new value.
export async function castVote(
  peekId: string,
  isKill: boolean
): Promise<{ success_rate: number } | null> {
  if (!peekId) return null;
  const sb = supabaseAdmin();

  const { data: current, error: readErr } = await sb
    .from("peeks")
    .select("success_rate, published, slug")
    .eq("id", peekId)
    .maybeSingle();
  if (readErr || !current || !current.published) return null;

  const next = clamp(current.success_rate + (isKill ? 1 : -1), 0, 100);

  const { error: writeErr } = await sb
    .from("peeks")
    .update({ success_rate: next })
    .eq("id", peekId);
  if (writeErr) return null;

  if (current.slug) revalidatePath(`/peeks/${current.slug}`);
  return { success_rate: next };
}
