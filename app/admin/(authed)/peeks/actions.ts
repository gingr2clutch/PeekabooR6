"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { r2Upload } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime.startsWith("image/png")) return "png";
  if (mime.startsWith("image/jpeg")) return "jpg";
  if (mime.startsWith("image/webp")) return "webp";
  if (mime.startsWith("video/mp4")) return "mp4";
  if (mime.startsWith("video/webm")) return "webm";
  if (mime.startsWith("video/quicktime")) return "mov";
  return "bin";
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

// Pulls a staged file off the form and uploads it to R2. Returns the new
// public URL, or null if no usable file was attached.
async function uploadStagedFile(
  peekId: string,
  formData: FormData,
  field: "screenshot" | "video"
): Promise<string | null> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = safeExtension(file.name, file.type);
  const key = `peeks/${peekId}-${field}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  return r2Upload(key, bytes, file.type || "application/octet-stream");
}

export async function createPeekAction(formData: FormData) {
  console.log("[createPeekAction] start. form keys:", Array.from(formData.keys()));

  const screenshot = formData.get("screenshot");
  const video = formData.get("video");
  console.log("[createPeekAction] file sizes:", {
    screenshot: screenshot instanceof File ? `${screenshot.name} ${screenshot.size}b ${screenshot.type}` : "none",
    video: video instanceof File ? `${video.name} ${video.size}b ${video.type}` : "none",
  });

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

  console.log("[createPeekAction] inserting row...");
  const { data, error } = await supabaseAdmin()
    .from("peeks")
    .insert({
      floor_id,
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
  if (error) {
    console.error("[createPeekAction] insert failed", error);
    throw error;
  }

  console.log("[createPeekAction] uploading staged files...");
  let screenshotUrl: string | null = null;
  let videoUrl: string | null = null;
  try {
    screenshotUrl = await uploadStagedFile(data.id, formData, "screenshot");
    console.log("[createPeekAction] screenshot upload result:", screenshotUrl);
  } catch (e) {
    console.error("[createPeekAction] screenshot upload threw", e);
    throw e;
  }
  try {
    videoUrl = await uploadStagedFile(data.id, formData, "video");
    console.log("[createPeekAction] video upload result:", videoUrl);
  } catch (e) {
    console.error("[createPeekAction] video upload threw", e);
    throw e;
  }

  const mediaPatch: Record<string, unknown> = {};
  if (screenshotUrl) mediaPatch.screenshot_url = screenshotUrl;
  if (videoUrl) mediaPatch.video_url = videoUrl;
  if (Object.keys(mediaPatch).length > 0) {
    console.log("[createPeekAction] patching media URLs", mediaPatch);
    const { error: upErr } = await supabaseAdmin()
      .from("peeks")
      .update(mediaPatch)
      .eq("id", data.id);
    if (upErr) {
      console.error("[createPeekAction] media patch failed", upErr);
      throw upErr;
    }
  }

  console.log("[createPeekAction] success. redirecting to edit page", data.id);
  revalidatePath("/admin/peeks");
  redirect(`/admin/peeks/${data.id}/edit`);
}

export async function updatePeekAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
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

  if (!id || !floor_id || !name) return;

  const screenshotUrl = await uploadStagedFile(id, formData, "screenshot");
  const videoUrl = await uploadStagedFile(id, formData, "video");
  const removeScreenshot = formData.get("remove_screenshot") === "on";
  const removeVideo = formData.get("remove_video") === "on";

  const update: Record<string, unknown> = {
    floor_id,
    name,
    x_pct,
    y_pct,
    difficulty,
    risk,
    tip,
    success_rate,
    published,
    instructions: instructions.length ? instructions : null,
  };
  if (screenshotUrl) update.screenshot_url = screenshotUrl;
  else if (removeScreenshot) update.screenshot_url = null;
  if (videoUrl) update.video_url = videoUrl;
  else if (removeVideo) update.video_url = null;

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update(update)
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/peeks");
  revalidatePath(`/admin/peeks/${id}/edit`);
  revalidatePath(`/peeks/${id}`);
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
  revalidatePath(`/peeks/${id}`);
}

export async function uploadPeekScreenshotAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id || !(file instanceof File) || file.size === 0) return;

  const ext = safeExtension(file.name, file.type);
  const key = `peeks/${id}-screenshot-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const url = await r2Upload(key, bytes, file.type || "application/octet-stream");

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ screenshot_url: url })
    .eq("id", id);
  if (error) throw error;

  revalidatePath(`/admin/peeks/${id}/edit`);
  revalidatePath(`/peeks/${id}`);
}

export async function uploadPeekVideoAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id || !(file instanceof File) || file.size === 0) return;

  const ext = safeExtension(file.name, file.type);
  const key = `peeks/${id}-video-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const url = await r2Upload(key, bytes, file.type || "application/octet-stream");

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ video_url: url })
    .eq("id", id);
  if (error) throw error;

  revalidatePath(`/admin/peeks/${id}/edit`);
  revalidatePath(`/peeks/${id}`);
}

export async function removePeekMediaAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "");
  if (!id) return;
  if (field !== "screenshot_url" && field !== "video_url") return;

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ [field]: null })
    .eq("id", id);
  if (error) throw error;

  revalidatePath(`/admin/peeks/${id}/edit`);
  revalidatePath(`/peeks/${id}`);
}
