// Browser-only helpers for extracting a poster frame from a video and
// uploading the resulting JPEG to R2 via a presigned PUT URL. Used both
// during fresh video uploads and when re-generating a poster for an
// already-uploaded video on the admin edit page.

// Generic browser → R2 PUT.
export function putToR2(
  uploadUrl: string,
  body: Blob,
  contentType = "image/jpeg",
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
          "Network error during upload. R2 bucket may be missing CORS rules."
        )
      );
    xhr.send(body);
  });
}

// Extracts a representative frame (~1s in to skip fade-ins) from a video as
// a JPEG Blob. Source can be a local File (newly picked) or a remote URL
// (existing R2 video). For URL sources, the R2 bucket must include the
// page's origin in its CORS allowlist.
export function extractPosterFrame(
  source: File | string
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const isFile = source instanceof File;
    const objectUrl = isFile ? URL.createObjectURL(source) : null;
    const src = isFile ? objectUrl! : source;

    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    if (!isFile) {
      // Required so canvas.toBlob doesn't trip the tainted-canvas rule.
      video.crossOrigin = "anonymous";
    }

    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.onerror = fail;

    video.onloadedmetadata = () => {
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
