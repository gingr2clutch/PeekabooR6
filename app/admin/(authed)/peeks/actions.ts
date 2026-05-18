"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import {
  buildBasePeekSlug,
  ensureUniquePeekSlug,
  slugify,
} from "@/lib/slug";

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function parseInstructions(formData: FormData): string[] {
  return formData
    .getAll("instructions")
    .map((v) => String(v).trim())
    .filter((s) => s.length > 0);
}

function parseRisk(v: FormDataEntryValue | null): "low" | "medium" | "high" {
  const s = String(v ?? "medium");
  return s === "low" || s === "high" ? s : "medium";
}

function parsePeekType(
  v: FormDataEntryValue | null
): "spawn" | "runout" | "mid_round" {
  const s = String(v ?? "spawn");
  return s === "runout" || s === "mid_round" ? s : "spawn";
}

function parseTip(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > 200 ? s.slice(0, 200) : s;
}

function parseSuccessRate(v: FormDataEntryValue | null): number {
  const n = Math.round(Number(v ?? 50));
  if (Number.isNaN(n)) return 50;
  return clamp(n, 0, 100);
}

async function mapSlugForFloor(floorId: string): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .from("floors")
    .select("maps(slug)")
    .eq("id", floorId)
    .maybeSingle();
  if (error) throw error;
  const maps = (data?.maps ?? null) as { slug: string } | null;
  return maps?.slug ?? "";
}

export async function createPeekAction(formData: FormData) {
  console.log(
    "[createPeekAction] start. form keys:",
    Array.from(formData.keys())
  );

  const floor_id = String(formData.get("floor_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const x_pct = clamp(Number(formData.get("x_pct") ?? 50), 0, 100);
  const y_pct = clamp(Number(formData.get("y_pct") ?? 50), 0, 100);
  const difficulty = clamp(
    Math.round(Number(formData.get("difficulty") ?? 3)),
    1,
    5
  );
  const risk = parseRisk(formData.get("risk"));
  const peek_type = parsePeekType(formData.get("peek_type"));
  const tip = parseTip(formData.get("tip"));
  const success_rate = parseSuccessRate(formData.get("success_rate"));
  const published = formData.get("published") === "on";
  const instructions = parseInstructions(formData);

  console.log("[createPeekAction] parsed payload:", {
    floor_id,
    name,
    x_pct,
    y_pct,
    difficulty,
    risk,
    peek_type,
    tip,
    success_rate,
    published,
    instructionsCount: instructions.length,
  });

  if (!floor_id || !name) {
    console.warn("[createPeekAction] aborting — missing required field", {
      hasFloorId: !!floor_id,
      hasName: !!name,
    });
    return;
  }

  const mapSlug = await mapSlugForFloor(floor_id);
  const slug = await ensureUniquePeekSlug(buildBasePeekSlug(mapSlug, name));

  const { data, error } = await supabaseAdmin()
    .from("peeks")
    .insert({
      floor_id,
      slug,
      name,
      x_pct,
      y_pct,
      difficulty,
      risk,
      peek_type,
      tip,
      success_rate,
      published,
      instructions: instructions.length ? instructions : null,
    })
    .select("id")
    .single();
  console.log("[createPeekAction] insert result:", { data, error });
  if (error) throw error;

  revalidatePath("/admin/peeks");
  redirect(`/admin/peeks/${data.id}/edit`);
}

export async function updatePeekAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const floor_id = String(formData.get("floor_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const x_pct = clamp(Number(formData.get("x_pct") ?? 50), 0, 100);
  const y_pct = clamp(Number(formData.get("y_pct") ?? 50), 0, 100);
  const difficulty = clamp(
    Math.round(Number(formData.get("difficulty") ?? 3)),
    1,
    5
  );
  const risk = parseRisk(formData.get("risk"));
  const peek_type = parsePeekType(formData.get("peek_type"));
  const tip = parseTip(formData.get("tip"));
  const success_rate = parseSuccessRate(formData.get("success_rate"));
  const published = formData.get("published") === "on";
  const instructions = parseInstructions(formData);

  if (!id || !floor_id || !name) return;

  // Slug field is optional on the edit form. Empty → regenerate from
  // map + name. Non-empty → kebab-case it then collision-check.
  const mapSlug = await mapSlugForFloor(floor_id);
  const base = rawSlug
    ? slugify(rawSlug) || buildBasePeekSlug(mapSlug, name)
    : buildBasePeekSlug(mapSlug, name);
  const slug = await ensureUniquePeekSlug(base, id);

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({
      floor_id,
      slug,
      name,
      x_pct,
      y_pct,
      difficulty,
      risk,
      peek_type,
      tip,
      success_rate,
      published,
      instructions: instructions.length ? instructions : null,
    })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/peeks");
  revalidatePath(`/admin/peeks/${id}/edit`);
  revalidatePath(`/peeks/${slug}`);
}

export async function deletePeekAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin().from("peeks").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/peeks");
  redirect("/admin/peeks");
}

export async function togglePublishedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "on";
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ published: next })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/peeks");
  const { data: row } = await supabaseAdmin()
    .from("peeks")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (row?.slug) revalidatePath(`/peeks/${row.slug}`);
}

