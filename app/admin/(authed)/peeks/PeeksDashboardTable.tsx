"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import type { PeekType } from "@/lib/db";
import { PEEK_TYPES, PEEK_TYPE_ORDER } from "@/lib/peek-types";
import type {
  InlineField,
  InlineUpdateResult,
} from "./actions";

export type DashboardRow = {
  id: string;
  slug: string;
  name: string;
  difficulty: number;
  risk: "low" | "medium" | "high";
  success_rate: number;
  view_count: number;
  published: boolean;
  peek_type: PeekType | null;
  map: { id: string; name: string; slug: string } | null;
  floor: { id: string; name: string } | null;
};

export type DashboardMap = { id: string; name: string; slug: string };

type SortKey =
  | "map"
  | "floor"
  | "name"
  | "difficulty"
  | "risk"
  | "success_rate"
  | "view_count"
  | "published";

type Props = {
  initialRows: DashboardRow[];
  maps: DashboardMap[];
  filterMap: string;
  onFilterMapChange: (slug: string) => void;
  updateField: (
    id: string,
    field: InlineField,
    value: string | number | boolean
  ) => Promise<InlineUpdateResult>;
  bulkSetPublished: (
    ids: string[],
    published: boolean
  ) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;
  bulkDelete: (
    ids: string[]
  ) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;
};

type SortChoice = `${SortKey}:${"asc" | "desc"}`;

const SORT_CHOICES: Array<{ value: SortChoice; label: string }> = [
  { value: "success_rate:desc", label: "Success rate (high → low)" },
  { value: "success_rate:asc", label: "Success rate (low → high)" },
  { value: "name:asc", label: "Name (A → Z)" },
  { value: "name:desc", label: "Name (Z → A)" },
  { value: "view_count:desc", label: "Views (high → low)" },
  { value: "difficulty:desc", label: "Difficulty (hard → easy)" },
  { value: "difficulty:asc", label: "Difficulty (easy → hard)" },
  { value: "map:asc", label: "Map (A → Z)" },
  { value: "published:desc", label: "Status (published first)" },
];

const RISK_OPTIONS: Array<DashboardRow["risk"]> = ["low", "medium", "high"];
const DIFFICULTY_BUCKETS: Array<{
  label: string;
  value: number; // canonical int stored when the user picks this bucket
  matches: (n: number) => boolean;
}> = [
  { label: "Easy", value: 2, matches: (n) => n <= 2 },
  { label: "Medium", value: 3, matches: (n) => n === 3 },
  { label: "Hard", value: 4, matches: (n) => n >= 4 },
];

function bucketFor(n: number) {
  return (
    DIFFICULTY_BUCKETS.find((b) => b.matches(n)) ?? DIFFICULTY_BUCKETS[1]
  );
}

function cellKey(id: string, field: InlineField) {
  return `${id}:${field}`;
}

