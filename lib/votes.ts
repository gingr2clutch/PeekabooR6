import { supabaseAdmin } from "@/lib/supabase";

// Logged-in users may vote again on a peek, but only 7 days after their last
// vote on it — stops flip-flop spam while letting people refresh a stale call.
export const REVOTE_COOLDOWN_DAYS = 7;

export type MyVote = {
  choice: "worked" | "didnt";
  // 0 = the cooldown has passed and they can vote again now.
  daysUntilRevote: number;
};

const DAY_MS = 86_400_000;

// Whole days remaining before `lastVotedAt` clears the cooldown (0 once it has).
// Rounded up so "1 day left" never silently means "a few more hours".
export function daysUntilRevote(lastVotedAt: string): number {
  const elapsedDays = (Date.now() - new Date(lastVotedAt).getTime()) / DAY_MS;
  return Math.max(0, Math.ceil(REVOTE_COOLDOWN_DAYS - elapsedDays));
}

// A logged-in user's MOST RECENT vote on a peek (or null). peek_votes is an
// append-only history, so this reads the newest row. It's RLS-locked, hence the
// service role. Anonymous users never have a row here.
export async function getMyLatestPeekVote(
  peekId: string,
  userId: string
): Promise<MyVote | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("peek_votes")
    .select("worked, created_at")
    .eq("peek_id", peekId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    choice: data.worked ? "worked" : "didnt",
    daysUntilRevote: daysUntilRevote(data.created_at as string),
  };
}
