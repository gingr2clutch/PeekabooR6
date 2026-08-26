"use server";

import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

// Preview-photo upload for one gadget site. Deliberately a sibling of
// app/admin/(authed)/floors/[id]/upload-actions.ts rather than a shared
// helper: that file is the working blueprint path, and generalising it to
// serve two callers would put it at risk for no gain here.
//
// Writes gadget_sites.preview_image_url only. No peek table is touched.

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

// Revalidates the admin view plus the public map page, which is where the
// thumbnail actually shows. The map slug is looked up rather than passed in so
// a caller cannot revalidate the wrong path.
async function revalidateForSite(siteId: string) {
  const { data } = await supabaseAdmin()
    .from("gadget_sites")
    .select("maps(slug)")
    .eq("id", siteId)
    .maybeSingle();
  const mapSlug = (data as unknown as { maps: { slug: string } | null } | null)
    ?.maps?.slug;

  revalidatePath(`/admin/gadgets/${siteId}`);
  revalidatePath("/admin/gadgets");
  if (mapSlug) revalidatePath(`/gadgets/${mapSlug}`);
}

// Presigned PUT so the browser uploads straight to R2. Going through the
// server action would cap the file at Vercel's ~4.5 MB body limit, which
// phone photos routinely exceed.
export async function createGadgetSiteImageUploadUrl(
  siteId: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!siteId) throw new Error("siteId required");

  const ext = safeExtension(filename, contentType);
  const key = `gadget-sites/${siteId}-${Date.now()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 600 });
  return { uploadUrl, publicUrl: r2PublicUrl(key) };
}

// Called by the client after a successful R2 PUT.
export async function setGadgetSiteImageUrl(
  siteId: string,
  publicUrl: string
): Promise<void> {
  if (!siteId || !publicUrl) {
    throw new Error("siteId and publicUrl required");
  }
  const { error } = await supabaseAdmin()
    .from("gadget_sites")
    .update({ preview_image_url: publicUrl })
    .eq("id", siteId);
  if (error) throw error;

  await revalidateForSite(siteId);
}

export async function clearGadgetSiteImageUrl(siteId: string): Promise<void> {
  if (!siteId) throw new Error("siteId required");
  const { error } = await supabaseAdmin()
    .from("gadget_sites")
    .update({ preview_image_url: null })
    .eq("id", siteId);
  if (error) throw error;

  await revalidateForSite(siteId);
}
