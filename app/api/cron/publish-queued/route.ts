import { NextResponse } from "next/server";
import { publishNextQueued } from "@/lib/queue";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Daily auto-publish job, triggered by GitHub Actions
// (.github/workflows/publish-queued.yml). Same auth as the snapshot job:
// requires `Authorization: Bearer <CRON_SECRET>`. Fails closed — if CRON_SECRET
// is unset, every request is 401. The release-day gate (Mon/Wed/Fri) lives in
// publishNextQueued(), so the job can run daily and no-op on off days.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await publishNextQueued();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
