// Purely decorative "morphing mesh" backdrop for the homepage top block — it
// sits BEHIND both the live-stats counter and the "Maps" title as one
// continuous layer (z-0). Three soft warm-orange radial blooms slowly drift and
// scale on their own timing so the whole thing gently morphs (no hard edges,
// no lines); a soft porcelain radial veil over the center keeps the numbers and
// title text readable. This element clips + edge-masks itself, so nothing
// bleeds into the maps grid below. No JS — all motion is CSS (.peek-mesh-* in
// globals.css) and stops (static soft glow) under prefers-reduced-motion.
export function MeshBackdrop() {
  return (
    <div
      aria-hidden
      className="peek-mesh pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="peek-mesh-bloom peek-mesh-a" />
      <div className="peek-mesh-bloom peek-mesh-b" />
      <div className="peek-mesh-bloom peek-mesh-c" />
      <div className="peek-mesh-veil absolute inset-0" />
    </div>
  );
}
