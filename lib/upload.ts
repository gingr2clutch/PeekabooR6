// Client-only helpers shared by every R2 uploader.
//
// 1. compressImageForUpload — resize + transcode the picked file to WebP
//    in the browser before the PUT. Without Vercel image optimization
//    (disabled site-wide so we don't hit the Hobby quota), R2 serves the
//    original bytes verbatim — so any savings have to happen here.
// 2. putToR2 — XHR PUT with progress, used by both image and video flows.

export type CompressPreset = "floor" | "peek" | "image" | "operator";

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
  // Operator icons. Drawn at 64px in a circle, so 256 covers 2x displays with
  // room to spare and keeps the file tiny — these are served unoptimised.
  operator: { maxWidthOrHeight: 256, initialQuality: 0.85 },
};

/**
 * Centre-crops an image to a square before it is compressed.
 *
 * Needed because compressImageForUpload only ever SCALES: maxWidthOrHeight
 * shrinks the long edge and preserves aspect ratio. A 16:9 screenshot stays
 * 16:9, and the circular crop on the public card would then silently cut its
 * sides off. Cropping here means what the admin sees in the preview is what
 * visitors see.
 *
 * Runs on a canvas rather than in the compression library, which has no crop
 * option. Already-square images pass through untouched.
 */
export async function cropToSquare(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);

  // Nothing to do — avoid a needless re-encode.
  if (bitmap.width === bitmap.height) {
    bitmap.close();
    return file;
  }

  const sx = Math.round((bitmap.width - side) / 2);
  const sy = Math.round((bitmap.height - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file; // No 2d context: fall through uncropped rather than fail.
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, side, side);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[a-z0-9]+$/i, "") || "image";
  return new File([blob], `${base}.png`, { type: "image/png" });
}

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
