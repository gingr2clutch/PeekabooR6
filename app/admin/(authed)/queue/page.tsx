import Link from "next/link";
import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabase";
import { coverThumb } from "@/lib/cover-image";
import {
  projectReleaseDates,
  RELEASE_DAYS,
  scheduledRanToday,
} from "@/lib/queue";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  moveQueuedPeekAction,
  publishNowAction,
  removeFromQueueAction,
} from "./actions";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type QueuedRow = {
  id: string;
  name: string;
  slug: string;
  floors: {
    name: string | null;
    maps: { name: string | null; cover_image_url: string | null } | null;
  } | null;
};

type LogRow = {
  peek_name: string | null;
  peek_slug: string | null;
  source: string;
  published_at: string;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function AdminQueuePage() {
  const sb = supabaseAdmin();

  const { data: queuedData } = await sb
    .from("peeks")
    .select("id, name, slug, floors ( name, maps ( name, cover_image_url ) )")
    .eq("published", false)
    .not("queue_position", "is", null)
    .order("queue_position", { ascending: true });
  const queued = (queuedData ?? []) as unknown as QueuedRow[];

  // Projected dates: start tomorrow if today's scheduled release already fired,
  // otherwise from today. Display-only estimate.
  const ranToday = await scheduledRanToday();
  const now = new Date();
  const startFrom = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + (ranToday ? 1 : 0)
    )
  );
  const dates = projectReleaseDates(queued.length, startFrom);

  const { data: logData } = await sb
    .from("publish_log")
    .select("peek_name, peek_slug, source, published_at")
    .order("published_at", { ascending: false })
    .limit(15);
  const log = (logData ?? []) as LogRow[];

  const scheduleLabel = RELEASE_DAYS.map((d) => DAY_NAMES[d]).join(" / ");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Release queue</h1>
        <p className="mt-1 text-sm text-muted">
          Auto-publishes one peek every <strong>{scheduleLabel}</strong> at 16:00
          UTC. Queued peeks are hidden everywhere until released.{" "}
          <span className="text-ink">{queued.length} queued.</span>
        </p>
      </div>

      {queued.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-5 text-sm text-muted">
          Nothing queued. Create a peek with{" "}
          <strong>“Add to release queue”</strong> checked to line it up.
        </p>
      ) : (
        <ol className="space-y-3">
          {queued.map((peek, i) => {
            const floor = peek.floors;
            const map = floor?.maps ?? null;
            const cover = map?.cover_image_url ?? null;
            const date = dates[i];
            return (
              <li
                key={peek.id}
                className="flex items-center gap-3 rounded-card border border-border bg-card p-3 sm:gap-4 sm:p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {i + 1}
                </span>

                <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-btn border border-border bg-black sm:w-24">
                  {cover ? (
                    <Image
                      src={coverThumb(cover, 300)}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="placeholder-stripes h-full w-full" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {peek.name}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {[map?.name, floor?.name].filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-brand">
                    {date ? `Projected: ${fmtDate(date)}` : "Projected: —"}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    <form action={moveQueuedPeekAction}>
                      <input type="hidden" name="id" value={peek.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button
                        type="submit"
                        aria-label="Move up"
                        disabled={i === 0}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-btn border border-border text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveQueuedPeekAction}>
                      <input type="hidden" name="id" value={peek.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button
                        type="submit"
                        aria-label="Move down"
                        disabled={i === queued.length - 1}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-btn border border-border text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <Link
                      href={`/admin/peeks/${peek.id}/edit`}
                      className="inline-flex h-7 items-center rounded-btn border border-border px-2 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                    >
                      Edit
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <form action={publishNowAction}>
                      <input type="hidden" name="id" value={peek.id} />
                      <ConfirmButton
                        message={`Publish "${peek.name}" now? It will go live immediately and post to Discord.`}
                        className="inline-flex h-7 items-center rounded-btn bg-brand px-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand/90"
                      >
                        Publish now
                      </ConfirmButton>
                    </form>
                    <form action={removeFromQueueAction}>
                      <input type="hidden" name="id" value={peek.id} />
                      <ConfirmButton
                        message={`Remove "${peek.name}" from the queue? It stays an unpublished draft.`}
                        className="inline-flex h-7 items-center rounded-btn border border-border px-2 text-xs font-medium text-muted transition-colors hover:border-red-400 hover:text-red-600"
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Recently released
        </h2>
        {log.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No releases logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
            {log.map((row, i) => (
              <li
                key={`${row.peek_slug}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {row.peek_slug ? (
                    <Link
                      href={`/peeks/${row.peek_slug}`}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {row.peek_name ?? row.peek_slug}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">
                      {row.peek_name ?? "(deleted)"}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {row.source}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {new Date(row.published_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
