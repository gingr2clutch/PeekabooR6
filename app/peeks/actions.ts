"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

// Public, no-auth endpoint. Records a real "Worked for me / Didn't work" vote:
// vote_count is the running total, worked_votes counts the "worked" clicks.
// Once vote_count clears MEASURED_MIN_VOTES the peek's display flips from the
// admin-seeded Effectiveness estimate to a measured worked/total percentage.
// The admin estimate (base_success_rate) is never touched here.
export async function castVote(
  peekId: string,
  isKill: boolean
): Promise<{ vote_count: number; worked_votes: number } | null> {
  if (!peekId) return null;
  const sb = supabaseAdmin();

  const { data: current, error: readErr } = await sb
    .from("peeks")
    .select("vote_count, worked_votes, published, slug")
    .eq("id", peekId)
    .maybeSingle();
  if (readErr || !current || !current.published) return null;

  const vote_count = (current.vote_count ?? 0) + 1;
  const worked_votes = (current.worked_votes ?? 0) + (isKill ? 1 : 0);

  const { error: writeErr } = await sb
    .from("peeks")
    .update({ vote_count, worked_votes })
    .eq("id", peekId);
  if (writeErr) return null;

  if (current.slug) revalidatePath(`/peeks/${current.slug}`);
  revalidatePath("/top");
  return { vote_count, worked_votes };
}
