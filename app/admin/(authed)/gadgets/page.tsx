import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createSiteAction,
  deleteSiteAction,
  toggleSitePublishedAction,
} from "./actions";

// Reads with the service-role client, so DRAFTS ARE VISIBLE here. The public
// pages use supabasePublic() and see published rows only.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gadget sites",
  robots: { index: false, follow: false },
};

type SiteRow = {
  id: string;
  map_id: string;
  floor_id: string | null;
  slug: string;
  name: string;
  display_order: number;
  published: boolean;
  preview_image_url: string | null;
};

const input =
  "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";

export default async function AdminGadgetSitesPage() {
  const sb = supabaseAdmin();

  const [mapsRes, floorsRes, sitesRes, countsRes] = await Promise.all([
    sb.from("maps").select("id, slug, name").order("name"),
    sb.from("floors").select("id, map_id, name").order("name"),
    sb
      .from("gadget_sites")
      .select(
        "id, map_id, floor_id, slug, name, display_order, published, preview_image_url"
      )
      .order("display_order"),
    sb.from("gadget_placements").select("id, site_id"),
  ]);
  for (const r of [mapsRes, floorsRes, sitesRes, countsRes]) {
    if (r.error) throw r.error;
  }

  const maps = (mapsRes.data ?? []) as {
    id: string;
    slug: string;
    name: string;
  }[];
  const floors = (floorsRes.data ?? []) as {
    id: string;
    map_id: string;
    name: string;
  }[];
  const sites = (sitesRes.data ?? []) as SiteRow[];

  const placementCount = new Map<string, number>();
  for (const p of (countsRes.data ?? []) as { site_id: string }[]) {
    placementCount.set(p.site_id, (placementCount.get(p.site_id) ?? 0) + 1);
  }
  const floorName = new Map(floors.map((f) => [f.id, f.name]));

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Gadget sites
        </h1>
        <span className="text-sm text-muted">
          {sites.length} sites · {placementCount.size} with placements
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        Bomb sites per map. Drafts are listed here but hidden from the public
        site until published. Placements live inside each site.
      </p>

      {maps.map((map) => {
        const mapSites = sites.filter((s) => s.map_id === map.id);
        const mapFloors = floors.filter((f) => f.map_id === map.id);
        return (
          <section key={map.id} className="mt-8">
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
                {map.name}
              </h2>
              <hr className="h-px flex-1 border-0 bg-border" />
              <span className="text-xs text-muted">
                {mapSites.length} sites
              </span>
            </div>

            {mapSites.length > 0 && (
              <ul className="mb-3 space-y-2">
                {mapSites.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-card px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/admin/gadgets/${s.id}`}
                        className="font-medium text-ink hover:text-brand"
                      >
                        {s.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted">
                        /{s.slug} ·{" "}
                        {s.floor_id
                          ? floorName.get(s.floor_id) ?? "unknown floor"
                          : "no floor set"}{" "}
                        · {placementCount.get(s.id) ?? 0} placements
                      </span>
                    </span>

                    {/* Which thumbnail the public card is actually using.
                        "No photo" is not an error — the card falls back to the
                        floor blueprint — but it is the one thing you cannot
                        tell from the row otherwise. */}
                    <span
                      className={`rounded-btn px-2 py-0.5 text-xs font-medium ${
                        s.preview_image_url
                          ? "bg-blue/10 text-blue"
                          : "bg-ink/[0.06] text-muted"
                      }`}
                      title={
                        s.preview_image_url
                          ? "Card shows this site's photo"
                          : "Card falls back to the floor blueprint"
                      }
                    >
                      {s.preview_image_url ? "Photo" : "No photo"}
                    </span>

                    <span
                      className={`rounded-btn px-2 py-0.5 text-xs font-semibold ${
                        s.published
                          ? "bg-teal/10 text-teal"
                          : "bg-ink/[0.06] text-muted"
                      }`}
                    >
                      {s.published ? "Published" : "Draft"}
                    </span>

                    {/* Explicit affordance. The site name above links to the
                        same place, but it reads as plain text, so the photo
                        and placement editor was effectively hidden. */}
                    <Link
                      href={`/admin/gadgets/${s.id}`}
                      className="rounded-btn border border-border px-2 py-1 text-xs font-medium text-ink hover:border-blue hover:text-blue"
                    >
                      Photo &amp; placements
                    </Link>

                    <form action={toggleSitePublishedAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input
                        type="hidden"
                        name="published"
                        value={s.published ? "false" : "true"}
                      />
                      <button className="rounded-btn border border-border px-2 py-1 text-xs text-ink hover:border-brand hover:text-brand">
                        {s.published ? "Unpublish" : "Publish"}
                      </button>
                    </form>

                    {/* Deleting a site cascades to its placements (migration
                        029), so this confirms first and names the count that
                        would go with it. */}
                    <form action={deleteSiteAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmButton
                        message={`Delete "${s.name}"? This also deletes its ${
                          placementCount.get(s.id) ?? 0
                        } placement(s). This cannot be undone.`}
                        className="rounded-btn border border-border px-2 py-1 text-xs text-muted hover:border-brand hover:text-brand"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            {/* Add a site to this map. */}
            <form
              action={createSiteAction}
              className="flex flex-wrap items-end gap-2 rounded-card border border-dashed border-border p-3"
            >
              <input type="hidden" name="map_id" value={map.id} />
              <label className="min-w-[9rem] flex-1">
                <span className="mb-1 block text-xs text-muted">Name</span>
                <input
                  name="name"
                  required
                  placeholder="Site A"
                  className={input}
                />
              </label>
              <label className="min-w-[9rem] flex-1">
                <span className="mb-1 block text-xs text-muted">
                  Slug (optional)
                </span>
                <input name="slug" placeholder="site-a" className={input} />
              </label>
              <label className="min-w-[10rem] flex-1">
                <span className="mb-1 block text-xs text-muted">
                  Floor (blueprint)
                </span>
                <select name="floor_id" className={input} defaultValue="">
                  <option value="">— none —</option>
                  {mapFloors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="w-20">
                <span className="mb-1 block text-xs text-muted">Order</span>
                <input
                  name="display_order"
                  type="number"
                  defaultValue={mapSites.length}
                  className={input}
                />
              </label>
              <button className="rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand">
                Add site
              </button>
            </form>
          </section>
        );
      })}
    </main>
  );
}
