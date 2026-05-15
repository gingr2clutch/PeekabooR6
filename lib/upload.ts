// Client-only helpers shared by every R2 uploader.
//
// 1. compressImageForUpload — resize + transcode the picked file to WebP
//    in the browser before the PUT. Without Vercel image optimization
//    (disabled site-wide so we don't hit the Hobby quota), R2 serves the
//    original bytes verbatim — so any savings have to happen here.
// 2. putToR2 — XHR PUT with progress, used by both image and video flows.

export type CompressPreset = "floor" | "peek" | "image";

const PRESETS: Record<
  CompressPreset,
  { maxWidthOrHeight: number; initialQuality: number }
> = {
  // 16:10 bird's-eye screenshots. 1600px on the long edge keeps text
  // readable when zoomed but stays under ~400 KB at q=0.85 WebP.
  floor: { maxWidthOrHeight: 1600, initialQuality: 0.85 },
  // 16:9 peek posters / first-frame thumbnails.
  peek: { maxWidthOrHeight: 1280, initialQuality: 0.85 },
  // Catch-all (map covers, etc.).
  image: { maxWidthOrHeight: 1920, initialQuality: 0.85 },
};

// Returns a new File renamed to `.webp` so the eventual R2 key extension
// + Content-Type agree (the upload action picks the extension from the
// filename when valid).
export async function compressImageForUpload(
  file: File,
  preset: CompressPreset
): Promise<File> {
  // Dynamic import so the ~200 KB compression library only loads when an
  // admin actually picks a file, not on every public-page bundle.
  const { default: imageCompression } = await import(
    "browser-image-compression"
  );
  const { maxWidthOrHeight, initialQuality } = PRESETS[preset];

  const compressed = await imageCompression(file, {
    maxWidthOrHeight,
    initialQuality,
    useWebWorker: true,
    fileType: "image/webp",
  });

  const base = file.name.replace(/\.[a-z0-9]+$/i, "") || "image";
  return new File([compressed], `${base}.webp`, { type: "image/webp" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function putToR2(
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
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(
        new Error(
          `R2 upload failed (HTTP ${xhr.status} ${xhr.statusText || ""}). ${
            xhr.responseText || "No response body."
          }`.trim()
        )
      );
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Network error during upload. R2 bucket may be missing CORS rules for this origin."
        )
      );
    xhr.send(body);
  });
}
