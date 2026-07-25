"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { FlameBadge } from "./FlameBadge";
import { GemBadge } from "./GemBadge";
import { BeginnerBadge } from "./BeginnerBadge";

type Entry = {
  Badge: (p: { className?: string }) => JSX.Element;
  title: string;
  desc: string;
};

const ENTRIES: Entry[] = [
  { Badge: FlameBadge, title: "Top Peek", desc: "community's most popular" },
  { Badge: GemBadge, title: "Underrated", desc: "top 10 hidden gems" },
  {
    Badge: BeginnerBadge,
    title: "Beginner Friendly",
    desc: "low risk, easy difficulty",
  },
];

// Collapsed-by-default legend for the pin/card badges. A small "Badge key"
// toggle expands a compact row that shows each badge at its real size beside its
// meaning, so people can match them instantly. Dropped near the top of list/map
// pages and (collapsed) on the peek detail page.
export function BadgeKey({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-brand"
      >
        <Info size={14} aria-hidden />
        Badge key
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2.5 rounded-card border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          {ENTRIES.map(({ Badge, title, desc }) => (
            <span key={title} className="flex items-center gap-2 text-sm">
              <Badge className="h-5 w-5 shrink-0" />
              <span>
                <span className="font-semibold text-ink">{title}</span>{" "}
                <span className="text-muted">— {desc}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
