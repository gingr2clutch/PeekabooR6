"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  clearOperatorIconUrl,
  createOperatorIconUploadUrl,
  setOperatorIconUrl,
} from "@/app/admin/(authed)/gadgets/operator-icon-actions";
import {
  compressImageForUpload,
  cropToSquare,
  formatBytes,
  putToR2,
} from "@/lib/upload";

type Props = {
  operatorId: string;
  operatorName: string;
  initialUrl: string | null;
};

// Icon uploader for one operator. Mirrors DirectGadgetSiteImageUpload —
// compress in the browser, PUT straight to R2 via a presigned URL, then write
// the public URL to the row.
//
// One extra step: the file is centre-cropped to a square BEFORE compression.
// The public card crops to a circle, so an uncropped 16:9 image would lose its
// sides there with no warning. Cropping first means the preview below is
// exactly what visitors get.
export function OperatorIconUpload({
  operatorId,
  operatorName,
  initialUrl,
}: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"crop" | "upload" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savings, setSavings] = useState<{ before: number; after: number } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    setBusy(true);
    setSavings(null);
    setPhase("crop");
    try {
      const beforeBytes = file.size;
      const squared = await cropToSquare(file);
      const compressed = await compressImageForUpload(squared, "operator");
      setSavings({ before: beforeBytes, after: compressed.size });
      setPhase("upload");

      const { uploadUrl, publicUrl } = await createOperatorIconUploadUrl(
        operatorId,
        compressed.name,
        compressed.type
      );
      await putToR2(uploadUrl, compressed, compressed.type, (pct) =>
        setProgress(pct)
      );
      await setOperatorIconUrl(operatorId, publicUrl);
      setUrl(publicUrl);
      setProgress(100);
    } catch (e) {
      console.error("[OperatorIconUpload] upload failed:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${operatorName}'s icon? The card falls back to a letter.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clearOperatorIconUrl(operatorId);
      setUrl(null);
      setProgress(0);
    } catch (e) {
      console.error("[OperatorIconUpload] remove failed:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
      {/* Circular, matching how the public card crops it. */}
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-blue">
        {url ? (
          <Image
            key={url}
            src={url}
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden className="text-lg font-semibold text-white">
            {(operatorName.trim()[0] ?? "?").toUpperCase()}
          </span>
        )}
      </span>

      <span
        className={`rounded-btn px-2 py-0.5 text-xs font-medium ${
          url ? "bg-blue/10 text-blue" : "bg-ink/[0.06] text-muted"
        }`}
      >
        {url ? "Icon" : "No photo"}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <label
          className={`cursor-pointer rounded-btn border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-blue hover:text-blue ${
            busy ? "cursor-not-allowed opacity-70" : ""
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          {busy
            ? phase === "crop"
              ? "Cropping…"
              : `Uploading… ${progress}%`
            : url
              ? "Replace"
              : "Upload icon"}
        </label>

        {url && !busy && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-btn border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-blue hover:text-blue"
          >
            Remove
          </button>
        )}
      </div>

      {busy && phase === "upload" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-blue transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {savings && !error && (
        <p className="w-full text-xs text-muted">
          Cropped square and compressed: {formatBytes(savings.before)} →{" "}
          <span className="font-medium text-ink">{formatBytes(savings.after)}</span>
        </p>
      )}

      {error && (
        <p className="w-full rounded-btn border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
