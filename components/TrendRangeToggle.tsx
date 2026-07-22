"use client";

import { useState, type ReactNode } from "react";

// Small 7d / 14d range switch shown above the trends chart. Both charts are
// server-rendered and passed in as props; this only flips which one is visible.
// Defaults to 14d.
export function TrendRangeToggle({
  sevenDay,
  fourteenDay,
}: {
  sevenDay: ReactNode;
  fourteenDay: ReactNode;
}) {
  const [range, setRange] = useState<"7" | "14">("14");
  const options = [
    { value: "7", label: "7d" },
    { value: "14", label: "14d" },
  ] as const;

  return (
    <div>
      <div className="mb-4 flex justify-center">
        <div
          role="tablist"
          aria-label="Chart range"
          className="inline-flex rounded-btn border border-border bg-card p-1 shadow-sm"
        >
          {options.map((o) => {
            const active = range === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRange(o.value)}
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
      {range === "7" ? sevenDay : fourteenDay}
    </div>
  );
}
