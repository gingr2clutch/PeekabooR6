import { PageHeader } from "@/components/PageHeader";

// Route-scoped skeleton — same reason as app/compare/loading.tsx: the root
// app/loading.tsx is a ~1240px tile grid and this page is ~770-810px.
//
// The rafter heading and the two navs are rendered for real, not as grey bars.
// They are static (the default view is always "Top contributors" / All time),
// so they cost nothing and they make the top of the skeleton pixel-identical to
// the top of the page at every width. Only the board below is a placeholder,
// because its height genuinely depends on how many contributors there are.
export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="arena pb-8">
        <section className="arena-rafter">
          <div className="site-shell mx-auto max-w-3xl px-4 pb-14 pt-8 text-center sm:pt-10">
            <div className="arena-trophy-stage" aria-hidden />
            <h1 className="arena-title mt-4 text-5xl sm:text-6xl">
              Top <span className="text-brand">contributors</span>
            </h1>
            <p className="arena-subline mt-4 text-base sm:text-lg">
              Players who sent in a clip that made the site. Their name stays on
              the peek.
            </p>
          </div>
        </section>

        <div className="site-shell mx-auto max-w-3xl px-4">
          <div className="mx-auto mt-2 grid w-full max-w-sm grid-cols-2 gap-1 rounded-[16px] border border-border bg-card p-[5px] shadow-sm">
            <span className="rounded-[12px] px-4 py-3 text-center text-[16px] font-semibold lg:text-[18px]">
              Peeks
            </span>
            <span className="rounded-[12px] px-4 py-3 text-center text-[16px] font-semibold lg:text-[18px]">
              Gadgets
            </span>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["This week", "This month", "All time"].map((t) => (
              <span
                key={t}
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            &nbsp;
          </p>

          <div className="mt-8 grid grid-cols-3 items-end gap-2 sm:gap-4">
            {/* Heights measured against the live board, not guessed: the
                default (Peeks, All time) view renders at exactly this height at
                both 390 and 1470, so the default view — the one every visitor
                and every crawler lands on — has no shift at all. */}
            <div className="h-[213px] animate-pulse rounded-t-[14px] bg-border/60" />
            <div className="h-[241px] animate-pulse rounded-t-[14px] bg-border/70" />
            <div className="h-[203px] animate-pulse rounded-t-[14px] bg-border/60" />
          </div>
        </div>
      </main>
    </>
  );
}
