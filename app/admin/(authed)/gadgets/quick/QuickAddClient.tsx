"use client";

import { useEffect, useRef, useState } from "react";
import { GadgetClipUpload } from "@/components/GadgetClipUpload";
import { MultiPinPlacer } from "@/components/MultiPinPlacer";
import { quickAddSetup, quickUndoSetup } from "./actions";

export type QuickMap = { id: string; name: string };
export type QuickSite = {
  id: string;
  mapId: string;
  name: string;
  blueprintUrl: string | null;
};
export type QuickOperator = { id: string; name: string; published: boolean };

type Props = {
  maps: QuickMap[];
  sites: QuickSite[];
  operators: QuickOperator[];
};

// Quick-add: enter setup after setup on one site without re-walking the admin
// tree.
//
// The loop is pick map/site/operator ONCE, then pins → clip → save, repeated.
// Saving deliberately does not navigate and does not reset the three selectors;
// it clears only the pins, the clip and the name.
//
// Those are cleared by remounting them with a changed key rather than by adding
// reset props. MultiPinPlacer and GadgetClipUpload each hold their state
// internally and neither exposes a way to clear from outside, so a key bump
// returns both to their initial state without growing an API that the per-site
// editor would also inherit.

const STORAGE_KEY = "pkb_quickadd_v1";

export function QuickAddClient({ maps, sites, operators }: Props) {
  const [mapId, setMapId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(0);
  const [last, setLast] = useState<{ id: string; summary: string } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Restore the last-used trio. Runs after mount, not during render, so the
  // server and first client render agree and hydration stays quiet.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as Partial<Record<string, string>>;
      // Validate against what still exists — a saved site that has since been
      // deleted would otherwise leave the form pointing at nothing.
      if (v.mapId && maps.some((m) => m.id === v.mapId)) setMapId(v.mapId);
      if (v.siteId && sites.some((s) => s.id === v.siteId)) setSiteId(v.siteId);
      if (v.operatorId && operators.some((o) => o.id === v.operatorId)) {
        setOperatorId(v.operatorId);
      }
    } catch {
      // A corrupt entry should not stop the page loading.
    }
  }, [maps, sites, operators]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mapId, siteId, operatorId })
      );
    } catch {
      // Private mode / quota. Losing the memory is not worth an error.
    }
  }, [mapId, siteId, operatorId]);

  const mapSites = sites.filter((s) => s.mapId === mapId);
  const site = sites.find((s) => s.id === siteId) ?? null;
  const ready = !!siteId && !!operatorId;

  function onMapChange(next: string) {
    setMapId(next);
    // The old site belongs to the old map, so keep it only if it survives the
    // change — which it will not, but being explicit beats a stale id.
    setSiteId((cur) => (sites.some((s) => s.id === cur && s.mapId === next) ? cur : ""));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("site_id", siteId);
      fd.set("operator_id", operatorId);
      const res = await quickAddSetup(fd);
      setPlaced((n) => n + 1);
      setLast(res);
      // Clear pin + clip only. Selectors stay exactly as they were.
      setResetKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onUndo() {
    if (!last || undoing) return;
    setUndoing(true);
    try {
      await quickUndoSetup(last.id);
      setPlaced((n) => Math.max(0, n - 1));
      setLast(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUndoing(false);
    }
  }

  const select =
    "w-full rounded-btn border border-border bg-card px-3 py-2.5 text-base text-ink outline-none transition-colors focus:border-blue";

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      // Clears the save bar, plus whatever the adhesion unit is occupying, so
      // the last field is never stranded underneath either.
      className="pb-32"
    >
      {/* Sticky context. These three are the thing you set once and leave, so
          they stay reachable while the blueprint scrolls under them. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg px-4 pb-3 pt-2 sm:-mx-6 sm:px-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Map</span>
            <select
              value={mapId}
              onChange={(e) => onMapChange(e.target.value)}
              className={select}
            >
              <option value="">Pick a map…</option>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Bomb site
            </span>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              disabled={!mapId}
              className={`${select} disabled:opacity-50`}
            >
              <option value="">
                {mapId ? "Pick a site…" : "Pick a map first"}
              </option>
              {mapSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Operator
            </span>
            <select
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className={select}
            >
              <option value="">Pick an operator…</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.published ? "" : " (draft)"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {placed > 0 && (
          <p className="mt-2 text-xs font-medium text-teal">
            {placed} setup{placed === 1 ? "" : "s"} added this session
          </p>
        )}
      </div>

      {!ready ? (
        <p className="mt-6 rounded-card border border-dashed border-border p-6 text-center text-sm text-muted">
          Pick a map, bomb site and operator to start adding setups.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Name — blank becomes &ldquo;Setup N&rdquo;
            </span>
            <input
              key={`name-${siteId}-${resetKey}`}
              name="name"
              placeholder="Standard"
              className={select}
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-muted">
              Pins
            </span>
            {/* key remounts this after each save, clearing the pins without
                MultiPinPlacer needing a reset prop. */}
            <MultiPinPlacer
              key={`pins-${siteId}-${resetKey}`}
              src={site?.blueprintUrl ?? null}
            />
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-muted">
              Clip — upload, or paste a link below
            </span>
            <GadgetClipUpload key={`clip-${siteId}-${resetKey}`} siteId={siteId} />
            <input
              key={`embed-${siteId}-${resetKey}`}
              name="embed_url"
              placeholder="https://medal.tv/games/r6-siege/clips/…"
              className={`${select} mt-2`}
            />
          </div>

          {error && (
            <p className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Save + confirmation pinned to the bottom of the viewport: on a phone
          the blueprint fills the screen, and scrolling to find Save every time
          would undo most of what this page is for. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        {last && (
          <div className="mb-2 flex items-center gap-3 rounded-btn bg-teal/10 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-xs text-teal">
              Added {last.summary}
            </span>
            <button
              type="button"
              onClick={onUndo}
              disabled={undoing}
              className="shrink-0 rounded-btn border border-teal/40 px-2.5 py-1 text-xs font-semibold text-teal disabled:opacity-50"
            >
              {undoing ? "Undoing…" : "Undo"}
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={!ready || saving}
          className="w-full rounded-btn bg-ink px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save setup"}
        </button>
      </div>
    </form>
  );
}
