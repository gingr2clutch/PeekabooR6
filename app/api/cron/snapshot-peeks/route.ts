import { NextResponse } from "next/server";
import { captureDailySnapshots } from "@/lib/snapshots";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Snapshotting every peek can take a few seconds; give it room.
export const maxDuration = 60;

// Daily snapshot job, triggered by Vercel Cron (see vercel.json). Protected by
// CRON_SECRET: Vercel Cron automatically sends `Authorization: Bearer
// <CRON_SECRET>`, so a public request without it is rejected. Fails closed —
// if CRON_SECRET is unset, every request is 401.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await captureDailySnapshots();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