export function PeeksDashboardTable({
  initialRows,
  maps,
  filterMap,
  onFilterMapChange,
  updateField,
  bulkSetPublished,
  bulkDelete,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] =
    useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [savedFlash, setSavedFlash] = useState<Record<string, true>>({});
  const [errorFlash, setErrorFlash] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkBusy, startBulkTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterMap && r.map?.slug !== filterMap) return false;
      if (filterStatus === "published" && !r.published) return false;
      if (filterStatus === "draft" && r.published) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, filterMap, filterStatus, search]);

  const sorted = useMemo(() => {
    const cmp = (a: DashboardRow, b: DashboardRow): number => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "map":
          return (a.map?.name ?? "").localeCompare(b.map?.name ?? "") * dir;
        case "floor":
          return (a.floor?.name ?? "").localeCompare(b.floor?.name ?? "") * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "difficulty":
          return (a.difficulty - b.difficulty) * dir;
        case "risk": {
          const order = { low: 0, medium: 1, high: 2 } as const;
          return (order[a.risk] - order[b.risk]) * dir;
        }
        case "success_rate":
          return (a.success_rate - b.success_rate) * dir;
        case "view_count":
          return (a.view_count - b.view_count) * dir;
        case "published":
          return (Number(a.published) - Number(b.published)) * dir;
      }
    };
    return [...filtered].sort(cmp);
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function flashSaved(id: string, field: InlineField) {
    const key = cellKey(id, field);
    setSavedFlash((s) => ({ ...s, [key]: true }));
    window.setTimeout(() => {
      setSavedFlash((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    }, 1200);
  }

  function flashError(id: string, field: InlineField, message: string) {
    const key = cellKey(id, field);
    setErrorFlash((e) => ({ ...e, [key]: message }));
    window.setTimeout(() => {
      setErrorFlash((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }, 2400);
  }

  // Optimistic update: write to local state, then call the server. On
  // failure, restore the previous value and flash an error.
  async function commitField(
    id: string,
    field: InlineField,
    value: string | number | boolean
  ) {
    const before = rows.find((r) => r.id === id);
    if (!before) return;
    setRows((curr) =>
      curr.map((r) =>
        r.id === id ? ({ ...r, [field]: value } as DashboardRow) : r
      )
    );
    const res = await updateField(id, field, value);
    if (res.ok) {
      // Server might have normalized the value (e.g. clamped). Reflect it.
      setRows((curr) =>
        curr.map((r) =>
          r.id === id ? ({ ...r, [field]: res.value } as DashboardRow) : r
        )
      );
      flashSaved(id, field);
    } else {
      setRows((curr) => curr.map((r) => (r.id === id ? before : r)));
      flashError(id, field, res.error);
    }
  }

  function toggleRowSelected(id: string) {
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleIds = useMemo(() => sorted.map((r) => r.id), [sorted]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id));

  function toggleSelectAllVisible() {
    setSelected((curr) => {
      const next = new Set(curr);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function runBulkPublish(published: boolean) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startBulkTransition(async () => {
      const res = await bulkSetPublished(ids, published);
      if (res.ok) {
        setRows((curr) =>
          curr.map((r) => (selected.has(r.id) ? { ...r, published } : r))
        );
        setSelected(new Set());
      } else {
        alert(`Failed: ${res.error}`);
      }
    });
  }

  function runBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startBulkTransition(async () => {
      const res = await bulkDelete(ids);
      if (res.ok) {
        const removed = new Set(ids);
        setRows((curr) => curr.filter((r) => !removed.has(r.id)));
        setSelected(new Set());
        setConfirmDelete(false);
      } else {
        alert(`Failed: ${res.error}`);
        setConfirmDelete(false);
      }
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      {/* Filter / search row */}
      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4">
        <label className="text-xs text-muted">
          <span className="mb-1 block">Map</span>
          <select
            value={filterMap}
            onChange={(e) => onFilterMapChange(e.target.value)}
            className="min-w-[160px] rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="">All maps</option>
            {maps.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          <span className="mb-1 block">Status</span>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as typeof filterStatus)
            }
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          <span className="mb-1 block">Sort by</span>
          <select
            value={`${sortKey}:${sortDir}` as SortChoice}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":") as [
                SortKey,
                "asc" | "desc",
              ];
              setSortKey(k);
              setSortDir(d);
            }}
            className="min-w-[200px] rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
          >
            {SORT_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
            {/* Header-click sorts that aren't in the curated list still show
                up here as a transient option so the dropdown stays in sync. */}
            {!SORT_CHOICES.some(
              (c) => c.value === (`${sortKey}:${sortDir}` as SortChoice)
            ) && (
              <option value={`${sortKey}:${sortDir}`}>
                {sortKey} ({sortDir})
              </option>
            )}
          </select>
        </label>
        <label className="flex-1 text-xs text-muted">
          <span className="mb-1 block">Search by name</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. construction"
            className="w-full min-w-[180px] rounded-btn border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <div className="self-end text-xs text-muted">
          {sorted.length} of {rows.length}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand/40 bg-brand/[0.05] px-4 py-2.5 text-sm">
          <div className="font-medium text-ink">
            {selectedCount} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulkPublish(true)}
              className="rounded-btn border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-300 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulkPublish(false)}
              className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
            >
              Unpublish
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setConfirmDelete(true)}
              className="rounded-btn border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:border-red-300 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-btn px-2 py-1.5 text-xs text-muted transition-colors hover:text-brand"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
        >
          <div className="w-full max-w-sm rounded-card border border-border bg-card p-5 shadow-xl">
            <h2 className="text-base font-semibold">
              Delete {selectedCount} {selectedCount === 1 ? "peek" : "peeks"}?
            </h2>
            <p className="mt-2 text-sm text-muted">
              This cannot be undone. The peek pages and their videos
              metadata will be removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setConfirmDelete(false)}
                className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={runBulkDelete}
                className="rounded-btn border border-red-200 bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {bulkBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[1140px] text-sm">
          <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all visible peeks"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-border accent-brand"
                />
              </th>
              <Th label="Map" sortKey="map" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Floor" sortKey="floor" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Difficulty" sortKey="difficulty" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Risk" sortKey="risk" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-2 text-left">Type</th>
              <Th label="Success" sortKey="success_rate" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="Views" sortKey="view_count" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="Status" sortKey="published" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-2 text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted">
                  No peeks match those filters.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const isSel = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={`border-b border-border last:border-0 ${isSel ? "bg-brand/[0.04]" : ""}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name}`}
                      checked={isSel}
                      onChange={() => toggleRowSelected(r.id)}
                      className="h-4 w-4 rounded border-border accent-brand"
                    />
                  </td>
                  <td className="px-4 py-2 text-muted">{r.map?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-muted">{r.floor?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <InlineText
                      value={r.name}
                      flash={savedFlash[cellKey(r.id, "name")]}
                      error={errorFlash[cellKey(r.id, "name")]}
                      onCommit={(v) => commitField(r.id, "name", v)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <InlineDifficulty
                      value={r.difficulty}
                      flash={savedFlash[cellKey(r.id, "difficulty")]}
                      error={errorFlash[cellKey(r.id, "difficulty")]}
                      onCommit={(v) => commitField(r.id, "difficulty", v)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <InlineRisk
                      value={r.risk}
                      flash={savedFlash[cellKey(r.id, "risk")]}
                      error={errorFlash[cellKey(r.id, "risk")]}
                      onCommit={(v) => commitField(r.id, "risk", v)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <InlineType
                      value={r.peek_type ?? "spawn"}
                      flash={savedFlash[cellKey(r.id, "peek_type")]}
                      error={errorFlash[cellKey(r.id, "peek_type")]}
                      onCommit={(v) => commitField(r.id, "peek_type", v)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <InlineNumber
                      value={r.success_rate}
                      min={0}
                      max={100}
                      suffix="%"
                      flash={savedFlash[cellKey(r.id, "success_rate")]}
                      error={errorFlash[cellKey(r.id, "success_rate")]}
                      onCommit={(v) =>
                        commitField(r.id, "success_rate", v)
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">
                    {r.view_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <InlinePublished
                      value={r.published}
                      flash={savedFlash[cellKey(r.id, "published")]}
                      error={errorFlash[cellKey(r.id, "published")]}
                      onCommit={(v) =>
                        commitField(r.id, "published", v)
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/peeks/${r.id}/edit`}
                      className="rounded-btn border border-border px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  align?: "right";
}) {
  const isActive = current === sortKey;
  const arrow = isActive ? (dir === "asc" ? "▲" : "▼") : "";
  return (
    <th
      className={`px-4 py-2 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-brand ${isActive ? "text-ink" : ""}`}
      >
        <span>{label}</span>
        {arrow && <span className="text-[10px]">{arrow}</span>}
      </button>
    </th>
  );
}

// --- inline editors ---

function flashCls(flash?: boolean, error?: string) {
  if (error) return "ring-1 ring-red-300 bg-red-50/60";
  if (flash) return "ring-1 ring-emerald-300 bg-emerald-50/60";
  return "";
}

function InlineText({
  value,
  flash,
  error,
  onCommit,
}: {
  value: string;
  flash?: boolean;
  error?: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function start() {
    setEditing(true);
    window.setTimeout(() => ref.current?.focus(), 0);
  }
  function stop() {
    const next = ref.current?.value.trim() ?? "";
    setEditing(false);
    if (next && next !== value) onCommit(next);
  }

  return editing ? (
    <input
      ref={ref}
      defaultValue={value}
      onBlur={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          setEditing(false);
        }
      }}
      className={`w-full rounded-btn border border-brand/40 bg-card px-2 py-1 text-sm outline-none focus:border-brand ${flashCls(flash, error)}`}
    />
  ) : (
    <button
      type="button"
      title={error ?? "Click to edit"}
      onClick={start}
      className={`w-full rounded-btn px-2 py-1 text-left text-sm font-medium text-ink transition-colors hover:bg-bg ${flashCls(flash, error)}`}
    >
      {value}
    </button>
  );
}

function InlineNumber({
  value,
  min,
  max,
  suffix,
  flash,
  error,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  flash?: boolean;
  error?: string;
  onCommit: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function start() {
    setEditing(true);
    window.setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 0);
  }
  function stop() {
    const raw = Number(ref.current?.value ?? value);
    setEditing(false);
    if (!Number.isNaN(raw) && raw !== value) onCommit(raw);
  }

  return editing ? (
    <input
      ref={ref}
      type="number"
      min={min}
      max={max}
      defaultValue={value}
      onBlur={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") setEditing(false);
      }}
      className={`w-20 rounded-btn border border-brand/40 bg-card px-2 py-1 text-right text-sm outline-none focus:border-brand ${flashCls(flash, error)}`}
    />
  ) : (
    <button
      type="button"
      title={error ?? "Click to edit"}
      onClick={start}
      className={`inline-flex min-w-[3.5rem] justify-end rounded-btn px-2 py-1 text-sm tabular-nums text-ink transition-colors hover:bg-bg ${flashCls(flash, error)}`}
    >
      {value}
      {suffix}
    </button>
  );
}

function InlineDifficulty({
  value,
  flash,
  error,
  onCommit,
}: {
  value: number;
  flash?: boolean;
  error?: string;
  onCommit: (v: number) => void;
}) {
  const bucket = bucketFor(value);
  return (
    <select
      value={bucket.value}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (next !== bucket.value) onCommit(next);
      }}
      title={error ?? `Stored value: ${value}/5`}
      className={`rounded-btn border border-border bg-card px-2 py-1 text-sm outline-none focus:border-brand ${flashCls(flash, error)}`}
    >
      {DIFFICULTY_BUCKETS.map((b) => (
        <option key={b.value} value={b.value}>
          {b.label}
        </option>
      ))}
    </select>
  );
}

function InlineRisk({
  value,
  flash,
  error,
  onCommit,
}: {
  value: DashboardRow["risk"];
  flash?: boolean;
  error?: string;
  onCommit: (v: DashboardRow["risk"]) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = e.target.value as DashboardRow["risk"];
        if (next !== value) onCommit(next);
      }}
      title={error}
      className={`rounded-btn border border-border bg-card px-2 py-1 text-sm capitalize outline-none focus:border-brand ${flashCls(flash, error)}`}
    >
      {RISK_OPTIONS.map((r) => (
        <option key={r} value={r}>
          {r[0].toUpperCase() + r.slice(1)}
        </option>
      ))}
    </select>
  );
}

function InlineType({
  value,
  flash,
  error,
  onCommit,
}: {
  value: PeekType;
  flash?: boolean;
  error?: string;
  onCommit: (v: PeekType) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = e.target.value as PeekType;
        if (next !== value) onCommit(next);
      }}
      title={error ?? PEEK_TYPES[value].label}
      className={`rounded-btn border border-border bg-card px-2 py-1 text-center text-sm font-bold outline-none focus:border-brand ${flashCls(flash, error)}`}
    >
      {PEEK_TYPE_ORDER.map((t) => (
        <option key={t} value={t} title={PEEK_TYPES[t].label}>
          {PEEK_TYPES[t].letter}
        </option>
      ))}
    </select>
  );
}

function InlinePublished({
  value,
  flash,
  error,
  onCommit,
}: {
  value: boolean;
  flash?: boolean;
  error?: string;
  onCommit: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      title={error ?? "Click to toggle"}
      onClick={() => onCommit(!value)}
      className={`rounded-btn border px-2 py-0.5 text-xs font-medium transition-colors ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
          : "border-border bg-bg text-muted hover:border-brand hover:text-brand"
      } ${flashCls(flash, error)}`}
    >
      {value ? "Published" : "Draft"}
    </button>
  );
}
