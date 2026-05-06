"use client";

import { useRef, useState } from "react";
import {
  clearPeekVideoUrl,
  createPeekVideoUploadUrl,
  setPeekVideoUrl,
} from "@/app/admin/(authed)/peeks/upload-actions";

type Props = {
  peekId: string;
  initialUrl: string | null;
};

// Video uploader that talks to R2 directly via a presigned PUT URL. The file
// never flows through Vercel, so Hobby's 4.5 MB body limit doesn't apply —
// the only ceiling is R2's per-PUT cap (currently 5 GB).
//
// Flow:
//   1. Server action issues a short-lived presigned PUT URL.
//   2. Browser PUTs the file straight to R2 with progress events.
//   3. Server action saves the resulting public URL on the peek row.
export function DirectVideoUpload({ peekId, initialUrl }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    setBusy(true);
    try {
      const { uploadUrl, publicUrl } = await createPeekVideoUploadUrl(
        peekId,
        file.name,
        file.type || "application/octet-stream"
      );

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream"
        );
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(
              new Error(`R2 upload failed (HTTP ${xhr.status}). ${xhr.responseText || ""}`)
            );
          }
        };
        xhr.onerror = () =>
          reject(
            new Error(
              "Network error during upload. If this is the first time you're uploading a video, the R2 bucket might be missing CORS rules — see the README."
            )
          );
        xhr.send(file);
      });

      await setPeekVideoUrl(peekId, publicUrl);
      setUrl(publicUrl);
      setProgress(100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the video from this peek?")) return;
    setBusy(true);
    setError(null);
    try {
      await clearPeekVideoUrl(peekId);
      setUrl(null);
      setProgress(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {url && (
        <video
          key={url}
          src={url}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-inner bg-black"
        />
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (busy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`flex aspect-video w-full cursor-pointer items-center justify-center rounded-card border-2 border-dashed text-center transition-colors ${
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border bg-bg hover:border-brand"
        } ${busy ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Reset so the same file can be re-picked after a failure.
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <span className="px-4 text-sm text-muted">
          {busy
            ? `Uploading… ${progress}%`
            : url
              ? "Drop a new clip to replace, or click to browse"
              : "Drop a clip (.mp4, .mov, .webm) here, or click to browse"}
        </span>
      </label>

      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-brand transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {url && !busy && (
        <button
          type="button"
          onClick={handleRemove}
          className="rounded-btn border border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
        >
          Remove video
        </button>
      )}

      <p className="text-[11px] text-muted">
        Uploads straight to R2 — no Vercel size limit.
      </p>
    </div>
  );
}
