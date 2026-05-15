"use server";

import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

// Mirrors the peek-video flow: issue a short-lived presigned PUT URL so the
// browser uploads directly to R2. Bird's-eye images are commonly 5-15 MB
// PNG screenshots, which exceeds Vercel's ~4.5 MB server-action body limit
// — going through the runtime would silently fail.
export async function createFloorImageUploadUrl(
  floorId: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!floorId) throw new Error("floorId required");

  const ext = safeExtension(filename, contentType);
  const key = `floors/${floorId}-${Date.now()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 600 });
  return { uploadUrl, publicUrl: r2PublicUrl(key) };
}

// Called by the client after a successful R2 PUT.
export async function setFloorImageUrl(
  floorId: string,
  publicUrl: string
): Promise<void> {
  if (!floorId || !publicUrl) {
    throw new Error("floorId and publicUrl required");
  }
  const { error } = await supabaseAdmin()
    .from("floors")
    .update({ birds_eye_url: publicUrl })
    .eq("id", floorId);
  if (error) throw error;

  revalidatePath(`/admin/floors/${floorId}`);
  revalidatePath("/admin/maps");
}

export async function clearFloorImageUrl(floorId: string): Promise<void> {
  if (!floorId) throw new Error("floorId required");
  const { error } = await supabaseAdmin()
    .from("floors")
    .update({ birds_eye_url: null })
    .eq("id", floorId);
  if (error) throw error;

  revalidatePath(`/admin/floors/${floorId}`);
  revalidatePath("/admin/maps");
}
