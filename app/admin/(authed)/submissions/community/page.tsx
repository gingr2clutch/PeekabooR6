import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { supabaseAdmin } from "@/lib/supabase";
import {
  approveCommunitySubmissionAction,
  deleteCommunitySubmissionAction,
  reopenCommunitySubmissionAction,
  rejectCommunitySubmissionAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  created_at: string;
  kind: "peek" | "gadget";
  map: string;
  bomb_site: string | null;
  operator: string | null;
  spot_name: string;
  is_new_spot: boolean;
  submitter_name: string;
  source_url: string | null;
  file_path: string | null;
  status: "pending" | "approved" | "rejected";
};

const STATUS_ORDER: Record<Row["status"], number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
};

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default async function CommunitySubmissionsPage() {
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

  const rows = (data ?? []) as Row[];
  // Pending first, then newest within each status. Done here rather than in the
  // query because PostgREST cannot order by a custom status ranking.
  rows.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.created_at.localeCompare(a.created_at)
  );

  // The bucket is private, so previews need signed URLs. Minted in one batch
  // here and valid for an hour — long enough to work through the queue, short
  // enough that a copied link does not stay live.
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

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/submissions"
          className="text-sm text-muted hover:text-brand"
        >
          ← Peek submissions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Community submissions
        </h1>
        <p className="mt-1 text-sm text-muted">
          Clips and screenshots from the submit sections on the homepage and
          /gadgets. {pending} pending of {rows.length}. Approve and reject only
          set status for now — attaching an approved clip to a peek page is a
          later step.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-6 text-sm text-muted">
          No community submissions yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <Card
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

function Card({ r, previewUrl }: { r: Row; previewUrl?: string }) {
  const labelCls =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";
  const valueCls = "mt-0.5 text-sm text-ink break-words";
  const isImage = !!r.file_path?.endsWith(".png");

  const statusCls =
    r.status === "pending"
      ? "bg-brand/10 text-brand"
      : r.status === "approved"
        ? "bg-teal/10 text-teal"
        : "bg-ink/[0.06] text-muted";

  return (
    <li className="rounded-card border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-btn px-2 py-0.5 text-[11px] font-semibold ${
            r.kind === "gadget" ? "bg-blue/10 text-blue" : "bg-brand/10 text-brand"
          }`}
        >
          {r.kind}
        </span>
        <span className={`rounded-btn px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}>
          {r.status}
        </span>
        {r.is_new_spot && (
          <span className="rounded-btn bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink">
            FIRST FIND
          </span>
        )}
        <span className="ml-auto text-xs text-muted">
          {formatDate(r.created_at)} · id {r.id.slice(0, 8)}…
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className={labelCls}>Spot</div>
          <div className={`${valueCls} font-medium`}>{r.spot_name}</div>
        </div>
        <div>
          <div className={labelCls}>Submitted by</div>
          <div className={valueCls}>{r.submitter_name}</div>
        </div>
        <div>
          <div className={labelCls}>Map</div>
          <div className={valueCls}>{r.map}</div>
        </div>
        <div>
          <div className={labelCls}>
            {r.kind === "gadget" ? "Bomb site / operator" : "Location"}
          </div>
          <div className={valueCls}>
            {r.kind === "gadget"
              ? [r.bomb_site, r.operator].filter(Boolean).join(" · ") || "—"
              : "—"}
          </div>
        </div>
      </div>

      {/* Preview. A signed URL for uploads, since the bucket is private; a
          plain link for pasted sources, which we deliberately do not embed —
          an iframe would run third-party script inside the admin. */}
      <div className="mt-4">
        <div className={labelCls}>Preview</div>
        {previewUrl ? (
          isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="mt-1.5 max-h-64 rounded-inner border border-border"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              preload="metadata"
              className="mt-1.5 max-h-64 w-full max-w-md rounded-inner border border-border bg-black"
            />
          )
        ) : r.source_url ? (
          <a
            href={r.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 block break-all text-sm text-brand hover:underline"
          >
            {r.source_url}
          </a>
        ) : (
          <div className={valueCls}>—</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {r.status === "pending" ? (
          <>
            <form action={approveCommunitySubmissionAction}>
              <input type="hidden" name="id" value={r.id} />
              <button className="rounded-btn bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-brand">
                Approve
              </button>
            </form>
            <form action={rejectCommunitySubmissionAction}>
              <input type="hidden" name="id" value={r.id} />
              <button className="rounded-btn border border-border px-3 py-1.5 text-sm text-ink hover:border-brand hover:text-brand">
                Reject
              </button>
            </form>
          </>
        ) : (
          <form action={reopenCommunitySubmissionAction}>
            <input type="hidden" name="id" value={r.id} />
            <button className="rounded-btn border border-border px-3 py-1.5 text-sm text-ink hover:border-brand hover:text-brand">
              Back to pending
            </button>
          </form>
        )}

        {/* Separate from reject: rejecting keeps the record, this destroys it
            and the uploaded file. */}
        <form action={deleteCommunitySubmissionAction} className="ml-auto">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="file_path" value={r.file_path ?? ""} />
          <ConfirmButton
            message={`Delete this submission from ${r.submitter_name}? The uploaded file goes with it. This cannot be undone.`}
            className="rounded-btn border border-border px-3 py-1.5 text-sm text-muted hover:border-brand hover:text-brand"
          >
            Delete
          </ConfirmButton>
        </form>
      </div>
    </li>
  );
}
