"use client";

import { useState } from "react";
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
// generation existed (or when you just want to refresh the poster). Pulls
// the existing video from R2, extracts a frame, uploads it as the new
// poster.
export function RegeneratePosterButton({
  peekId,
  videoUrl,
  hasPoster,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    setError(null);
    setDone(false);
    setBusy(true);
    try {
      const blob = await extractPosterFrame(videoUrl);
      if (!blob) {
        throw new Error(
          "Couldn't extract a frame from the video. The R2 bucket likely needs your page's origin added to its CORS rules."
        );
      }
      const { uploadUrl, publicUrl } = await createPeekPosterUploadUrl(peekId);
      await putToR2(uploadUrl, blob, "image/jpeg");
      await setPeekPosterUrl(peekId, publicUrl);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
      >
        {busy
          ? "Generating poster…"
          : done
            ? "Poster updated ✓"
            : hasPoster
              ? "Regenerate poster"
              : "Generate poster"}
      </button>
      {error && (
        <p className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
