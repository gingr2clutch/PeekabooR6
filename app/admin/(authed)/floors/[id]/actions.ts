"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function updateFloorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim());
  const order = Number(formData.get("display_order") ?? 0);
  if (!id || !name || !slug) return;

  const { error } = await supabaseAdmin()
    .from("floors")
    .update({ name, slug, display_order: order || 1 })
    .eq("id", id);
  if (error) throw error;

  revalidatePath(`/admin/floors/${id}`);
  revalidatePath("/admin/maps");
}

export async function deleteFloorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin().from("floors").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/maps");
  redirect("/admin/maps");
}

// Image upload + removal moved to upload-actions.ts so floor bird's-eyes
// use a presigned PUT directly to R2, bypassing the Vercel server-action
// body-size limit that was silently dropping large PNG screenshots.
