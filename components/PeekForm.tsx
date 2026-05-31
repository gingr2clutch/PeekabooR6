"use client";

import { useMemo, useState } from "react";
import { InstructionsEditor } from "./InstructionsEditor";
import { PinPlacer } from "./PinPlacer";

export type FloorOption = {
  id: string;
  name: string;
  mapName: string;
  birdsEyeUrl: string | null;
};

type Props = {
  floors: FloorOption[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initial?: {
    id?: string;
    floor_id?: string;
    name?: string;
    slug?: string;
    x_pct?: number;
    y_pct?: number;
    difficulty?: number;
    risk?: "low" | "medium" | "high";
    published?: boolean;
    instructions?: string[];
    tip?: string | null;
    success_rate?: number;
    base_success_rate?: number;
  };
};

export function PeekForm({ floors, action, submitLabel, initial }: Props) {
  const [floorId, setFloorId] = useState(
    initial?.floor_id ?? floors[0]?.id ?? ""
  );
  // Slider reflects the admin-set base. Falls back to success_rate so
  // pre-migration rows (without a base value) still render sensibly.
  const [successRate, setSuccessRate] = useState(
    initial?.base_success_rate ?? initial?.success_rate ?? 50
  );

  const selectedFloor = useMemo(
    () => floors.find((f) => f.id === floorId) ?? null,
    [floors, floorId]
  );

  return (
    <form
      action={action}
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="space-y-5 rounded-card border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Details
        </h2>

        <label className="block text-xs text-muted">
          <span className="mb-1 block">Floor</span>
          <select
            name="floor_id"
            required
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            {floors.length === 0 && <option value="">No floors yet</option>}
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.mapName} · {f.name}
                {f.birdsEyeUrl ? "" : " (no image)"}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-muted">
          <span className="mb-1 block">Peek name</span>
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="e.g. Main stairs"
            className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>

        {initial?.id && (
          <label className="block text-xs text-muted">
            <span className="mb-1 block">URL slug</span>
            <input
              name="slug"
              defaultValue={initial.slug ?? ""}
              placeholder="auto-generated from name"
              className="w-full rounded-btn border border-border bg-card px-3 py-2 font-mono text-sm text-ink outline-none focus:border-brand"
            />
            <span className="mt-1 block text-[11px] text-muted">
              The peek lives at <span className="font-mono">/peeks/&lt;slug&gt;</span>.
              Leave blank to regenerate from the name. Collisions get -2, -3,
              ... appended automatically.
            </span>
          </label>
        )}

        <div>
          <span className="mb-1 block text-xs text-muted">Instructions</span>
          <InstructionsEditor initial={initial?.instructions ?? []} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            <span className="mb-1 block">Difficulty (1–5)</span>
            <select
              name="difficulty"
              defaultValue={String(initial?.difficulty ?? 3)}
              className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            <span className="mb-1 block">Risk</span>
            <select
              name="risk"
              defaultValue={initial?.risk ?? "medium"}
              className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="block text-xs text-muted">
          <div className="mb-1 flex items-center justify-between">
            <span>Success rate (starting value)</span>
            <span className="font-medium text-ink">{successRate}%</span>
          </div>
          <input
            type="range"
            name="success_rate"
            min={0}
            max={100}
            value={successRate}
            onChange={(e) => setSuccessRate(Number(e.target.value))}
            className="w-full accent-brand"
          />
        </label>

        <label className="block text-xs text-muted">
          <span className="mb-1 block">Pro tip (optional)</span>
          <textarea
            name="tip"
            defaultValue={initial?.tip ?? ""}
            maxLength={200}
            rows={2}
            placeholder="One-liner that helps a beginner — e.g. wait for the first callout before peeking"
            className="w-full resize-y rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
          />
          <span className="mt-1 block text-[11px] text-muted">
            Up to 200 characters.
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published ?? false}
            className="h-4 w-4 rounded border-border accent-brand"
          />
          <span>Published (visible on the public site)</span>
        </label>

        <button
          type="submit"
          className="rounded-btn bg-ink px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95"
        >
          {submitLabel}
        </button>
      </div>

      <div className="space-y-5 rounded-card border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Pin position
        </h2>
        <PinPlacer
          src={selectedFloor?.birdsEyeUrl ?? null}
          initialX={initial?.x_pct ?? 50}
          initialY={initial?.y_pct ?? 50}
          name={
            selectedFloor
              ? `${selectedFloor.mapName} ${selectedFloor.name}`
              : undefined
          }
        />
      </div>
    </form>
  );
}
