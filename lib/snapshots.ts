import { supabaseAdmin } from "./supabase";
import { rating } from "./rate";

export type SnapshotResult = {
  date: string; // YYYY-MM-DD (UTC) captured_at used for every row
  peeks: number; // published peeks processed
};

// Captures one stats snapshot per published peek for today (UTC). Effectiveness
// and grade are derived with the same rating() used everywhere on the site:
// measured peeks (>= MEASURED_MIN_VOTES) use the real worked/total %, others
// use the admin-seeded estimate. Idempotent — the unique (peek_id, captured_at)
// constraint + ignoreDuplicates means re-running the same day is a no-op.
export async function captureDailySnapshots(): Promise<SnapshotResult> {
  const sb = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

  const { data, error } = await sb
    .from("peeks")
    .select("id, base_success_rate, worked_votes, vote_count")
    .eq("published", true);
  if (error) throw error;

  const peeks = (data ?? []) as {
    id: string;
    base_success_rate: number;
    worked_votes: number;
    vote_count: number;
  }[];

  const rows = peeks.map((p) => {
    const r = rating(p.base_success_rate, p.worked_votes, p.vote_count);
    return {
      peek_id: p.id,
      effectiveness_pct:
        r.tier === "measured" ? r.pct : Math.round(p.base_success_rate || 0),
      grade: r.label, // full label incl. +/- for measured, plain letter otherwise
      vote_count: p.vote_count ?? 0,
      captured_at: today,
    };
  });

  if (rows.length > 0) {
    const { error: upErr } = await sb
      .from("peek_snapshots")
      .upsert(rows, {
        onConflict: "peek_id,captured_at",
        ignoreDuplicates: true, // skip peeks already captured today
      });
    if (upErr) throw upErr;
  }

  return { date: today, peeks: rows.length };
}
