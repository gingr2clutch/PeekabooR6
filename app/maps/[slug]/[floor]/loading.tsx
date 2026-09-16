import { PageHeader } from "@/components/PageHeader";

const SKELETON_PINS = [
  { x: 22, y: 35 },
  { x: 48, y: 60 },
  { x: 70, y: 28 },
  { x: 35, y: 75 },
  { x: 80, y: 70 },
];

// Loading shell for a floor page.
//
// This has to reserve roughly the HEIGHT OF THE REAL PAGE, not just sketch its
// top. It previously stopped after the blueprint, so while the page streamed
// the document was about 420px shorter than it would end up — short enough to
// fit the viewport, which parked the footer at the bottom of the screen. When
// the content arrived the footer was shoved down and out, and because it had
// been visible that counted: 0.087 CLS on production, the entire score for the
// page, with no ad involved.
//
// So every block below the blueprint is stubbed here at the same size it
// renders at: the "ranked by grade" line, the mobile tap-a-pin card, the rank
// sentence and the floor-stats box. Matching the real markup's classes rather
// than hardcoding pixel heights means the two stay in step if the real page
// changes.
//
// Exactness is neither possible nor needed — the floor-chip row wraps
// differently per map, so a few pixels of drift remain. What mattered was the
// 420px hole.
export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        {/* Back link, title and the floor chips — mirrors the real header
            block, which is ~170px tall, not the 32px this used to reserve. */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-9 w-24 animate-pulse rounded-btn bg-border/70" />
          <div className="mx-auto h-9 w-64 animate-pulse rounded-btn bg-border" />
          <div className="mx-auto mt-2 h-6 w-52 animate-pulse rounded-btn bg-border/60" />
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-24 animate-pulse rounded-btn bg-border/70"
              />
            ))}
          </div>
        </div>

        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card border border-border bg-card">
          <div className="placeholder-stripes h-full w-full" />
          {SKELETON_PINS.map((p, i) => (
            <span
              key={i}
              className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-border ring-2 ring-white sm:h-8 sm:w-8"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          ))}
        </div>

        {/* "Ranked by grade" */}
        <div className="mx-auto mt-3 h-5 w-28 animate-pulse rounded-btn bg-border/60" />

        {/* Mobile-only tap-a-pin card. md:hidden to match the real one, so the
            desktop shell does not over-reserve. */}
        <div className="mt-4 h-[46px] animate-pulse rounded-card border border-dashed border-border bg-card md:hidden" />

        {/* The "ranks Nth of M" sentence */}
        <div className="mx-auto mt-6 h-5 w-64 animate-pulse rounded-btn bg-border/60" />

        {/* Floor stats — the tallest block below the blueprint at ~204px, and
            the single biggest piece of the reservation. */}
        <section className="mx-auto mt-12 max-w-md">
          <div className="mx-auto h-4 w-24 animate-pulse rounded-btn bg-border/70" />
          <div className="mt-3 grid grid-cols-2 gap-y-6 rounded-card border border-border bg-card px-2 py-6 sm:grid-cols-4 sm:gap-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-7 w-12 animate-pulse rounded-btn bg-border" />
                <div className="h-3 w-14 animate-pulse rounded-btn bg-border/60" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
