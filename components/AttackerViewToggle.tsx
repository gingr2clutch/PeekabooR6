"use client";

import { useState, type ReactNode } from "react";

// Client toggle between two server-rendered views on the attacker guide,
// styled like the map page's tablist bubble. Local state only — deliberately
// does NOT share the map page's ?view= / localStorage key, so the two can't
// bleed into each other.
export function AttackerViewToggle({
  dangerView,
  floorView,
}: {
  dangerView: ReactNode;
  floorView: ReactNode;
}) {
  const [view, setView] = useState<"danger" | "floor">("danger");
  const options: { value: "danger" | "floor"; label: string }[] = [
    { value: "danger", label: "By danger" },
    { value: "floor", label: "By floor" },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div
          role="tablist"
          aria-label="Sort angles"
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
                onClick={() => setView(o.value)}
                className={`rounded-btn px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out ${
                  active ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "danger" ? dangerView : floorView}
    </div>
  );
}
