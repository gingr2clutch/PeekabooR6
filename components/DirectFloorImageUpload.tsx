"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  clearFloorImageUrl,
  createFloorImageUploadUrl,
  setFloorImageUrl,
} from "@/app/admin/(authed)/floors/[id]/upload-actions";
import { putToR2 } from "@/lib/upload";

type Props = {
  floorId: string;
  floorName: string;
  initialUrl: string | null;
};

// Bird's-eye image uploader. Talks to R2 directly via a presigned PUT URL
// so files don't traverse the Vercel runtime (which would cap them at
// ~4.5 MB). On success the public URL is written to the floor row.
export function DirectFloorImageUpload({
  floorId,
  floorName,
  initialUrl,
}: Props) {
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
      const { uploadUrl, publicUrl } = await createFloorImageUploadUrl(
        floorId,
        file.name,
        file.type || "application/octet-stream"
      );

      await putToR2(
        uploadUrl,
        file,
        file.type || "application/octet-stream",
        (pct) => setProgress(pct)
      );
      await setFloorImageUrl(floorId, publicUrl);
      setUrl(publicUrl);
      setProgress(100);
    } catch (e) {
      // Surface the real error to the dev tools console as well as the
      // UI so a silent failure isn't possible.
      console.error("[DirectFloorImageUpload] upload failed:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (
      !confirm(
        "Remove the bird's-eye image? Pins will still exist but the public view will show the placeholder."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clearFloorImageUrl(floorId);
      setUrl(null);
      setProgress(0);
    } catch (e) {
      console.error("[DirectFloorImageUpload] remove failed:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {url && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner border border-border">
          <Image
            key={url}
            src={url}
            alt={floorName}
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover"
          />
        </div>
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
        className={`flex aspect-[16/10] w-full cursor-pointer items-center justify-center rounded-card border-2 border-dashed text-center transition-colors ${
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border bg-bg hover:border-brand"
        } ${busy ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
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
              ? "Drop a new image to replace, or click to browse"
              : "Drop an image (.png, .jpg, .webp) here, or click to browse"}
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
          Remove image
        </button>
      )}

      <p className="text-[11px] text-muted">
        Uploads straight to R2 — no Vercel size limit.
      </p>
    </div>
  );
}
