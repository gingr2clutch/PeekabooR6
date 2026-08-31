import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PENDING_PREFIX } from "@/lib/submission-limits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// An upload lands in storage before its row is inserted, so any interruption in
// between — a closed tab, a failed insert, a caller who never submits — leaves
// an object with nothing pointing at it. Without this they accumulate forever.
//
// Protected by CRON_SECRET exactly like the other cron routes, and fails closed
// if the variable is unset. Note this is a destructive endpoint: it deletes
// storage objects, so it must never be reachable without the secret.

// Only sweep objects older than this. Generous on purpose — an upload that is
// mid-flight, or one whose row is a few seconds behind, must never be deleted
// out from under a live submission.
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  try {
    // Every path any row still points at. Checked against full paths rather
    // than filenames so the nested and flat key shapes both match correctly.
    const { data: rows, error: rowsErr } = await sb
      .from("community_submissions")
      .select("file_path")
      .not("file_path", "is", null);
    if (rowsErr) throw rowsErr;

    const referenced = new Set(
      ((rows ?? []) as { file_path: string | null }[])
        .map((r) => r.file_path)
        .filter((p): p is string => !!p)
    );

    // Uploads are one directory deep per IP hash, plus legacy objects sitting
    // flat at the top level, so both levels are walked.
    const { data: top, error: topErr } = await sb.storage
      .from("submissions")
      .list(PENDING_PREFIX, { limit: 1000 });
    if (topErr) throw topErr;

    const candidates: { path: string; created_at: string | null }[] = [];

    for (const entry of top ?? []) {
      // Supabase reports a folder as an entry with no id/metadata.
      const isFolder = !entry.id;
      if (isFolder) {
        const { data: inner } = await sb.storage
          .from("submissions")
          .list(`${PENDING_PREFIX}/${entry.name}`, { limit: 1000 });
        for (const o of inner ?? []) {
          if (!o.id) continue;
          candidates.push({
            path: `${PENDING_PREFIX}/${entry.name}/${o.name}`,
            created_at: o.created_at ?? null,
          });
        }
      } else {
        candidates.push({
          path: `${PENDING_PREFIX}/${entry.name}`,
          created_at: entry.created_at ?? null,
        });
      }
    }

    const cutoff = Date.now() - MIN_AGE_MS;
    const orphans = candidates
      .filter((c) => !referenced.has(c.path))
      .filter((c) => {
        const t = Date.parse(c.created_at ?? "");
        // Unknown age is treated as too young to touch — deleting something
        // that might be seconds old is far worse than sweeping it next run.
        return Number.isFinite(t) && t < cutoff;
      })
      .map((c) => c.path);

    if (orphans.length > 0) {
      const { error: delErr } = await sb.storage
        .from("submissions")
        .remove(orphans);
      if (delErr) throw delErr;
    }

    return NextResponse.json({
      ok: true,
      scanned: candidates.length,
      referenced: referenced.size,
      deleted: orphans.length,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
