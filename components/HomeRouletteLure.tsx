"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PeekRoulette } from "@/components/PeekRoulette";
import { PeekRouletteWinModal } from "@/components/PeekRouletteWinModal";
import { track } from "@/lib/analytics";
import {
  RouletteWheel,
  rouletteSound,
  type RoulettePeek,
} from "@/lib/peek-roulette-wheel";

type MapChoice = { slug: string; name: string };

type Props = { maps: MapChoice[] };

// Decorative pool for the idle lure only. The mini wheel draws no text, so all
// it needs is a spread of grade labels to colour ten pockets — no peek data is
// shipped to the homepage for this. It is never spun: tapping opens the map
// picker, and the real pool is fetched once a map is chosen.
const IDLE_FACE: RoulettePeek[] = ["S", "A", "B", "C", "A", "S", "B", "C", "A", "B"].map(
  (g, i) => ({
    id: `idle-${i}`,
    slug: "",
    name: "",
    floorName: null,
    gradeLabel: g,
    videoUrl: null,
    posterUrl: null,
  })
);

type Pool = {
  peeks: RoulettePeek[];
  mapName: string;
  mapCoverUrl: string | null;
};

export function HomeRouletteLure({ maps }: Props) {
  const lureRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<RouletteWheel | null>(null);

  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string>(maps[0]?.slug ?? "");
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<RoulettePeek | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => setSoundOn(rouletteSound.on), []);

  // Idle lure. Ambient rotation is suppressed under reduced motion by
  // startIdle itself, which draws one static frame instead.
  useEffect(() => {
    const canvas = lureRef.current;
    if (!canvas) return;
    const wheel = new RouletteWheel(canvas, IDLE_FACE, { mini: true });
    wheelRef.current = wheel;
    wheel.startIdle();
    return () => {
      wheel.destroy();
      wheelRef.current = null;
    };
  }, []);

  // Pause the lure while any overlay is up — nothing is looking at it, and it
  // keeps a rAF loop off the main thread during the spin.
  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    if (open || landed) wheel.stopIdle();
    else wheel.startIdle();
  }, [open, landed]);

  const loadPool = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/maps/${slug}/roulette-peeks`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Pool;
      if (data.peeks.length === 0) throw new Error("empty");
      setPool(data);
    } catch {
      setPool(null);
      setError("Couldn't load that map's peeks. Pick another, or try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openPicker = useCallback(() => {
    track("roulette_opened", { placement: "homepage" });
    setOpen(true);
    setPool(null);
    setError(null);
    setSpinning(false);
  }, []);

  const closeAll = useCallback(() => {
    setOpen(false);
    setPool(null);
    setSpinning(false);
    setError(null);
  }, []);

  // Escape + scroll lock for the picker. The win popup manages its own.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAll();
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open, closeAll]);

  const startSpin = useCallback(async () => {
    if (!chosen) return;
    setSpinning(true);
    if (!pool) await loadPool(chosen);
  }, [chosen, pool, loadPool]);

  const handleLand = useCallback(
    (peek: RoulettePeek) => {
      // The picker closes so the payoff lands on a clear screen.
      setOpen(false);
      setSpinning(false);
      setLanded(peek);
    },
    []
  );

  const handleSpinAgain = useCallback(() => {
    setLanded(null);
    setOpen(true);
    setSpinning(true);
  }, []);

  if (maps.length === 0) return null;

  const activeMapName =
    pool?.mapName ?? maps.find((m) => m.slug === chosen)?.name ?? "";

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label="Open Peek Roulette"
        aria-haspopup="dialog"
        className="pr-lure"
      >
        <canvas ref={lureRef} width={66} height={66} aria-hidden />
        <span aria-hidden className="pr-bang">
          !
        </span>
      </button>

      {open && (
        <div
          className="pr-win"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAll();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pr-pick-head"
            className="pr-felt pr-felt--modal"
          >
            <button
              type="button"
              onClick={closeAll}
              aria-label="Close"
              className="pr-winx pr-winx--left"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => setSoundOn(rouletteSound.toggle())}
              aria-pressed={soundOn}
              aria-label={soundOn ? "Mute roulette sound" : "Unmute roulette sound"}
              className={`pr-sound ${soundOn ? "is-on" : ""}`}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>

            <div id="pr-pick-head" className="pr-mhead">
              Peek Roulette
            </div>

            {!spinning ? (
              <>
                <div className="pr-mq">What map are you on?</div>
                <div className="pr-chips">
                  {maps.map((m) => (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => {
                        setChosen(m.slug);
                        setPool(null);
                        setError(null);
                      }}
                      aria-pressed={chosen === m.slug}
                      className={`pr-chip ${chosen === m.slug ? "is-sel" : ""}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                {error && <p className="pr-merr">{error}</p>}
                <button
                  type="button"
                  onClick={startSpin}
                  disabled={loading}
                  className="pr-btn-gold"
                >
                  {loading ? "Loading…" : "Spin the wheel"}
                </button>
              </>
            ) : pool ? (
              <PeekRoulette
                mapName={pool.mapName}
                mapSlug={chosen}
                peeks={pool.peeks}
                variant="full"
                placement="homepage"
                onLand={handleLand}
                autoSpin
              />
            ) : error ? (
              <>
                <p className="pr-merr">{error}</p>
                <button
                  type="button"
                  onClick={() => setSpinning(false)}
                  className="pr-btn-gold"
                >
                  Pick another map
                </button>
              </>
            ) : (
              <div className="pr-word">Loading…</div>
            )}
          </div>
        </div>
      )}

      {landed && (
        <PeekRouletteWinModal
          peek={landed}
          mapName={activeMapName}
          mapSlug={chosen}
          placement="homepage"
          mapCoverUrl={pool?.mapCoverUrl ?? null}
          onSpinAgain={handleSpinAgain}
          onClose={() => setLanded(null)}
        />
      )}
    </>
  );
}
