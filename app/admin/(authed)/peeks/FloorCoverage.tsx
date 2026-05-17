"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export type CoverageFloor = {
  id: string;
  name: string;
  display_order: number;
  birds_eye_url: string | null;
  map: { id: string; name: string; slug: string };
};

export type CoveragePeek = {
  id: string;
  name: string;
  x_pct: number;
  y_pct: number;
  published: boolean;
  floor_id: string;
};

type Props = {
  floors: CoverageFloor[];
  peeks: CoveragePeek[];
  filterMap: string; // "" = all maps; otherwise map slug
};

// A peek lands at exactly (50, 50) when the admin saves it without
// touching the pin placer. The schema requires non-null coordinates, so
// this default-center sentinel is what "unplaced" means in practice.
function isUnplaced(p: { x_pct: number; y_pct: number }): boolean {
  return p.x_pct === 50 && p.y_pct === 50;
}

export function FloorCoverage({ floors, peeks, filterMap }: Props) {
  const [open, setOpen] = useState(false);

  const peeksByFloor = useMemo(() => {
    const map = new Map<string, CoveragePeek[]>();
    for (const p of peeks) {
      const bucket = map.get(p.floor_id);
      if (bucket) bucket.push(p);
      else map.set(p.floor_id, [p]);
    }
    return map;
  }, [peeks]);

  const groups = useMemo(() => {
    const visibleFloors = filterMap
      ? floors.filter((f) => f.map.slug === filterMap)
      : floors;
    // Group by map. For a single-map filter that's one group; for "all maps"
    // the admin can scan each map's coverage independently.
    const byMap = new Map<
      string,
      { map: CoverageFloor["map"]; floors: CoverageFloor[] }
    >();
    for (const f of visibleFloors) {
      const g = byMap.get(f.map.id);
      if (g) g.floors.push(f);
      else byMap.set(f.map.id, { map: f.map, floors: [f] });
    }
    const groupArr = Array.from(byMap.values());
    for (const g of groupArr) {
      g.floors.sort((a, b) => a.display_order - b.display_order);
    }
    groupArr.sort((a, b) => a.map.name.localeCompare(b.map.name));
    return groupArr;
  }, [floors, filterMap]);

  const totalFloors = groups.reduce((s, g) => s + g.floors.length, 0);

  return (
    <section className="rounded-card border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Chevron open={open} />
          <span className="text-sm font-semibold text-ink">
            Floor coverage
          </span>
          <span className="text-xs text-muted">
            {filterMap
              ? `${totalFloors} ${totalFloors === 1 ? "floor" : "floors"} on this map`
              : `${totalFloors} ${totalFloors === 1 ? "floor" : "floors"} across ${groups.length} ${groups.length === 1 ? "map" : "maps"}`}
          </span>
        </div>
        <div className="hidden items-center gap-3 text-[11px] uppercase tracking-wide text-muted sm:flex">
          <LegendDot className="bg-emerald-500" /> Published
          <LegendDot className="bg-amber-500" /> Draft
        </div>
      </button>

      {open && (
        <div className="space-y-6 border-t border-border px-4 py-4">
          {groups.length === 0 && (
            <p className="text-sm text-muted">
              No floors match the current map filter.
            </p>
          )}
          {groups.map((g) => (
            <div key={g.map.id} className="space-y-3">
              {!filterMap && (
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {g.map.name}
                </h3>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.floors.map((floor) => (
                  <FloorCard
                    key={floor.id}
                    floor={floor}
                    peeks={peeksByFloor.get(floor.id) ?? []}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FloorCard({
  floor,
  peeks,
}: {
  floor: CoverageFloor;
  peeks: CoveragePeek[];
}) {
  const liveCount = peeks.filter((p) => p.published).length;
  const draftCount = peeks.length - liveCount;
  const unplaced = peeks.filter(isUnplaced);
  const placed = peeks.filter((p) => !isUnplaced(p));

  return (
    <div className="space-y-2 rounded-card border border-border bg-bg p-3">
      <div className="text-sm font-semibold text-ink">{floor.name}</div>
      <div className="text-[11px] text-muted">
        {peeks.length} {peeks.length === 1 ? "peek" : "peeks"} ·{" "}
        <span className="text-emerald-700">{liveCount} live</span> ·{" "}
        <span className="text-amber-700">{draftCount} draft</span>
        {unplaced.length > 0 && (
          <>
            {" "}
            ·{" "}
            <span className="text-red-700">
              {unplaced.length} with no pin placed
            </span>
          </>
        )}
      </div>

      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner border border-border bg-card">
        {floor.birds_eye_url ? (
          <Image
            src={floor.birds_eye_url}
            alt={`${floor.map.name} ${floor.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="placeholder-stripes absolute inset-0 flex items-center justify-center">
            <span className="rounded-btn bg-card/80 px-2 py-1 text-[11px] text-muted backdrop-blur-sm">
              No bird's-eye uploaded
            </span>
          </div>
        )}
        {placed.map((p) => (
          <span
            key={p.id}
            title={`${p.name} — ${p.published ? "Published" : "Draft"}`}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
          >
            <span
              className={`block h-2.5 w-2.5 rounded-full ring-2 ring-white shadow ${
                p.published ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
        ))}
      </div>

      {unplaced.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
            Unplaced — needs a pin
          </div>
          <ul className="space-y-1">
            {unplaced.map((p) => (
              <li key={p.id} className="text-xs">
                <Link
                  href={`/admin/peeks/${p.id}/edit`}
                  className="text-ink underline decoration-dotted underline-offset-2 hover:text-brand"
                >
                  {p.name}
                </Link>
                <span className="ml-1 text-muted">
                  ({p.published ? "Published" : "Draft"})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-none stroke-current transition-transform ${open ? "rotate-90" : ""}`}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function LegendDot({ className }: { className: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ring-1 ring-white ${className}`}
    />
  );
}
