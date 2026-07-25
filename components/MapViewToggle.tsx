"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

// useLayoutEffect on the client (applies the resolved choice before paint, so a
// remembered/URL "Ranked list" doesn't flash the Floors view); useEffect on the
// server to avoid React's "useLayoutEffect does nothing on the server" warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type View = "floors" | "ranked";
const STORAGE_KEY = "peek-map-view";

function isView(v: unknown): v is View {
  return v === "floors" || v === "ranked";
}

// Update just the ?view= param on the CURRENT history entry — no navigation, no
// refetch, no scroll jump. window.history.replaceState is integrated with the
// Next.js App Router, so browser back returns to this exact URL/view and the
// link stays shareable.
function syncViewInUrl(next: View) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") === next) return;
    url.searchParams.set("view", next);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // ignore
  }
}

// Client-side toggle between two server-rendered views. Both view trees are
// built on the server and passed in as props, so switching is instant with no
// refetch.
//
// The view is reflected in the URL (?view=ranked). That is what fixes back-
// navigation: tapping a peek then pressing back returns to the map URL that
// still carries ?view=ranked, so the ranked list is restored (and shared links
// land on the right view). localStorage remains a cross-visit fallback for when
// no ?view is present.
export function MapViewToggle({
  floorsView,
  rankedView,
  initialView = "floors",
}: {
  floorsView: ReactNode;
  rankedView: ReactNode;
  // What the server rendered from ?view= (defaults to "floors"). The client
  // reconciles this against the live URL + stored preference on mount.
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);

  // On mount, resolve the view from (1) the live URL — the source of truth for
  // back-navigation and shared links — then (2) the stored cross-visit
  // preference. Reflect the result back into the URL so a later
  // "tap a peek → press back" returns to this same view.
  useIsoLayoutEffect(() => {
    let next: View | null = null;
    try {
      const p = new URLSearchParams(window.location.search).get("view");
      if (isView(p)) next = p;
    } catch {
      // ignore
    }
    if (!next) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (isView(saved)) next = saved;
      } catch {
        // ignore
      }
    }
    if (next) {
      if (next !== view) setView(next);
      syncViewInUrl(next);
    }
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(next: View) {
    setView(next);
    syncViewInUrl(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures
    }
  }

  const options: { value: View; label: string }[] = [
    { value: "floors", label: "Floors" },
    { value: "ranked", label: "Ranked list" },
  ];

  return (
    // Floors-section "bubble": a barely-there orange tint sits behind the
    // toggle + the active view (floors or ranked list), so the whole section
    // reads as one unit between the stats box and the trends chart. The cards
    // inside keep their white styling; modest padding on mobile so the tint
    // doesn't steal card width.
    <div className="rounded-card border border-brand/20 bg-brand/[0.11] px-3 py-4 sm:p-6">
      <div className="mb-8 flex justify-center">
        <div
          role="tablist"
          aria-label="Map view"
          className="inline-flex rounded-btn border border-border bg-card p-1 shadow-sm"
        >
          {options.map((o) => {
            const active = view === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => choose(o.value)}
                className={`rounded-btn px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out ${
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "floors" ? floorsView : rankedView}
    </div>
  );
}
