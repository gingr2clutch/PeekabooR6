import { supabaseAdmin } from "@/lib/supabase";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
} from "./actions";

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
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default async function SubmissionsPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
        <p className="mt-1 text-sm text-muted">
          Pending peek submissions from the public /submit form.
          Approve creates a draft peek (published=false) you can finish in
          the Peeks dashboard. Reject deletes the submission.
        </p>
      </div>

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
