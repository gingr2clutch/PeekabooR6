import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Picks a random published peek on the given map and redirects the browser
// to its slug URL. Selection happens on every request — no caching, so each
// click rolls a fresh pick.
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const sb = supabasePublic();

  const { data: map } = await sb
    .from("maps")
    .select("id, slug, published")
    .eq("slug", params.slug)
    .maybeSingle();

  const fallback = (path: string) => {
    const res = NextResponse.redirect(new URL(path, req.url), 307);
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
  };

  if (!map || !map.published) {
    return fallback(`/maps/${params.slug}`);
  }

  const { data: peeks } = await sb
    .from("peeks")
    .select("slug, floors!inner(map_id)")
    .eq("published", true)
    .eq("floors.map_id", map.id);

  const list = (peeks ?? []) as unknown as { slug: string }[];
  if (list.length === 0) {
    return fallback(`/maps/${map.slug}`);
  }

  const pick = list[Math.floor(Math.random() * list.length)];
  return fallback(`/peeks/${pick.slug}`);
}
