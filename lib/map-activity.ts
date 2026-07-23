import { supabaseAdmin, supabasePublic } from "@/lib/supabase";

export type MapVoteActivity = {
  sevenDayVotes: number; // votes gained across the map's peeks in the last ~7 days
  allTimeVotes: number; // sum of current vote_count across the map's peeks
};

const SEVEN = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgoUTC(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Per-map vote activity, keyed by map id.
//
// Votes are stored only as running counters on peeks (no per-vote table), so
// "votes in the last 7 days" is derived from the daily peek_snapshots series
// (captured by the GitHub Action cron): for each published peek,
//   7-day votes = current vote_count − vote_count at the ~7-days-ago snapshot.
// Peeks younger than 7 days have no baseline snapshot, but all of their votes
// are by definition recent, so their whole vote_count counts. When no baseline
// exists yet (snapshots < 7 days old), every peek yields 0 and callers fall back
// to all-time votes — the intended interim behaviour.
//
// No migration required; runs per request (cheap: two small queries).
export async function getMapVoteActivity(): Promise<
  Map<string, MapVoteActivity>
> {
  const out = new Map<string, MapVoteActivity>();

  // Current vote_count + map id for every published peek (peeks → floors → map).
  const { data: peekRows } = await supabasePublic()
    .from("peeks")
    .select("id, vote_count, created_at, floors!inner(map_id)")
    .eq("published", true);

  type PeekRow = {
    id: string;
    vote_count: number | null;
    created_at: string;
    floors: { map_id: string } | null;
  };
  const peeks = (peekRows ?? []) as unknown as PeekRow[];

  // Baseline: each peek's vote_count as of ~7 days ago (one row per peek).
  // Snapshots are RLS-locked, so read them with the service-role client.
  const { data: snapRows } = await supabaseAdmin()
    .from("peek_snapshots")
    .select("peek_id, vote_count")
    .eq("captured_at", isoDaysAgoUTC(SEVEN));

  const baseline = new Map<string, number>();
  for (const s of (snapRows ?? []) as { peek_id: string; vote_count: number }[]) {
    baseline.set(s.peek_id, s.vote_count);
  }

  const newThreshold = Date.now() - SEVEN * DAY_MS;

  for (const p of peeks) {
    const mapId = p.floors?.map_id;
    if (!mapId) continue;
    const current = p.vote_count ?? 0;

    const createdMs = new Date(p.created_at).getTime();
    let sevenDay: number;
    if (Number.isFinite(createdMs) && createdMs >= newThreshold) {
      // Peek is younger than the window → every vote it has is recent.
      sevenDay = current;
    } else {
      const base = baseline.get(p.id);
      sevenDay = base === undefined ? 0 : Math.max(0, current - base);
    }

    const acc = out.get(mapId) ?? { sevenDayVotes: 0, allTimeVotes: 0 };
    acc.sevenDayVotes += sevenDay;
    acc.allTimeVotes += current;
    out.set(mapId, acc);
  }

  return out;
}
