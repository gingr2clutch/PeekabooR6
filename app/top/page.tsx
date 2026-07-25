import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ProLockBadge } from "@/components/ProLockBadge";
import { getTopPeeks, type PeekWithContext } from "@/lib/db";
import { rating, gradeTierColor } from "@/lib/rate";
import { computeDirection, getSnapshotsForPeeks } from "@/lib/trends";
import { isPeekNew } from "@/lib/peek-recency";

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

  return (
    <>
      <PageHeader />
      <main className="arena fade-in-up pb-20">
        {/* Rafter header — dark, full-bleed, with the beam at its bottom edge.
            Rendered server-side so there's no flash against the cream page. */}
        <section className="arena-rafter">
          <div className="mx-auto max-w-3xl px-4 pb-10 pt-14 text-center sm:pt-16">
            <div className="arena-eyebrow">
              <span className="arena-eyebrow-rule" aria-hidden />
              <span>Hall of Peeks</span>
              <span className="arena-eyebrow-rule" aria-hidden />
            </div>
            <h1 className="arena-title mt-5 text-4xl sm:text-5xl">Top Peeks</h1>
            <p className="arena-subline mt-3.5 text-[15px]">
              Banners hang for the community&rsquo;s best.
            </p>
          </div>
          <div className="arena-beam" aria-hidden />
        </section>

        <div className="mx-auto max-w-3xl px-4">
          {peeks.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              Once peeks start collecting votes they&rsquo;ll show up here.
            </p>
          ) : (
            <ol className="arena-list">
              {banners.map((peek, i) => (
                <Banner key={peek.id} peek={peek} rank={i + 1} />
              ))}

              {climbing.length > 0 && (
                <li className="arena-climb-head" aria-hidden="true">
                  <span className="arena-climb-dot" />
                  <span className="arena-climb-label">Climbing</span>
                  <span className="arena-climb-rule" />
                </li>
              )}

              {climbing.map((peek, i) => (
                <ClimbRow
                  key={peek.id}
                  peek={peek}
                  rank={i + 4}
                  falling={
                    computeDirection(trends.get(peek.id) ?? []) === "down"
                  }
                />
              ))}
            </ol>
          )}
        </div>
      </main>
    </>
  );
}

function Banner({ peek, rank }: { peek: PeekWithContext; rank: number }) {
  const floor = peek.floors!;
  const map = floor.maps;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const votes = peek.vote_count ?? 0;

  return (
    <li className={`arena-banner arena-banner--${rank}`}>
      <Link href={`/peeks/${peek.slug}?from=top`} className="arena-banner-card">
        <span className={`arena-coin arena-coin--${rank}`} aria-hidden>
          {rank}
        </span>
        <span className="arena-name">{peek.name}</span>
        <span className="arena-loc">
          {map.name} · {floor.name}
        </span>
        <span className="flex items-center gap-1.5">
          {peek.is_pro_only && <ProLockBadge />}
          <span
            className="arena-grade"
            style={{ backgroundColor: gradeTierColor(r.label) }}
            aria-label={`Grade ${r.label}`}
          >
            {r.label}
          </span>
        </span>
        <span className="arena-votes">{voteLabel(votes)}</span>
      </Link>
    </li>
  );
}

function ClimbRow({
  peek,
  rank,
  falling,
}: {
  peek: PeekWithContext;
  rank: number;
  falling: boolean;
}) {
  const floor = peek.floors!;
  const map = floor.maps;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const votes = peek.vote_count ?? 0;

  return (
    <li className="arena-climb">
      <Link href={`/peeks/${peek.slug}?from=top`} className="arena-climb-link">
        <span className="arena-climb-rank">{rank}</span>
        <span className="arena-climb-main">
          <span className="arena-climb-name">
            <span className="arena-climb-nametext">{peek.name}</span>
            {isPeekNew(peek.created_at) && (
              <span className="arena-newpill">New</span>
            )}
            {falling && (
              <span className="arena-trend-down" aria-label="Trend falling">
                ▼
              </span>
            )}
            {peek.is_pro_only && <ProLockBadge />}
          </span>
          <span className="arena-climb-loc">
            {map.name} · {floor.name}
          </span>
        </span>
        <span
          className="arena-chip"
          style={{ backgroundColor: gradeTierColor(r.label) }}
          aria-label={`Grade ${r.label}`}
        >
          {r.label}
        </span>
        <span className="arena-climb-votes">{voteLabel(votes)}</span>
      </Link>
    </li>
  );
}
