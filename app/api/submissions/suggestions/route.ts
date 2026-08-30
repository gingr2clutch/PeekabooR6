import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Typeahead source for step 2, fetched on demand rather than shipped with the
// page. The submit section sits below the fold on both pages, so nobody needs
// this until they scroll and interact — loading it lazily keeps the homepage's
// payload and query count exactly as they were.
//
// READ ONLY. The peek branch selects two columns and writes nothing; peeks are
// never modified anywhere in this feature.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const mapSlug = url.searchParams.get("map") ?? "";
  if (!mapSlug) return NextResponse.json({ names: [] });

  const sb = supabasePublic();

  const { data: map } = await sb
    .from("maps")
    .select("id")
    .eq("slug", mapSlug)
    .maybeSingle();
  if (!map) return NextResponse.json({ names: [] });

  if (kind === "peek") {
    // Peeks carry no map_id — they hang off floors, so the map is reached
    // through the embed, the same shape the rest of the app uses.
    const { data, error } = await sb
      .from("peeks")
      .select("name, floors!inner(map_id)")
      .eq("published", true)
      .eq("floors.map_id", map.id);
    if (error) return NextResponse.json({ names: [] });
    const names = Array.from(
      new Set(((data ?? []) as unknown as { name: string }[]).map((p) => p.name))
    ).sort();
    return NextResponse.json({ names });
  }

  if (kind === "gadget") {
    // Narrowed by site AND operator, not operator alone: a placement label
    // belongs to a site+operator pair, so suggesting Valkyrie's labels from a
    // different bomb site would be noise.
    const site = url.searchParams.get("site");
    const operator = url.searchParams.get("operator");

    let q = sb
      .from("gadget_placements")
      .select(
        "label, gadget_sites!inner(map_id, name), gadget_operators!inner(name)"
      )
      .eq("published", true)
      .eq("gadget_sites.map_id", map.id);
    if (site) q = q.eq("gadget_sites.name", site);
    if (operator) q = q.eq("gadget_operators.name", operator);

    const { data, error } = await q;
    if (error) return NextResponse.json({ names: [] });
    const names = Array.from(
      new Set(
        ((data ?? []) as unknown as { label: string | null }[])
          .map((p) => p.label)
          .filter((l): l is string => !!l)
      )
    ).sort();
    return NextResponse.json({ names });
  }

  return NextResponse.json({ names: [] });
}
