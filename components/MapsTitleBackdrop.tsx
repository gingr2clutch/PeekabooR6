import type { CSSProperties } from "react";

// ── Change this one value to switch the backdrop, then redeploy. ──
// 'ember' = warm embers drifting up over a soft glow
// 'radar' = radar sweep field
export const MAPS_BG: "ember" | "radar" = "ember";

// Purely decorative, CSS-animated backdrop that sits BEHIND the homepage
// "Maps" title block (lower z-index). Self-clipping + edge-masked band with a
// white radial vignette so the title text stays crisp and nothing bleeds onto
// the live-stats strip above or the maps grid below. No JS, no client hooks —
// all motion is CSS (see .peek-maps-* in globals.css) and stops under
// prefers-reduced-motion (embers hidden, only the static glow remains).
export function MapsTitleBackdrop() {
  return (
    <div
      aria-hidden
      className="peek-maps-bg pointer-events-none absolute inset-x-0 top-1/2 z-0 h-[150px] -translate-y-1/2 overflow-hidden"
    >
      {MAPS_BG === "ember" ? <EmberField /> : <RadarField />}
      {/* White radial vignette keeps the center clean for the title text. */}
      <div className="peek-maps-vignette absolute inset-0" />
    </div>
  );
}

// Tiny embers. left/bottom/size position them; dur/delay vary the speed and
// keep them out of sync (negative delay → already mid-rise on load); peak is
// the fade-in opacity; drift is a small sideways sway.
type Ember = {
  left: number;
  bottom: number;
  size: number;
  peak: number;
  drift: number;
  dur: number;
  delay: number;
};

const EMBERS: Ember[] = [
  { left: 16, bottom: 12, size: 4, peak: 0.55, drift: 6, dur: 11, delay: -2 },
  { left: 30, bottom: 34, size: 3, peak: 0.45, drift: -5, dur: 13, delay: -7 },
  { left: 44, bottom: 6, size: 5, peak: 0.5, drift: 5, dur: 10, delay: -9.5 },
  { left: 57, bottom: 40, size: 3, peak: 0.5, drift: -7, dur: 14, delay: -1 },
  { left: 69, bottom: 16, size: 4, peak: 0.5, drift: 6, dur: 12, delay: -4.5 },
  { left: 81, bottom: 28, size: 3, peak: 0.45, drift: -4, dur: 12.5, delay: -8 },
  { left: 89, bottom: 9, size: 4, peak: 0.5, drift: 5, dur: 13.5, delay: -11 },
];

function EmberField() {
  return (
    <>
      <div className="peek-maps-ember-glow" />
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="peek-maps-ember"
          style={
            {
              left: `${e.left}%`,
              bottom: `${e.bottom}px`,
              height: `${e.size}px`,
              width: `${e.size}px`,
              animationDuration: `${e.dur}s`,
              animationDelay: `${e.delay}s`,
              ["--peak"]: e.peak,
              ["--drift"]: `${e.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

function blip(top: string, left: string, delay: string): CSSProperties {
  return { top, left, animationDelay: delay };
}

function RadarField() {
  return (
    <>
      <div className="peek-maps-rings" />
      <div className="peek-maps-sweep" />
      <span className="peek-maps-blip" style={blip("30%", "58%", "0.6s")} />
      <span className="peek-maps-blip" style={blip("62%", "40%", "2.1s")} />
      <span className="peek-maps-blip" style={blip("46%", "68%", "3.4s")} />
      <span className="peek-maps-blip" style={blip("40%", "34%", "4.3s")} />
    </>
  );
}
