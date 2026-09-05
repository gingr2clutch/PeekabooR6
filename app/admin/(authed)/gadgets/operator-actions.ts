"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

// CRUD for gadget operators. Kept separate from ./actions.ts, which drives
// sites and placements — same reasoning as the icon actions: one file per
// thing, so an edit for one cannot quietly change the other.
//
// Writes gadget_operators only. No peek table is read or written.

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Operators are global, not scoped to a map, so every gadget route can be
// affected by a change here.
function revalidateOperators() {
  revalidatePath("/admin/gadgets/operators");
  revalidatePath("/admin/gadgets");
  revalidatePath("/gadgets");
}

export async function createOperatorAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const slugInput = String(formData.get("slug") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const gadget_name = String(formData.get("gadget_name") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0);

  const { error } = await supabaseAdmin().from("gadget_operators").insert({
    name,
    slug: slugify(slugInput || name),
    role,
    gadget_name,
    display_order: Number.isNaN(display_order) ? 0 : display_order,
    // New operators start hidden. The public picker only surfaces an operator
    // once it has a placement anyway, but this makes "not ready yet" explicit
    // rather than relying on that side effect.
    published: false,
  });
  if (error) throw error;
  revalidateOperators();
}

export async function updateOperatorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const role = String(formData.get("role") ?? "").trim() || null;
  const gadget_name = String(formData.get("gadget_name") ?? "").trim() || null;
  const display_order = Number(formData.get("display_order") ?? 0);

  // The slug is deliberately not editable: it is the public URL segment
  // (/gadgets/<map>/<site>/<slug>), so changing it would silently break any
  // link already shared. Name, role, gadget and order are all cosmetic.
  const { error } = await supabaseAdmin()
    .from("gadget_operators")
    .update({
      name,
      role,
      gadget_name,
      display_order: Number.isNaN(display_order) ? 0 : display_order,
    })
    .eq("id", id);
  if (error) throw error;
  revalidateOperators();
}

export async function toggleOperatorPublishedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("published") ?? "") === "true";
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("gadget_operators")
    .update({ published: next })
    .eq("id", id);
  if (error) throw error;
  revalidateOperators();
}

export async function deleteOperatorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = supabaseAdmin();

  // The database already refuses this: gadget_placements.operator_id is
  // ON DELETE RESTRICT (migration 029). Counting first only changes the
  // message — a raw foreign-key violation on screen says nothing about what
  // to do next. The constraint remains the real guarantee, so a placement
  // added between this count and the delete still cannot slip through.
  const { count, error: countErr } = await sb
    .from("gadget_placements")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", id);
  if (countErr) throw countErr;

  if ((count ?? 0) > 0) {
    const { data: op } = await sb
      .from("gadget_operators")
      .select("name")
      .eq("id", id)
      .maybeSingle();
    const who = (op as { name: string } | null)?.name ?? "This operator";
    throw new Error(
      `${who} still has ${count} placement${count === 1 ? "" : "s"}. Delete those first — removing the operator would orphan them.`
    );
  }

  const { error } = await sb.from("gadget_operators").delete().eq("id", id);
  if (error) throw error;
  revalidateOperators();
}
