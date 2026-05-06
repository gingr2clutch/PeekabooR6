"use server";

import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime.startsWith("video/mp4")) return "mp4";
  if (mime.startsWith("video/webm")) return "webm";
  if (mime.startsWith("video/quicktime")) return "mov";
  return "bin";
}

// Issues a short-lived (10 min) presigned PUT URL for the browser to upload
// directly to R2. The whole video file never flows through the Next/Vercel
// runtime, so there's no 4.5 MB body-size limit to hit.
export async function createPeekVideoUploadUrl(
  peekId: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!peekId) throw new Error("peekId required");

  const ext = safeExtension(filename, contentType);
  const key = `peeks/${peekId}-video-${Date.now()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 600 });
  return { uploadUrl, publicUrl: r2PublicUrl(key) };
}

// Called by the client after a direct R2 PUT succeeds. Just records the
// public URL on the peek row.
export async function setPeekVideoUrl(
  peekId: string,
  publicUrl: string
): Promise<void> {
  if (!peekId || !publicUrl) throw new Error("peekId and publicUrl required");

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ video_url: publicUrl })
    .eq("id", peekId);
  if (error) throw error;

  revalidatePath(`/admin/peeks/${peekId}/edit`);
  revalidatePath(`/peeks/${peekId}`);
}

export async function clearPeekVideoUrl(peekId: string): Promise<void> {
  if (!peekId) throw new Error("peekId required");

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ video_url: null, poster_url: null })
    .eq("id", peekId);
  if (error) throw error;

  revalidatePath(`/admin/peeks/${peekId}/edit`);
  revalidatePath(`/peeks/${peekId}`);
}

// Same presigned-PUT pattern as video, but for the auto-generated poster
// JPEG that's drawn from the video's first frame in the browser.
export async function createPeekPosterUploadUrl(
  peekId: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!peekId) throw new Error("peekId required");

  const key = `peeks/${peekId}-poster-${Date.now()}.jpg`;
  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: "image/jpeg",
  });
  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 600 });
  return { uploadUrl, publicUrl: r2PublicUrl(key) };
}

export async function setPeekPosterUrl(
  peekId: string,
  publicUrl: string
): Promise<void> {
  if (!peekId || !publicUrl) throw new Error("peekId and publicUrl required");

  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ poster_url: publicUrl })
    .eq("id", peekId);
  if (error) throw error;

  revalidatePath(`/admin/peeks/${peekId}/edit`);
  revalidatePath(`/peeks/${peekId}`);
}
