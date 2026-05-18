import { supabasePublic } from "./supabase";

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

export type PeekType = "spawn" | "runout" | "mid_game";

export type Peek = {
  id: string;
  floor_id: string;
  slug: string;
  name: string;
  x_pct: number;
  y_pct: number;
  video_url: string | null;
  poster_url: string | null;
  instructions: string[] | null;
  difficulty: number;
  risk: "low" | "medium" | "high";
  tip: string | null;
  useful_pct: number;
  vote_count: number;
  success_rate: number;
  // Optional because migration 013 (peek_type column) is applied
  // separately; renderers fall back to 'spawn' when this is absent.
  peek_type?: PeekType | null;
  published: boolean;
  created_at: string;
};

// peek_type is intentionally NOT in the SELECT list. PostgREST hard-fails
// the whole query with 42703 when an unknown column is requested, so
// adding it here would 500 every public route on a Supabase project
// that hasn't yet run db/migrations/013_peeks_type.sql. Once the
// migration is applied in every environment, append `, peek_type` here.
const PEEK_COLUMNS =
  "id, floor_id, slug, name, x_pct, y_pct, video_url, poster_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, published, created_at";

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

export async function getFloorsForMap(mapId: string): Promise<Floor[]> {
  const { data, error } = await supabasePublic()
    .from("floors")
    .select("id, map_id, slug, name, display_order, birds_eye_url")
    .eq("map_id", mapId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
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

// Try with peek_type first so the floor view can colour pins by type.
// Older Supabase projects that haven't run migration 013 still answer
// the legacy column set — fall back to that and log a warning. Once the
// migration is applied everywhere this fallback can be removed.
export async function getPublishedPeeksForFloor(
  floorId: string
): Promise<Peek[]> {
  const sb = supabasePublic();
  const first = await sb
    .from("peeks")
    .select(`${PEEK_COLUMNS}, peek_type`)
    .eq("floor_id", floorId)
    .eq("published", true)
    .order("success_rate", { ascending: false })
    .order("created_at", { ascending: true });
  if (!first.error) return (first.data ?? []) as Peek[];
  if (first.error.code !== "42703") throw first.error;
  console.warn(
    "[getPublishedPeeksForFloor] peek_type column missing — falling back (run migration 013 to enable colour-coded pins)"
  );
  const second = await sb
    .from("peeks")
    .select(PEEK_COLUMNS)
    .eq("floor_id", floorId)
    .eq("published", true)
    .order("success_rate", { ascending: false })
    .order("created_at", { ascending: true });
  if (second.error) throw second.error;
  return (second.data ?? []) as Peek[];
}

export type PeekWithContext = Peek & {
  floors: (Floor & { maps: Map }) | null;
};

export async function getTopPeeks(limit = 5): Promise<PeekWithContext[]> {
  // Overfetch then drop any whose map isn't published — supabase's filter
  // syntax can't reach maps.published through the nested join cleanly.
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(
      `${PEEK_COLUMNS}, floors(id, map_id, slug, name, display_order, birds_eye_url, maps(id, slug, name, published, cover_image_url))`
    )
    .eq("published", true)
    .order("success_rate", { ascending: false })
    .order("vote_count", { ascending: false })
    .limit(limit * 3);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PeekWithContext[];
  return rows.filter((p) => p.floors?.maps?.published).slice(0, limit);
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
