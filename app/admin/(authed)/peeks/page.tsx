import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import {
  bulkDeletePeeksAction,
  bulkSetPublishedAction,
  updatePeekFieldAction,
} from "./actions";
import {
  PeeksDashboardTable,
  type DashboardMap,
  type DashboardRow,
} from "./PeeksDashboardTable";

export const dynamic = "force-dynamic";

type JoinedPeek = {
  id: string;
  slug: string;
  name: string;
  difficulty: number;
  risk: "low" | "medium" | "high";
  success_rate: number;
  published: boolean;
  floors: {
    id: string;
    name: string;
    maps: { id: string; name: string; slug: string } | null;
  } | null;
};

async function loadPeeks(): Promise<JoinedPeek[]> {
  const { data, error } = await supabaseAdmin()
    .from("peeks")
    .select(
      "id, slug, name, difficulty, risk, success_rate, published, floors(id, name, maps(id, name, slug))"
    )
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as JoinedPeek[];
}

async function loadMaps(): Promise<DashboardMap[]> {
  const { data, error } = await supabaseAdmin()
    .from("maps")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DashboardMap[];
}

// Pull every /peeks/* page-view row and group by slug in memory. Fine for
// admin-page latency; once page_views gets big enough to matter, swap this
// for a Postgres view or a denormalized counter on peeks.
async function loadViewCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const { data, error } = await supabaseAdmin()
    .from("page_views")
    .select("path")
    .like("path", "/peeks/%");
  if (error) {
    console.warn("[admin/peeks] view-count query failed:", error.message);
    return counts;
  }
  for (const row of (data ?? []) as { path: string }[]) {
    const slug = row.path.slice("/peeks/".length);
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

export default async function AdminPeeksPage() {
  const [peeks, maps, viewCounts] = await Promise.all([
    loadPeeks(),
    loadMaps(),
    loadViewCounts(),
  ]);

  const rows: DashboardRow[] = peeks.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    difficulty: p.difficulty,
    risk: p.risk,
    success_rate: p.success_rate,
    view_count: viewCounts.get(p.slug) ?? 0,
    published: p.published,
    map: p.floors?.maps
      ? {
          id: p.floors.maps.id,
          name: p.floors.maps.name,
          slug: p.floors.maps.slug,
        }
      : null,
    floor: p.floors ? { id: p.floors.id, name: p.floors.name } : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Peeks</h1>
        <Link
          href="/admin/peeks/new"
          className="rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95"
        >
          + New peek
        </Link>
      </div>

      <PeeksDashboardTable
        initialRows={rows}
        maps={maps}
        updateField={updatePeekFieldAction}
        bulkSetPublished={bulkSetPublishedAction}
        bulkDelete={bulkDeletePeeksAction}
      />
    </div>
  );
}
