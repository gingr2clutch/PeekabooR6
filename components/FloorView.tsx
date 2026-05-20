"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  // Mirror of selectedId that lags by the panel exit-animation duration so
  // the card can play its slide-out before unmounting. While `panelClosing`
  // is true, the card is still rendered with peek-card-out applied.
  const [displayedSelectedId, setDisplayedSelectedId] =
    useState<string | null>(null);
  const [panelClosing, setPanelClosing] = useState(false);

  useEffect(() => {
    if (selectedId) {
      setDisplayedSelectedId(selectedId);
      setPanelClosing(false);
      return;
    }
    if (displayedSelectedId) {
      setPanelClosing(true);
      const t = window.setTimeout(() => {
        setDisplayedSelectedId(null);
        setPanelClosing(false);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [selectedId, displayedSelectedId]);

  function toggleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function deselect() {
    setSelectedId(null);
  }

  const displayedSelectedIndex = displayedSelectedId
    ? peeks.findIndex((p) => p.id === displayedSelectedId)
    : -1;
  const displayedSelected =
    displayedSelectedIndex >= 0 ? peeks[displayedSelectedIndex] : null;

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
          {displayedSelected ? (
            <SelectedPeekCard
              key={displayedSelected.id}
              peek={displayedSelected}
              rank={displayedSelectedIndex + 1}
              floorName={floor.name}
              onClose={deselect}
              isClosing={panelClosing}
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
  isClosing,
}: {
  peek: Positioned;
  rank: number;
  floorName: string;
  onClose: () => void;
  isClosing: boolean;
}) {
  const animCls = isClosing ? "peek-card-out" : "peek-card-in";
  return (
    <div
      className={`rounded-card border border-border bg-card p-4 shadow-sm ${animCls}`}
      role="region"
      aria-label="Selected peek details"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white ring-4 ring-brand/20"
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
        <StatTile label="Success">
          <span className="text-base font-bold text-brand">
            <AnimatedNumber value={peek.success_rate} />%
          </span>
        </StatTile>
        <StatTile label="Difficulty">
          <DifficultyDots level={peek.difficulty} />
        </StatTile>
        <StatTile label="Risk">
          <RiskIndicator level={peek.risk} />
        </StatTile>
      </div>

      <Link
        href={`/peeks/${peek.slug}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-btn bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-brand/90 active:scale-[0.99]"
      >
        View full peek →
      </Link>
    </div>
  );
}

// Counts a number up from 0 to its real value on mount via requestAnimationFrame.
// Reduced-motion users skip the animation and see the final value immediately.
function AnimatedNumber({
  value,
  durationMs = 400,
}: {
  value: number;
  durationMs?: number;
}) {
  const [current, setCurrent] = useState(() => {
    if (typeof window === "undefined") return value;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? value
      : 0;
  });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCurrent(value);
      return;
    }
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // ease-out quadratic — fast start, settles on the value
      const eased = 1 - (1 - t) * (1 - t);
      setCurrent(Math.round(eased * value));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return <>{current}</>;
}

function StatTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-between rounded-btn border border-border bg-bg px-2 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="mt-1 flex h-5 items-center justify-center">{children}</div>
    </div>
  );
}

function DifficultyDots({ level }: { level: number }) {
  const total = 5;
  const filled = Math.max(0, Math.min(total, Math.round(level)));
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Difficulty ${filled} out of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={
            i < filled
              ? "h-1.5 w-1.5 rounded-full bg-ink/80"
              : "h-1.5 w-1.5 rounded-full border border-border bg-transparent"
          }
        />
      ))}
    </div>
  );
}

function RiskIndicator({ level }: { level: "low" | "medium" | "high" }) {
  const dotCls =
    level === "low"
      ? "bg-emerald-500"
      : level === "high"
        ? "bg-rose-500"
        : "bg-amber-500";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold capitalize text-ink">
      <span aria-hidden className={`h-2 w-2 rounded-full ${dotCls}`} />
      {level}
    </span>
  );
}
