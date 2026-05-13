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
