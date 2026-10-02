"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The peek page's title, with the "where is this?" disclosure next to it.
 *
 * The map and floor used to sit in a breadcrumb line under the credit, which
 * spent a whole row on two words most readers already knew — they arrived from
 * that very floor. They now live behind a circled-i next to the title, which
 * costs the header nothing until someone actually asks.
 *
 * Two rules shape the markup:
 *
 *  - The card is a SIBLING of the <h1>, never a child. The h1's text content
 *    has to stay exactly the peek name; a map and floor nested inside it would
 *    end up in the page's heading text for every crawler and screen reader.
 *  - The card is always in the server HTML and merely hidden, so Google sees
 *    the map name, the floor name and both internal links on every load with no
 *    JS and no interaction. That is also why it is hidden with visibility
 *    rather than unmounted — there is nothing to mount on open, so the first
 *    tap cannot be slow.
 *
 * The card is absolutely positioned: opening it overlays the credit beneath,
 * and nothing on the page moves. The icon is inline and last inside the h1, so
 * on a name that wraps it rides along with the final line.
 */

/** Circled i. Sized by the button, so it follows the title's breakpoints. */
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-full w-full">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="7.6" r="1.15" fill="currentColor" />
      <path
        d="M12 10.9v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PeekTitle({
  name,
  mapName,
  mapHref,
  floorName,
  floorHref,
}: {
  name: string;
  mapName: string;
  mapHref: string;
  floorName: string;
  floorHref: string;
}) {
  const [open, setOpen] = useState(false);
  const cardId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Navigating away from the peek (including by tapping a link in the card
  // itself) leaves nothing open behind us.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Escape should hand focus back to where it came from, not drop it on
      // <body> and send the next Tab to the top of the page.
      btnRef.current?.focus();
    };
    // pointerdown, not click: closing on the press matches how the rest of the
    // site's overlays feel, and it fires before a link inside takes over.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || cardRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const where = `${mapName} · ${floorName}`;

  // Split off the final word so it can be glued to the icon. The capture keeps
  // the exact whitespace run that separated them, so head + gap + tail is the
  // name character-for-character — a name with a double space or an unusual
  // separator still renders as itself. A single-word name has no head at all.
  const m = /^([\s\S]*\S)(\s+)(\S+)$/.exec(name);
  const [head, gap, tail] = m ? [m[1], m[2], m[3]] : ["", "", name];

  return (
    <div className="relative">
      {/* No padding to balance the icon. Padding only ever balanced the ONE
          line the icon sits on; every other line of a wrapped name inherited
          the offset and sat half the padding to the right of centre. Without
          it each line centres on the page centre, and the icon's line centres
          as text-plus-icon together, which is what it should have been.

          text-balance splits a two-line name evenly instead of leaving a
          near-empty second line.

          aria-label looks redundant next to identical text, but it is load
          bearing: a heading's accessible name is built from its descendants,
          so without it the nested button's own label would be read as part of
          the heading ("Tower 2, Where is this peek? Oregon, Second floor").
          Naming the h1 explicitly stops at the peek name; the button keeps its
          own label for when it is focused. */}
      <h1
        aria-label={name}
        className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl"
      >
        {head}
        {gap}
        {/* The last word and the icon break as one unit, so the icon can never
            be left stranded on a line of its own. Splitting on the final run of
            whitespace and re-rendering that exact run keeps the h1's text
            content character-for-character the peek name. */}
        <span className="whitespace-nowrap">
          {tail}
          <button
            ref={btnRef}
            type="button"
            aria-expanded={open}
            aria-controls={cardId}
            aria-label={`Where is this peek? ${where}`}
            onClick={() => setOpen((v) => !v)}
            className={`relative ml-[8px] inline-flex h-[22px] w-[22px] translate-y-[-0.09em] align-middle transition-colors duration-150 sm:ml-[10px] sm:h-7 sm:w-7 ${
              open ? "text-brand" : "text-muted hover:text-brand"
            }`}
          >
            <InfoIcon />
            {/* A 44px target centred on a 22px glyph. Absolute, so the tap area
                is comfortable without the icon taking more room in the line. */}
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2"
            />
          </button>
        </span>
      </h1>

      <div
        ref={cardRef}
        id={cardId}
        role="region"
        aria-label="Peek location"
        className={`absolute left-1/2 top-full z-20 mt-2 w-[min(17rem,calc(100vw-2rem))] -translate-x-1/2 rounded-card border border-border bg-card p-3 text-left shadow-[0_6px_20px_rgba(0,0,0,0.09)] motion-safe:transition motion-safe:duration-150 ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible translate-y-1 opacity-0"
        }`}
      >
        <dl className="space-y-2">
          <WhereRow label="Map" value={mapName} href={mapHref} />
          <WhereRow label="Floor" value={floorName} href={floorHref} />
        </dl>
      </div>
    </div>
  );
}

function WhereRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="peek-where-label w-[46px] shrink-0">{label}</dt>
      <dd className="min-w-0">
        <Link
          href={href}
          className="text-[16.5px] font-semibold leading-snug text-ink underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand"
        >
          {value}
        </Link>
      </dd>
    </div>
  );
}
