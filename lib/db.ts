import { supabasePublic } from "./supabase";
import { MEASURED_MIN_VOTES, rating, ratingScore } from "./rate";

export type Map = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  cover_image_url: string | null;
};

export type Floor = {
  id: string;
  map_id: string;
  slug: string;
  name: string;
  display_order: number;
  birds_eye_url: string | null;
};

export type Peek = {
  id: string;
  floor_id: string;
  slug: string;
  name: string;
  x_pct: number;
  y_pct: number;
  video_url: string | null;
  poster_url: string | null;
  tiktok_url: string | null;
  instructions: string[] | null;
  difficulty: number;
  risk: "low" | "medium" | "high";
  tip: string | null;
  useful_pct: number;
  vote_count: number; // running total of community votes
  worked_votes: number; // count of "Worked for me" votes
  success_rate: number; // drifted legacy gauge — not shown to users anymore
  base_success_rate: number; // admin-seeded estimate; drives Effectiveness
  published: boolean;
  created_at: string;
};

// Code-gated creator invitations. Admin-only data — public queries don't
// read this table. Profile fields are null until claim time.
export type Creator = {
  id: string;
  code: string;
  display_name: string | null;
  tiktok: string | null;
  bio: string | null;
  profile_image_url: string | null;
  rank: string | null;
  region: string | null;
  platform: string | null;
  youtube_url: string | null;
  twitch_url: string | null;
  x_url: string | null;
  is_founder: boolean;
  claimed_at: string | null;
  approved_at: string | null;
  created_at: string;
};

// NOTE: posted_to_discord is intentionally NOT selected here — public peek
// queries don't need it, and leaving it out keeps these reads working even if
// the code deploys before the 020 migration adds the column. lib/discord.ts
// reads/writes the flag via its own targeted query.
const PEEK_COLUMNS =
  "id, floor_id, slug, name, x_pct, y_pct, video_url, poster_url, tiktok_url, instructions, difficulty, risk, tip, useful_pct, vote_count, worked_votes, success_rate, base_success_rate, published, created_at";

