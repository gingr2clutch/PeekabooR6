"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Bucket, r2Client, r2PublicUrl } from "@/lib/r2";

// Presigned upload for a gadget placement clip.
//
// Unlike the peek video uploader, this writes nothing to the database. It
// hands back a public URL that the client drops into the form's hidden
// video_url field, so the existing createPlacementAction /
// updatePlacementAction remain the only write path — and the New Placement
// form works even though its row does not exist yet.
//
// Touches R2 only. No table is read or written here, gadget or peek.

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/quicktime") return "mov";
  if (mime === "video/webm") return "webm";
  return "bin";
}

export async function createGadgetClipUploadUrl(
  siteId: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!siteId) throw new Error("siteId required");

  const ext = safeExtension(filename, contentType);
  // Random suffix as well as the timestamp: several placements on one site can
  // be uploaded in the same millisecond from a fast connection.
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `gadget-clips/${siteId}-${Date.now()}-${rand}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client(), cmd, { expiresIn: 900 });
  return { uploadUrl, publicUrl: r2PublicUrl(key) };
}
