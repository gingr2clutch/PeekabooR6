"use client";

import { useState } from "react";
import { FloorCoverage } from "./FloorCoverage";
import type { CoverageFloor, CoveragePeek } from "./FloorCoverage";
import {
  PeeksDashboardTable,
  type DashboardMap,
  type DashboardRow,
} from "./PeeksDashboardTable";
import type { InlineField, InlineUpdateResult } from "./actions";

type Props = {
  initialRows: DashboardRow[];
  maps: DashboardMap[];
  coverageFloors: CoverageFloor[];
  coveragePeeks: CoveragePeek[];
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

export function PeeksPageClient({
  initialRows,
  maps,
  coverageFloors,
  coveragePeeks,
  updateField,
  bulkSetPublished,
  bulkDelete,
}: Props) {
  const [filterMap, setFilterMap] = useState<string>("");

  return (
    <div className="space-y-6">
      <FloorCoverage
        floors={coverageFloors}
        peeks={coveragePeeks}
        filterMap={filterMap}
      />

      <PeeksDashboardTable
        initialRows={initialRows}
        maps={maps}
        filterMap={filterMap}
        onFilterMapChange={setFilterMap}
        updateField={updateField}
        bulkSetPublished={bulkSetPublished}
        bulkDelete={bulkDelete}
      />
    </div>
  );
}
