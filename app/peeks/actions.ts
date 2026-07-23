"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { REVOTE_COOLDOWN_DAYS, daysUntilRevote } from "@/lib/votes";

export type VoteResult = {
  vote_count: number; // distinct current voters (grade denominator)
  worked_votes: number; // how many of those said "worked"
  total_casts: number; // every cast ever (display only)
  // Logged-in only: their latest pick + days until they can vote again.
  myVote?: "worked" | "didnt";
  daysUntilRevote?: number;
};

// Records a "Worked for me / Didn't work" vote.
//
//   • Anonymous (no session): unchanged one-time behavior — bump the aggregate
//     counters. Double-voting is guarded only client-side by a localStorage flag.
//   • Logged-in: EVERY vote is appended to peek_votes forever (never updated or
//     deleted). They may vote again 7 days after their last vote on the peek.
//
// The grade always reflects each user's LATEST vote at full weight: vote_count
// counts a user once (their first vote); a re-vote leaves vote_count alone and
// only shifts worked_votes by the flip delta. total_casts counts every cast for
// honest "N votes · M players" display and never feeds the grade.
export async function castVote(
  peekId: string,
  isKill: boolean
): Promise<VoteResult | null> {
  if (!peekId) return null;
  const sb = supabaseAdmin();

  const { data: current, error: readErr } = await sb
    .from("peeks")
    .select("vote_count, worked_votes, total_casts, published, slug")
    .eq("id", peekId)
    .maybeSingle();
  if (readErr || !current || !current.published) return null;

  const baseCount = current.vote_count ?? 0;
  const baseWorked = current.worked_votes ?? 0;
  const baseCasts = current.total_casts ?? 0;

  const revalidate = () => {
    if (current.slug) revalidatePath(`/peeks/${current.slug}`);
    revalidatePath("/top");
  };

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  // --- Anonymous: unchanged one-time increment (each cast = one distinct voter). ---
  if (!user) {
    const vote_count = baseCount + 1;
    const worked_votes = baseWorked + (isKill ? 1 : 0);
    const total_casts = baseCasts + 1;
    const { error } = await sb
      .from("peeks")
      .update({ vote_count, worked_votes, total_casts })
      .eq("id", peekId);
    if (error) return null;
    revalidate();
    return { vote_count, worked_votes, total_casts };
  }

  // --- Logged-in: append-only history + 7-day re-vote cadence. ---
  const { data: prev } = await sb
    .from("peek_votes")
    .select("worked, created_at")
    .eq("peek_id", peekId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Cooldown enforced server-side (never trust the client): still inside the
  // window → change nothing, just report current state.
  if (prev) {
    const remaining = daysUntilRevote(prev.created_at as string);
    if (remaining > 0) {
      return {
        vote_count: baseCount,
        worked_votes: baseWorked,
        total_casts: baseCasts,
        myVote: prev.worked ? "worked" : "didnt",
        daysUntilRevote: remaining,
      };
    }
  }

  const nowIso = new Date().toISOString();

  // Permanent history row — never updated, never deleted.
  const { error: insErr } = await sb
    .from("peek_votes")
    .insert({ peek_id: peekId, user_id: user.id, worked: isKill, created_at: nowIso });
  if (insErr) return null;

  // Current-grade aggregates: total_casts always +1. A first-time voter is a new
  // distinct voter; a re-vote keeps vote_count fixed and only moves worked_votes.
  const total_casts = baseCasts + 1;
  let vote_count = baseCount;
  let worked_votes = baseWorked;
  if (!prev) {
    vote_count = baseCount + 1;
    worked_votes = baseWorked + (isKill ? 1 : 0);
  } else {
    const delta = (isKill ? 1 : 0) - (prev.worked ? 1 : 0);
    worked_votes = Math.max(0, Math.min(baseCount, baseWorked + delta));
  }

  const { error: updErr } = await sb
    .from("peeks")
    .update({ vote_count, worked_votes, total_casts })
    .eq("id", peekId);
  if (updErr) return null;

  revalidate();
  return {
    vote_count,
    worked_votes,
    total_casts,
    myVote: isKill ? "worked" : "didnt",
    daysUntilRevote: REVOTE_COOLDOWN_DAYS,
  };
}
