import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createPlacementAction,
  deletePlacementAction,
  togglePlacementPublishedAction,
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
    .select("id, map_id, floor_id, slug, name, display_order, published, maps(name, slug)")
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
    maps: { name: string; slug: string } | null;
  };

  const [opsRes, floorsRes, placementsRes] = await Promise.all([
    sb.from("gadget_operators").select("id, slug, name").order("display_order"),
    sb.from("floors").select("id, name").eq("map_id", site.map_id).order("name"),
    sb
      .from("gadget_placements")
      .select("id, operator_id, label, note, x_pct, y_pct, video_url, thumbs_up, thumbs_down, published")
      .eq("site_id", site.id)
      .order("created_at"),
  ]);
  for (const r of [opsRes, floorsRes, placementsRes]) if (r.error) throw r.error;

  const operators = (opsRes.data ?? []) as { id: string; slug: string; name: string }[];
  const floors = (floorsRes.data ?? []) as { id: string; name: string }[];
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
      <Link href="/admin/gadgets" className="text-sm text-muted hover:text-brand">
        ← All gadget sites
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        {site.maps?.name} · {site.name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {placements.length} placements · {site.published ? "published" : "draft"}
      </p>

      {/* Site settings. floor_id decides which blueprint the public page draws
          pins on; without it the page falls back to guessing a floor. */}
      <form
        action={updateSiteAction}
        className="mt-6 flex flex-wrap items-end gap-2 rounded-card border border-border bg-card p-3"
      >
        <input type="hidden" name="id" value={site.id} />
        <label className="min-w-[9rem] flex-1">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input name="name" defaultValue={site.name} className={input} />
        </label>
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-xs text-muted">Floor (blueprint)</span>
          <select name="floor_id" defaultValue={site.floor_id ?? ""} className={input}>
            <option value="">— none —</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <label className="w-20">
          <span className="mb-1 block text-xs text-muted">Order</span>
          <input name="display_order" type="number" defaultValue={site.display_order} className={input} />
        </label>
        <button className="rounded-btn border border-border px-3 py-2 text-sm text-ink hover:border-brand hover:text-brand">
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
            <form action={updatePlacementAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="site_id" value={site.id} />
              <label className="min-w-[8rem]">
                <span className="mb-1 block text-xs text-muted">Operator</span>
                <select name="operator_id" defaultValue={p.operator_id} className={input}>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label className="min-w-[8rem] flex-1">
                <span className="mb-1 block text-xs text-muted">Label</span>
                <input name="label" defaultValue={p.label ?? ""} className={input} />
              </label>
              <label className="w-20">
                <span className="mb-1 block text-xs text-muted">X %</span>
                <input name="x_pct" type="number" step="0.1" defaultValue={p.x_pct} className={input} />
              </label>
              <label className="w-20">
                <span className="mb-1 block text-xs text-muted">Y %</span>
                <input name="y_pct" type="number" step="0.1" defaultValue={p.y_pct} className={input} />
              </label>
              <label className="min-w-[10rem] flex-1">
                <span className="mb-1 block text-xs text-muted">Video URL</span>
                <input name="video_url" defaultValue={p.video_url ?? ""} className={input} />
              </label>
              <label className="min-w-[10rem] flex-1">
                <span className="mb-1 block text-xs text-muted">Note</span>
                <input name="note" defaultValue={p.note ?? ""} className={input} />
              </label>
              <button className="rounded-btn border border-border px-2 py-1.5 text-xs text-ink hover:border-brand hover:text-brand">
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
                <button className="rounded-btn border border-border px-2 py-0.5 hover:border-brand hover:text-brand">
                  {p.published ? "Unpublish" : "Publish"}
                </button>
              </form>
              <form action={deletePlacementAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="site_id" value={site.id} />
                <ConfirmButton
                  message={`Delete placement "${p.label ?? "untitled"}"? This cannot be undone.`}
                  className="rounded-btn border border-border px-2 py-0.5 hover:border-brand hover:text-brand"
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
        className="mt-4 flex flex-wrap items-end gap-2 rounded-card border border-dashed border-border p-3"
      >
        <input type="hidden" name="site_id" value={site.id} />
        <label className="min-w-[8rem]">
          <span className="mb-1 block text-xs text-muted">Operator</span>
          <select name="operator_id" required className={input}>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="min-w-[8rem] flex-1">
          <span className="mb-1 block text-xs text-muted">Label</span>
          <input name="label" placeholder="Above door" className={input} />
        </label>
        <label className="w-20">
          <span className="mb-1 block text-xs text-muted">X %</span>
          <input name="x_pct" type="number" step="0.1" defaultValue={50} className={input} />
        </label>
        <label className="w-20">
          <span className="mb-1 block text-xs text-muted">Y %</span>
          <input name="y_pct" type="number" step="0.1" defaultValue={50} className={input} />
        </label>
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-xs text-muted">Video URL</span>
          <input name="video_url" className={input} />
        </label>
        <button className="rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-brand">
          Add placement
        </button>
      </form>
    </main>
  );
}
