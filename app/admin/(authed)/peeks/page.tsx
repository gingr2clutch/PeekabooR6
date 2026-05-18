import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import {
  bulkDeletePeeksAction,
  bulkSetPublishedAction,
  updatePeekFieldAction,
} from "./actions";
import { PeeksPageClient } from "./PeeksPageClient";
import type {
  CoverageFloor,
  CoveragePeek,
} from "./FloorCoverage";
import type { DashboardMap, DashboardRow } from "./PeeksDashboardTable";

export const dynamic = "force-dynamic";

type JoinedPeek = {
  id: string;
  slug: string;
  name: string;
  difficulty: number;
  risk: "low" | "medium" | "high";
  success_rate: number;
  published: boolean;
  x_pct: number;
  y_pct: number;
  peek_type?: "spawn" | "runout" | "mid_round" | null;
  floors: {
    id: string;
    name: string;
    maps: { id: string; name: string; slug: string } | null;
  } | null;
};

type FloorRow = {
  id: string;
  name: string;
  display_order: number;
  birds_eye_url: string | null;
  maps: { id: string; name: string; slug: string } | null;
};

async function loadPeeks(): Promise<JoinedPeek[]> {
  // Try with peek_type; if migration 013 hasn't been applied yet,
  // PostgREST returns 42703 — fall back to the legacy column set so the
  // admin list keeps rendering.
  const base =
    "id, slug, name, difficulty, risk, success_rate, published, x_pct, y_pct, floors(id, name, maps(id, name, slug))";
  const sb = supabaseAdmin();
  const first = await sb
    .from("peeks")
    .select(`${base}, peek_type`)
    .order("name", { ascending: true });
  if (!first.error) return (first.data ?? []) as unknown as JoinedPeek[];
  if (first.error.code !== "42703") throw first.error;
  console.warn(
    "[admin/peeks] peek_type column missing — falling back (run migration 013 to enable inline Type editor)"
  );
  const second = await sb
    .from("peeks")
    .select(base)
    .order("name", { ascending: true });
  if (second.error) throw second.error;
  return (second.data ?? []) as unknown as JoinedPeek[];
}

async function loadMaps(): Promise<DashboardMap[]> {
  const { data, error } = await supabaseAdmin()
    .from("maps")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DashboardMap[];
}

async function loadFloors(): Promise<FloorRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("floors")
    .select(
      "id, name, display_order, birds_eye_url, maps(id, name, slug)"
    )
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as FloorRow[];
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
  const [peeks, maps, floors, viewCounts] = await Promise.all([
    loadPeeks(),
    loadMaps(),
    loadFloors(),
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
    peek_type: p.peek_type ?? null,
    map: p.floors?.maps
      ? {
          id: p.floors.maps.id,
          name: p.floors.maps.name,
          slug: p.floors.maps.slug,
        }
      : null,
    floor: p.floors ? { id: p.floors.id, name: p.floors.name } : null,
  }));

  const coverageFloors: CoverageFloor[] = floors
    .filter((f) => f.maps)
    .map((f) => ({
      id: f.id,
      name: f.name,
      display_order: f.display_order,
      birds_eye_url: f.birds_eye_url,
      map: f.maps as { id: string; name: string; slug: string },
    }));

  const coveragePeeks: CoveragePeek[] = peeks
    .filter((p) => p.floors)
    .map((p) => ({
      id: p.id,
      name: p.name,
      x_pct: p.x_pct,
      y_pct: p.y_pct,
      published: p.published,
      floor_id: (p.floors as { id: string }).id,
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

      <PeeksPageClient
        initialRows={rows}
        maps={maps}
        coverageFloors={coverageFloors}
        coveragePeeks={coveragePeeks}
        updateField={updatePeekFieldAction}
        bulkSetPublished={bulkSetPublishedAction}
        bulkDelete={bulkDeletePeeksAction}
      />
    </div>
  );
}
