import { supabaseAdmin } from "@/lib/supabase";
import { r2Upload } from "@/lib/r2";
import { splitStoragePath } from "@/lib/submission-limits";

// Moving a submitted clip into peek video storage.
//
// The two systems deliberately use different backends: submissions land in a
// PRIVATE Supabase Storage bucket (signed URLs, which expire), while peek
// videos are public objects in R2. A peek cannot point at a Supabase signed
// URL — it would break the moment the signature lapsed — so publishing a
// submission has to physically move the bytes.
//
// No transcoding is involved. Submissions accept video/mp4 and video/quicktime,
// the peek uploader accepts those too, and existing peek videos are already a
// mix of .mov and .mp4 — so this is a byte-for-byte object copy.

const VIDEO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

/** Whether a submission's stored file can become a peek video at all. */
export function isVideoPath(filePath: string | null): boolean {
  if (!filePath) return false;
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return ext in VIDEO_MIME;
}

/**
 * Copies a submission's clip from the submissions bucket into R2 and returns
 * the public URL to store on the peek.
 *
 * Called BEFORE the peek is created. If this throws, nothing has been created
 * and the submission is untouched — which is why it runs first: the copy is
 * the flakiest step, so it happens while there is still nothing to roll back.
 *
 * The R2 key mirrors the convention used by the manual uploader
 * (peeks/<id>-video-<ts>.<ext>), except the id is not known yet — the peek
 * does not exist at this point — so a random token stands in. Nothing parses
 * these keys; the shape is for humans reading the bucket.
 */
export async function copySubmissionClipToR2(
  filePath: string
): Promise<string> {
  const parts = splitStoragePath(filePath);
  if (!parts) throw new Error("Submission file path is not in the expected form.");

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = VIDEO_MIME[ext];
  if (!contentType) {
    throw new Error(
      `Submitted file is a .${ext}, which cannot be used as a peek video.`
    );
  }

  const { data, error } = await supabaseAdmin()
    .storage.from("submissions")
    .download(filePath);
  if (error || !data) {
    throw new Error(
      `Could not read the submitted clip from storage: ${error?.message ?? "not found"}`
    );
  }

  // Buffered rather than streamed: submissions are capped at 50MB, which is
  // comfortable inside a function's memory, and streaming to S3 would need an
  // explicit content length anyway.
  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length === 0) throw new Error("The submitted clip is empty.");

  const token = crypto.randomUUID();
  const key = `peeks/submission-${token}-video-${Date.now()}.${ext}`;
  return r2Upload(key, bytes, contentType);
}
