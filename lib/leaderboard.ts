import { supabaseAdmin } from "./supabase";

// Leaderboard reads.
//
// Uses the service role, not supabasePublic(), and that is deliberate: both
// contributors and community_submissions have RLS enabled with no policies
// (migrations 031 and 032), so the anon key sees nothing. Migration 032 spells
// out why — a public-read policy on contributors would also expose claimed_by,
// a real auth.users id, to anyone who asked PostgREST for it.
//
// The safety rule that comes with that: every select here is an explicit
// column list. claimed_by must never appear in one, and nothing on this path
// may be handed to a client component.
//
// Aggregation happens in JS rather than SQL because PostgREST cannot GROUP BY.
// The credited set is small — one row today, and it only grows by hand as an
// admin approves submissions — so this is a full scan of a short table, not a
// scaling decision. If it ever stops being short, this is the thing to replace
// with a database view.

export type Period = "week" | "month" | "all";
export type Kind = "peek" | "gadget";

export const PERIODS: Period[] = ["week", "month", "all"];

export function isPeriod(v: string | undefined): v is Period {
  return v === "week" || v === "month" || v === "all";
}
export function isKind(v: string | undefined): v is Kind {
  return v === "peek" || v === "gadget";
}

/** Rolling windows, not calendar ones — "this week" means the last 7 days. */
function since(period: Period): string | null {
  if (period === "all") return null;
  const days = period === "week" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

type CreditedRow = {
  id: string;
  kind: Kind;
  created_at: string;
  is_new_spot: boolean;
  contributor_id: string;
  linked_peek_id: string | null;
  spot_name: string;
  map: string;
};

/**
 * Every approved submission that has been credited to someone.
 *
 * Both filters matter. `status = approved` keeps rejected and still-pending
 * work off the board, and `contributor_id not null` is what makes the board
 * reflect a human decision rather than whatever name a stranger typed into the
 * public form — the whole point of resolving identity at approval.
 */
async function creditedSubmissions(
  kind: Kind,
  period: Period
): Promise<CreditedRow[]> {
  let q = supabaseAdmin()
    .from("community_submissions")
    .select(
      "id, kind, created_at, is_new_spot, contributor_id, linked_peek_id, spot_name, map"
    )
    .eq("status", "approved")
    .eq("kind", kind)
    .not("contributor_id", "is", null);

  const from = since(period);
  if (from) q = q.gte("created_at", from);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CreditedRow[];
}

export type LeaderboardEntry = {
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  count: number;
  firstFinds: number;
};

export type Leaderboard = {
  entries: LeaderboardEntry[];
  /** Credited, approved submissions of this kind in this window. */
  totalContributions: number;
  /** Distinct people behind them. */
  totalContributors: number;
};

export async function getLeaderboard(
  kind: Kind,
  period: Period
): Promise<Leaderboard> {
  const rows = await creditedSubmissions(kind, period);
  if (rows.length === 0) {
    return { entries: [], totalContributions: 0, totalContributors: 0 };
  }

  const tally = new Map<string, { count: number; firstFinds: number }>();
  for (const r of rows) {
    const t = tally.get(r.contributor_id) ?? { count: 0, firstFinds: 0 };
    t.count += 1;
    if (r.is_new_spot) t.firstFinds += 1;
    tally.set(r.contributor_id, t);
  }

  // Hidden contributors drop out here rather than in the tally, so a hidden
  // person's submissions still count toward the totals — they happened, and
  // hiding someone should not silently rewrite the site's numbers.
  const { data, error } = await supabaseAdmin()
    .from("contributors")
    .select("id, slug, display_name, avatar_url, is_hidden")
    .in("id", Array.from(tally.keys()));
  if (error) throw error;

  const people = (data ?? []) as {
    id: string;
    slug: string;
    display_name: string;
    avatar_url: string | null;
    is_hidden: boolean;
  }[];

  const entries = people
    .filter((p) => !p.is_hidden)
    .map((p) => ({
      slug: p.slug,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      count: tally.get(p.id)?.count ?? 0,
      firstFinds: tally.get(p.id)?.firstFinds ?? 0,
    }))
    // Count first; ties broken by name so the order is stable between renders
    // rather than however Postgres happened to return the rows.
    .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));

  return {
    entries,
    totalContributions: rows.length,
    totalContributors: tally.size,
  };
}

export type ContributorProfile = {
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  linkUrl: string | null;
  peekCount: number;
  gadgetCount: number;
  items: {
    id: string;
    kind: Kind;
    spotName: string;
    map: string;
    isNewSpot: boolean;
    createdAt: string;
    /** Set once the submission became a published peek. Links to /peeks/<slug>. */
    peekSlug: string | null;
  }[];
};

/**
 * One contributor's public page. Returns null for an unknown or hidden slug so
 * the route can 404 — a hidden contributor should not be reachable by guessing
 * the URL just because the leaderboard stopped listing them.
 */
export async function getContributorProfile(
  slug: string
): Promise<ContributorProfile | null> {
  const sb = supabaseAdmin();

  const { data: row, error } = await sb
    .from("contributors")
    .select("id, slug, display_name, avatar_url, link_url, is_hidden")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const c = row as {
    id: string;
    slug: string;
    display_name: string;
    avatar_url: string | null;
    link_url: string | null;
    is_hidden: boolean;
  };
  if (c.is_hidden) return null;

  const { data: subs, error: subErr } = await sb
    .from("community_submissions")
    .select("id, kind, spot_name, map, is_new_spot, created_at, linked_peek_id")
    .eq("status", "approved")
    .eq("contributor_id", c.id)
    .order("created_at", { ascending: false });
  if (subErr) throw subErr;

  const rows = (subs ?? []) as {
    id: string;
    kind: Kind;
    spot_name: string;
    map: string;
    is_new_spot: boolean;
    created_at: string;
    linked_peek_id: string | null;
  }[];

  // Resolve the peeks in one go so a profile with 30 credits is still two
  // queries rather than 31.
  const peekIds = rows
    .map((r) => r.linked_peek_id)
    .filter((v): v is string => !!v);
  const peekBySlug = new Map<string, string>();
  if (peekIds.length > 0) {
    const { data: peeks } = await sb
      .from("peeks")
      .select("id, slug, published")
      .in("id", peekIds);
    for (const p of (peeks ?? []) as {
      id: string;
      slug: string;
      published: boolean;
    }[]) {
      // Unpublished peeks get no link. The credit still shows — they did the
      // work — but pointing at a draft would 404 on the public site.
      if (p.published) peekBySlug.set(p.id, p.slug);
    }
  }

  return {
    slug: c.slug,
    displayName: c.display_name,
    avatarUrl: c.avatar_url,
    linkUrl: c.link_url,
    peekCount: rows.filter((r) => r.kind === "peek").length,
    gadgetCount: rows.filter((r) => r.kind === "gadget").length,
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      spotName: r.spot_name,
      map: r.map,
      isNewSpot: r.is_new_spot,
      createdAt: r.created_at,
      peekSlug: r.linked_peek_id
        ? peekBySlug.get(r.linked_peek_id) ?? null
        : null,
    })),
  };
}
