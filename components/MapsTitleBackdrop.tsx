import type { CSSProperties } from "react";

// ── Change this one value to switch the backdrop, then redeploy. ──
// 'grid'  = parallax tactical grid
// 'radar' = radar sweep field
export const MAPS_BG: "grid" | "radar" = "grid";

// Purely decorative, CSS-animated backdrop that sits BEHIND the homepage
// "Maps" title block (lower z-index). Self-clipping + edge-masked band with a
// white radial vignette so the title text stays crisp and nothing bleeds onto
// the live-stats strip above or the maps grid below. No JS, no client hooks —
// all motion is CSS (see .peek-maps-* in globals.css) and stops under
// prefers-reduced-motion.
export function MapsTitleBackdrop() {
  return (
    <div
      aria-hidden
      className="peek-maps-bg pointer-events-none absolute inset-x-0 top-1/2 z-0 h-[150px] -translate-y-1/2 overflow-hidden"
    >
      {MAPS_BG === "grid" ? <GridField /> : <RadarField />}
      {/* White radial vignette keeps the center clean for the title text. */}
      <div className="peek-maps-vignette absolute inset-0" />
    </div>
  );
}

// Scanner targets: [top, left, animation-delay]. Each dot is detected (ping),
// then explodes (shockwave) "like it got shot". Spaced 10s apart so one fires
// roughly every 10 seconds, cycling through these scattered spots.
const GRID_TARGETS: Array<[string, string, string]> = [
  ["32%", "15%", "0s"],
  ["62%", "27%", "10s"],
  ["40%", "38%", "20s"],
  ["68%", "70%", "30s"],
  ["34%", "84%", "40s"],
  ["58%", "62%", "50s"],
];

function GridField() {
  return (
    <>
      <div className="peek-maps-grid peek-maps-grid-a absolute inset-[-25%]" />
      <div className="peek-maps-grid peek-maps-grid-b absolute inset-[-25%]" />
      <div className="peek-maps-glow" />
      <div className="peek-maps-scan" />
      {GRID_TARGETS.map(([top, left, delay], i) => (
        <span
          key={i}
          className="peek-maps-target"
          style={{ top, left, ["--d"]: delay } as CSSProperties}
        />
      ))}
      <span className="peek-maps-tick absolute left-3 top-1.5">GRID·046</span>
      <span className="peek-maps-tick absolute bottom-1.5 right-3">R6·SPAWN</span>
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
