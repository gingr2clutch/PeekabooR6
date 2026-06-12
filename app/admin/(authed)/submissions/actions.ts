"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { buildBasePeekSlug, ensureUniquePeekSlug } from "@/lib/slug";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

// Approve: create a draft peek from the submission, then delete the
// submission row. Peek is inserted with published=false + sensible
// defaults so the admin can finish it in the existing peeks dashboard.
export async function approveSubmissionAction(
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };

  const sb = supabaseAdmin();

  const { data: sub, error: readErr } = await sb
    .from("peek_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!sub) return { ok: false, error: "Submission not found." };

  // Resolve floor by (map_slug, floor_slug) — the submission only stores
  // the slug pair, but peeks.floor_id is a UUID FK.
  const { data: map, error: mapErr } = await sb
    .from("maps")
    .select("id, slug")
    .eq("slug", sub.map_slug)
    .maybeSingle();
  if (mapErr) return { ok: false, error: mapErr.message };
  if (!map) {
    return { ok: false, error: `Map "${sub.map_slug}" not found.` };
  }

  const { data: floor, error: floorErr } = await sb
    .from("floors")
    .select("id, slug")
    .eq("map_id", map.id)
    .eq("slug", sub.floor_slug)
    .maybeSingle();
  if (floorErr) return { ok: false, error: floorErr.message };
  if (!floor) {
    return {
      ok: false,
      error: `Floor "${sub.floor_slug}" not found on ${sub.map_slug}.`,
    };
  }

  // Draft name from the description — admin edits it later in the peeks
  // dashboard. Truncate so a giant paragraph doesn't blow up the slug.
  const rawName = String(sub.peek_description ?? "").trim() || "Untitled peek";
  const name = rawName.length > 80 ? `${rawName.slice(0, 77)}…` : rawName;
  const base = buildBasePeekSlug(map.slug, name);
  const slug = await ensureUniquePeekSlug(base);

  const { error: insertErr } = await sb.from("peeks").insert({
    floor_id: floor.id,
    slug,
    name,
    x_pct: Number(sub.pin_x ?? 0),
    y_pct: Number(sub.pin_y ?? 0),
    video_url: sub.clip_url ?? null,
    tip: sub.pro_tip ?? null,
    instructions: null,
    difficulty: 3,
    risk: "medium",
    published: false,
  });
  if (insertErr) return { ok: false, error: insertErr.message };

  const { error: delErr } = await sb
    .from("peek_submissions")
    .delete()
    .eq("id", id);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/peeks");
  return { ok: true };
}

export async function rejectSubmissionAction(
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };

  const { error } = await supabaseAdmin()
    .from("peek_submissions")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/submissions");
  return { ok: true };
}