// Inline single-field update used by the dashboard table. Returns ok/error
// so the client can flash a saved indicator or revert its optimistic edit.
export type InlineField =
  | "name"
  | "difficulty"
  | "risk"
  | "success_rate"
  | "published";

export type InlineUpdateResult =
  | { ok: true; value: string | number | boolean }
  | { ok: false; error: string };

export async function updatePeekFieldAction(
  id: string,
  field: InlineField,
  raw: string | number | boolean
): Promise<InlineUpdateResult> {
  if (!id) return { ok: false, error: "Missing peek id" };

  let patch: Record<string, unknown> | null = null;
  let normalized: string | number | boolean;

  switch (field) {
    case "name": {
      const v = String(raw ?? "").trim();
      if (!v) return { ok: false, error: "Name cannot be empty" };
      patch = { name: v };
      normalized = v;
      break;
    }
    case "difficulty": {
      const n = clamp(Math.round(Number(raw)), 1, 5);
      patch = { difficulty: n };
      normalized = n;
      break;
    }
    case "risk": {
      const v = parseRisk(raw == null ? null : String(raw));
      patch = { risk: v };
      normalized = v;
      break;
    }
    case "success_rate": {
      const n = clamp(Math.round(Number(raw)), 0, 100);
      patch = { success_rate: n };
      normalized = n;
      break;
    }
    case "published": {
      const v = Boolean(raw);
      patch = { published: v };
      normalized = v;
      break;
    }
    default:
      return { ok: false, error: "Unknown field" };
  }

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/peeks");
  const { data: row } = await supabaseAdmin()
    .from("peeks")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (row?.slug) revalidatePath(`/peeks/${row.slug}`);

  return { ok: true, value: normalized };
}

export async function bulkSetPublishedAction(
  ids: string[],
  published: boolean
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "No peeks selected" };
  }
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("peeks")
    .update({ published })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/peeks");
  const { data: rows } = await sb
    .from("peeks")
    .select("slug")
    .in("id", ids);
  for (const r of (rows ?? []) as { slug: string }[]) {
    if (r.slug) revalidatePath(`/peeks/${r.slug}`);
  }
  return { ok: true, count: ids.length };
}

export async function bulkDeletePeeksAction(
  ids: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "No peeks selected" };
  }
  const sb = supabaseAdmin();

  // Grab slugs before delete so we can revalidate the public peek pages
  // (so anyone holding a stale cached page sees the 404).
  const { data: rows } = await sb
    .from("peeks")
    .select("slug")
    .in("id", ids);

  const { error } = await sb.from("peeks").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/peeks");
  for (const r of (rows ?? []) as { slug: string }[]) {
    if (r.slug) revalidatePath(`/peeks/${r.slug}`);
  }
  return { ok: true, count: ids.length };
}
