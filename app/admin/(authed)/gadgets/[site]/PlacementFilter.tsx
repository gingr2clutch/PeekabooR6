"use client";

import { useState } from "react";
import { OperatorIcon } from "@/components/OperatorIcon";

export type FilterChip = {
  operatorId: string;
  name: string;
  iconUrl: string | null;
  count: number;
};

export type FilterItem = {
  id: string;
  operatorId: string;
  /** The card's contents, rendered on the server and passed through untouched. */
  node: React.ReactNode;
};

type Props = {
  chips: FilterChip[];
  items: FilterItem[];
};

// Operator filter for a site's placements.
//
// The placement cards are still rendered on the server — every form, server
// action, PinPlacer and uploader inside them is byte-for-byte what it was.
// This component receives them as nodes and only decides which are visible, so
// filtering cannot change what an edit or delete does.
//
// Non-matching cards are hidden with a class rather than unmounted. Each card
// is an uncontrolled form: unmounting one would throw away anything typed into
// it, so switching filters mid-edit and switching back would silently lose the
// change. Hidden cards keep their state and their own forms, so nothing they
// contain can be submitted by a form that is visible.
export function PlacementFilter({ chips, items }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const visibleCount =
    active === null
      ? items.length
      : items.filter((i) => i.operatorId === active).length;

  return (
    <>
      {/* Sticky so the filter stays reachable while scrolling a long list.
          Needs an opaque background or the cards scroll through it, and the
          negative margin lets the row bleed to the screen edges on a phone so
          the last chip does not look cut off mid-scroll. */}
      <div className="sticky top-0 z-10 -mx-4 mt-3 border-b border-border bg-bg px-4 py-2 sm:-mx-6 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip
            label="All"
            count={items.length}
            selected={active === null}
            onClick={() => setActive(null)}
          />
          {chips.map((c) => (
            <Chip
              key={c.operatorId}
              label={c.name}
              count={c.count}
              selected={active === c.operatorId}
              onClick={() =>
                setActive((cur) => (cur === c.operatorId ? null : c.operatorId))
              }
              icon={
                <OperatorIcon name={c.name} iconUrl={c.iconUrl} size={24} />
              }
            />
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className={`rounded-card border border-border bg-card p-3 ${
              active === null || it.operatorId === active ? "" : "hidden"
            }`}
          >
            {it.node}
          </li>
        ))}
      </ul>

      {visibleCount === 0 && (
        <p className="mt-3 rounded-card border border-border bg-card p-5 text-sm text-muted">
          No placements for that operator on this site.
        </p>
      )}
    </>
  );
}

function Chip({
  label,
  count,
  selected,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      // min-h-[44px] is the tap target, not decoration — these sit in a
      // horizontal scroller where a short button is easy to miss with a thumb.
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-btn border px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? "border-blue bg-blue/10 text-blue"
          : "border-border bg-card text-ink hover:border-blue hover:text-blue"
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
          selected ? "bg-blue text-white" : "bg-ink/[0.06] text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
