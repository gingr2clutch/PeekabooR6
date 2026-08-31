import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/lib/submit-config";
import {
  PENDING_PREFIX,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  hashIp,
  pendingKey,
} from "@/lib/submission-limits";

export const dynamic = "force-dynamic";

// Step 2 of the upload path: the browser tells us what it intends to send, we
// check it, and hand back a signed URL scoped to one key.
//
// The bytes never pass through here — Vercel caps request bodies at ~4.5MB,
// far below these file sizes, so the client PUTs straight to Supabase Storage.
// This is a declared-intent check only; /api/submissions re-checks the object
// that actually landed, and the bucket enforces size and MIME independently.
export async function POST(req: Request) {
  let body: { filename?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const contentType = String(body.contentType ?? "");
  const size = Number(body.size ?? 0);

  if (!(ALLOWED_MIME as readonly string[]).includes(contentType)) {
    return NextResponse.json(
      { error: "Only mp4, mov or png files are accepted." },
      { status: 415 }
    );
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Files must be under 50MB." },
      { status: 413 }
    );
  }

  // Fail closed. Without an address the upload cannot be attributed, so
  // granting a URL would be an unmetered hole straight into storage.
  const ipHash = hashIp(req);
  if (!ipHash) {
    return NextResponse.json(
      { error: "Could not start the upload. Try again." },
      { status: 429 }
    );
  }

  const sb = supabaseAdmin();

  // Rate limit BEFORE minting, counting objects rather than database rows. The
  // abuse case is requesting URLs and uploading files without ever submitting,
  // which creates no rows at all — so a row count would never trip. Listing
  // this caller's own prefix counts exactly what they have uploaded.
  const { data: recent, error: listErr } = await sb.storage
    .from("submissions")
    .list(`${PENDING_PREFIX}/${ipHash}`, { limit: 100 });

  if (!listErr && recent) {
    const cutoff = Date.now() - RATE_WINDOW_MS;
    const inWindow = recent.filter((o) => {
      const t = Date.parse(o.created_at ?? "");
      return Number.isFinite(t) && t >= cutoff;
    }).length;
    if (inWindow >= RATE_LIMIT) {
      return NextResponse.json(
        { error: "You've uploaded a few already — try again in an hour." },
        { status: 429 }
      );
    }
  }

  // The key is ours, never the client's: a caller-supplied path could escape
  // the prefix or overwrite someone else's pending upload.
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "video/quicktime"
        ? "mov"
        : "mp4";
  const MINT_PREFIX = `${PENDING_PREFIX}/${ipHash}/`;
  const path = pendingKey(ipHash, crypto.randomUUID(), ext);

  // Record the mint itself, not just the eventual upload. Counting objects
  // alone leaves a hole: a caller could request a thousand URLs first, while
  // the count is still zero, and only then upload to all of them. A zero-byte
  // marker makes each mint immediately visible to the check above.
  //
  // Declared image/png because the bucket enforces a MIME allowlist — a
  // text/plain marker is rejected, which silently defeated the whole limit
  // until the error below was checked. Markers are never referenced by a row,
  // so the sweep collects them like any other orphan once they age out.
  const { error: markErr } = await sb.storage
    .from("submissions")
    .upload(
      `${MINT_PREFIX}${crypto.randomUUID()}.png`,
      // The type must be on the Blob, not only in the options: an untyped Blob
      // is inferred as application/octet-stream and the bucket rejects it.
      new Blob([], { type: "image/png" }),
      { contentType: "image/png" }
    );
  if (markErr) {
    // Fail closed: if the mint cannot be recorded, the limit cannot be
    // enforced, and handing out a URL anyway is the unmetered case again.
    return NextResponse.json(
      { error: "Could not start the upload. Try again." },
      { status: 503 }
    );
  }

  const { data, error } = await sb.storage
    .from("submissions")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not start the upload. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
