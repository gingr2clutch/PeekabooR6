import Link from "next/link";

// The two card shapes the restructured admin is built from.
//
// Both are whole-card links rather than a row with a small link in it. On a
// phone the tap target is the card, not a 40px "Manage →" at the end of a
// wrapping row — which is what the old list rows made you aim for.

const TAP =
  "block rounded-card border border-border bg-card transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

/**
 * Hub tile. One per section, with a count line so the hub answers "is there
 * anything waiting for me" without drilling in.
 *
 * `badge` is for work queues: pass a number and it renders only when > 0, so a
 * quiet section shows no pill at all rather than a "0" competing for attention.
 */
export function AdminHubCard({
  href,
  title,
  detail,
  badge,
  accent = "brand",
}: {
  href: string;
  title: string;
  detail: string;
  badge?: number;
  accent?: "brand" | "blue";
}) {
  const ring = accent === "blue" ? "hover:border-blue" : "hover:border-brand";
  const dot = accent === "blue" ? "bg-blue" : "bg-brand";

  return (
    <Link href={href} className={`${TAP} ${ring} p-4`}>
      <div className="flex items-center gap-3">
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="min-w-0 flex-1 text-base font-semibold text-ink">
          {title}
        </span>
        {badge != null && badge > 0 && (
          <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
            {badge}
          </span>
        )}
        <span aria-hidden className="shrink-0 text-muted">
          →
        </span>
      </div>
      <p className="mt-1.5 pl-5 text-sm text-muted">{detail}</p>
    </Link>
  );
}

/**
 * A row in a drill-down list — one map, one site, one peek.
 *
 * `meta` is the second line and `right` the trailing status pill. Destructive
 * actions are deliberately NOT accepted here: a whole-card link with a Delete
 * button inside it is a mis-tap waiting to happen, so those live on the item's
 * own screen.
 */
export function AdminListCard({
  href,
  title,
  meta,
  right,
  accent = "brand",
}: {
  href: string;
  title: string;
  meta?: React.ReactNode;
  right?: React.ReactNode;
  accent?: "brand" | "blue";
}) {
  const ring = accent === "blue" ? "hover:border-blue" : "hover:border-brand";

  return (
    <Link href={href} className={`${TAP} ${ring} px-4 py-3.5`}>
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{title}</span>
          {meta && (
            <span className="mt-0.5 block text-xs text-muted">{meta}</span>
          )}
        </span>
        {right}
        <span aria-hidden className="shrink-0 text-muted">
          →
        </span>
      </div>
    </Link>
  );
}

/** Small status pill. Neutral by default so colour means something when used. */
export function AdminPill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "bg-teal/10 text-teal"
      : tone === "warn"
        ? "bg-brand/10 text-brand"
        : "bg-ink/[0.06] text-muted";
  return (
    <span
      className={`shrink-0 rounded-btn px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}
