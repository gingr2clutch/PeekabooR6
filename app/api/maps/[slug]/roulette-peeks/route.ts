import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase";
import { rating } from "@/lib/rate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Peek pool for one map, for the homepage roulette.
//
// The map page passes its pool straight down as props because it already loads
// rankedPeeks. The homepage cannot: it would have to ship every map's peeks to
// every visitor (~140 rows, mostly long R2 URLs) on a page that is ~90% phones
// and carries ads. So the pool is fetched on demand once a map is chosen.
//
// Read-only. Anon client, so RLS applies and only published rows come back.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const sb = supabasePublic();

  const { data: map } = await sb
    .from("maps")
    .select("id, slug, name, published, cover_image_url")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!map || !map.published) {
    return NextResponse.json({ peeks: [], mapCoverUrl: null }, { status: 404 });
  }

  // Same floors!inner shape the random-peek route uses — peeks carry no
  // map_id, so the map is reached through the floor.
  const { data, error } = await sb
    .from("peeks")
    .select(
      "id, slug, name, video_url, poster_url, base_success_rate, worked_votes, vote_count, floors!inner(name, map_id)"
    )
    .eq("published", true)
    .eq("floors.map_id", map.id);

  if (error) {
    return NextResponse.json({ peeks: [], mapCoverUrl: null }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    slug: string;
    name: string;
    video_url: string | null;
    poster_url: string | null;
    base_success_rate: number;
    worked_votes: number;
    vote_count: number;
    floors: { name: string } | null;
  }[];

  // Grade is computed, not stored — same rating() the cards and the map-page
  // pool use, so a peek grades identically wherever it appears.
  const peeks = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    floorName: p.floors?.name ?? null,
    gradeLabel: rating(p.base_success_rate, p.worked_votes, p.vote_count).label,
    videoUrl: p.video_url,
    posterUrl: p.poster_url,
  }));

  const res = NextResponse.json({
    peeks,
    mapName: map.name,
    mapCoverUrl: map.cover_image_url,
  });
  // Every spin should see current data; never let a CDN pin a stale pool.
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}
