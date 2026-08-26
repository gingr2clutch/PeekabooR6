"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  clearGadgetSiteImageUrl,
  createGadgetSiteImageUploadUrl,
  setGadgetSiteImageUrl,
} from "@/app/admin/(authed)/gadgets/[site]/upload-actions";
import { compressImageForUpload, formatBytes, putToR2 } from "@/lib/upload";

type Props = {
  siteId: string;
  siteName: string;
  initialUrl: string | null;
  // Shown behind the empty state so it is obvious what the card falls back to.
  blueprintUrl: string | null;
};

// Preview-photo uploader for one gadget bomb site. Mirrors
// DirectFloorImageUpload: compress in the browser, PUT straight to R2 via a
// presigned URL, then write the public URL to the row.
//
// Two deliberate differences from the floor uploader:
//   - "peek" preset (1280px) not "floor" (1600px). This image is only ever
//     drawn in a square card at ~50vw on a phone, and the public map page
//     carries ads, so the extra pixels cost load time for nothing.
//   - Square preview box, matching how the card actually crops it.
export function DirectGadgetSiteImageUpload({
  siteId,
  siteName,
  initialUrl,
  blueprintUrl,
}: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"compress" | "upload" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [savings, setSavings] = useState<{ before: number; after: number } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    setBusy(true);
    setSavings(null);
    setPhase("compress");
    try {
      const beforeBytes = file.size;
      const compressed = await compressImageForUpload(file, "peek");
      setSavings({ before: beforeBytes, after: compressed.size });
      setPhase("upload");

      const { uploadUrl, publicUrl } = await createGadgetSiteImageUploadUrl(
        siteId,
        compressed.name,
        compressed.type
      );

      await putToR2(uploadUrl, compressed, compressed.type, (pct) =>
        setProgress(pct)
      );
      await setGadgetSiteImageUrl(siteId, publicUrl);
      setUrl(publicUrl);
      setProgress(100);
    } catch (e) {
      console.error("[DirectGadgetSiteImageUpload] upload failed:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  async function handleRemove() {
    if (
      !confirm(
        "Remove this site's photo? The card will fall back to the floor blueprint."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clearGadgetSiteImageUrl(siteId);
      setUrl(null);
      setProgress(0);
    } catch (e) {
      console.error("[DirectGadgetSiteImageUpload] remove failed:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        {/* Square, because that is how the public card crops it. */}
        <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-inner border border-border bg-bg">
          {url ? (
            <Image
              key={url}
              src={url}
              alt={siteName}
              fill
              sizes="160px"
              className="object-cover"
            />
          ) : blueprintUrl ? (
            <>
              <Image
                src={blueprintUrl}
                alt=""
                fill
                sizes="160px"
                className="object-cover opacity-40"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-center text-[10px] font-medium text-white">
                Blueprint fallback
              </span>
            </>
          ) : (
            <span className="placeholder-stripes absolute inset-0" />
          )}
        </div>

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
          className={`flex min-h-[10rem] flex-1 basis-56 cursor-pointer items-center justify-center rounded-card border-2 border-dashed text-center transition-colors ${
            dragOver
              ? "border-blue bg-blue/5"
              : "border-border bg-bg hover:border-blue"
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
            {phase === "compress"
              ? "Compressing photo…"
              : phase === "upload"
                ? `Uploading… ${progress}%`
                : url
                  ? "Drop a new photo to replace, or click to browse"
                  : "Drop a photo (.png, .jpg, .webp) here, or click to browse"}
          </span>
        </label>
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
        <p className="text-xs text-muted">
          Compressed: {formatBytes(savings.before)} →{" "}
          <span className="font-medium text-ink">
            {formatBytes(savings.after)}
          </span>
        </p>
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
          className="rounded-btn border border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-blue hover:text-blue"
        >
          Remove photo
        </button>
      )}

      <p className="text-[11px] text-muted">
        Compressed to WebP (max 1280 wide, q=0.85) in the browser, then uploaded
        straight to R2 — no Vercel size limit. This photo is the card thumbnail
        only; clicking the card still opens the floor blueprint with the pins.
      </p>
    </div>
  );
}
