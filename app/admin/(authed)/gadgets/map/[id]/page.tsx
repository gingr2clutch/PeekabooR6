import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminListCard, AdminPill } from "../../../AdminCards";
import { AdminScreen } from "../../../AdminScreen";
import { createSiteAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gadget sites",
  robots: { index: false, follow: false },
};

// Bomb sites for one map.
//
// Lives under /map/ rather than at /admin/gadgets/[map] because the dynamic
// slot at that level is already /admin/gadgets/[site]. A static segment beside
// a dynamic one resolves to the static branch first — the same arrangement
// /admin/gadgets/operators has always used. Site ids are UUIDs, so "map" can
// never be mistaken for one.
//
// Publish, unpublish and delete moved to the site's own screen. They were five
// controls deep in a wrapping row here, which is exactly the shape that made
// this page unusable on a phone.

type SiteRow = {
  id: string;
  slug: string;
  name: string;
  floor_id: string | null;
  display_order: number;
  published: boolean;
  preview_image_url: string | null;
};

const input =
  "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-blue";

export default async function AdminGadgetMapPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = supabaseAdmin();

  const [mapRes, floorsRes, sitesRes, placementsRes] = await Promise.all([
    sb.from("maps").select("id, slug, name").eq("id", params.id).maybeSingle(),
    sb.from("floors").select("id, name").eq("map_id", params.id).order("name"),
    sb
      .from("gadget_sites")
      .select(
        "id, slug, name, floor_id, display_order, published, preview_image_url"
      )
      .eq("map_id", params.id)
      .order("display_order"),
    sb.from("gadget_placements").select("site_id"),
  ]);
  if (mapRes.error) throw mapRes.error;
  if (!mapRes.data) notFound();

  const map = mapRes.data as { id: string; slug: string; name: string };
  const floors = (floorsRes.data ?? []) as { id: string; name: string }[];
  const sites = (sitesRes.data ?? []) as SiteRow[];
  const floorName = new Map(floors.map((f) => [f.id, f.name]));

  const placements = new Map<string, number>();
  for (const p of (placementsRes.data ?? []) as { site_id: string }[]) {
    placements.set(p.site_id, (placements.get(p.site_id) ?? 0) + 1);
  }

  const published = sites.filter((s) => s.published).length;

  return (
    <AdminScreen
      title={map.name}
      back={{ href: "/admin/gadgets", label: "Gadgets", accent: "blue" }}
      subtitle={`${sites.length} site${
        sites.length === 1 ? "" : "s"
      } · ${published} published`}
    >
      {sites.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-5 text-sm text-muted">
          No sites on {map.name} yet. Add one below.
        </p>
      ) : (
        <div className="space-y-2">
          {sites.map((s) => {
            const n = placements.get(s.id) ?? 0;
            return (
              <AdminListCard
                key={s.id}
                href={`/admin/gadgets/${s.id}`}
                accent="blue"
                title={s.name}
                meta={
                  <>
                    /{s.slug} ·{" "}
                    {s.floor_id
                      ? floorName.get(s.floor_id) ?? "unknown floor"
                      : "no floor set"}{" "}
                    · {n} placement{n === 1 ? "" : "s"}
                    {!s.preview_image_url && " · no photo"}
                  </>
                }
                right={
                  <AdminPill tone={s.published ? "good" : "muted"}>
                    {s.published ? "Live" : "Draft"}
                  </AdminPill>
                }
              />
            );
          })}
        </div>
      )}

      <form
        action={createSiteAction}
        className="space-y-3 rounded-card border border-dashed border-border p-4"
      >
        <input type="hidden" name="map_id" value={map.id} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Add a site to {map.name}
        </h2>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input name="name" required placeholder="Site A" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Slug (optional)</span>
          <input name="slug" placeholder="site-a" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">
            Floor (blueprint)
          </span>
          <select name="floor_id" className={input} defaultValue="">
            <option value="">— none —</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Order</span>
          <input
            name="display_order"
            type="number"
            defaultValue={sites.length}
            className={input}
          />
        </label>
        <button className="w-full rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue sm:w-auto">
          Add site
        </button>
      </form>
    </AdminScreen>
  );
}
