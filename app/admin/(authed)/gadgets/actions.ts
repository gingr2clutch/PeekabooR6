"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  const slug = slugify(slugInput || name);

  // gadget_sites has unique (map_id, slug) — migration 029. That constraint is
  // the guarantee and stays the guarantee; this lookup only decides what the
  // admin reads on screen. Without it a duplicate surfaces as a raw Postgres
  // unique-violation, which says nothing about what to do next.
  //
  // Note the scope: a slug is unique WITHIN a map, not across the site. Two
  // maps both having a Kitchen / Dining is legitimate and resolves to two
  // distinct public URLs, so this must never widen into a global check.
  const sb = supabaseAdmin();
  const { data: clash, error: clashErr } = await sb
    .from("gadget_sites")
    .select("name")
    .eq("map_id", map_id)
    .eq("slug", slug)
    .maybeSingle();
  if (clashErr) throw clashErr;
  if (clash) {
    const taken = (clash as { name: string }).name;
    throw new Error(
      `This map already has a site at /${slug} ("${taken}"). Pick a different name, or set the slug explicitly.`
    );
  }

  const { error } = await sb.from("gadget_sites").insert({
    map_id,
    name,
    slug,
    floor_id,
    display_order: Number.isNaN(display_order) ? 0 : display_order,
  });
  // 23505 is unique_violation: two adds raced past the check above. The
  // constraint caught it, so turn that into the same readable message rather
  // than leaking a raw error.
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `This map already has a site at /${slug}. Pick a different name, or set the slug explicitly.`
      );
    }
    throw error;
  }
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
  // gadget_setups cascades from the site, and pins cascade from the setups,
  // so this removes the whole tree beneath it.
  const mapSlug = await mapSlugForSite(id);
  const { error } = await supabaseAdmin()
    .from("gadget_sites")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(mapSlug);
}

// Same delete, called from the site's own screen. Redirects to the map, since
// staying on a deleted site would 404 on the next render. The map id comes in
// on the form because the row is gone by the time we could look it up.
// redirect() throws, so it sits after the write rather than inside a try.
export async function deleteSiteAndReturnAction(formData: FormData) {
  const mapId = String(formData.get("map_id") ?? "");
  await deleteSiteAction(formData);
  redirect(mapId ? `/admin/gadgets/map/${mapId}` : "/admin/gadgets");
}

/* ----------------------------- setups ---------------------------------- */

/**
 * A setup is the unit of gadget content: one site, one operator, one video,
 * many pins. These replace the old per-pin placement actions entirely.
 *
 * Pins are written by replacing the whole set rather than diffing. A setup is
 * edited as "here are its pins now", never one pin at a time, so a delete-then-
 * insert is both simpler and a closer match to what the admin actually did.
 * The delete is scoped to the setup, so it can only ever affect its own pins.
 *
 * Writes gadget_setups and gadget_setup_pins. No peek table is touched.
 */

type PinInput = { x_pct: number; y_pct: number };

// Pins arrive from the form as a JSON array, because their number varies per
// submit and named form fields cannot express that cleanly.
function parsePins(raw: FormDataEntryValue | null): PinInput[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (p): p is { x: number; y: number } =>
        !!p && typeof p === "object" && "x" in p && "y" in p
    )
    .map((p) => ({
      x_pct: clamp(Number(p.x), 0, 100),
      y_pct: clamp(Number(p.y), 0, 100),
    }))
    .filter((p) => !Number.isNaN(p.x_pct) && !Number.isNaN(p.y_pct));
}

async function replacePins(setupId: string, pins: PinInput[]) {
  const sb = supabaseAdmin();
  const { error: delErr } = await sb
    .from("gadget_setup_pins")
    .delete()
    .eq("setup_id", setupId);
  if (delErr) throw delErr;
  if (pins.length === 0) return;

  const { error } = await sb.from("gadget_setup_pins").insert(
    pins.map((p, i) => ({
      setup_id: setupId,
      x_pct: p.x_pct,
      y_pct: p.y_pct,
      // Order is the order they were placed, which is the order the clip
      // covers them — that is what the numbers on the blueprint mean.
      display_order: i,
    }))
  );
  if (error) throw error;
}

// "Setup 3" needs to know how many already exist for this site and operator.
// The database only insists a name exists; the default is application logic.
async function nextSetupNumber(
  siteId: string,
  operatorId: string
): Promise<number> {
  const { count } = await supabaseAdmin()
    .from("gadget_setups")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .eq("operator_id", operatorId);
  return (count ?? 0) + 1;
}

export async function createSetupAction(formData: FormData) {
  const site_id = String(formData.get("site_id") ?? "");
  const operator_id = String(formData.get("operator_id") ?? "");
  const video_url = String(formData.get("video_url") ?? "").trim();
  if (!site_id || !operator_id) return;
  // video_url is NOT NULL in the schema: a setup without a clip explains
  // nothing, since the pins carry no information on their own.
  if (!video_url) {
    throw new Error("A setup needs a clip — the pins alone explain nothing.");
  }

  const n = await nextSetupNumber(site_id, operator_id);
  const name = String(formData.get("name") ?? "").trim() || `Setup ${n}`;

  const { data, error } = await supabaseAdmin()
    .from("gadget_setups")
    .insert({ site_id, operator_id, name, video_url, display_order: n })
    .select("id")
    .single();
  if (error) throw error;

  await replacePins((data as { id: string }).id, parsePins(formData.get("pins")));
  revalidateGadgets(await mapSlugForSite(site_id));
}

export async function updateSetupAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const video_url = String(formData.get("video_url") ?? "").trim();
  const display_order = Number(formData.get("display_order") ?? 0);
  if (!id || !name) return;
  if (!video_url) {
    throw new Error("A setup needs a clip — the pins alone explain nothing.");
  }

  const { error } = await supabaseAdmin()
    .from("gadget_setups")
    .update({
      name,
      video_url,
      display_order: Number.isNaN(display_order) ? 0 : display_order,
    })
    .eq("id", id);
  if (error) {
    // 23505 is the unique index on (site_id, operator_id, display_order).
    if (error.code === "23505") {
      throw new Error(
        `Another setup for this operator already uses order ${display_order}. Give this one a different number.`
      );
    }
    throw error;
  }

  // Pins are only replaced when the form actually submitted a set. An edit
  // that just renames a setup must not wipe its pins.
  const raw = formData.get("pins");
  if (raw !== null && String(raw) !== "") {
    await replacePins(id, parsePins(raw));
  }
  revalidateGadgets(await mapSlugForSite(site_id));
}

export async function toggleSetupPublishedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  const next = String(formData.get("published") ?? "") === "true";
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("gadget_setups")
    .update({ published: next })
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(site_id));
}

export async function deleteSetupAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const site_id = String(formData.get("site_id") ?? "");
  if (!id) return;
  // Pins cascade from the setup, so this removes them too.
  const { error } = await supabaseAdmin()
    .from("gadget_setups")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidateGadgets(await mapSlugForSite(site_id));
}
