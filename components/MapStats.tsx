import Link from "next/link";
import { BestPeek } from "@/components/BestPeek";
import { PeekThumb } from "@/components/PeekThumb";
import { GradeBadge } from "@/components/GradeBadge";
import { rating } from "@/lib/rate";
import { GradeMixBar, type MapGrades } from "@/components/GradeMixBar";
import type { PeekWithContext } from "@/lib/db";

export type { MapGrades };

type Props = {
  peeks: number;
  votes: number;
  grades: MapGrades;
  // This map's top peek, rendered as a row inside the same card (optional).
  topPeek?: PeekWithContext | null;
};

// Map stats card: a white rounded card with a centered inline stat line
// (Peeks / Votes / S-Tier), a divider, the grade-mix bar + legend, and — when
// provided — a divider + the map's Top Peek row, all in one bubble. Real
// per-map data, computed server-side by the caller.
export function MapStats({ peeks, votes, grades, topPeek }: Props) {
  const stats = [
    { label: "Peeks", value: peeks },
    { label: "Votes", value: votes },
    { label: "S-Tier", value: grades.S },
  ];

  const r = topPeek
    ? rating(topPeek.base_success_rate, topPeek.worked_votes, topPeek.vote_count)
    : null;
  // Below lg this is one card, exactly as before. At lg it becomes 8 + 4: the
  // stats keep the left card and the top peek gets its own on the right.
  return (
    <div className="rounded-card border border-border bg-card px-4 py-5 shadow-sm sm:px-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <div className="lg:col-span-8 lg:flex lg:flex-col lg:rounded-card lg:border lg:border-border lg:bg-card lg:px-8 lg:py-7 lg:shadow-sm">
      {/* Small card header. */}
      <div className="mb-3 text-center text-lg font-bold tracking-tight text-ink lg:mb-5 lg:text-left lg:text-xl">
        Map Stats
      </div>

      {/* Stat line — bold black numbers + muted mono labels.
          lg: (>=1024px) the card is ~976px wide inside max-w-5xl, so three
          centred stats leave a lot of dead space either side. Spreading them
          evenly also lines the row up with the full-width grade bar below,
          rather than floating as a short cluster above it. */}
      {/* At lg the row stretches to the top-peek card, so the stat line takes
          the leftover space and centres in it. Pinning only the bar to the
          bottom left a gap in the middle instead of at the end — same empty
          band, moved. */}
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 sm:gap-x-10 lg:flex-1 lg:justify-start lg:gap-x-16">
        {stats.map((s) => (
          <div key={s.label} className="inline-flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums tracking-tight text-ink sm:text-2xl lg:text-4xl">
              {s.value.toLocaleString("en-US")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted lg:text-[11px]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Thin divider. Pushed to the bottom at lg (mt-auto) so the grade
          bar and legend sit on the card's lower edge instead of leaving a
          band of empty card beneath them once the row stretches. */}
      <div className="my-4 border-t border-border" />

      {/* Grade mix bar — stacked share of S/A/B/C across this map's peeks. */}
      <GradeMixBar grades={grades} />

      </div>

      {/* Top Peek. Two presentations of the same peek: the existing inline row
          below lg (untouched), and the mock's vertical card at lg. Gated so
          exactly one is ever visible — the hidden one is display:none, not a
          second link a reader or a crawler follows twice into the page. */}
      {topPeek && (
        <div className="lg:col-span-4 lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-card lg:shadow-sm">
          <div className="lg:hidden">
            <div className="my-4 border-t border-border" />
            <BestPeek peek={topPeek} eyebrow="Top Peek" bare />
          </div>

          <div className="hidden lg:flex lg:h-full lg:flex-col">
            {/* Fixed 16/9 box, so the thumbnail cannot shift anything when it
                decodes. */}
            {/* Same cascade BestPeek uses below lg — clip first frame, then
                map cover, then stripes. poster_url is null on almost every
                peek, which is why this card was rendering blank. Fixed 16/9
                box, so nothing shifts when the frame decodes. */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <PeekThumb peek={topPeek} sizes="420px" />
            </div>
            <div className="flex flex-1 flex-col px-5 py-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
                Top Peek
              </span>
              <Link
                href={`/peeks/${topPeek.slug}?from=map`}
                className="mt-1 text-lg font-bold tracking-tight text-ink hover:text-brand"
              >
                {topPeek.name}
              </Link>
              <span className="text-[13px] text-muted">
                {topPeek.floors?.name}
              </span>
              <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                <Link
                  href={`/peeks/${topPeek.slug}?from=map`}
                  className="text-[13px] font-semibold text-brand hover:underline"
                >
                  Watch the clip →
                </Link>
                {r && (
                  <span className="flex flex-col items-end gap-1">
                    <GradeBadge label={r.label} score={r.score} />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">
                      {topPeek.vote_count}{" "}
                      {topPeek.vote_count === 1 ? "vote" : "votes"}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
