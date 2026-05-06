"use server";

import { supabaseAdmin } from "@/lib/supabase";

export type LiveStats = {
  liveNow: number;
  today: number;
  lastHour: number;
  allTime: number;
  topPages: { path: string; count: number }[];
  recent: { path: string; created_at: string }[];
};

export async function getLiveStats(): Promise<LiveStats> {
  const sb = supabaseAdmin();
  const now = Date.now();
  const minuteAgo = new Date(now - 60_000).toISOString();
  const hourAgo = new Date(now - 60 * 60_000).toISOString();
  const today = new Date();
  const utcMidnight = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  ).toISOString();

  // Distinct session_ids in the last 60 seconds — Supabase doesn't expose
  // SELECT DISTINCT, so pull the small window and de-dupe in JS.
  const live = await sb
    .from("page_views")
    .select("session_id")
    .gte("created_at", minuteAgo);
  const liveNow = new Set(
    (live.data ?? []).map((r: { session_id: string }) => r.session_id)
  ).size;

  const todayCount = await sb
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", utcMidnight);

  const hourCount = await sb
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);

  const allCount = await sb
    .from("page_views")
    .select("id", { count: "exact", head: true });

  // Top pages today: pull paths since UTC midnight, count in JS, sort.
  const todayPaths = await sb
    .from("page_views")
    .select("path")
    .gte("created_at", utcMidnight);
  const pageCounts = new Map<string, number>();
  for (const row of (todayPaths.data ?? []) as { path: string }[]) {
    pageCounts.set(row.path, (pageCounts.get(row.path) ?? 0) + 1);
  }
  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  const recent = await sb
    .from("page_views")
    .select("path, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    liveNow,
    today: todayCount.count ?? 0,
    lastHour: hourCount.count ?? 0,
    allTime: allCount.count ?? 0,
    topPages,
    recent: (recent.data ?? []) as { path: string; created_at: string }[],
  };
}
