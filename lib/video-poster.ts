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
// (existing R2 video). For URL sources we fetch the video as a Blob first
// — that way the hidden <video> plays from a same-origin blob: URL and
// canvas readback isn't blocked by tainting rules even if the remote
// CDN's CORS replies are inconsistent.
export async function extractPosterFrame(
  source: File | string
): Promise<Blob | null> {
  console.log(
    "[extractPosterFrame] start. source =",
    source instanceof File ? `File(${source.name}, ${source.size}b)` : source
  );

  let blob: Blob;
  if (source instanceof File || source instanceof Blob) {
    blob = source;
  } else {
    try {
      const res = await fetch(source, { mode: "cors", credentials: "omit" });
      if (!res.ok) {
        console.warn(
          "[extractPosterFrame] fetch returned non-OK",
          res.status,
          res.statusText
        );
        return null;
      }
      blob = await res.blob();
      console.log(
        "[extractPosterFrame] fetched blob",
        blob.size,
        "bytes",
        blob.type
      );
    } catch (e) {
      console.warn("[extractPosterFrame] fetch threw", e);
      return null;
    }
  }

  return new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => URL.revokeObjectURL(blobUrl);
    const fail = (reason: string) => {
      console.warn("[extractPosterFrame] fail:", reason);
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };

    // Hard ceiling so the button never hangs forever.
    const timeout = setTimeout(() => fail("timeout (15s)"), 15000);

    video.onerror = () => fail(`video element error code ${video.error?.code}`);

    video.onloadedmetadata = () => {
      console.log(
        "[extractPosterFrame] loadedmetadata. duration=",
        video.duration,
        "size=",
        video.videoWidth,
        "x",
        video.videoHeight
      );
      try {
        const target = Math.min(1, (video.duration || 4) / 4);
        video.currentTime = target;
      } catch (e) {
        fail(`seek threw: ${e}`);
      }
    };

    video.onseeked = () => {
      console.log("[extractPosterFrame] seeked, drawing canvas");
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail("no 2d context");
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (out) => {
            clearTimeout(timeout);
            cleanup();
            if (!out) {
              console.warn("[extractPosterFrame] toBlob returned null");
            } else {
              console.log(
                "[extractPosterFrame] poster blob ready",
                out.size,
                "bytes"
              );
            }
            resolve(out);
          },
          "image/jpeg",
          0.85
        );
      } catch (e) {
        fail(`drawImage threw: ${e}`);
      }
    };
  });
}
