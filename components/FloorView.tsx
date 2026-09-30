"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link2, Share2, X } from "lucide-react";
import { BirdsEyeWatermark } from "@/components/BirdsEyeWatermark";
import { PeekPin } from "@/components/PeekPin";
import { BlueprintImage } from "@/components/BlueprintImage";
import { mapAccent } from "@/lib/map-accents";
import type { Floor, Map } from "@/lib/db";
import { rating, ratingLabel, votesText } from "@/lib/rate";
import { GradeBadge } from "@/components/GradeBadge";
import { isPeekNew } from "@/lib/peek-recency";
import { SpotList, type SpotMember } from "@/components/SpotList";

/** A group of peeks filmed at one spot, already ordered best-first. */
export type FloorSpot = { members: SpotMember[] };

type PositionedSpot = FloorSpot & { displayX: number; displayY: number };

type Props = {
  map: Map;
  floor: Floor;
  spots: FloorSpot[];
};

// Client wrapper around the bird's-eye image + pin overlay. Owns the
// "selected pin" state used on mobile: tap a pin → highlights → its
// details show in a fixed card below the map. Desktop users still get the
// hover tooltip and click-to-navigate behavior.
export function FloorView({ map, floor, spots }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Mirror of selectedId that lags by the panel exit-animation duration so
  // the card can play its slide-out before unmounting. While `panelClosing`
  // is true, the card is still rendered with peek-card-out applied.
  const [displayedSelectedId, setDisplayedSelectedId] =
    useState<string | null>(null);
  const [panelClosing, setPanelClosing] = useState(false);

  // Pin layout pass — runs client-side because it needs the rendered map
  // dimensions to convert percent coords to pixels for collision avoidance
  // and edge clamping. Stored coords on peeks are never mutated; this only
  // overrides display positions.
  const mapRef = useRef<HTMLDivElement>(null);
  // Layout runs over SPOTS, not peeks: every member of a spot shares one pin,
  // so collision and clamping only ever move that one pin.
  const seed = (): PositionedSpot[] =>
    spots.map((s) => ({
      ...s,
      displayX: s.members[0].x_pct,
      displayY: s.members[0].y_pct,
    }));
  const [adjustedSpots, setAdjustedSpots] = useState<PositionedSpot[]>(seed);

  useLayoutEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    function recompute() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      // Pin diameter matches the visible-pin Tailwind classes
      // (h-6 mobile, md:h-7 desktop). 4px minimum visual gap.
      const desktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 768px)").matches;
      const pinPx = desktop ? 28 : 24;
      const minDist = pinPx + 4;
      const r = pinPx / 2;

      const pts = spots.map((s) => ({
        spot: s,
        x: (s.members[0].x_pct / 100) * w,
        y: (s.members[0].y_pct / 100) * h,
      }));

      // Iterative repulsion — for each overlapping pair, push them
      // apart along the line connecting their centres by the overlap
      // amount. 5 passes is plenty for typical floors (<20 pins).
      for (let iter = 0; iter < 5; iter++) {
        let moved = false;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[j].x - pts[i].x;
            const dy = pts[j].y - pts[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= minDist || dist < 0.001) continue;
            const push = (minDist - dist) / 2;
            const ux = dx / dist;
            const uy = dy / dist;
            pts[i].x -= ux * push;
            pts[i].y -= uy * push;
            pts[j].x += ux * push;
            pts[j].y += uy * push;
            moved = true;
          }
        }
        if (!moved) break;
      }

      // Clamp so the full pin circle stays inside the map bounds.
      const next: PositionedSpot[] = pts.map(({ spot, x, y }) => {
        const cx = Math.max(r, Math.min(w - r, x));
        const cy = Math.max(r, Math.min(h - r, y));
        return {
          ...spot,
          displayX: (cx / w) * 100,
          displayY: (cy / h) * 100,
        };
      });
      setAdjustedSpots(next);
    }

    recompute();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [spots]);

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

  // Selection is keyed on the LEAD's id, for a single pin and a cluster alike.
  const displayedSelectedIndex = displayedSelectedId
    ? adjustedSpots.findIndex((s) => s.members[0].id === displayedSelectedId)
    : -1;
  const displayedSelected =
    displayedSelectedIndex >= 0 ? adjustedSpots[displayedSelectedIndex] : null;

  const totalPeeks = spots.reduce((n, s) => n + s.members.length, 0);
  const hasCluster = spots.some((s) => s.members.length > 1);

  return (
    <>
      {/* Outer wrapper has no overflow so tooltips and the active pin
          can extend beyond the visual bounds of the map without being
          clipped. The bordered/rounded image lives in a separate
          clipped sibling below it. */}
      <div ref={mapRef} className="relative aspect-[16/10] w-full">
        <div className="absolute inset-0 overflow-hidden rounded-card border border-border bg-card">
          {floor.birds_eye_url ? (
            <>
              <BlueprintImage
                src={floor.birds_eye_url}
                widths={[960, 1440, 1920]}
                // NOT the box width. The box is 16:10 and the blueprints are
                // 16:9, so object-cover scales to fill the HEIGHT and crops the
                // sides — it consumes width * (16/10) / (16/9) = 1.111x the box
                // width. Asking for the box width (960px) made the browser pick
                // the 960w candidate and then upscale it ~11%, which is visibly
                // softer than main downscaling the 1600x900 original. Asking for
                // what cover actually needs picks 1440w and downscales instead.
                sizes="(max-width: 1024px) 112vw, 1064px"
                accent={mapAccent(map.slug)}
                eager
                className="object-cover"
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
          {adjustedSpots.map((spot, i) => {
            const lead = spot.members[0];
            const open = selectedId === lead.id && spot.members.length > 1;
            return (
              <Fragment key={lead.id}>
              <PeekPin
                key={lead.id}
                slug={lead.slug}
                name={lead.name}
                xPct={spot.displayX}
                yPct={spot.displayY}
                number={i + 1}
                count={spot.members.length}
                isNew={isPeekNew(lead.created_at)}
                hasTiktok={!!lead.tiktok_url}
                ratingText={ratingLabel(
                  lead.base_success_rate,
                  lead.worked_votes,
                  lead.vote_count
                )}
                isSelected={selectedId === lead.id}
                onSelect={() => toggleSelect(lead.id)}
              />
              {/* Desktop popover. A SIBLING of its pin, never a child: inside
                  the pin, every click in the list would bubble to the pin's
                  own handler and toggle the spot shut. Rendered immediately
                  after its own pin so Tab from that pin lands on the first
                  row rather than on the next pin. */}
              {open && (
                <SpotPopover
                  spot={spot}
                  rank={i + 1}
                  floorName={floor.name}
                  onClose={deselect}
                />
              )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {totalPeeks > 0 && (
        <p className="mt-3 text-center text-[13px] text-muted">
          {/* Server-rendered either way — same element, same position, so the
              longer string cannot shift anything when a floor has a cluster. */}
          {hasCluster
            ? "Ranked by grade · a + badge means more peeks here"
            : "Ranked by grade"}
        </p>
      )}

      {/* Every peek inside a cluster, as a real link. A cluster pin is a
          button, so without this the members of a spot would be reachable only
          by opening a popover — invisible to a crawler and tedious for a
          screen reader working through the page linearly. */}
      {hasCluster && (
        <ul className="sr-only">
          {spots
            .filter((s) => s.members.length > 1)
            .flatMap((s) => s.members)
            .map((m) => (
              <li key={m.id}>
                <Link href={`/peeks/${m.slug}`}>{m.name}</Link>
              </li>
            ))}
        </ul>
      )}

      {/* Mobile-only detail card. Avoids the desktop tooltip's clipping
          and z-stacking issues entirely on the smallest screens. */}
      {totalPeeks > 0 && (
        <div className="mt-4 md:hidden">
          {displayedSelected ? (
            displayedSelected.members.length > 1 ? (
              <SelectedSpotCard
                key={displayedSelected.members[0].id}
                spot={displayedSelected}
                rank={displayedSelectedIndex + 1}
                floorName={floor.name}
                onClose={deselect}
                isClosing={panelClosing}
              />
            ) : (
              <SelectedPeekCard
                key={displayedSelected.members[0].id}
                peek={displayedSelected.members[0]}
                rank={displayedSelectedIndex + 1}
                mapName={map.name}
                floorName={floor.name}
                onClose={deselect}
                isClosing={panelClosing}
              />
            )
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
  peek: SpotMember;
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
        <SuccessTile peek={peek} />
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

// Rating tile for the mobile selected-pin card — the effectiveness grade.
// Measured tier puts the vote count in the tile label so the grade reads as
// community-backed; estimate tier keeps the "Effectiveness" label.
// Mobile counterpart of SelectedPeekCard for a cluster. Same shell, same
// enter/exit animation, same close button — the body is the spot's list
// instead of stat tiles, because the stats belong to individual peeks and a
// spot has several.
function SelectedSpotCard({
  spot,
  rank,
  floorName,
  onClose,
  isClosing,
}: {
  spot: FloorSpot;
  rank: number;
  floorName: string;
  onClose: () => void;
  isClosing: boolean;
}) {
  const animCls = isClosing ? "peek-card-out" : "peek-card-in";
  const count = spot.members.length;
  return (
    <div
      className={`overflow-hidden rounded-card border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)] ${animCls}`}
      role="region"
      aria-label={`${count} peeks at this spot`}
    >
      <SpotHeader
        rank={rank}
        count={count}
        floorName={floorName}
        onClose={onClose}
      />
      <SpotList members={spot.members} />
    </div>
  );
}

function SpotHeader({
  rank,
  count,
  floorName,
  onClose,
}: {
  rank: number;
  count: number;
  floorName: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 pb-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white ring-4 ring-brand/20"
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-ink">
          {count} peeks at this spot
        </h3>
        <p className="mt-0.5 text-xs text-muted">{floorName} · best grade first</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close spot list"
        className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-muted transition-colors hover:bg-ink/[0.06] hover:text-brand"
      >
        <X size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

// Desktop popover, anchored beside its pin.
//
// Position is measured in pixels and clamped inside the map box. It cannot be
// done with `transform: translateY(-50%)` on the card itself: peek-card-in
// animates `transform` with fill `both`, so the animation's value wins and the
// card would sit with its TOP on the pin — which hung it 144px below the map
// on a pin near the bottom edge. The animated card is therefore a child of a
// plain positioning wrapper, and the wrapper's transform stays untouched.
const POP_W = 282;
const POP_GAP = 40;
const POP_INSET = 8;

function SpotPopover({
  spot,
  rank,
  floorName,
  onClose,
}: {
  spot: PositionedSpot;
  rank: number;
  floorName: string;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const count = spot.members.length;
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    side: "left" | "right" | "above" | "below";
  } | null>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    const box = wrap?.parentElement?.getBoundingClientRect();
    if (!wrap || !card || !box || box.width <= 0) return;

    const pinX = (spot.displayX / 100) * box.width;
    const pinY = (spot.displayY / 100) * box.height;
    const h = Math.min(card.offsetHeight, box.height * 0.85);
    const needs = POP_W + POP_GAP;

    // A side is strongly preferred: the map is wider than it is tall, so there
    // is nearly always room left or right, and a side keeps the popover clear
    // of the pins directly above and below.
    let side: "left" | "right" | "above" | "below";
    if (box.width - pinX >= needs) side = "right";
    else if (pinX >= needs) side = "left";
    else side = pinY < box.height / 2 ? "below" : "above";

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    let left: number;
    let top: number;
    if (side === "right" || side === "left") {
      left = side === "right" ? pinX + POP_GAP : pinX - POP_GAP - POP_W;
      top = clamp(pinY - h / 2, POP_INSET, box.height - h - POP_INSET);
    } else {
      left = clamp(pinX - POP_W / 2, POP_INSET, box.width - POP_W - POP_INSET);
      top = side === "below" ? pinY + POP_GAP : pinY - POP_GAP - h;
      top = clamp(top, POP_INSET, box.height - h - POP_INSET);
    }
    setPos({ left, top, side });
  }, [spot.displayX, spot.displayY, count]);

  useEffect(() => {
    function pinEl() {
      return wrapRef.current?.parentElement?.querySelector<HTMLElement>(
        'button[aria-expanded="true"]'
      );
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const pin = pinEl();
      onClose();
      // Focus returns to the pin that opened it, so Tab resumes in place.
      pin?.focus();
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      // A click on the pin is its own toggle; closing here too would close and
      // immediately reopen.
      if (pinEl()?.contains(t)) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const side = pos?.side ?? "right";

  return (
    <div
      ref={wrapRef}
      // Hidden until measured, so it never paints at the wrong place first.
      style={{
        width: POP_W,
        left: pos ? pos.left : 0,
        top: pos ? pos.top : 0,
        visibility: pos ? "visible" : "hidden",
      }}
      className="absolute z-50 hidden md:block"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-label={`${count} peeks at this spot`}
        style={{ maxHeight: "min(85vh, 520px)" }}
        className="peek-card-in relative overflow-y-auto overscroll-contain rounded-card border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_10px_28px_rgba(0,0,0,0.16)]"
      >
        <SpotHeader
          rank={rank}
          count={count}
          floorName={floorName}
          onClose={onClose}
        />
        <SpotList members={spot.members} />
      </div>
      {/* Caret on the pin side, on the wrapper so the card's own scrolling
          cannot clip it. */}
      <span
        aria-hidden
        className={`absolute h-3 w-3 rotate-45 border-border bg-card ${
          side === "right"
            ? "left-[-6px] top-1/2 -mt-1.5 border-b border-l"
            : side === "left"
              ? "right-[-6px] top-1/2 -mt-1.5 border-r border-t"
              : side === "below"
                ? "left-1/2 top-[-6px] -ml-1.5 border-l border-t"
                : "bottom-[-6px] left-1/2 -ml-1.5 border-b border-r"
        }`}
      />
    </div>
  );
}

function SuccessTile({ peek }: { peek: SpotMember }) {
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  return (
    <StatTile label={r.tier === "measured" ? votesText(r.votes) : "Effectiveness"}>
      <GradeBadge label={r.label} score={r.score} />
    </StatTile>
  );
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
