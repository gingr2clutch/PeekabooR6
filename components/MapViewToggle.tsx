"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

// useLayoutEffect on the client (applies the saved choice before paint, so a
// remembered "Ranked list" doesn't flash the Floors view); useEffect on the
// server to avoid React's "useLayoutEffect does nothing on the server" warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type View = "floors" | "ranked";
const STORAGE_KEY = "peek-map-view";

// Client-side toggle between two server-rendered views. Both view trees are
// built on the server and passed in as props, so switching is instant with no
// refetch. Default is "floors" (SSR + no-JS keep current behavior); the choice
// is remembered in localStorage across maps and visits.
export function MapViewToggle({
  floorsView,
  rankedView,
}: {
  floorsView: ReactNode;
  rankedView: ReactNode;
}) {
  const [view, setView] = useState<View>("floors");

  useIsoLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "floors" || saved === "ranked") setView(saved);
    } catch {
      // localStorage unavailable (private mode etc.) — keep the default.
    }
  }, []);

  function choose(next: View) {
    setView(next);
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
    <div className="rounded-card border border-brand/10 bg-brand/[0.06] px-3 py-4 sm:p-6">
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
