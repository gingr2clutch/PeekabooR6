"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { LayoutGrid, ListOrdered } from "lucide-react";

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

  const options: {
    value: View;
    label: string;
    Icon: typeof LayoutGrid;
  }[] = [
    { value: "floors", label: "Floors", Icon: LayoutGrid },
    { value: "ranked", label: "Ranked list", Icon: ListOrdered },
  ];

  return (
    // Floors-section "bubble": a barely-there orange tint sits behind the
    // toggle + the active view (floors or ranked list), so the whole section
    // reads as one unit between the stats box and the trends chart. The cards
    // inside keep their white styling; modest padding on mobile so the tint
    // doesn't steal card width.
    //
    // Dropped at lg. The desktop floor cards carry the map's accent on their
    // own outline, and a tinted box around them fought that — two competing
    // frames around the same content. Desktop gets a plain heading row
    // instead: label left, toggle right. Below lg the bubble is untouched.
    <div className="rounded-card border border-brand/20 bg-brand/[0.11] px-3 py-4 sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
      <div className="mb-8 flex justify-center lg:mb-6 lg:flex-col lg:items-center lg:justify-center lg:gap-4">
        {/* Desktop-only section heading. Tracks the toggle, because on the
            ranked view "Pick a floor" would be describing the wrong thing. */}
        <h2 className="hidden text-2xl font-bold tracking-tight text-ink lg:block lg:text-center">
          {view === "ranked" ? "Every peek, ranked" : "Pick a floor"}
        </h2>
        <div
          role="tablist"
          aria-label="Map view"
          className="inline-flex rounded-btn border border-border bg-card p-1 shadow-sm lg:rounded-[16px] lg:bg-white lg:p-[5px]"
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
                className={`rounded-btn px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out lg:inline-flex lg:items-center lg:gap-2.5 lg:rounded-[12px] lg:px-[30px] lg:py-[14px] lg:text-[18px] lg:leading-[30px] ${
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {/* Icons are desktop-only; the phone pill has no room. */}
                <o.Icon size={20} aria-hidden className="hidden lg:block" />
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
