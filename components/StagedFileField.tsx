"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  name: string;
  accept?: string;
  currentUrl?: string | null;
  removeFlagName?: string;
  emptyLabel?: string;
  previewKind?: "image" | "video";
};

// File picker that stages a file in a hidden <input type="file"> for the
// surrounding <form> to submit. Unlike DropUpload it does NOT auto-submit —
// the file rides along when the parent form is submitted, so it can be
// processed in the same server action that creates/updates the row.
//
// The X button clears either the queued file (before save) or marks the
// already-saved file for removal on the next submit.
export function StagedFileField({
  name,
  accept = "image/*",
  currentUrl,
  removeFlagName,
  emptyLabel = "Drop a file here, or click to browse",
  previewKind = "image",
}: Props) {
  const [staged, setStaged] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [removeExisting, setRemoveExisting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function attach(file: File) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    inputRef.current.files = dt.files;
    setStaged(file);
    setRemoveExisting(false);
  }

  function clearStaged() {
    if (inputRef.current) inputRef.current.value = "";
    setStaged(null);
  }

  function markRemoveExisting() {
    clearStaged();
    setRemoveExisting(true);
  }

  function undoRemove() {
    setRemoveExisting(false);
  }

  const showSavedPreview = currentUrl && !staged && !removeExisting;
  const stagedPreview = staged ? URL.createObjectURL(staged) : null;

  return (
    <div className="space-y-3">
      {showSavedPreview && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner border border-border">
          {previewKind === "video" ? (
            <video
              src={currentUrl!}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <Image
              src={currentUrl!}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
            />
          )}
          {removeFlagName && (
            <RemoveBadge onClick={markRemoveExisting} title="Remove">
              ×
            </RemoveBadge>
          )}
        </div>
      )}

      {stagedPreview && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner border border-border">
          {previewKind === "video" ? (
            <video
              src={stagedPreview}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stagedPreview}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          <RemoveBadge onClick={clearStaged} title="Discard staged file">
            ×
          </RemoveBadge>
          <span className="absolute bottom-2 left-2 rounded-btn bg-black/60 px-2 py-0.5 text-[11px] text-white">
            Will upload on save
          </span>
        </div>
      )}

      {removeExisting && currentUrl && (
        <div className="flex items-center justify-between rounded-inner border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>Existing file will be removed on save.</span>
          <button
            type="button"
            onClick={undoRemove}
            className="rounded-btn border border-red-200 bg-white px-2 py-0.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Undo
          </button>
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) attach(file);
        }}
        className={`flex aspect-[16/10] w-full cursor-pointer items-center justify-center rounded-card border-2 border-dashed text-center transition-colors ${
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border bg-bg hover:border-brand"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) attach(file);
          }}
        />
        <span className="px-4 text-sm text-muted">
          {staged
            ? "Drop a different file to replace"
            : currentUrl && !removeExisting
              ? "Drop a new file to replace, or click to browse"
              : emptyLabel}
        </span>
      </label>

      {removeFlagName && (
        <input
          type="hidden"
          name={removeFlagName}
          value={removeExisting ? "on" : ""}
        />
      )}
    </div>
  );
}

function RemoveBadge({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white/90 text-base font-medium text-ink shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
    >
      {children}
    </button>
  );
}
