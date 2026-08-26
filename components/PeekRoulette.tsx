"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track, type RoulettePlacement } from "@/lib/analytics";
import {
  RouletteWheel,
  rouletteSound,
  type RoulettePeek,
} from "@/lib/peek-roulette-wheel";

export type RouletteVariant = "compact" | "full" | "mini";

type Props = {
  mapName: string;
  mapSlug: string;
  peeks: RoulettePeek[];
  variant: RouletteVariant;
  placement: RoulettePlacement;
  onLand: (peek: RoulettePeek) => void;
  // Set by "Spin again": the component remounts and spins straight away
  // rather than waiting for another tap.
  autoSpin?: boolean;
};

// Canvas pixel size per variant. Fixed, not responsive: the felt bar's height
// must never change (the result lives in the popup), so nothing here can move
// surrounding content. Zero CLS by construction.
const SIZE: Record<RouletteVariant, number> = {
  compact: 112,
  full: 212,
  mini: 66,
};

export function PeekRoulette({
  mapName,
  mapSlug,
  peeks,
  variant,
  placement,
  onLand,
  autoSpin = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<RouletteWheel | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  // Read the persisted mute choice after mount only. Reading it during render
  // would mismatch the server HTML and trip a hydration error.
  useEffect(() => setSoundOn(rouletteSound.on), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peeks.length === 0) return;
    const wheel = new RouletteWheel(canvas, peeks, { mini: variant === "mini" });
    wheelRef.current = wheel;
    wheel.startIdle();
    return () => {
      wheel.destroy();
      wheelRef.current = null;
    };
    // Rebuilt only if the pool identity or variant changes — never per render,
    // since construction re-scales the canvas backing store.
  }, [peeks, variant]);

  const spin = useCallback(() => {
    const wheel = wheelRef.current;
    if (!wheel || wheel.spinning || peeks.length === 0) return;
    setSpinning(true);
    track("roulette_spin_started", { placement, map: mapSlug });
    wheel.spin((winner) => {
      setSpinning(false);
      track("roulette_peek_landed", {
        placement,
        map: mapSlug,
        peek_id: winner.id,
        grade: winner.gradeLabel,
      });
      // Brief beat so the ball is seen to settle before the popup covers it.
      window.setTimeout(() => onLand(winner), 380);
    });
  }, [mapSlug, onLand, peeks.length, placement]);

  const toggleSound = useCallback(() => {
    setSoundOn(rouletteSound.toggle());
  }, []);

  // "Spin again" path. rAF defers to the frame after the wheel is constructed
  // and idling, so the spin starts from a drawn face rather than a blank one.
  useEffect(() => {
    if (!autoSpin) return;
    const id = requestAnimationFrame(() => spin());
    return () => cancelAnimationFrame(id);
  }, [autoSpin, spin]);

  // A map with no published peeks has nothing to land on. Render nothing
  // rather than an inert wheel.
  if (peeks.length === 0) return null;

  const px = SIZE[variant];

  const wheelCanvas = (
    <canvas
      ref={canvasRef}
      width={px}
      height={px}
      role="button"
      tabIndex={0}
      aria-label={`Spin Peek Roulette for a random ${mapName} peek`}
      aria-disabled={spinning}
      onClick={spin}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          spin();
        }
      }}
      className="pr-canvas"
    />
  );

  // 'full' is the wheel alone, for the homepage modal — the felt, heading and
  // sound toggle belong to that modal, not here.
  if (variant === "full") {
    return (
      <div className="pr-wheelhold pr-wheelhold--full">
        {wheelCanvas}
        <div className="pr-word">{spinning ? "Spinning…" : " "}</div>
      </div>
    );
  }

  return (
    <div className="pr-felt pr-felt--compact">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleSound();
        }}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Mute roulette sound" : "Unmute roulette sound"}
        className={`pr-sound ${soundOn ? "is-on" : ""}`}
      >
        {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
      </button>

      <div className="pr-wheelhold">{wheelCanvas}</div>

      <div className="pr-body">
        <div className="pr-title">Peek Roulette</div>
        <div className="pr-sub">
          {spinning ? "Good luck…" : `Spin a random ${mapName} peek`}
        </div>
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="pr-cta"
        >
          {spinning ? "Spinning…" : "Spin the wheel"}
        </button>
      </div>
    </div>
  );
}

function SoundOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M17 9l4 6M21 9l-4 6" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
    </svg>
  );
}
