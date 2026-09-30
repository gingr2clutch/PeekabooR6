import { supabaseAdmin } from "./supabase";
import type { FloorOption } from "@/components/PeekForm";

export async function getFloorOptions(): Promise<FloorOption[]> {
  // Peeks come along for the ride so the pin placer can warn when a new pin
  // lands on an existing one. Explicit columns only, and DRAFTS are included on
  // purpose: two unpublished peeks at one window is exactly the collision worth
  // catching before either goes live. Read-only — nothing here writes.
  const { data, error } = await supabaseAdmin()
    .from("floors")
    .select(
      "id, name, display_order, birds_eye_url, maps(name, slug), peeks(id, name, published, x_pct, y_pct)"
    )
    .order("name", { foreignTable: "maps", ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;

  type Row = {
    id: string;
    name: string;
    display_order: number;
    birds_eye_url: string | null;
    maps: { name: string; slug: string } | null;
    peeks: {
      id: string;
      name: string;
      published: boolean;
      x_pct: number | null;
      y_pct: number | null;
    }[] | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.maps)
    .map((r) => ({
      id: r.id,
      name: r.name,
      mapName: r.maps!.name,
      birdsEyeUrl: r.birds_eye_url,
      peeks: (r.peeks ?? [])
        // A row with no coordinates cannot collide with anything.
        .filter(
          (p) => Number.isFinite(p.x_pct) && Number.isFinite(p.y_pct)
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          published: p.published,
          x_pct: p.x_pct as number,
          y_pct: p.y_pct as number,
        })),
    }));
}
