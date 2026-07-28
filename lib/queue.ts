import { supabaseAdmin } from "./supabase";
import { postPeekToDiscord } from "./discord";

// ---------------------------------------------------------------------------
// Release schedule config — change these to retune.
//   RELEASE_DAYS: UTC weekday numbers (Sun=0 … Sat=6) the scheduler publishes on.
//   Time of day:  the GitHub Actions cron in .github/workflows/publish-queued.yml
//                 (currently 16:00 UTC). The app only gates by day; the workflow
//                 controls the hour.
// ---------------------------------------------------------------------------
export const RELEASE_DAYS = [1, 3, 5]; // Mon, Wed, Fri

export type PublishSource = "scheduler" | "admin";

type QueuedPeek = { id: string; name: string; slug: string };

function utcMidnight(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Whether a scheduler publish already happened today (UTC). The idempotency
// guard: if the daily job somehow runs twice, the second run no-ops.
export async function scheduledRanToday(): Promise<boolean> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("publish_log")
    .select("id")
    .eq("source", "scheduler")
    .gte("published_at", utcMidnight().toISOString())
    .limit(1);
  if (error) {
    // Fail safe: if we can't verify, treat as "already ran" so we never risk a
    // double-publish.
    console.error("[queue] idempotency check failed:", error);
    return true;
  }
  return (data?.length ?? 0) > 0;
}

async function nextQueuedPeek(): Promise<QueuedPeek | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("peeks")
    .select("id, name, slug")
    .eq("published", false)
    .not("queue_position", "is", null)
    .order("queue_position", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as QueuedPeek | null) ?? null;
}

// Publish a specific peek NOW (admin "Publish now" or the scheduler): flip it to
// published, clear its queue slot, log the release, and fire the (best-effort)
// Discord announce. Discord posting never throws, so a webhook outage can't
// block the publish.
export async function publishPeekNow(
  peekId: string,
  source: PublishSource
): Promise<{ ok: boolean; peek?: QueuedPeek }> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("peeks")
    .update({ published: true, queue_position: null })
    .eq("id", peekId)
    .select("id, name, slug")
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false };
  const peek = data as QueuedPeek;

  await sb.from("publish_log").insert({
    peek_id: peek.id,
    peek_name: peek.name,
    peek_slug: peek.slug,
    source,
  });

  await postPeekToDiscord(peek.id); // best-effort; never throws
  return { ok: true, peek };
}

export type PublishRunResult =
  | { published: false; reason: string; day: number }
  | { published: true; peek: QueuedPeek; day: number };

// Daily scheduler entrypoint. Quietly no-ops on non-release days, when the queue
// is empty, or if it already ran today.
export async function publishNextQueued(): Promise<PublishRunResult> {
  const day = new Date().getUTCDay();
  if (!RELEASE_DAYS.includes(day)) {
    return { published: false, reason: "not a release day", day };
  }
  if (await scheduledRanToday()) {
    return { published: false, reason: "already ran today", day };
  }
  const next = await nextQueuedPeek();
  if (!next) {
    return { published: false, reason: "queue empty", day };
  }
  const res = await publishPeekNow(next.id, "scheduler");
  if (!res.ok || !res.peek) {
    return { published: false, reason: "publish failed", day };
  }
  return { published: true, peek: res.peek, day };
}

// Projected release dates for the admin queue view (display only): the next
// `count` release-day dates starting from `from` (UTC), one release per day.
export function projectReleaseDates(count: number, from = new Date()): Date[] {
  const out: Date[] = [];
  const d = utcMidnight(from);
  // Safety bound so a misconfigured RELEASE_DAYS can't loop forever.
  for (let i = 0; i < 400 && out.length < count; i++) {
    if (RELEASE_DAYS.includes(d.getUTCDay())) out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
