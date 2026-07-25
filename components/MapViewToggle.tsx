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

// Write ?view= onto the CURRENT history entry with the native History API.
// Next.js (14.1+) patches replaceState and keeps its router in sync, so this is
// instant — no navigation, no refetch, no loading flash, no scroll jump — and
// the entry the peek link is pushed over now carries ?view=ranked. That's what
// makes browser-back return to the same view. Pass `null` as the state (per the
// Next docs): passing Next's own state object throws inside the patched method.
function writeViewToUrl(next: View) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") === next) return;
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url.toString());
  } catch {
    // ignore
  }
}

function readViewFromUrl(): View | null {
  if (typeof window === "undefined") return null;
  try {
    const v = new URLSearchParams(window.location.search).get("view");
    return isView(v) ? v : null;
  } catch {
    return null;
  }
}

// Client-side toggle between two server-rendered views. Both view trees are
// built on the server and passed in as props, so the visible switch is instant
// (driven by local state) with no refetch.
//
// The chosen view is written to the URL (?view=ranked). That is what fixes back-
// navigation: tapping a peek then pressing back returns to the map URL that
// still carries ?view=ranked, so the ranked list is restored on the server AND
// re-read on the client. localStorage stays a cross-visit fallback.
export function MapViewToggle({
  floorsView,
  rankedView,
  initialView = "floors",
}: {
  floorsView: ReactNode;
  rankedView: ReactNode;
  // What the server rendered from ?view= (defaults to "floors"). The client
  // reconciles against the live URL + stored preference on mount.
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);

  useIsoLayoutEffect(() => {
    // Source of truth on the client: the live URL (restored on browser-back and
    // present on shared links), then the stored cross-visit preference.
    const fromUrl = readViewFromUrl();
    if (fromUrl) {
      if (fromUrl !== view) setView(fromUrl);
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isView(saved)) {
        if (saved !== view) setView(saved);
        writeViewToUrl(saved); // reflect stored pref so a later back-nav works
      }
    } catch {
      // localStorage unavailable — keep the default.
    }
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(next: View) {
    setView(next); // instant visual switch
    writeViewToUrl(next); // Next-integrated URL update → back-nav restores it
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
