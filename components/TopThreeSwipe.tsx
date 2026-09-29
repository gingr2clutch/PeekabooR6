import Link from "next/link";
import { TopThreeScroller } from "@/components/TopThreeScroller";
import { coverThumb } from "@/lib/cover-image";
import { gradeTierColor, rating } from "@/lib/rate";
import type { PeekWithContext } from "@/lib/db";

// The top 3 as a swipe row. Phones only — /top and /underrated both render
// this alongside their pennant block, which is hidden below md.
//
// Server component: the cards are plain markup and are handed to the client
// scroller as children, so only the dot tracking ships JS.

const ACCENT = {
  top: "#f2640e", // brand orange
  underrated: "#0e8f8b", // gem teal
} as const;

export type SwipeFrom = keyof typeof ACCENT;

// The preview is a 1:1 crop of a 1000px-wide render of the floor blueprint,
// positioned so the peek's own pin sits under the marker. object-fit: none is
// what makes it a crop rather than a fit — the image keeps its natural size and
// object-position slides it, which is far cheaper than generating per-peek
// thumbnails and needs no new storage.
const PREVIEW_W = 1000;
const PREVIEW_Q = 70;

function Card({
  peek,
  rank,
  from,
}: {
  peek: PeekWithContext;
  rank: 1 | 2 | 3;
  from: SwipeFrom;
}) {
  const floor = peek.floors!;
  const map = floor.maps;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const votes = peek.vote_count ?? 0;
  const src = floor.birds_eye_url
    ? coverThumb(floor.birds_eye_url, PREVIEW_W, PREVIEW_Q)
    : null;

  return (
    <li className="t3-item">
      <Link
        href={`/peeks/${peek.slug}?from=${from}`}
        aria-label={`Open peek: ${peek.name}, ${map.name}`}
        className={`t3-card t3-card--${rank}`}
      >
        <span className="t3-preview">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              srcSet={`${src} 2x`}
              alt=""
              aria-hidden
              // #1 is above the fold on every phone and is the page's LCP
              // candidate; #2 and #3 are off-screen until swiped.
              loading={rank === 1 ? "eager" : "lazy"}
              {...(rank === 1 ? { fetchpriority: "high" } : {})}
              decoding={rank === 1 ? "sync" : "async"}
              className="t3-img"
              style={{ objectPosition: `${peek.x_pct}% ${peek.y_pct}%` }}
            />
          )}
          {/* Same treatment as the floor-map pins. No sight cone: direction is
              not a column we store. */}
          <span
            aria-hidden
            className="t3-pin"
            style={{ left: `${peek.x_pct}%`, top: `${peek.y_pct}%` }}
          />
          <span className="t3-watch" aria-hidden>
            <span className="t3-watch-glyph">▶</span> Watch
          </span>
        </span>

        {rank === 1 && (
          <span className="t3-crown" aria-hidden>
            👑
          </span>
        )}
        <span className={`arena-coin arena-coin--${rank} t3-coin`} aria-hidden>
          {rank}
        </span>

        <span className="t3-body">
          <span className="t3-name">{peek.name}</span>
          <span className="t3-loc">
            {map.name} · {floor.name}
          </span>
          <span className="t3-meta">
            {/* Colour always comes from gradeTierColor — the grade tiers are
                never collapsed into one fixed colour. */}
            <span
              className="arena-grade t3-grade"
              style={{ backgroundColor: gradeTierColor(r.label) }}
              aria-label={`Grade ${r.label}`}
            >
              {r.label}
            </span>
            <span className="t3-votes">
              {votes} {votes === 1 ? "vote" : "votes"}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export function TopThreeSwipe({
  peeks,
  from,
  className = "",
}: {
  /** the top three, best first */
  peeks: PeekWithContext[];
  from: SwipeFrom;
  className?: string;
}) {
  const three = peeks.slice(0, 3);
  if (three.length === 0) return null;

  return (
    <div className={className}>
      <TopThreeScroller
        count={three.length}
        accent={ACCENT[from]}
        label={from === "top" ? "Top three peeks" : "Top three hidden gems"}
      >
        {three.map((peek, i) => (
          <Card
            key={peek.id}
            peek={peek}
            rank={(i + 1) as 1 | 2 | 3}
            from={from}
          />
        ))}
      </TopThreeScroller>
    </div>
  );
}
