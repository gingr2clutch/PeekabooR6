import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { NitroAdSlot } from "@/components/NitroAdSlot";
import { ExploreNext } from "@/components/ExploreNext";
import { TopThreeSwipe } from "@/components/TopThreeSwipe";
import { getUnderratedPeeks, type PeekWithContext } from "@/lib/db";
import { rating, gradeTierColor, GRADED_THRESHOLDS } from "@/lib/rate";
import { computeDirection, getSnapshotsForPeeks } from "@/lib/trends";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Underrated peeks — hidden gems",
  description:
    "High-grade Rainbow Six Siege spawn peeks the community hasn't voted on much yet. Discover hidden gems and vote to surface them.",
  alternates: { canonical: `${SITE_URL}/underrated` },
};

function voteLabel(votes: number) {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

// A detailed faceted brilliant-cut diamond. Spins in 3D (rotateY) in the
// header; the facet shades give it the cut look, sparkles twinkle around it.
function Diamond() {
  return (
    <svg className="arena-gem-svg" viewBox="0 0 100 100" aria-hidden>
      <g
        stroke="#0b6b66"
        strokeWidth="0.5"
        strokeOpacity="0.35"
        strokeLinejoin="round"
      >
        {/* crown */}
        <polygon points="32,24 68,24 69,48 31,48" fill="#ecfdfc" />
        <polygon points="32,24 31,48 20,48" fill="#86d8d1" />
        <polygon points="32,24 20,48 10,48" fill="#b7ece7" />
        <polygon points="68,24 80,48 69,48" fill="#86d8d1" />
        <polygon points="68,24 90,48 80,48" fill="#b7ece7" />
        {/* pavilion */}
        <polygon points="10,48 20,48 50,96" fill="#1f8a82" />
        <polygon points="20,48 31,48 50,96" fill="#39b6ad" />
        <polygon points="31,48 50,48 50,96" fill="#22938b" />
        <polygon points="50,48 69,48 50,96" fill="#41beb5" />
        <polygon points="69,48 80,48 50,96" fill="#22938b" />
        <polygon points="80,48 90,48 50,96" fill="#1f8a82" />
      </g>
      {/* girdle line + outline */}
      <line x1="10" y1="48" x2="90" y2="48" stroke="#0b6b66" strokeWidth="0.7" strokeOpacity="0.4" />
      <polygon
        points="32,24 68,24 90,48 50,96 10,48"
        fill="none"
        stroke="#0a5f5a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* specular highlight over the table */}
      <polygon points="34,24 51,24 45,47 32,47" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

export default async function UnderratedPage() {
  const peeks = await getUnderratedPeeks();

  // Batched trend direction for the "falling" marker on the tier chips.
  const trends = await getSnapshotsForPeeks(
    peeks.map((p) => p.id),
    14
  );

  const banners = peeks.slice(0, 3); // ranks 1-3
  const climbing = peeks.slice(3); // ranks 4+

  const climbEntries = climbing.map((peek, i) => ({
    peek,
    rank: i + 4,
    falling: computeDirection(trends.get(peek.id) ?? []) === "down",
    r: rating(peek.base_success_rate, peek.worked_votes, peek.vote_count),
  }));
  // GRADED_THRESHOLDS is already ordered best-first and covers every label
  // rating() can return, so walking it both orders the tiers and drops the
  // empty ones without a second list of grades to keep in sync. The peeks
  // themselves stay in getUnderratedPeeks()' order within each tier.
  const tiers = GRADED_THRESHOLDS.map((t) => ({
    label: t.label,
    items: climbEntries.filter((e) => e.r.label === t.label),
  })).filter((t) => t.items.length > 0);

  return (
    <>
      <PageHeader />
      <main className="arena fade-in-up pb-8">
        {/* Same rafter shell as Top Peeks, but this page's own header: the
            spinning diamond instead of the flame crest, and no eyebrow. */}
        <section className="arena-rafter">
          <div className="site-shell mx-auto max-w-3xl px-4 pb-14 pt-8 text-center sm:pt-10">
            {/* Rotating diamond — the header's signature animation. */}
            <div className="arena-gem-stage" aria-hidden>
              <div className="arena-gem">
                <Diamond />
              </div>
              <span className="arena-gem-spark arena-gem-spark--1" />
              <span className="arena-gem-spark arena-gem-spark--2" />
              <span className="arena-gem-spark arena-gem-spark--3" />
            </div>
            <h1 className="arena-title mt-4 text-5xl sm:text-6xl">Underrated</h1>
            <p className="arena-subline mt-4 text-base sm:text-lg">
              Great peeks almost nobody has voted on — yet.
            </p>
          </div>
        </section>

        {/* Banners are their own block, outside the list below, exactly as on
            Top Peeks: they need to be wider than the max-w-3xl the rest of the
            page uses, and keeping them out of the list is what leaves the ad
            below them in plain document order. */}
        {/* Phones get a swipe row instead of the pennants: three 440px
            banners side by side on a 390px screen pushed the ad most of a
            screen further down. The pennant block below is hidden with a
            class rather than removed, so md+ is byte-identical and its CSS
            is untouched. Both render in the same DOM position, so the ad
            after them does not move. */}
        {peeks.length > 0 && (
          <TopThreeSwipe peeks={banners} from="underrated" className="md:hidden" />
        )}

        {peeks.length > 0 && (
          <div className="site-shell mx-auto hidden max-w-[1260px] px-4 md:block">
            <div className="pnt">
              <div className="pnt-group pnt-group--champ">
                <span className="pnt-rod" aria-hidden />
                <div className="pnt-hang">
                  <Pennant peek={banners[0]} rank={1} />
                </div>
              </div>
              {banners.length > 1 && (
                <div className="pnt-group pnt-group--pair">
                  <span className="pnt-rod" aria-hidden />
                  <div className="pnt-hang">
                    {banners[1] && <Pennant peek={banners[1]} rank={2} />}
                    {banners[2] && <Pennant peek={banners[2]} rank={3} />}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* content-1, directly under the banners at every width. Same id, same
            className, same container as Top Peeks. */}
        <div className="site-shell mx-auto max-w-3xl px-4">
          <NitroAdSlot id="pkb-content-1" className="my-8 md:my-7" />
        </div>

        <div className="site-shell mx-auto max-w-3xl px-4">
          {peeks.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              No underrated peeks right now — they surface here once a
              high-grade peek picks up a few (but not too many) votes.
            </p>
          ) : (
            tiers.length > 0 && (
              <>
                <div className="arena-climb-head" aria-hidden="true">
                  <span className="arena-climb-dot" />
                  <span className="arena-climb-label">More gems</span>
                  <span className="arena-climb-rule" />
                </div>

                <ol className="tier-list">
                  {tiers.map((tier) => {
                    const color = gradeTierColor(tier.label);
                    return (
                      <li className="tier" key={tier.label}>
                        <div
                          className="tier-badge"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        >
                          <span className="tier-grade">{tier.label}</span>
                          <span className="tier-word">Tier</span>
                        </div>
                        <ol className="tier-items">
                          {tier.items.map(({ peek, rank, falling }) => {
                            const floor = peek.floors!;
                            const map = floor.maps;
                            const votes = peek.vote_count ?? 0;
                            return (
                              <li key={peek.id}>
                                <Link
                                  href={`/peeks/${peek.slug}?from=underrated`}
                                  aria-label={`Open peek: ${peek.name}, ${map.name}`}
                                  className="tier-chip"
                                >
                                  <span className="tier-chip-top">
                                    <span className="tier-chip-rank">
                                      #{rank}
                                    </span>
                                    {falling && (
                                      <span className="tier-chip-down">▼</span>
                                    )}
                                    <span className="tier-chip-votes">
                                      {voteLabel(votes)}
                                    </span>
                                  </span>
                                  <span className="tier-chip-name">
                                    {peek.name}
                                  </span>
                                  <span className="tier-chip-loc">
                                    {map.name} · {floor.name}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ol>
                      </li>
                    );
                  })}
                </ol>
              </>
            )
          )}
        </div>

        {/* Same container the list above uses, so the row lines up with it. */}
        <div className="site-shell mx-auto max-w-3xl px-4">
          <ExploreNext
            line="Great peeks almost nobody's found yet. Vote one up and help it get discovered."
            cards={[
              {
                href: "/top",
                icon: "flame",
                label: "Top peeks",
                subtitle: "Highest-rated angles",
              },
              {
                href: "/#maps",
                icon: "map",
                label: "Browse maps",
                subtitle: "Every map",
              },
            ]}
          />
        </div>
      </main>
    </>
  );
}

// One hanging pennant. The whole banner is the link — a real <a>, so it is
// reachable by keyboard, opens in a new tab on middle-click, and carries the
// same ?from=underrated the rest of the page uses.
function Pennant({ peek, rank }: { peek: PeekWithContext; rank: number }) {
  const floor = peek.floors!;
  const map = floor.maps;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const votes = peek.vote_count ?? 0;

  return (
    <div className={`pnt-item pnt-item--${rank}`}>
      {/* The hanger — cord, nail and brass rod. Decorative and md+ only: it is
          display:none below md, where the two shared mobile rods do the job
          instead. Inside the item so it travels with its own banner rather
          than being positioned against the row. */}
      <span className="pnt-hanger" aria-hidden="true">
        <svg
          className="pnt-cord"
          viewBox="0 0 100 46"
          preserveAspectRatio="none"
          aria-hidden
        >
          {/* preserveAspectRatio="none" stretches the triangle to whatever
              width the banner ends up; non-scaling-stroke keeps the cord a
              constant 1.6px instead of stretching with it. */}
          <path
            d="M2.6 44 L50 2.6 L97.4 44"
            fill="none"
            stroke="#7d6a4a"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="pnt-nail" />
        <span className="pnt-rodbar" />
      </span>
      {/* Carries the banner's drop-shadow and its focus ring at md+. Both have
          to be a filter, because clip-path cuts a box-shadow away with the
          corners it clips. display:contents below md, so the mobile layout
          gains no box and stays exactly as it is. */}
      <span className="pnt-cloth">
      <Link
        href={`/peeks/${peek.slug}?from=underrated`}
        aria-label={`Open peek: ${peek.name}, ${map.name}`}
        className={`pnt-card pnt-card--${rank}`}
      >
        {rank === 1 && (
          <span className="pnt-crown" aria-hidden>
            👑
          </span>
        )}
        <span className={`arena-coin arena-coin--${rank} pnt-coin`} aria-hidden>
          {rank}
        </span>
        <span className="pnt-name">{peek.name}</span>
        <span className="pnt-loc">
          {map.name} · {floor.name}
        </span>
        {/* Colour still comes from gradeTierColor, never a fixed green — the
            grade tiers are not allowed to collapse into one colour. */}
        <span
          className="arena-grade pnt-grade"
          style={{ backgroundColor: gradeTierColor(r.label) }}
          aria-label={`Grade ${r.label}`}
        >
          {r.label}
        </span>
        <span className="pnt-spacer" aria-hidden />
        <span className="pnt-watch" aria-hidden>
          <span className="pnt-watch-glyph">▶</span>
          {/* The desktop wording is fixed; the mobile wording depends only on
              rank, which is known here, so only one of the two needs a
              breakpoint to choose between them. */}
          <span className="pnt-watch-desk">Watch peek</span>
          <span className="pnt-watch-mob">
            {rank === 1 ? "Tap to watch" : "Watch"}
          </span>
        </span>
        <span className="pnt-votes">{voteLabel(votes)}</span>
      </Link>
      </span>
    </div>
  );
}

