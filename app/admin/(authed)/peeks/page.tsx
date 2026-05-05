import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { supabaseAdmin } from "@/lib/supabase";
import { deletePeekAction, togglePublishedAction } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  difficulty: number;
  risk: string;
  published: boolean;
  floor_id: string;
  floors: {
    id: string;
    name: string;
    slug: string;
    map_id: string;
    maps: { id: string; name: string; slug: string } | null;
  } | null;
};

async function getPeeks(filters: {
  mapId?: string;
  floorId?: string;
}): Promise<Row[]> {
  let query = supabaseAdmin()
    .from("peeks")
    .select(
      "id, name, difficulty, risk, published, floor_id, floors!inner(id, name, slug, map_id, maps!inner(id, name, slug))"
    );
  if (filters.floorId) query = query.eq("floor_id", filters.floorId);
  if (filters.mapId) query = query.eq("floors.map_id", filters.mapId);

  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

async function getFilterOptions() {
  const { data: maps, error: mapsErr } = await supabaseAdmin()
    .from("maps")
    .select("id, name, slug")
    .order("name");
  if (mapsErr) throw mapsErr;
  const { data: floors, error: floorsErr } = await supabaseAdmin()
    .from("floors")
    .select("id, name, display_order, map_id")
    .order("display_order");
  if (floorsErr) throw floorsErr;
  return { maps: maps ?? [], floors: floors ?? [] };
}

export default async function AdminPeeksPage({
  searchParams,
}: {
  searchParams: { map?: string; floor?: string };
}) {
  const { maps, floors } = await getFilterOptions();
  const mapId = searchParams.map || undefined;
  const floorId = searchParams.floor || undefined;
  const filteredFloors = mapId
    ? floors.filter((f) => f.map_id === mapId)
    : floors;
  const peeks = await getPeeks({ mapId, floorId });

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

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4"
      >
        <label className="text-xs text-muted">
          <span className="mb-1 block">Map</span>
          <select
            name="map"
            defaultValue={mapId ?? ""}
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="">All maps</option>
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          <span className="mb-1 block">Floor</span>
          <select
            name="floor"
            defaultValue={floorId ?? ""}
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="">All floors</option>
            {filteredFloors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
        >
          Apply
        </button>
        {(mapId || floorId) && (
          <Link
            href="/admin/peeks"
            className="text-xs text-muted transition-colors hover:text-brand"
          >
            Clear filters
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 text-left">Peek</th>
              <th className="px-4 py-2 text-left">Map</th>
              <th className="px-4 py-2 text-left">Floor</th>
              <th className="px-4 py-2 text-left">Difficulty</th>
              <th className="px-4 py-2 text-left">Risk</th>
              <th className="px-4 py-2 text-left">Published</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {peeks.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-muted">
                  {p.floors?.maps?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted">
                  {p.floors?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted">{p.difficulty}/5</td>
                <td className="px-4 py-2 text-muted capitalize">{p.risk}</td>
                <td className="px-4 py-2">
                  <form action={togglePublishedAction} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="next"
                      value={p.published ? "off" : "on"}
                    />
                    <button
                      type="submit"
                      className={`rounded-btn border px-2 py-0.5 text-xs font-medium transition-colors ${
                        p.published
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                          : "border-border bg-bg text-muted hover:border-brand hover:text-brand"
                      }`}
                    >
                      {p.published ? "Published" : "Draft"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/peeks/${p.id}/edit`}
                      className="rounded-btn border border-border px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                    >
                      Edit
                    </Link>
                    <form action={deletePeekAction} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton
                        message={`Delete ${p.name}?`}
                        className="rounded-btn border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {peeks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  No peeks match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
