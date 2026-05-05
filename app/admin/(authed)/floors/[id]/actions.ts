"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { r2Upload } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
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

export async function uploadFloorImageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id || !(file instanceof File) || file.size === 0) return;

  const ext = safeExtension(file.name, file.type);
  const key = `floors/${id}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const url = await r2Upload(key, bytes, file.type || "application/octet-stream");

  const { error } = await supabaseAdmin()
    .from("floors")
    .update({ birds_eye_url: url })
    .eq("id", id);
  if (error) throw error;

  revalidatePath(`/admin/floors/${id}`);
  revalidatePath("/admin/maps");
}

export async function removeFloorImageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("floors")
    .update({ birds_eye_url: null })
    .eq("id", id);
  if (error) throw error;

  revalidatePath(`/admin/floors/${id}`);
  revalidatePath("/admin/maps");
}
