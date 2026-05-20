"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Link2, Share2, X } from "lucide-react";
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
              mapName={map.name}
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
  mapName,
  floorName,
  onClose,
  isClosing,
}: {
  peek: Positioned;
  rank: number;
  mapName: string;
  floorName: string;
  onClose: () => void;
  isClosing: boolean;
}) {
  const animCls = isClosing ? "peek-card-out" : "peek-card-in";
  const shareTitle = `${peek.name} · ${mapName} ${floorName}`;
  return (
    <div
      className={`rounded-card border border-border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)] ${animCls}`}
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

      <ShareCopyRow slug={peek.slug} title={shareTitle} />
    </div>
  );
}

// Sibling pair of subtle buttons under the primary CTA. Share triggers the
// native sheet on supporting browsers, otherwise falls back to clipboard.
// Copy link always copies. Both flash "Copied ✓" on success — width is
// stable because the grid sets each cell to 50%.
function ShareCopyRow({ slug, title }: { slug: string; title: string }) {
  const [shareCopied, setShareCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareTimerRef = useRef<number | null>(null);
  const linkTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
      if (linkTimerRef.current) window.clearTimeout(linkTimerRef.current);
    };
  }, []);

  function getUrl(): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/peeks/${slug}`;
  }

  function flashShare() {
    setShareCopied(true);
    if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
    shareTimerRef.current = window.setTimeout(() => {
      setShareCopied(false);
      shareTimerRef.current = null;
    }, 1500);
  }

  function flashLink() {
    setLinkCopied(true);
    if (linkTimerRef.current) window.clearTimeout(linkTimerRef.current);
    linkTimerRef.current = window.setTimeout(() => {
      setLinkCopied(false);
      linkTimerRef.current = null;
    }, 1500);
  }

  async function handleShare() {
    const url = getUrl();
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    if (await copyToClipboard(url)) flashShare();
  }

  async function handleCopy() {
    if (await copyToClipboard(getUrl())) flashLink();
  }

  const btnCls =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-border bg-card px-3 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand active:scale-[0.99]";

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share this peek"
        className={btnCls}
      >
        <Share2 size={14} strokeWidth={2} aria-hidden />
        <span>{shareCopied ? "Copied \u2713" : "Share"}</span>
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy peek link"
        className={btnCls}
      >
        <Link2 size={14} strokeWidth={2} aria-hidden />
        <span>{linkCopied ? "Copied \u2713" : "Copy link"}</span>
      </button>
    </div>
  );
}

// Clipboard with a legacy fallback for non-secure-context / older browsers.
async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    if (
      typeof window !== "undefined" &&
      window.isSecureContext &&
      navigator.clipboard
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy path.
  }
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
