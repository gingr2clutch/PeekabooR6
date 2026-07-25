"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

// Client-side toggle between two server-rendered views. Both view trees are
// built on the server and passed in as props, so the visible switch is instant
// (driven by local state) with no refetch.
//
// The chosen view is written to the URL (?view=ranked) THROUGH THE NEXT ROUTER
// (router.replace) so the router owns the param. That is what fixes back-
// navigation: tapping a peek then pressing back returns to the map URL that
// still carries ?view=ranked, and the page renders that view server-side. The
// URL write runs in a transition so it never flashes the route's loading state.
// localStorage stays a cross-visit fallback when the URL has no ?view.
export function MapViewToggle({
  floorsView,
  rankedView,
  initialView = "floors",
}: {
  floorsView: ReactNode;
  rankedView: ReactNode;
  // What the server rendered from ?view= (defaults to "floors").
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // On mount, resolve the view: the URL wins (source of truth for back-nav and
  // shared links), then the stored cross-visit preference.
  useIsoLayoutEffect(() => {
    const urlView = searchParams.get("view");
    if (isView(urlView)) {
      if (urlView !== view) setView(urlView);
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isView(saved) && saved !== view) setView(saved);
    } catch {
      // localStorage unavailable — keep the default.
    }
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(next: View) {
    setView(next); // instant visual switch
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures
    }
    // Reflect the choice in the URL via the router so back-navigation returns
    // here. scroll:false keeps the list position; the transition avoids the
    // route's loading fallback while the (cheap) re-render settles.
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
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
