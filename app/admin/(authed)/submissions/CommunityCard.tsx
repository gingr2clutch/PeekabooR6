import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  approveCommunitySubmissionAction,
  deleteCommunitySubmissionAction,
  reopenCommunitySubmissionAction,
  rejectCommunitySubmissionAction,
} from "./community-actions";

// One row of the community queue. Split out of the page so the tab shell stays
// readable with two very different card layouts in it.

export type Row = {
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


function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}


export function CommunityCard({ r, previewUrl }: { r: Row; previewUrl?: string }) {
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
            {/* Only offered for peek submissions: the flow builds a peek, and
                there is no equivalent creation path for a gadget placement
                yet. Gadget rows keep plain approve/reject. */}
            {r.kind === "peek" && (
              <Link
                href={`/admin/submissions/${r.id}/publish`}
                className="rounded-btn bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-[#d95a0c]"
              >
                Edit &amp; publish
              </Link>
            )}
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
