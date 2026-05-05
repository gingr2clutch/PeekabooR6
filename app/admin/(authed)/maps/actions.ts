"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { r2Upload } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createMapAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  if (!name) return;
  const slug = slugify(slugInput || name);

  const { error } = await supabaseAdmin()
    .from("maps")
    .insert({ name, slug });
  if (error) throw error;

  revalidatePath("/admin/maps");
  revalidatePath("/");
}

export async function updateMapAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim());
  if (!id || !name || !slug) return;

  const { error } = await supabaseAdmin()
    .from("maps")
    .update({ name, slug })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/maps");
  revalidatePath("/");
  revalidatePath(`/maps/${slug}`);
}

export async function toggleMapPublishedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "on";
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("maps")
    .update({ published: next })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/maps");
  revalidatePath("/");
}

export async function uploadMapCoverAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id || !(file instanceof File) || file.size === 0) return;

  const ext = safeExtension(file.name, file.type);
  const key = `maps/${id}-cover-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const url = await r2Upload(
    key,
    bytes,
    file.type || "application/octet-stream"
  );

  const { error } = await supabaseAdmin()
    .from("maps")
    .update({ cover_image_url: url })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/maps");
  revalidatePath("/");
}

export async function removeMapCoverAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("maps")
    .update({ cover_image_url: null })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/maps");
  revalidatePath("/");
}

export async function deleteMapAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin().from("maps").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/maps");
  revalidatePath("/");
}

export async function createFloorAction(formData: FormData) {
  const mapId = String(formData.get("map_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const order = Number(formData.get("display_order") ?? 0);
  if (!mapId || !name) return;
  const slug = slugify(slugInput || name);

  const { error } = await supabaseAdmin()
    .from("floors")
    .insert({ map_id: mapId, name, slug, display_order: order || 1 });
  if (error) throw error;

  revalidatePath("/admin/maps");
}

export async function deleteFloorFromListAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin().from("floors").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/maps");
}

export async function goToFloorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  redirect(`/admin/floors/${id}`);
}
