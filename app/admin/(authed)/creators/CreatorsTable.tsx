import type { Creator } from "@/lib/db";

function statusOf(c: Creator): { label: string; cls: string } {
  if (c.approved_at) {
    return {
      label: "Approved",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (c.claimed_at) {
    return {
      label: "Pending approval",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  return {
    label: "Unclaimed",
    cls: "bg-bg text-muted border-border",
  };
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export function CreatorsTable({ creators }: { creators: Creator[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 text-left">Code</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Claimed</th>
            <th className="px-4 py-2 text-left">Approved</th>
            <th className="px-4 py-2 text-left">Created</th>
            <th className="px-4 py-2 text-left">Display name</th>
            <th className="px-4 py-2 text-left">TikTok</th>
          </tr>
        </thead>
        <tbody>
          {creators.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-muted"
              >
                No creators yet — click <span className="font-medium text-ink">+ Generate code</span> to create the first invite.
              </td>
            </tr>
          )}
          {creators.map((c) => {
            const s = statusOf(c);
            return (
              <tr
                key={c.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-2 font-mono font-medium text-ink">
                  {c.code}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center rounded-btn border px-2 py-0.5 text-xs font-medium ${s.cls}`}
                  >
                    {s.label}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted">
                  {formatDate(c.claimed_at)}
                </td>
                <td className="px-4 py-2 text-muted">
                  {formatDate(c.approved_at)}
                </td>
                <td className="px-4 py-2 text-muted">
                  {formatDate(c.created_at)}
                </td>
                <td className="px-4 py-2 text-muted">
                  {c.display_name ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted">
                  {c.tiktok ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
