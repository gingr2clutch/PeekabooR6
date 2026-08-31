import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  isAllowedSourceUrl,
} from "@/lib/submit-config";
import {
  RATE_LIMIT,
  RATE_WINDOW_MS,
  hashIp,
  splitStoragePath,
} from "@/lib/submission-limits";

export const dynamic = "force-dynamic";

// Strip anything that would let a display name break out of the text it is
// rendered into, and hold it to the demo's 24-character limit.
function cleanName(raw: string): string {
  return raw
    .replace(/[<>&"'`\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Bad request");
  }

  const kind = String(body.kind ?? "");
  if (kind !== "peek" && kind !== "gadget") return bad("Bad request");

  const map = String(body.map ?? "").trim().slice(0, 80);
  const spot_name = String(body.spot_name ?? "").trim().slice(0, 120);
  const submitter_name = cleanName(String(body.submitter_name ?? ""));
  if (!map || !spot_name || !submitter_name) {
    return bad("Map, spot name and your name are all required.");
  }

  const bomb_site = body.bomb_site
    ? String(body.bomb_site).trim().slice(0, 120)
    : null;
  const operator = body.operator
    ? String(body.operator).trim().slice(0, 80)
    : null;

  const rawUrl = body.source_url ? String(body.source_url).trim() : "";
  const source_url = rawUrl || null;
  const file_path = body.file_path ? String(body.file_path).trim() : null;

  // Step 1 promises a file OR a link. The table has the same rule as a check
  // constraint, so this is the friendly error rather than the only guard.
  if (!source_url && !file_path) {
    return bad("Add a clip or paste a link first.");
  }
  if (source_url && !isAllowedSourceUrl(source_url)) {
    return bad("Links must be from TikTok, YouTube or medal.tv.");
  }

  const sb = supabaseAdmin();

  // Verify the object that ACTUALLY landed, rather than trusting what the
  // client declared when it asked for the signed URL. A caller that lied about
  // type or size at that step fails here.
  if (file_path) {
    // Handles both key shapes: the nested pending/<hash>/<uuid> written now,
    // and the flat pending/<uuid> rows created before uploads were
    // attributable. Also rejects traversal.
    const parts = splitStoragePath(file_path);
    if (!parts) return bad("Bad request");
    const { dir, name } = parts;
    const { data: found, error: listErr } = await sb.storage
      .from("submissions")
      .list(dir, { search: name, limit: 1 });

    const obj = found?.find((o) => o.name === name);
    if (listErr || !obj) return bad("Upload not found. Try again.");

    const meta = (obj.metadata ?? {}) as { size?: number; mimetype?: string };
    if (typeof meta.size !== "number" || meta.size <= 0) {
      return bad("Upload not found. Try again.");
    }
    if (meta.size > MAX_UPLOAD_BYTES) return bad("Files must be under 50MB.", 413);
    if (
      meta.mimetype &&
      !(ALLOWED_MIME as readonly string[]).includes(meta.mimetype)
    ) {
      return bad("Only mp4, mov or png files are accepted.", 415);
    }
  }

  // Rate limit. Counted in the database rather than in memory because each
  // serverless invocation gets its own memory — an in-process counter would
  // reset constantly and never actually limit anything.
  const ip_hash = hashIp(req);
  if (ip_hash) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error: countErr } = await sb
      .from("community_submissions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash)
      .gte("created_at", since);
    if (!countErr && (count ?? 0) >= RATE_LIMIT) {
      return bad("You've submitted a few already — try again in an hour.", 429);
    }
  }

  const { error } = await sb.from("community_submissions").insert({
    kind,
    map,
    bomb_site,
    operator,
    spot_name,
    is_new_spot: body.is_new_spot === true,
    submitter_name,
    source_url,
    file_path,
    ip_hash,
  });

  if (error) {
    console.error("[api/submissions] insert failed:", error.message);
    return bad("Could not save that. Try again.", 500);
  }

  return NextResponse.json({ ok: true });
}
