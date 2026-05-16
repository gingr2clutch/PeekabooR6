"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import { BirdsEyeWatermark } from "@/components/BirdsEyeWatermark";
import { PeekPin } from "@/components/PeekPin";
import type { Floor, Map, Peek } from "@/lib/db";
import { isPeekNew } from "@/lib/peek-recency";

type Positioned = Peek & { displayX: number; displayY: number };

type Props = {
  map: Map;
  floor: Floor;
  peeks: Positioned[];
};

// Client wrapper around the bird's-eye image + pin overlay. Owns the
// "selected pin" state used on mobile: tap a pin → highlights → its
// details show in a fixed card below the map. Desktop users still get the
// hover tooltip and click-to-navigate behavior.
export function FloorView({ map, floor, peeks }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function toggleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function deselect() {
    setSelectedId(null);
  }

  const selectedIndex = selectedId
    ? peeks.findIndex((p) => p.id === selectedId)
    : -1;
  const selected = selectedIndex >= 0 ? peeks[selectedIndex] : null;

  return (
    <>
      {/* Outer wrapper has no overflow so tooltips and the active pin
          can extend beyond the visual bounds of the map without being
          clipped. The bordered/rounded image lives in a separate
          clipped sibling below it. */}
      <div className="relative aspect-[16/10] w-full">
        <div className="absolute inset-0 overflow-hidden rounded-card border border-border bg-card">
          {floor.birds_eye_url ? (
            <>
              <Image
                src={floor.birds_eye_url}
                alt={`${map.name} ${floor.name} bird's-eye view`}
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
                priority
              />
              <BirdsEyeWatermark />
            </>
          ) : (
            <div className="placeholder-stripes flex h-full w-full items-center justify-center">
              <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                Bird&apos;s-eye view coming soon
              </span>
            </div>
          )}
        </div>

        {/* Pin layer. Clicking inside but not on a pin deselects. */}
        <div
          className="absolute inset-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) deselect();
          }}
        >
          {peeks.map((peek, i) => (
            <PeekPin
              key={peek.id}
              slug={peek.slug}
              name={peek.name}
              xPct={peek.displayX}
              yPct={peek.displayY}
              number={i + 1}
              isNew={isPeekNew(peek.created_at)}
              isSelected={selectedId === peek.id}
              onSelect={() => toggleSelect(peek.id)}
            />
          ))}
        </div>
      </div>

      {peeks.length > 0 && (
        <p className="mt-3 text-center text-[13px] text-muted">
          Ranked by success rate
        </p>
      )}

      {/* Mobile-only detail card. Avoids the desktop tooltip's clipping
          and z-stacking issues entirely on the smallest screens. */}
      {peeks.length > 0 && (
        <div className="mt-4 md:hidden">
          {selected ? (
            <SelectedPeekCard
              peek={selected}
              rank={selectedIndex + 1}
              floorName={floor.name}
              onClose={deselect}
            />
          ) : (
            <p
              className="rounded-card border border-dashed border-border bg-card px-4 py-3 text-center text-sm text-muted"
              aria-live="polite"
            >
              Tap a pin to see details
            </p>
          )}
        </div>
      )}
    </>
  );
}

function SelectedPeekCard({
  peek,
  rank,
  floorName,
  onClose,
}: {
  peek: Positioned;
  rank: number;
  floorName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="rounded-card border border-border bg-card p-4 shadow-sm"
      role="region"
      aria-label="Selected peek details"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink">
            {peek.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{floorName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Deselect peek"
          className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-muted transition-colors hover:bg-ink/[0.06] hover:text-brand"
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Success" value={`${peek.success_rate}%`} highlight />
        <Stat label="Difficulty" value={`${peek.difficulty}/5`} />
        <Stat label="Risk" value={peek.risk} capitalize />
      </div>

      <Link
        href={`/peeks/${peek.slug}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-brand active:scale-[0.99]"
      >
        View full peek →
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  capitalize,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-btn border border-border bg-bg px-2 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold ${
          highlight ? "text-brand" : "text-ink"
        } ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
