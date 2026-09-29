"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pairId } from "@/lib/compare-pair";
import { mapAccent } from "@/lib/map-accents";
import { coverThumb } from "@/lib/cover-image";

// Two map slots and a Compare button. Imports lib/compare-pair, NOT lib/compare
// — the latter pulls lib/db and would drag the Supabase client into the client
// bundle.
export type PickerMap = {
  slug: string;
  name: string;
  cover: string | null;
};

// Fixed heights, set here rather than left to content: the box goes from "+ /
// Pick a map" to a long map name with a cover behind it, and anything
// content-sized would resize the moment you pick. CLS stays 0.
const BOX = "h-[190px] sm:h-[230px] lg:h-[260px]";
// Mirrors BOX's smallest step as an inline style, for the same reason the
// select is positioned inline: it must hold its size before CSS arrives.
const BOX_MIN_H = 190;

function Slot({
  value,
  maps,
  disabledSlug,
  onChange,
  label,
}: {
  value: PickerMap | null;
  maps: PickerMap[];
  disabledSlug: string | null;
  onChange: (slug: string) => void;
  label: string;
}) {
  const accent = value ? mapAccent(value.slug) : null;

  return (
    <div
      className={`relative flex-1 overflow-hidden rounded-card transition-shadow ${BOX} ${
        value
          ? "border border-border bg-card shadow-sm"
          : "border-2 border-dashed border-border bg-card/60"
      }`}
      style={{
        minHeight: BOX_MIN_H,
        ...(accent ? { boxShadow: `inset 0 0 0 3px ${accent}` } : null),
      }}
    >
      {/* Cover art behind a dark gradient, so the map name stays readable on
          every cover. Only when the map actually has one. */}
      {value?.cover && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverThumb(value.cover, 640)}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.42) 75%, rgba(0,0,0,0.25) 100%)",
            }}
          />
        </>
      )}

      <div className="relative flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        {value ? (
          <>
            <span
              className={`text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[34px] ${
                value.cover ? "text-white" : "text-ink"
              }`}
              style={{ textWrap: "balance" }}
            >
              {value.name}
            </span>
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
                value.cover ? "text-white/70" : "text-muted"
              }`}
            >
              Tap to change
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border text-2xl leading-none text-muted"
            >
              +
            </span>
            <span className="text-[15px] font-semibold text-muted">
              Pick a map
            </span>
          </>
        )}
      </div>

      {/* The native <select> is stretched over the whole card and made
          invisible, so a tap anywhere opens the OS picker — the wheel on iOS,
          the dropdown on desktop. That is a far better control than anything
          custom, and it is keyboard- and screen-reader-native for free.

          Positioned with an INLINE style, not a class. A select with ~18
          options is ~455px tall at its natural size, and until the stylesheet
          applied, two of them added ~911px to the page and then collapsed —
          a 0.25 layout shift on a page that is otherwise static. Inline styles
          ship inside the HTML, so they cannot arrive late. */}
      <select
        aria-label={label}
        value={value?.slug ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          appearance: "none",
        }}
      >
        <option value="" disabled>
          Pick a map
        </option>
        {maps.map((m) => (
          <option key={m.slug} value={m.slug} disabled={m.slug === disabledSlug}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ComparePicker({ maps }: { maps: PickerMap[] }) {
  const router = useRouter();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);

  const bySlug = (s: string | null) => maps.find((m) => m.slug === s) ?? null;
  const mapA = bySlug(a);
  const mapB = bySlug(b);
  const ready = !!a && !!b && a !== b;

  return (
    <div>
      <div className="relative flex items-stretch gap-3 sm:gap-5">
        <Slot
          label="First map"
          value={mapA}
          maps={maps}
          disabledSlug={b}
          onChange={setA}
        />

        {/* VS badge, centred on the seam. Absolutely positioned so it cannot
            add width and squeeze the boxes at 390. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-bg bg-ink font-mono text-[13px] font-bold tracking-wider text-white shadow-md sm:h-14 sm:w-14 sm:text-[15px]"
        >
          VS
        </span>

        <Slot
          label="Second map"
          value={mapB}
          maps={maps}
          disabledSlug={a}
          onChange={setB}
        />
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            if (!a || !b) return;
            // Straight to the canonical URL, so picking Oregon then Chalet
            // lands on /compare/chalet-vs-oregon with no redirect hop.
            router.push(`/compare/${pairId(a, b)}`);
          }}
          className="inline-flex items-center gap-2 rounded-btn bg-brand px-8 py-3.5 text-[16px] font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-ink/20 disabled:hover:translate-y-0 disabled:hover:opacity-100 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Compare
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
