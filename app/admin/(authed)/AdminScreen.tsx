import { AdminBackLink } from "./AdminBackLink";

// The frame every admin screen sits in.
//
// Replaces AdminNav. The old bar carried 6-8 links on every screen, which on a
// phone wrapped into three rows of chrome above the content. Here the only
// navigation on an inner screen is one back link to its parent, so the position
// in the hierarchy is legible and the header costs one line instead of four.
//
// Every screen passes `back`. There is no screen below the hub without a parent
// — that is the invariant that makes removing the nav safe.

type Props = {
  title: string;
  /** Parent screen. Label is what the parent is called, not "Back". */
  back: { href: string; label: string; accent?: "brand" | "blue" };
  /** Sub-line under the title. */
  subtitle?: React.ReactNode;
  /**
   * Primary action for the screen, e.g. "+ New peek". Full width on a phone so
   * it is reachable with a thumb, inline next to the title from sm:.
   */
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminScreen({ title, back, subtitle, action, children }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <AdminBackLink
          href={back.href}
          label={back.label}
          accent={back.accent}
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle && (
              <div className="mt-1 text-sm text-muted">{subtitle}</div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>

      {children}
    </div>
  );
}
