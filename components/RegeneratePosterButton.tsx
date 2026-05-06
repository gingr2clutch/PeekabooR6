"use client";

import { useRef, useState } from "react";
import {
  createPeekPosterUploadUrl,
  setPeekPosterUrl,
} from "@/app/admin/(authed)/peeks/upload-actions";
import { extractPosterFrame, putToR2 } from "@/lib/video-poster";

type Props = {
  peekId: string;
  videoUrl: string;
  hasPoster: boolean;
};

// Backfill helper for peeks whose video was uploaded before auto-poster
// generation existed. Two paths:
//   1. "Generate poster" — fetches the existing video, extracts a frame.
//      Requires R2 GET CORS allowing this origin.
//   2. "Upload poster manually" — pick any JPG/PNG, sent straight to R2.
//      Always works, no CORS dependency on the video URL.
export function RegeneratePosterButton({
  peekId,
  videoUrl,
  hasPoster,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [stage, setStage] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAuto() {
    console.log("[GENERATE POSTER] Button clicked");
    console.log("[RegeneratePosterButton] click. videoUrl=", videoUrl);
    setError(null);
    setDone(false);
    setBusy(true);
    setStage("Fetching video…");
    try {
      console.log("[RegeneratePosterButton] extracting poster frame");
      const blob = await extractPosterFrame(videoUrl);
      if (!blob) {
        throw new Error(
          "Couldn't extract a frame from the video. Most likely R2 CORS doesn't allow GET from this origin. As a workaround, click 'Upload poster manually' and pick any JPG."
        );
      }
      console.log(
        "[RegeneratePosterButton] got blob",
        blob.size,
        "bytes — requesting presigned URL"
      );
      setStage("Uploading poster…");
      const { uploadUrl, publicUrl } = await createPeekPosterUploadUrl(peekId);
      await putToR2(uploadUrl, blob, "image/jpeg");
      setStage("Saving…");
      await setPeekPosterUrl(peekId, publicUrl);
      console.log("[RegeneratePosterButton] done. publicUrl=", publicUrl);
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[RegeneratePosterButton] failed:", msg, e);
      setError(msg);
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  async function handleManual(file: File) {
    console.log(
      "[RegeneratePosterButton] manual upload",
      file.name,
      file.size,
      "bytes"
    );
    setError(null);
    setDone(false);
    setBusy(true);
    setStage("Uploading poster…");
    try {
      const { uploadUrl, publicUrl } = await createPeekPosterUploadUrl(peekId);
      await putToR2(
        uploadUrl,
        file,
        file.type || "image/jpeg"
      );
      setStage("Saving…");
      await setPeekPosterUrl(peekId, publicUrl);
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[RegeneratePosterButton] manual upload failed:", msg, e);
      setError(msg);
    } finally {
      setBusy(false);
      setStage("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAuto}
          disabled={busy}
          className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {busy
            ? stage || "Working…"
            : done
              ? "Poster updated ✓"
              : hasPoster
                ? "Regenerate poster"
                : "Generate poster"}
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
        >
          Upload poster manually
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleManual(file);
          }}
        />
      </div>

      {busy && (
        <div className="rounded-btn border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {stage || "Working…"}
        </div>
      )}

      {error && (
        <p className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
