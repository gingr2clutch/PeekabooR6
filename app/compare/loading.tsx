import { PageHeader } from "@/components/PageHeader";

// Route-scoped skeleton. Without it this page falls back to app/loading.tsx,
// whose 14-tile grid is ~1240px tall against this page's ~550px — the swap
// shrank the page by ~900px and dragged the footer with it, a 0.25 shift on an
// otherwise completely static page.
//
// The heading is rendered for real rather than as placeholder bars. It is
// static copy, so it costs nothing to render and it makes the skeleton exactly
// as tall as the final page at every width — which grey bars of a guessed
// height cannot do, because the h1 and subtitle wrap differently at 390 than at
// 1470. The two boxes and the button already have fixed sizes, so with the
// heading matched the whole page matches and CLS is 0.
export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-4xl px-4 pb-8 pt-6 sm:px-6">
        <div className="mb-10 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            Map comparisons
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Which map has the better peeks?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
            Every matchup is scored from real community data — S-tier counts,
            average grade, and total votes. Pick two maps and settle it.
          </p>
        </div>

        <div className="flex items-stretch gap-3 sm:gap-5">
          <div
            className="h-[190px] flex-1 animate-pulse rounded-card border-2 border-dashed border-border bg-card/60 sm:h-[230px] lg:h-[260px]"
            style={{ minHeight: 190 }}
          />
          <div
            className="h-[190px] flex-1 animate-pulse rounded-card border-2 border-dashed border-border bg-card/60 sm:h-[230px] lg:h-[260px]"
            style={{ minHeight: 190 }}
          />
        </div>

        <div className="mt-6 flex justify-center">
          {/* Same box the real button occupies: px-8 py-3.5 at 16px/1.5. */}
          <div className="h-[50px] w-[168px] animate-pulse rounded-btn bg-border" />
        </div>
      </main>
    </>
  );
}
