import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { CopyCleanupList, type CopyRow } from "./CopyCleanupList";

// Same as every other admin page: read live on each request, never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Copy cleanup",
  robots: { index: false, follow: false },
};

// Admin-only proofreading view: every peek's instructions and tip on one
// scrollable page, so typos can be fixed in a single pass instead of opening
// each peek's edit form. Writes go through updatePeekFieldAction — the same
// inline-update path and validation the peeks dashboard already uses.
//
// Auth is the existing /admin/* cookie gate in middleware.ts; this page adds
// none of its own. Nothing public is touched.

type JoinedPeek = {
  id: string;
  slug: string;
  name: string;
  instructions: string[] | null;
  tip: string | null;
  floors: { name: string; maps: { name: string } | null } | null;
};

async function loadPeeks(): Promise<CopyRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("peeks")
    .select("id, slug, name, instructions, tip, floors(name, maps(name))")
    .order("name", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as JoinedPeek[];
  return rows
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      mapName: p.floors?.maps?.name ?? "—",
      floorName: p.floors?.name ?? "—",
      instructions: (p.instructions ?? []).join("\n"),
      tip: p.tip ?? "",
    }))
    // Grouped by map, then floor, then name, so a read-through follows the
    // same order as the site rather than one flat alphabetical list.
    .sort(
      (a, b) =>
        a.mapName.localeCompare(b.mapName) ||
        a.floorName.localeCompare(b.floorName) ||
        a.name.localeCompare(b.name)
    );
}

export default async function CopyCleanupPage() {
  const rows = await loadPeeks();
  const withTip = rows.filter((r) => r.tip.trim()).length;
  const withSteps = rows.filter((r) => r.instructions.trim()).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Copy cleanup
      </h1>
      <p className="mt-2 text-sm text-muted">
        Every peek&apos;s instructions and tip, in map order. Edits save on blur
        (or hit Save); each field writes through the same update path as the
        peeks dashboard.
      </p>
      <p className="mt-1 text-sm text-muted">
        {rows.length} peeks · {withSteps} with instructions · {withTip} with a
        tip
      </p>

      <div className="mt-8">
        {rows.length === 0 ? (
          <p className="rounded-card border border-border bg-card p-4 text-sm text-muted">
            No peeks yet.
          </p>
        ) : (
          <CopyCleanupList rows={rows} />
        )}
      </div>
    </main>
  );
}
