"use client";

import { useEffect, useRef, useState } from "react";
import { getLiveStats, type LiveStats } from "./actions";

const REFRESH_MS = 5000;

export default function AdminLivePage() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function refresh() {
      try {
        const next = await getLiveStats();
        if (!aliveRef.current) return;
        setStats(next);
        setUpdatedAt(new Date());
        setError(null);
      } catch (e) {
        if (!aliveRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (aliveRef.current) {
          timer = setTimeout(refresh, REFRESH_MS);
        }
      }
    }
    refresh();

    return () => {
      aliveRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Live</h1>
        <p className="text-xs text-muted">
          Auto-refreshes every {REFRESH_MS / 1000}s
          {updatedAt && (
            <>
              {" · "}
              <span>last update {updatedAt.toLocaleTimeString()}</span>
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex items-center gap-4 rounded-card border border-border bg-card p-6 sm:p-8">
        <span
          aria-hidden
          className={`h-3 w-3 rounded-full ${
            stats && stats.liveNow > 0
              ? "animate-pulse bg-emerald-500"
              : "bg-border"
          }`}
        />
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Live now
          </span>
          <span className="text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
            {stats ? stats.liveNow : "—"}
          </span>
          <span className="mt-1 text-xs text-muted">
            distinct sessions active in the last 60s
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Today (UTC)" value={stats?.today} />
        <Stat label="Last hour" value={stats?.lastHour} />
        <Stat label="All time" value={stats?.allTime} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Top pages today
          </h2>
          {!stats ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : stats.topPages.length === 0 ? (
            <p className="text-sm text-muted">No views yet today.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {stats.topPages.map((p) => (
                <li
                  key={p.path}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="truncate font-mono text-[13px]">
                    {p.path}
                  </span>
                  <span className="tabular-nums text-muted">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent activity
          </h2>
          {!stats ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : stats.recent.length === 0 ? (
            <p className="text-sm text-muted">No views yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {stats.recent.map((r, i) => (
                <li
                  key={`${r.created_at}-${i}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="truncate font-mono text-[13px]">
                    {r.path}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-muted">
                    {formatRelative(r.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
        {value === undefined ? "—" : value.toLocaleString()}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 5) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
