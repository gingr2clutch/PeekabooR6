// Client-only helper. Issues an XHR PUT to a presigned R2 URL with progress
// reporting. Used by both the peek-video and floor-image uploaders so that
// large files never traverse the Next/Vercel runtime (which has a ~4.5 MB
// body-size cap on server actions).
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
