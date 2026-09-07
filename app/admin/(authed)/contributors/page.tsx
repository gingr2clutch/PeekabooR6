import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminPill } from "../AdminCards";
import { AdminScreen } from "../AdminScreen";
import {
  deleteContributorAction,
  mergeContributorsAction,
  toggleContributorHiddenAction,
  updateContributorAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contributors",
  robots: { index: false, follow: false },
};

// Contributor maintenance.
//
// There is no "add" form, and that is the design: a contributor is created by
// attaching credit to a submission, which is the moment an admin decides who
// somebody is. Creating one here would make an empty row with nothing to rank.
//
// What this screen is for is everything that happens after that — a name typed
// wrong during approval, one person split across two rows, someone who asked
// not to be listed.

type Row = {
  id: string;
  slug: string;
  display_name: string;
  link_url: string | null;
  is_hidden: boolean;
  created_at: string;
};

const input =
  "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";

export default async function AdminContributorsPage() {
  const sb = supabaseAdmin();

  const [peopleRes, creditsRes] = await Promise.all([
    sb
      .from("contributors")
      .select("id, slug, display_name, link_url, is_hidden, created_at")
      .order("display_name", { ascending: true }),
    // Credit counts per contributor, split by kind, so a row can say what it
    // would cost to delete before you click.
    sb
      .from("community_submissions")
      .select("contributor_id, kind, status")
      .not("contributor_id", "is", null),
  ]);
  if (peopleRes.error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load contributors: {peopleRes.error.message}
      </div>
    );
  }

  const people = (peopleRes.data ?? []) as Row[];
  const credits = new Map<string, { total: number; approved: number }>();
  for (const c of (creditsRes.data ?? []) as {
    contributor_id: string;
    status: string;
  }[]) {
    const t = credits.get(c.contributor_id) ?? { total: 0, approved: 0 };
    t.total += 1;
    if (c.status === "approved") t.approved += 1;
    credits.set(c.contributor_id, t);
  }

  return (
    <AdminScreen
      title="Contributors"
      back={{ href: "/admin/home", label: "Admin" }}
      subtitle={`${people.length} contributor${
        people.length === 1 ? "" : "s"
      } · created by attaching credit in the submissions queue`}
    >
      <p className="rounded-card border border-brand/30 bg-brand/[0.06] p-3 text-xs text-ink">
        Only <b>approved</b> credits appear on the public leaderboard. Deleting
        a contributor who still holds credit would strip that attribution
        silently, so it is blocked — merge or hide instead.
      </p>

      {people.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-6 text-sm text-muted">
          No contributors yet. Attach credit to a submission in{" "}
          <Link href="/admin/submissions" className="text-brand hover:underline">
            the queue
          </Link>{" "}
          and they will appear here.
        </p>
      ) : (
        <ul className="space-y-3">
          {people.map((p) => {
            const c = credits.get(p.id) ?? { total: 0, approved: 0 };
            const others = people.filter((o) => o.id !== p.id);
            return (
              <li
                key={p.id}
                className="rounded-card border border-border bg-card p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <AdminPill tone={p.is_hidden ? "muted" : "good"}>
                    {p.is_hidden ? "Hidden" : "Listed"}
                  </AdminPill>
                  <span className="text-xs text-muted">
                    {c.approved} on the board · {c.total} credit
                    {c.total === 1 ? "" : "s"} total
                  </span>
                  {!p.is_hidden && (
                    <Link
                      href={`/contributors/${p.slug}`}
                      target="_blank"
                      className="ml-auto text-xs text-brand hover:underline"
                    >
                      View profile →
                    </Link>
                  )}
                </div>

                <form action={updateContributorAction} className="space-y-3">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="block text-xs text-muted">
                    <span className="mb-1 block">Display name</span>
                    <input
                      name="display_name"
                      defaultValue={p.display_name}
                      required
                      maxLength={60}
                      className={input}
                    />
                  </label>
                  <label className="block text-xs text-muted">
                    <span className="mb-1 block">
                      Slug — this is their public URL
                    </span>
                    <input name="slug" defaultValue={p.slug} className={input} />
                    <span className="mt-1 block text-[11px] text-muted">
                      /contributors/{p.slug} · changing this breaks any link
                      already shared. Leave blank to rebuild it from the name.
                    </span>
                  </label>
                  <label className="block text-xs text-muted">
                    <span className="mb-1 block">Link (optional)</span>
                    <input
                      name="link_url"
                      defaultValue={p.link_url ?? ""}
                      placeholder="https://twitch.tv/name"
                      className={input}
                    />
                  </label>
                  <button className="w-full rounded-btn border border-border px-3 py-2 text-sm text-ink hover:border-brand hover:text-brand sm:w-auto">
                    Save
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <form action={toggleContributorHiddenAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="hidden"
                      value={p.is_hidden ? "false" : "true"}
                    />
                    <button className="rounded-btn border border-border px-3 py-1.5 text-xs text-ink hover:border-brand hover:text-brand">
                      {p.is_hidden ? "Show on leaderboard" : "Hide"}
                    </button>
                  </form>

                  {/* Blocked while they hold credit — the FK is ON DELETE SET
                      NULL, so the database would allow it and quietly wipe the
                      attribution. */}
                  <form action={deleteContributorAction} className="sm:ml-auto">
                    <input type="hidden" name="id" value={p.id} />
                    {c.total > 0 ? (
                      <span
                        title={`${p.display_name} holds ${c.total} credit(s). Merge or hide instead.`}
                        className="inline-block cursor-not-allowed rounded-btn border border-border px-3 py-1.5 text-xs text-muted opacity-50"
                      >
                        Delete
                      </span>
                    ) : (
                      <ConfirmButton
                        message={`Delete ${p.display_name}? They hold no credit, so nothing is lost.`}
                        className="rounded-btn border border-border px-3 py-1.5 text-xs text-muted hover:border-brand hover:text-brand"
                      >
                        Delete
                      </ConfirmButton>
                    )}
                  </form>
                </div>

                {/* Merge. The repair for the split-credit typo the attach
                    field warns about. Hidden when there is nobody to merge
                    into, so a one-person list is not cluttered by it. */}
                {others.length > 0 && c.total > 0 && (
                  <form
                    action={mergeContributorsAction}
                    className="mt-3 space-y-2 border-t border-border pt-3"
                  >
                    <input type="hidden" name="from_id" value={p.id} />
                    <label className="block text-xs text-muted">
                      <span className="mb-1 block">
                        Merge {p.display_name}&rsquo;s {c.total} credit
                        {c.total === 1 ? "" : "s"} into
                      </span>
                      <select name="to_id" className={input} defaultValue="">
                        <option value="" disabled>
                          Pick a contributor…
                        </option>
                        {others.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ConfirmButton
                      message={`Move every credit from ${p.display_name} to the selected contributor, then delete ${p.display_name}? This cannot be undone.`}
                      className="w-full rounded-btn border border-border px-3 py-2 text-sm text-ink hover:border-brand hover:text-brand sm:w-auto"
                    >
                      Merge &amp; delete
                    </ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminScreen>
  );
}
