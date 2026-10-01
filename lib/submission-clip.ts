// Which clip fields a published submission writes onto its peek.
//
// Its own module, and pure, for two reasons: community-actions.ts is
// "use server" (every export there must be an async action, so a plain helper
// cannot live in it), and this is the one decision in the publish path worth
// being able to exercise without a database.

/** The parts of a community_submissions row that decide the clip. */
export type SubmissionClipSource = {
  file_path: string | null;
  source_url: string | null;
};

export type PeekClipFields = {
  /** An R2 object we host, copied from the upload. */
  video_url: string | null;
  /**
   * An external clip, read by clipPlatform() and ClipCredit.
   *
   * Named tiktok_url for historical reasons — it holds any external clip URL,
   * TikTok, YouTube or Medal alike, and clipPlatform() is what tells them
   * apart.
   */
  tiktok_url: string | null;
};

/**
 * A file upload keeps working exactly as before: it is copied to R2 and the
 * resulting URL goes in video_url, with no external link recorded.
 *
 * A LINK-ONLY submission — a Medal, TikTok or YouTube URL in source_url with no
 * file — used to publish with neither field set, silently losing the clip the
 * submitter sent. Its URL now goes to tiktok_url, which is the field the peek
 * page actually reads for an external clip.
 *
 * `copiedVideoUrl` is the result of copying the upload, which the caller does
 * (it needs network and storage); this only decides where things land.
 */
export function clipFieldsForSubmission(
  sub: SubmissionClipSource,
  copiedVideoUrl: string | null
): PeekClipFields {
  if (sub.file_path) {
    return { video_url: copiedVideoUrl, tiktok_url: null };
  }
  const link = (sub.source_url ?? "").trim();
  return { video_url: null, tiktok_url: link || null };
}
