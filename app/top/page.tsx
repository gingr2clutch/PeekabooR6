import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { NitroAdSlot } from "@/components/NitroAdSlot";
import { ExploreNext } from "@/components/ExploreNext";
import { TopThreeSwipe } from "@/components/TopThreeSwipe";
import { getTopPeeks, type PeekWithContext } from "@/lib/db";
import { rating, gradeTierColor, GRADED_THRESHOLDS } from "@/lib/rate";
import { computeDirection, getSnapshotsForPeeks } from "@/lib/trends";
import { FlameCrestMotion } from "@/components/FlameCrestMotion";
import { DESKTOP_CREST, MOBILE_CREST, type Crest } from "@/lib/flame-crest";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top peeks",
  description:
    "The top spawn peeks across every map in Rainbow Six Siege, ranked by community success rate.",
};

// Shared vote-count line, styled for either surface.
function voteLabel(votes: number) {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

// --- Rafter flame crest -------------------------------------------------
// Sharp, flat flames. Geometry is static seeded data from lib/flame-crest.ts
// (SSR-safe, no runtime randomness); this only renders it.
//
// Each cluster is a plain div: the layer's gradient as a background, the merged
// outline of 2-3 tongues as clip-path. Divs rather than SVG paths because a
// transform animation on a div is composited, while the same animation on an
// SVG child is not — that is what lets every flame move instead of a quarter of
// them. See the note at the top of lib/flame-crest.ts.
function FlameCrest({ crest, variant }: { crest: Crest; variant: "d" | "m" }) {
  return (
    <div className={`crest crest--${variant}`} aria-hidden>
      {crest.layers.map((l) => {
        const fill = `linear-gradient(0deg, ${l.from} 0%, ${l.to} 100%)`;
        return (
          <div
            key={l.id}
            className="crest-layer"
            style={
              {
                "--sway-dur": `${l.swayDur}s`,
                "--sway-delay": `${l.swayDelay}s`,
              } as CSSProperties
            }
          >
            {/* solid band along the bottom edge — the banner cords hang off
                this, and it hides the seams between neighbouring clusters */}
            <div
              className="crest-base"
              style={{ height: l.baseH, background: fill }}
            />
            {l.clusters.map((c, i) => (
              <div
                key={i}
                className="crest-cl"
                style={
                  {
                    left: c.left,
                    width: c.width,
                    height: c.height,
                    background: fill,
                    clipPath: `path("${c.path}")`,
                    "--dur": `${c.dur}s`,
                    "--delay": `${c.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function CrestEmbers({ crest, variant }: { crest: Crest; variant: "d" | "m" }) {
  return (
    <div className={`crest-embers crest-embers--${variant}`} aria-hidden>
      {crest.embers.map((e, i) => (
        <span
          key={i}
          className="crest-ember"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              "--from": `${e.from}px`,
              "--drift": e.drift,
              "--dur": `${e.dur}s`,
              "--delay": `${e.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
export default async function TopPeeksPage() {
  const peeks = await getTopPeeks(10);

  // Batched 7-vs-7 trend direction for every ranked peek (one query) — the
  // climbing list flags any that are slipping with a red ▼.
  const trends = await getSnapshotsForPeeks(
    peeks.map((p) => p.id),
    14
  );

  const banners = peeks.slice(0, 3); // ranks 1–3
  const climbing = peeks.slice(3); // ranks 4+

  // Climbing, grouped into grade tiers. Same peeks and the same order as the
  // flat list this replaces — rank is still position in `peeks`, so the
  // numbers shown are the real overall ranks, not a per-tier count.
  const climbEntries = climbing.map((peek, i) => ({
    peek,
    rank: i + 4,
    falling: computeDirection(trends.get(peek.id) ?? []) === "down",
    r: rating(peek.base_success_rate, peek.worked_votes, peek.vote_count),
  }));
  // GRADED_THRESHOLDS is already ordered best-first and covers every label
  // rating() can return, so walking it both orders the tiers and drops the
  // empty ones without a second list of grades to keep in sync.
  const tiers = GRADED_THRESHOLDS.map((t) => ({
    label: t.label,
    items: climbEntries.filter((e) => e.r.label === t.label),
  })).filter((t) => t.items.length > 0);

  return (
    <>
      <PageHeader />
      <main className="arena fade-in-up pb-8">
        {/* Rafter header — dark, full-bleed, with the beam at its bottom edge.
            Rendered server-side so there's no flash against the cream page. */}
        <section className="arena-rafter">
          {/* Decorative flame crest rising from the beam around the title.
              The SVGs are server-rendered; FlameCrestMotion is a client shell
              that only pauses the animation while the header is off screen. */}
          <FlameCrestMotion>
            <FlameCrest crest={DESKTOP_CREST} variant="d" />
            <FlameCrest crest={MOBILE_CREST} variant="m" />
            <CrestEmbers crest={DESKTOP_CREST} variant="d" />
            <CrestEmbers crest={MOBILE_CREST} variant="m" />
          </FlameCrestMotion>
          {/* No eyebrow here (Underrated keeps its own). arena-head--noeyebrow
              gives back exactly the height the eyebrow occupied as EXTRA bottom
              padding, so the rafter is the same height as before and nothing
              below it moves — the text simply sits higher and the freed room
              goes to the flames. */}
          <div className="site-shell arena-head--noeyebrow mx-auto max-w-3xl px-4 pb-14 pt-8 text-center sm:pt-10">
            <h1 className="arena-title text-5xl sm:text-6xl">Top Peeks</h1>
            <p className="arena-subline mt-4 text-base sm:text-lg">
              Banners hang for the community&rsquo;s best.
            </p>
          </div>
        </section>

        {/* The podium is its own block, OUTSIDE the list below, for two
            reasons. It needs to be wider than the max-w-3xl the rest of the
            page uses — the rod is up to 1220px — and being in the same flex
            list as the ad is what put the ad above it: .arena-list is a flex
            container, the banners carried order 1/2/3, and the ad <li> had no
            order at all, so its default 0 sorted it ahead of all three. Out
            here the ad simply follows in document order. */}
        {/* Phones get a swipe row instead of the pennants: three 440px
            banners side by side on a 390px screen pushed the ad most of a
            screen further down. The pennant block below is hidden with a
            class rather than removed, so md+ is byte-identical and its CSS
            is untouched. Both render in the same DOM position, so the ad
            after them does not move. */}
        {peeks.length > 0 && (
          <TopThreeSwipe peeks={banners} from="top" className="md:hidden" />
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

        {/* The ad sits between the podium above and Climbing below, at every
            width. Same container, same id, same className — only its place in
            the document moved. It is no longer wrapped in an <li>, because the
            list it used to be a child of is gone; that <li> was list
            scaffolding, not part of the ad. */}
        <div className="site-shell mx-auto max-w-3xl px-4">
          <NitroAdSlot id="pkb-content-1" className="my-8 md:my-7" />
        </div>

        <div className="site-shell mx-auto max-w-3xl px-4">
          {peeks.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              Once peeks start collecting votes they&rsquo;ll show up here.
            </p>
          ) : (
            tiers.length > 0 && (
              <>
                <div className="arena-climb-head" aria-hidden="true">
                  <span className="arena-climb-dot" />
                  <span className="arena-climb-label">Climbing</span>
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
                                  href={`/peeks/${peek.slug}?from=top`}
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
            line="The community's highest-rated peeks. Think one's ranked wrong? Cast your vote."
            cards={[
              {
                href: "/underrated",
                icon: "gem",
                label: "Underrated peeks",
                subtitle: "Hidden gems, few votes",
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
// same ?from=top the rest of the page uses.
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
        href={`/peeks/${peek.slug}?from=top`}
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

