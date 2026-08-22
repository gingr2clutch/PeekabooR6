"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

// Gadget admin writes. All go through supabaseAdmin() (service role), which
// bypasses RLS — that is the only write path the gadget tables have, since
// migration 029 created SELECT policies and nothing else.
//
// Nothing here touches a peek table.

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// Public gadget routes are keyed on slugs, so a change has to clear both the
// admin view and the live pages.
function revalidateGadgets(mapSlug?: string | null) {
  revalidatePath("/admin/gadgets");
  revalidatePath("/gadgets");
  if (mapSlug) revalidatePath(`/gadgets/${mapSlug}`);
}

async function mapSlugForSite(siteId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("gadget_sites")
    .select("maps(slug)")
    .eq("id", siteId)
    .maybeSingle();
  const row = data as unknown as { maps: { slug: string } | null } | null;
  return row?.maps?.slug ?? null;
}

/* ----------------------------- sites ----------------------------------- */

export async function createSiteAction(formData: FormData) {
  const map_id = String(formData.get("map_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const floor_id = String(formData.get("floor_id") ?? "") || null;
  const display_order = Number(formData.get("display_order") ?? 0);
  if (!map_id || !name) return;

  const { error } = await supabaseAdmin().from("gadget_sites").insert({
    map_id,
    name,
    slug: slugify(slugInput || name),
    floor_id,
    display_order: Number.isNaN(display_order) ? 0 : display_order,
  });
  if (error) throw error;
  revalidateGadgets();
}

export async function updateSiteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const floor_id = String(formData.get("floor_id") ?? "") || null;
  const display_order = Number(formData.get("display_order") ?? 0);
  if (!id || !name) return;

  const { error } = await supabaseAdmin()
    .from("gadget_sites")
    .update({
      name,
      floor_id,
      display_order: Number.isNaN(display_order) ? 0 : display_order,
    })
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(id));
}

export async function toggleSitePublishedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("published") ?? "") === "true";
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("gadget_sites")
    .update({ published: next })
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(id));
}

export async function deleteSiteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // gadget_placements cascades from the site, so this removes its pins too.
  const mapSlug = await mapSlugForSite(id);
  const { error } = await supabaseAdmin()
    .from("gadget_sites")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(mapSlug);
}

/* --------------------------- placements -------------------------------- */

export async function createPlacementAction(formData: FormData) {
  const site_id = String(formData.get("site_id") ?? "");
  const operator_id = String(formData.get("operator_id") ?? "");
  const label = String(formData.get("label") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const video_url = String(formData.get("video_url") ?? "").trim() || null;
  const x_pct = clamp(Number(formData.get("x_pct") ?? 50), 0, 100);
  const y_pct = clamp(Number(formData.get("y_pct") ?? 50), 0, 100);
  if (!site_id || !operator_id) return;

  const { error } = await supabaseAdmin()
    .from("gadget_placements")
    .insert({ site_id, operator_id, label, note, video_url, x_pct, y_pct });
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(site_id));
}

export async function updatePlacementAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  const operator_id = String(formData.get("operator_id") ?? "");
  const label = String(formData.get("label") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const video_url = String(formData.get("video_url") ?? "").trim() || null;
  const x_pct = clamp(Number(formData.get("x_pct") ?? 50), 0, 100);
  const y_pct = clamp(Number(formData.get("y_pct") ?? 50), 0, 100);
  if (!id || !operator_id) return;

  const { error } = await supabaseAdmin()
    .from("gadget_placements")
    .update({ operator_id, label, note, video_url, x_pct, y_pct })
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(site_id));
}

export async function togglePlacementPublishedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  const next = String(formData.get("published") ?? "") === "true";
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("gadget_placements")
    .update({ published: next })
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(site_id));
}

export async function deletePlacementAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("gadget_placements")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(site_id));
}
