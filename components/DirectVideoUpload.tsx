"use client";

import { useRef, useState } from "react";
import {
  clearPeekVideoUrl,
  createPeekPosterUploadUrl,
  createPeekVideoUploadUrl,
  setPeekPosterUrl,
  setPeekVideoUrl,
} from "@/app/admin/(authed)/peeks/upload-actions";

type Props = {
  peekId: string;
  initialUrl: string | null;
};

// Video uploader that talks to R2 directly via a presigned PUT URL. The file
// never flows through Vercel, so Hobby's 4.5 MB body limit doesn't apply.
//
// Flow per file:
//   1. Server issues a presigned PUT URL.
//   2. Browser PUTs the video to R2 (with progress events).
//   3. Server records the public URL on the peek row.
//   4. Browser draws the first video frame to a canvas, uploads that JPEG
//      to R2 (also presigned), and records it as the poster URL. Failures
//      here are non-fatal — the video itself is already saved.
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

      await putToR2(uploadUrl, file, file.type || "application/octet-stream", (pct) =>
        setProgress(pct)
      );
      await setPeekVideoUrl(peekId, publicUrl);
      setUrl(publicUrl);
      setProgress(100);

      // Best-effort poster generation. If anything fails (codec issues,
      // CORS, blocked autoplay), swallow it — video already saved.
      try {
        const blob = await firstFrameBlob(file);
        if (blob) {
          const poster = await createPeekPosterUploadUrl(peekId);
          await putToR2(poster.uploadUrl, blob, "image/jpeg");
          await setPeekPosterUrl(peekId, poster.publicUrl);
        }
      } catch (posterErr) {
        console.warn("[DirectVideoUpload] poster generation failed", posterErr);
      }
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
        Uploads straight to R2 — no Vercel size limit. Poster image is
        auto-generated from the first frame.
      </p>
    </div>
  );
}

// Generic browser → R2 PUT with optional progress callback.
function putToR2(
  uploadUrl: string,
  body: Blob,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else
        reject(
          new Error(
            `R2 upload failed (HTTP ${xhr.status}). ${xhr.responseText || ""}`
          )
        );
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Network error during upload. If this is the first time you're uploading a video, the R2 bucket might be missing CORS rules — check the dashboard."
        )
      );
    xhr.send(body);
  });
}

// Extracts the first frame of a video File as a JPEG Blob using a hidden
// <video> + <canvas>. Resolves null if the browser can't decode the file
// (we don't want this to block the video upload itself).
function firstFrameBlob(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.onerror = fail;

    video.onloadedmetadata = () => {
      // Many R6 captures start with a fade-in or black title card, so seek
      // ~1s in (capped at 1/4 of the clip for short videos) to grab a real
      // representative frame.
      try {
        const target = Math.min(1, (video.duration || 4) / 4);
        video.currentTime = target;
      } catch {
        fail();
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          "image/jpeg",
          0.85
        );
      } catch {
        fail();
      }
    };
  });
}
