import { supabaseAdmin } from "./supabase";
import type { FloorOption } from "@/components/PeekForm";

export async function getFloorOptions(): Promise<FloorOption[]> {
  const { data, error } = await supabaseAdmin()
    .from("floors")
    .select(
      "id, name, display_order, birds_eye_url, maps(name, slug)"
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
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.maps)
    .map((r) => ({
      id: r.id,
      name: r.name,
      mapName: r.maps!.name,
      birdsEyeUrl: r.birds_eye_url,
    }));
}
