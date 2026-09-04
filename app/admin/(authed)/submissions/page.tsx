import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
} from "./actions";
import { CommunityCard, type Row as CommunityRow } from "./CommunityCard";

export const dynamic = "force-dynamic";

type Submission = {
  id: string;
  map_slug: string | null;
  floor_slug: string | null;
  pin_x: number | null;
  pin_y: number | null;
  location_description: string | null;
  peek_description: string | null;
  pro_tip: string | null;
  clip_url: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  status: string | null;
  created_at: string;
};


function formatDate(s: string | null): string {
  if (!s) return "\u2014";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

const STATUS_ORDER: Record<CommunityRow["status"], number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
};

type Params = { searchParams?: { tab?: string; published?: string } };

// Two queues on one page. The tab lives in the URL rather than client state so
// that a server action's revalidate — which re-renders the page from scratch —
// lands the reader back where they were instead of snapping to the default.
export default async function SubmissionsPage({ searchParams }: Params) {
  const tab = searchParams?.tab === "legacy" ? "legacy" : "community";
  const publishedId = searchParams?.published;
  const sb = supabaseAdmin();

  // Counts for both badges regardless of which tab is open; rows only for the
  // tab actually being rendered, so the idle queue costs one head request
  // rather than a full fetch.
  //
  // Every row in peek_submissions is pending by construction: that flow deletes
  // the row on both approve and reject, so a total count IS the pending count.
  const [communityCount, legacyCount] = await Promise.all([
    sb
      .from("community_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    sb.from("peek_submissions").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Submission queues">
          <TabLink
            href="/admin/submissions"
            label="Community"
            count={communityCount.count ?? 0}
            active={tab === "community"}
          />
          <TabLink
            href="/admin/submissions?tab=legacy"
            label="Legacy /submit"
            count={legacyCount.count ?? 0}
            active={tab === "legacy"}
          />
        </nav>
      </div>

      {publishedId && (
        <div className="rounded-card border border-teal/40 bg-teal/[0.06] p-3 text-sm text-ink">
          Peek created and submission approved.{" "}
          <Link
            href={`/admin/peeks/${publishedId}/edit`}
            className="font-medium text-brand hover:underline"
          >
            Open the peek →
          </Link>
        </div>
      )}

      {tab === "community" ? <CommunityTab /> : <LegacyTab />}
    </div>
  );
}

function TabLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-btn border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-brand bg-brand/[0.06] text-ink"
          : "border-border text-muted hover:border-brand hover:text-ink"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
          count > 0 ? "bg-brand text-white" : "bg-ink/[0.06] text-muted"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

/* ----------------------------- community ------------------------------- */

async function CommunityTab() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("community_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load submissions: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as CommunityRow[];
  // Pending first, then newest within each status. Done here because PostgREST
  // cannot order by a custom status ranking.
  rows.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.created_at.localeCompare(a.created_at)
  );

  // The bucket is private, so previews need signed URLs. Minted in one batch
  // and valid for an hour — long enough to work the queue, short enough that a
  // copied link does not stay live.
  const paths = rows.map((r) => r.file_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await sb.storage
      .from("submissions")
      .createSignedUrls(paths, 60 * 60);
    for (const u of urls ?? []) {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Clips and screenshots from the submit sections on the homepage and
        /gadgets. Approve and reject only set status for now — attaching an
        approved clip to a peek page is a later step.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-6 text-sm text-muted">
          No community submissions yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <CommunityCard
              key={r.id}
              r={r}
              previewUrl={r.file_path ? signed.get(r.file_path) : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- legacy -------------------------------- */

async function LegacyTab() {
  const { data, error } = await supabaseAdmin()
    .from("peek_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load submissions: {error.message}
      </div>
    );
  }

  const submissions = (data ?? []) as Submission[];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Pending peek submissions from the older /submit form. Approve creates a
        draft peek (published=false) you can finish in the Peeks dashboard.
        Reject deletes the submission.
      </p>
      {submissions.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-6 text-sm text-muted">
          No submissions right now.
        </p>
      ) : (
        <ul className="space-y-4">
          {submissions.map((s) => (
            <SubmissionCard key={s.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmissionCard({ s }: { s: Submission }) {
  const labelCls =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";
  const valueCls = "mt-0.5 text-sm text-ink whitespace-pre-wrap break-words";

  return (
    <li className="rounded-card border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          {formatDate(s.created_at)} · id {s.id.slice(0, 8)}…
        </span>
        <span className="inline-flex items-center rounded-btn border border-border bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">
          {s.status ?? "pending"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className={labelCls}>Map slug</div>
          <div className={`${valueCls} font-mono`}>{s.map_slug ?? "—"}</div>
        </div>
        <div>
          <div className={labelCls}>Floor slug</div>
          <div className={`${valueCls} font-mono`}>{s.floor_slug ?? "—"}</div>
        </div>
        <div className="sm:col-span-2">
          <div className={labelCls}>Location description</div>
          <div className={valueCls}>{s.location_description ?? "—"}</div>
        </div>
        <div className="sm:col-span-2">
          <div className={labelCls}>Peek description</div>
          <div className={valueCls}>{s.peek_description ?? "—"}</div>
        </div>
        <div className="sm:col-span-2">
          <div className={labelCls}>Pro tip</div>
          <div className={valueCls}>{s.pro_tip ?? "—"}</div>
        </div>
        <div className="sm:col-span-2">
          <div className={labelCls}>Clip URL</div>
          <div className={valueCls}>
            {s.clip_url ? (
              <a
                href={s.clip_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                {s.clip_url}
              </a>
            ) : (
              "—"
            )}
          </div>
        </div>
        <div>
          <div className={labelCls}>Pin (x, y)</div>
          <div className={`${valueCls} font-mono`}>
            {s.pin_x != null && s.pin_y != null
              ? `${s.pin_x}, ${s.pin_y}`
              : "—"}
          </div>
        </div>
        <div>
          <div className={labelCls}>Submitter</div>
          <div className={valueCls}>
            {s.submitter_name ?? "—"}
            {s.submitter_email && (
              <>
                {" "}
                ·{" "}
                <a
                  href={`mailto:${s.submitter_email}`}
                  className="text-brand hover:underline"
                >
                  {s.submitter_email}
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <form action={rejectSubmissionAction}>
          <input type="hidden" name="id" value={s.id} />
          <button
            type="submit"
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-red-400 hover:text-red-600"
          >
            Reject
          </button>
        </form>
        <form action={approveSubmissionAction}>
          <input type="hidden" name="id" value={s.id} />
          <button
            type="submit"
            className="rounded-btn bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Approve as draft
          </button>
        </form>
      </div>
    </li>
  );
}
