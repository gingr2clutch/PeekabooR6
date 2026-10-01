import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { NitroAdSlot } from "@/components/NitroAdSlot";
import { ExploreNext } from "@/components/ExploreNext";
import { TopTifo } from "@/components/TopTifo";
import { getTopPeeks } from "@/lib/db";
import { rating, gradeTierColor, GRADED_THRESHOLDS } from "@/lib/rate";
import type { TifoDrop } from "@/lib/tifo/layout";
import { computeDirection, getSnapshotsForPeeks } from "@/lib/trends";

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

  // The three banners of the Tifo hero. Flat and serializable — nothing but
  // what gets painted crosses into the client, and the percentage is the same
  // rating() number the peek page shows.
  const tifoTop3: TifoDrop[] = banners.map((peek, i) => {
    const floor = peek.floors!;
    const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
    return {
      slug: peek.slug,
      rank: (i + 1) as 1 | 2 | 3,
      name: peek.name,
      map: floor.maps.name,
      floor: floor.name,
      grade: r.label,
      votes: peek.vote_count ?? 0,
      pct: r.tier === "measured" ? r.pct : 0,
      estimate: r.tier !== "measured",
    };
  });

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
        {/* Rafter header. The Tifo banner below carries the title at every
            width now, so there is nothing left to draw here: no flames, no
            beam, and — because arena-head--tifo takes the head block out of
            flow — no empty band either. The section stays as the h1's home.

            arena-head--tifo is sr-only, never display:none: there is exactly
            ONE <h1> on this page at every width and it stays in the
            accessibility tree. */}
        <section className="arena-rafter">
          <div className="site-shell arena-head--noeyebrow arena-head--tifo mx-auto max-w-3xl px-4 pb-14 pt-8 text-center sm:pt-10">
            <h1 className="arena-title text-5xl sm:text-6xl">Top Peeks</h1>
            <p className="arena-subline mt-4 text-base sm:text-lg">
              Banners hang for the community&rsquo;s best.
            </p>
          </div>
        </section>

        {/* The podium is its own block, OUTSIDE the list below: it needs to be
            wider than the max-w-3xl the rest of the page uses, and out here the
            ad simply follows it in document order.

            Phones hang the same three banners, full-bleed and with no side
            padding, directly under the nav — the rafter above has collapsed to
            nothing. Each TopTifo bails out at the width it is not for, so only
            one of these two ever builds a scene, and the ad below does not move
            either way. */}
        {peeks.length > 0 && (
          <div className="md:hidden">
            <TopTifo top3={tifoTop3} layout="phone" />
          </div>
        )}

        {peeks.length > 0 && (
          <div className="site-shell mx-auto hidden max-w-[1260px] px-4 md:block">
            <TopTifo top3={tifoTop3} className="mt-6" />
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
