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

export type Peek = {
  id: string;
  floor_id: string;
  name: string;
  x_pct: number;
  y_pct: number;
  screenshot_url: string | null;
  video_url: string | null;
  instructions: string[] | null;
  difficulty: number;
  risk: "low" | "medium" | "high";
  tip: string | null;
  useful_pct: number;
  vote_count: number;
  success_rate: number;
  published: boolean;
};

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

export async function getPublishedPeeksForFloor(
  floorId: string
): Promise<Peek[]> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(
      "id, floor_id, name, x_pct, y_pct, screenshot_url, video_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, published"
    )
    .eq("floor_id", floorId)
    .eq("published", true);
  if (error) throw error;
  return data ?? [];
}

export async function getPublishedPeek(id: string): Promise<Peek | null> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(
      "id, floor_id, name, x_pct, y_pct, screenshot_url, video_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, published"
    )
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