export async function getMaps(): Promise<Map[]> {
  const { data, error } = await supabasePublic()
    .from("maps")
    .select("id, slug, name, published, cover_image_url")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getMapBySlug(slug: string): Promise<Map | null> {
  const { data, error } = await supabasePublic()
    .from("maps")
    .select("id, slug, name, published, cover_image_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Maps the slug/name of a floor to a numeric physical altitude (higher =
// closer to the roof). Required because production `display_order` is
// inconsistent across maps — some have basement=3 / first=1 / second=2,
// some have everything tied at 1, etc. Parsing the name gives us a
// single rule that works for every map regardless of what was typed in
// the admin floor form.
function floorAltitude(slug: string, name: string): number {
  const combined = `${slug ?? ""} ${name ?? ""}`.toLowerCase();

  // Specific labels FIRST so "Sub-basement 2" isn't mistaken for floor 2.
  if (combined.includes("roof")) return 100;
  if (combined.includes("basement")) {
    return combined.includes("sub") ? -2 : -1;
  }
  // Kanal: upper bridge sits above lower bridge, both below the floors.
  if (combined.includes("upper") && combined.includes("bridge")) return 0.5;
  if (combined.includes("lower") && combined.includes("bridge")) return -0.5;
  if (combined.includes("ground")) return 0;

  // Numbered floors — words first, then numerals as a fallback.
  const wordToNum: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
  };
  for (const [word, num] of Object.entries(wordToNum)) {
    if (combined.includes(word)) return num;
  }
  const m = combined.match(/(\d+)/);
  if (m) {
    const num = parseInt(m[1], 10);
    if (Number.isFinite(num) && num > 0 && num < 100) return num;
  }

  // Unknown floor name — sink it to the bottom so it doesn't accidentally
  // outrank a real floor. Tiebreakers below keep its position stable.
  return -1000;
}

// Floors render top-down on every map: highest physical floor first,
// basement last. The order is derived from the floor's NAME/slug, not
// the database's display_order column — production data has that column
// set inconsistently per map and it can't be trusted as a height index.
// See floorAltitude() above for the parsing rules.
export async function getFloorsForMap(mapId: string): Promise<Floor[]> {
  const { data, error } = await supabasePublic()
    .from("floors")
    .select("id, map_id, slug, name, display_order, birds_eye_url")
    .eq("map_id", mapId);
  if (error) throw error;
  const floors = data ?? [];
  return [...floors].sort((a, b) => {
    const da = floorAltitude(a.slug, a.name);
    const db = floorAltitude(b.slug, b.name);
    if (da !== db) return db - da;
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function getFloorBySlug(
  mapId: string,
  floorSlug: string
): Promise<Floor | null> {
  const { data, error } = await supabasePublic()
    .from("floors")
    .select("id, map_id, slug, name, display_order, birds_eye_url")
    .eq("map_id", mapId)
    .eq("slug", floorSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPublishedPeeksForFloor(
  floorId: string
): Promise<Peek[]> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(PEEK_COLUMNS)
    .eq("floor_id", floorId)
    .eq("published", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  // Rank by the same Effectiveness score the /popular page uses, so pin
  // numbers match the grades users see. created_at stays the DB fetch order,
  // so a stable sort keeps it as the tiebreaker for equal scores.
  const peeks = data ?? [];
  return peeks.sort(
    (a, b) =>
      ratingScore(b.base_success_rate, b.worked_votes, b.vote_count) -
      ratingScore(a.base_success_rate, a.worked_votes, a.vote_count)
  );
}

export type PeekWithContext = Peek & {
  floors: (Floor & { maps: Map }) | null;
};

export async function getTopPeeks(limit = 5): Promise<PeekWithContext[]> {
  const sb = supabasePublic();
  const select = `${PEEK_COLUMNS}, floors(id, map_id, slug, name, display_order, birds_eye_url, maps(id, slug, name, published, cover_image_url))`;

  // Two pools, merged: the strongest admin estimates (so the board is never
  // empty) plus every measured peek (≥ vote threshold) so a community-proven
  // angle can't fall outside the estimate window. Final order is by a score
  // that spans both tiers — measured % for rated peeks, seed for the rest.
  const [byEstimate, measured] = await Promise.all([
    sb
      .from("peeks")
      .select(select)
      .eq("published", true)
      .order("base_success_rate", { ascending: false })
      .limit(limit * 4),
    sb
      .from("peeks")
      .select(select)
      .eq("published", true)
      .gte("vote_count", MEASURED_MIN_VOTES)
      .limit(limit * 4),
  ]);
  if (byEstimate.error) throw byEstimate.error;
  if (measured.error) throw measured.error;

  const merged = new Map<string, PeekWithContext>();
  const candidates = ([] as PeekWithContext[])
    .concat((byEstimate.data ?? []) as unknown as PeekWithContext[])
    .concat((measured.data ?? []) as unknown as PeekWithContext[]);
  for (const row of candidates) {
    if (row.floors?.maps?.published) merged.set(row.id, row);
  }

  return Array.from(merged.values())
    .sort(
      (a, b) =>
        ratingScore(b.base_success_rate, b.worked_votes, b.vote_count) -
        ratingScore(a.base_success_rate, a.worked_votes, a.vote_count)
    )
    .slice(0, limit);
}

export async function getPublishedPeekById(id: string): Promise<Peek | null> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(PEEK_COLUMNS)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPublishedPeekBySlug(slug: string): Promise<Peek | null> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(PEEK_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type PublicCreator = Pick<
  Creator,
  | "id"
  | "display_name"
  | "tiktok"
  | "bio"
  | "profile_image_url"
  | "rank"
  | "region"
  | "platform"
  | "youtube_url"
  | "twitch_url"
  | "x_url"
  | "is_founder"
>;

// Public read for the /creators page. Only safe-to-expose columns —
// never selects code, claimed_at, approved_at, or created_at. Anon
// access requires an RLS policy on creators allowing select where
// approved_at is not null; without it this returns an empty list.
export async function getApprovedCreators(): Promise<PublicCreator[]> {
  const { data, error } = await supabasePublic()
    .from("creators")
    .select(
      "id, display_name, tiktok, bio, profile_image_url, rank, region, platform, youtube_url, twitch_url, x_url, is_founder"
    )
    .not("approved_at", "is", null)
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Site-wide count of published peeks. Matches the published filter used
// by /popular and the per-map count on /maps/[slug]. Uses head:true so
// PostgREST returns just the Content-Range count without shipping rows.
export async function getPublishedPeekCount(): Promise<number> {
  const { count, error } = await supabasePublic()
    .from("peeks")
    .select("id", { count: "exact", head: true })
    .eq("published", true);
  if (error) throw error;
  return count ?? 0;
}

export type HomeStats = {
  mapsLive: number; // published maps
  gradedPeeks: number; // published peeks
  communityVotes: number; // sum of vote_count across published peeks
  sTierPeeks: number; // published peeks whose computed grade is "S"
};

// Real, request-time stats for the homepage "live stats" strip. All peek
// figures are over PUBLISHED peeks (consistent with mapsLive). There is no
// stored grade column, so S-tier is computed with rating() — the same grade
// shown on the site. Votes come from vote_count (the running vote total).
export async function getHomeStats(): Promise<HomeStats> {
  const sb = supabasePublic();

  const { count: mapsLive } = await sb
    .from("maps")
    .select("id", { count: "exact", head: true })
    .eq("published", true);

  const { data, error } = await sb
    .from("peeks")
    .select("vote_count, worked_votes, base_success_rate")
    .eq("published", true);
  if (error) throw error;

  const rows = (data ?? []) as {
    vote_count: number;
    worked_votes: number;
    base_success_rate: number;
  }[];

  let communityVotes = 0;
  let sTierPeeks = 0;
  for (const p of rows) {
    communityVotes += p.vote_count ?? 0;
    if (
      rating(p.base_success_rate, p.worked_votes, p.vote_count).grade === "S"
    ) {
      sTierPeeks += 1;
    }
  }

  return {
    mapsLive: mapsLive ?? 0,
    gradedPeeks: rows.length,
    communityVotes,
    sTierPeeks,
  };
}
