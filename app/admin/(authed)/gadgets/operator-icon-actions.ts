"use server";

import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

// Operator icon upload. Deliberately a sibling of
// app/admin/(authed)/gadgets/[site]/upload-actions.ts rather than a shared
// helper: that file is the working bomb-site photo path, and generalising it
// to serve two callers would put a live flow at risk for no gain.
//
// Writes gadget_operators.icon_url only. No peek table is touched.

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

// The icon shows on the public picker and placements header, so both gadget
// routes are cleared alongside the admin list. Paths are static here — unlike
// bomb sites, an operator is not scoped to one map.
function revalidateOperators() {
  revalidatePath("/admin/gadgets/operators");
  revalidatePath("/gadgets");
}

// Presigned PUT so the browser uploads straight to R2. Icons are small enough
// to pass through a server action, but this mirrors the existing photo path
// exactly rather than inventing a second style for the same job.
export async function createOperatorIconUploadUrl(
  operatorId: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!operatorId) throw new Error("operatorId required");

  const ext = safeExtension(filename, contentType);
  const key = `operators/${operatorId}-${Date.now()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 600 });
  return { uploadUrl, publicUrl: r2PublicUrl(key) };
}

// Called by the client after a successful R2 PUT. Uploading replaces whatever
// was there: the column holds one URL, and the old object is left in R2 rather
// than deleted, so a stale CDN copy can never 404 mid-swap.
export async function setOperatorIconUrl(
  operatorId: string,
  publicUrl: string
): Promise<void> {
  if (!operatorId || !publicUrl) {
    throw new Error("operatorId and publicUrl required");
  }
  const { error } = await supabaseAdmin()
    .from("gadget_operators")
    .update({ icon_url: publicUrl })
    .eq("id", operatorId);
  if (error) throw error;

  revalidateOperators();
}

export async function clearOperatorIconUrl(operatorId: string): Promise<void> {
  if (!operatorId) throw new Error("operatorId required");
  const { error } = await supabaseAdmin()
    .from("gadget_operators")
    .update({ icon_url: null })
    .eq("id", operatorId);
  if (error) throw error;

  revalidateOperators();
}
