"use client";

import { useRef, useState } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  hidden: { name: string; value: string }[];
  accept?: string;
  label?: string;
};

// Drag-drop file picker that auto-submits to a server action on file select.
// Uses a hidden file input behind a styled label so dropping or clicking both
// work and we get free file-picker UX from the browser.
export function DropUpload({
  action,
  hidden,
  accept = "image/*",
  label = "Drop an image here, or click to browse",
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    setPending(true);
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        try {
          await action(fd);
        } finally {
          setPending(false);
          setFilename(null);
          if (inputRef.current) inputRef.current.value = "";
        }
      }}
    >
      {hidden.map((h) => (
        <input key={h.name} type="hidden" name={h.name} value={h.value} />
      ))}
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
          if (!file || !inputRef.current) return;
          const dt = new DataTransfer();
          dt.items.add(file);
          inputRef.current.files = dt.files;
          setFilename(file.name);
          submit();
        }}
        className={`flex aspect-[16/10] w-full cursor-pointer items-center justify-center rounded-card border-2 border-dashed text-center transition-colors ${
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border bg-bg hover:border-brand"
        } ${pending ? "opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setFilename(file.name);
            submit();
          }}
        />
        <span className="px-4 text-sm text-muted">
          {pending
            ? `Uploading ${filename ?? "image"}…`
            : filename
              ? filename
              : label}
        </span>
      </label>
    </form>
  );
}
