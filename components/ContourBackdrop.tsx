// Purely decorative "contour drift" backdrop for the homepage top block — it
// sits BEHIND both the live-stats counter and the "Maps" title as one
// continuous layer (z-0). Two faint topographic ring patterns in the accent
// orange drift slowly in different directions; a soft porcelain radial veil
// over the center keeps the numbers and title text readable. This element
// clips itself (overflow-hidden) to the wrapper it fills, so nothing bleeds
// into the maps grid below. No JS — all motion is CSS (.peek-contour-* in
// globals.css) and stops under prefers-reduced-motion.
export function ContourBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="peek-contour peek-contour-a" />
      <div className="peek-contour peek-contour-b" />
      <div className="peek-contour-veil absolute inset-0" />
    </div>
  );
}
