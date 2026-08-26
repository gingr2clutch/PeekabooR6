"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { track, type RoulettePlacement } from "@/lib/analytics";
import { gradeTierColor } from "@/lib/rate";
import type { RoulettePeek } from "@/lib/peek-roulette-wheel";

type Props = {
  peek: RoulettePeek;
  mapName: string;
  mapSlug: string;
  placement: RoulettePlacement;
  posterUrl?: string | null;
  onSpinAgain: () => void;
  onClose: () => void;
};

// The payoff popup. Deliberately never auto-navigates — landing on the peek is
// the moment, so the visitor decides whether to go.
//
// No shared Modal component exists in this codebase (SiteNav and the admin
// peeks table each hand-roll one), so the dialog behaviour here follows
// SiteNav's pattern: role=dialog + aria-modal, Escape to close, body scroll
// locked while open, focus moved in and restored on close.
export function PeekRouletteWinModal({
  peek,
  mapName,
  mapSlug,
  placement,
  posterUrl,
  onSpinAgain,
  onClose,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);

    // Lock scroll without changing layout width — overflow alone would let the
    // scrollbar disappear and shift the page behind the overlay.
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    cardRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreRef.current?.focus?.();
    };
  }, [onClose]);

  const gradeColor = gradeTierColor(peek.gradeLabel);

  return (
    <div
      className="pr-win"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-win-name"
        tabIndex={-1}
        className="pr-wincard"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pr-winx"
        >
          ✕
        </button>

        <div className="pr-winbar">
          <div className="pr-kicker">The wheel landed on</div>
        </div>

        <div className="pr-winbody">
          <div className="pr-winthumb">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt=""
                fill
                sizes="330px"
                className="object-cover"
              />
            ) : null}
            <span aria-hidden className="pr-winplay">
              ▶
            </span>
            <span
              className="pr-wingrade"
              style={{ background: gradeColor }}
              aria-label={`Grade ${peek.gradeLabel}`}
            >
              {peek.gradeLabel}
            </span>
          </div>

          <div className="pr-winmap">{mapName.toUpperCase()}</div>
          <div id="pr-win-name" className="pr-winname">
            {peek.name}
          </div>
          {peek.floorName && <div className="pr-winfloor">{peek.floorName}</div>}

          <div className="pr-winacts">
            <a
              href={`/peeks/${peek.slug}?from=roulette`}
              onClick={() =>
                track("roulette_go_to_peek", {
                  placement,
                  map: mapSlug,
                  peek_id: peek.id,
                })
              }
              className="pr-wingo"
            >
              Go to peek →
            </a>
            <button type="button" onClick={onSpinAgain} className="pr-winagain">
              ↻ Spin again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
