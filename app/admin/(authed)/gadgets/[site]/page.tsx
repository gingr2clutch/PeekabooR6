import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DirectGadgetSiteImageUpload } from "@/components/DirectGadgetSiteImageUpload";
import { GadgetClipUpload } from "@/components/GadgetClipUpload";
import { PinPlacer } from "@/components/PinPlacer";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminBackLink } from "../../AdminBackLink";
import {
  createPlacementAction,
  deletePlacementAction,
  deleteSiteAndReturnAction,
  togglePlacementPublishedAction,
  toggleSitePublishedAction,
  updatePlacementAction,
  updateSiteAction,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gadget placements",
  robots: { index: false, follow: false },
};

type Params = { params: { site: string } };

const input =
  "w-full rounded-btn border border-border bg-card px-2 py-1.5 text-sm text-ink outline-none transition-colors focus:border-brand";

// Placements for one site. Service-role reads, so drafts show here.
export default async function AdminSitePlacementsPage({ params }: Params) {
  const sb = supabaseAdmin();

  const { data: siteRow, error: siteErr } = await sb
    .from("gadget_sites")
    .select(
      "id, map_id, floor_id, slug, name, display_order, published, preview_image_url, maps(name, slug)"
    )
    .eq("id", params.site)
    .maybeSingle();
  if (siteErr) throw siteErr;
  if (!siteRow) notFound();

  const site = siteRow as unknown as {
    id: string;
    map_id: string;
    floor_id: string | null;
    slug: string;
    name: string;
    display_order: number;
    published: boolean;
    preview_image_url: string | null;
    maps: { name: string; slug: string } | null;
  };

  const [opsRes, floorsRes, placementsRes] = await Promise.all([
    sb.from("gadget_operators").select("id, slug, name").order("display_order"),
    sb.from("floors").select("id, name, birds_eye_url").eq("map_id", site.map_id).order("name"),
    sb
      .from("gadget_placements")
      .select("id, operator_id, label, note, x_pct, y_pct, video_url, thumbs_up, thumbs_down, published")
      .eq("site_id", site.id)
      .order("created_at"),
  ]);
  for (const r of [opsRes, floorsRes, placementsRes]) if (r.error) throw r.error;

  const operators = (opsRes.data ?? []) as { id: string; slug: string; name: string }[];
  const floors = (floorsRes.data ?? []) as {
    id: string;
    name: string;
    birds_eye_url: string | null;
  }[];

  // The picker draws on the site's own blueprint. Without floor_id there is
  // nothing to click, and PinPlacer falls back to numeric inputs by itself.
  const blueprint =
    (site.floor_id ? floors.find((f) => f.id === site.floor_id) : null) ?? null;
  const placements = (placementsRes.data ?? []) as {
    id: string;
    operator_id: string;
    label: string | null;
    note: string | null;
    x_pct: number;
    y_pct: number;
    video_url: string | null;
    thumbs_up: number;
    thumbs_down: number;
    published: boolean;
  }[];

  return (
    <main>
      {/* Back to this site's map, not to the whole gadget section — the map
          screen is where you came from and where the sibling sites are. */}
      <AdminBackLink
        href={`/admin/gadgets/map/${site.map_id}`}
        label={site.maps?.name ?? "Gadgets"}
        accent="blue"
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {site.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            /{site.slug} · {placements.length} placement
            {placements.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Publish moved here from the map list, where it sat fifth in a
            wrapping row of controls. Full width on a phone. */}
        <form action={toggleSitePublishedAction} className="shrink-0">
          <input type="hidden" name="id" value={site.id} />
          <input
            type="hidden"
            name="published"
            value={site.published ? "false" : "true"}
          />
          <button
            className={`w-full rounded-btn border px-3 py-2 text-sm font-medium transition-colors sm:w-auto ${
              site.published
                ? "border-teal/40 bg-teal/10 text-teal"
                : "border-border bg-bg text-muted hover:border-blue hover:text-blue"
            }`}
          >
            {site.published ? "Published" : "Draft"}
          </button>
        </form>
      </div>

      {/* Card photo. Thumbnail only — the blueprint below is still what the
          public page draws pins on after you click into the site. */}
      <section className="mt-6 rounded-card border border-border bg-card p-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
          Card photo
        </h2>
        <p className="mb-3 mt-1 text-xs text-muted">
          Shown as this site&rsquo;s thumbnail on /gadgets/{site.maps?.slug}.
        </p>
        <DirectGadgetSiteImageUpload
          siteId={site.id}
          siteName={site.name}
          initialUrl={site.preview_image_url}
          blueprintUrl={blueprint?.birds_eye_url ?? null}
        />
      </section>

      {/* Site settings. floor_id decides which blueprint the public page draws
          pins on; without it the page falls back to guessing a floor. */}
      <form
        action={updateSiteAction}
        className="mt-6 space-y-3 rounded-card border border-border bg-card p-4 sm:grid sm:grid-cols-2 sm:items-end sm:gap-3 sm:space-y-0"
      >
        <input type="hidden" name="id" value={site.id} />
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input name="name" defaultValue={site.name} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Floor (blueprint)</span>
          <select name="floor_id" defaultValue={site.floor_id ?? ""} className={input}>
            <option value="">— none —</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Order</span>
          <input name="display_order" type="number" defaultValue={site.display_order} className={input} />
        </label>
        <button className="w-full rounded-btn border border-border px-3 py-2 text-sm text-ink hover:border-brand hover:text-brand">
          Save site
        </button>
      </form>

      {!site.floor_id && (
        <p className="mt-2 rounded-card border border-brand/30 bg-brand/[0.06] p-2 text-xs text-ink">
          No floor set — the public page will guess a blueprint until you pick one.
        </p>
      )}

      <h2 className="mt-8 text-sm font-bold uppercase tracking-[0.12em] text-ink">
        Placements
      </h2>

      <ul className="mt-3 space-y-2">
        {placements.map((p) => (
          <li key={p.id} className="rounded-card border border-border bg-card p-3">
            <form action={updatePlacementAction} className="space-y-3">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="site_id" value={site.id} />
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Operator</span>
                <select name="operator_id" defaultValue={p.operator_id} className={input}>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Label</span>
                <input name="label" defaultValue={p.label ?? ""} className={input} />
              </label>
              {/* Collapsed by default: one expanded blueprint per placement
                  would be a wall of images. The hidden x_pct/y_pct inputs
                  PinPlacer renders submit whether or not it is open. */}
              <details className="w-full">
                <summary className="cursor-pointer text-xs text-muted">
                  Position — {p.x_pct}%, {p.y_pct}% (click to place)
                </summary>
                <div className="mt-2">
                  <PinPlacer
                    src={blueprint?.birds_eye_url ?? null}
                    initialX={p.x_pct}
                    initialY={p.y_pct}
                    name={`${site.name} blueprint`}
                  />
                </div>
              </details>
              <div className="w-full">
                <span className="mb-1 block text-xs text-muted">Clip</span>
                <GadgetClipUpload siteId={site.id} initialUrl={p.video_url} />
              </div>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Note</span>
                <input name="note" defaultValue={p.note ?? ""} className={input} />
              </label>
              <button className="w-full rounded-btn border border-border px-3 py-2 text-sm text-ink hover:border-brand hover:text-brand sm:w-auto">
                Save
              </button>
            </form>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>👍 {p.thumbs_up} · 👎 {p.thumbs_down}</span>
              <span
                className={`rounded-btn px-2 py-0.5 font-semibold ${
                  p.published ? "bg-teal/10 text-teal" : "bg-ink/[0.06] text-muted"
                }`}
              >
                {p.published ? "Published" : "Draft"}
              </span>
              <form action={togglePlacementPublishedAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="site_id" value={site.id} />
                <input type="hidden" name="published" value={p.published ? "false" : "true"} />
                <button className="rounded-btn border border-border px-3 py-1.5 hover:border-brand hover:text-brand">
                  {p.published ? "Unpublish" : "Publish"}
                </button>
              </form>
              <form action={deletePlacementAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="site_id" value={site.id} />
                <ConfirmButton
                  message={`Delete placement "${p.label ?? "untitled"}"? This cannot be undone.`}
                  className="rounded-btn border border-border px-3 py-1.5 hover:border-brand hover:text-brand"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {/* Add a placement. */}
      <form
        action={createPlacementAction}
        className="mt-4 space-y-3 rounded-card border border-dashed border-border p-4"
      >
        <input type="hidden" name="site_id" value={site.id} />
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Operator</span>
          <select name="operator_id" required className={input}>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
        <div className="w-full">
          <span className="mb-1 block text-xs text-muted">
            Position — click the blueprint
          </span>
          <PinPlacer
            src={blueprint?.birds_eye_url ?? null}
            initialX={50}
            initialY={50}
            name={`${site.name} blueprint`}
          />
        </div>
        <div className="w-full">
          <span className="mb-1 block text-xs text-muted">Clip</span>
          <GadgetClipUpload siteId={site.id} />
        </div>
        <button className="w-full rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-brand sm:w-auto">
          Add placement
        </button>
      </form>

      {/* Deleting the site cascades to its placements (migration 029). This
          used to be a small button in the map list's wrapping control row,
          one mis-tap away from Publish. Here it is last, separated, confirmed,
          and it names what goes with it. */}
      <section className="mt-8 rounded-card border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Danger zone
        </h2>
        <p className="mt-1 text-xs text-red-700">
          Deleting {site.name} also deletes its {placements.length} placement
          {placements.length === 1 ? "" : "s"}.
        </p>
        <form action={deleteSiteAndReturnAction} className="mt-3">
          <input type="hidden" name="id" value={site.id} />
          <input type="hidden" name="map_id" value={site.map_id} />
          <ConfirmButton
            message={`Delete "${site.name}"? This also deletes its ${placements.length} placement(s). This cannot be undone.`}
            className="w-full rounded-btn border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 sm:w-auto"
          >
            Delete site
          </ConfirmButton>
        </form>
      </section>
    </main>
  );
}
