"use client";

import { useRef, useState } from "react";
import { createGadgetClipUploadUrl } from "@/app/admin/(authed)/gadgets/[site]/clip-upload-actions";
import { formatBytes, putToR2 } from "@/lib/upload";

type Props = {
  siteId: string;
  initialUrl?: string | null;
};

// Tap-to-add clip field for a gadget placement, replacing the raw URL box.
//
// It never writes to the database. The uploaded R2 URL goes into a hidden
// video_url input, so the surrounding form's existing action persists it — the
// same field name it always submitted. That is what lets this work on the New
// Placement form, where no row exists yet to attach an upload to.
//
// accept="video/*" opens straight to the videos in the phone's photo library.
export function GadgetClipUpload({ siteId, initialUrl }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    setBusy(true);
    setSize(file.size);
    try {
      const type = file.type || "application/octet-stream";
      const { uploadUrl, publicUrl } = await createGadgetClipUploadUrl(
        siteId,
        file.name,
        type
      );
      // Straight to R2 — a server action would cap this at Vercel's ~4.5 MB
      // body limit, which phone clips pass easily.
      await putToR2(uploadUrl, file, type, (pct) => setProgress(pct));
      setUrl(publicUrl);
      setProgress(100);
    } catch (e) {
      console.error("[GadgetClipUpload] upload failed:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      {/* The value the form actually submits. Unchanged field name, so no
          server action had to change. */}
      <input type="hidden" name="video_url" value={url ?? ""} />

      {url ? (
        <div className="flex flex-wrap items-center gap-3 rounded-btn border border-border bg-card p-2">
          <video
            src={`${url}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            className="h-16 w-24 shrink-0 rounded-btn bg-black object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-xs text-muted">
            Clip attached{size ? ` · ${formatBytes(size)}` : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              setUrl(null);
              setProgress(0);
              setSize(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="rounded-btn border border-border px-2 py-1 text-xs text-muted hover:border-brand hover:text-brand"
          >
            Replace
          </button>
        </div>
      ) : (
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
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`flex min-h-[64px] w-full cursor-pointer items-center justify-center rounded-btn border-2 border-dashed px-3 text-center transition-colors ${
            dragOver ? "border-brand bg-brand/5" : "border-border bg-bg hover:border-brand"
          } ${busy ? "cursor-not-allowed opacity-70" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <span className="text-sm text-muted">
            {busy ? `Uploading… ${progress}%` : "Tap to add a clip"}
          </span>
        </label>
      )}

      {busy && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-brand transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-btn border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
