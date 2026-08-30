import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/lib/submit-config";

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

  // The key is ours, never the client's: a caller-supplied path could escape
  // the prefix or overwrite someone else's pending upload.
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "video/quicktime"
        ? "mov"
        : "mp4";
  const path = `pending/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabaseAdmin()
    .storage.from("submissions")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not start the upload. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
