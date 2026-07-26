import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ExploreNext } from "@/components/ExploreNext";
import { getUnderratedPeeks, type PeekWithContext } from "@/lib/db";
import { rating, gradeTierColor } from "@/lib/rate";
import { computeDirection, getSnapshotsForPeeks } from "@/lib/trends";
import { isPeekNew } from "@/lib/peek-recency";

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

  // Batched trend direction for the "falling" ▼ marker on the list rows.
  const trends = await getSnapshotsForPeeks(
    peeks.map((p) => p.id),
    14
  );

  const banners = peeks.slice(0, 3); // ranks 1–3
  const gems = peeks.slice(3); // ranks 4+

  return (
    <>
      <PageHeader />
      <main className="arena fade-in-up pb-20">
        <section className="arena-rafter">
          <div className="mx-auto max-w-3xl px-4 pb-14 pt-8 text-center sm:pt-10">
            {/* Rotating diamond — the header's signature animation. */}
            <div className="arena-gem-stage" aria-hidden>
              <div className="arena-gem">
                <Diamond />
              </div>
              <span className="arena-gem-spark arena-gem-spark--1" />
              <span className="arena-gem-spark arena-gem-spark--2" />
              <span className="arena-gem-spark arena-gem-spark--3" />
            </div>
            <div className="arena-eyebrow">
              <span className="arena-eyebrow-rule" aria-hidden />
              <span>Hidden Gems</span>
              <span className="arena-eyebrow-rule" aria-hidden />
            </div>
            <h1 className="arena-title mt-4 text-5xl sm:text-6xl">Underrated</h1>
            <p className="arena-subline mt-4 text-base sm:text-lg">
              Great peeks almost nobody has voted on — yet.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-4">
          {peeks.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              No underrated peeks right now — they surface here once a high-grade
              peek picks up a few (but not too many) votes.
            </p>
          ) : (
            <ol className="arena-list arena-list--podium">
              {banners.map((peek, i) => (
                <Podium key={peek.id} peek={peek} rank={i + 1} />
              ))}

              {gems.length > 0 && (
                <li className="arena-climb-head" aria-hidden="true">
                  <span className="arena-climb-dot" />
                  <span className="arena-climb-label">More gems</span>
                  <span className="arena-climb-rule" />
                </li>
              )}

              {gems.map((peek, i) => (
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

        <ExploreNext
          line="Great peeks almost nobody's found yet. Vote one up and help it get discovered."
          cards={[
            { href: "/top", emoji: "🏆", label: "Top Peeks" },
            { href: "/#maps", emoji: "🗺️", label: "Browse Maps" },
          ]}
        />
      </main>
    </>
  );
}

function Podium({ peek, rank }: { peek: PeekWithContext; rank: number }) {
  const floor = peek.floors!;
  const map = floor.maps;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const votes = peek.vote_count ?? 0;

  return (
    <li className={`arena-podium arena-podium--${rank}`}>
      <Link
        href={`/peeks/${peek.slug}?from=underrated`}
        className="arena-podium-link"
      >
        {rank === 1 && (
          <span className="arena-podium-crown" aria-hidden>
            👑
          </span>
        )}
        <div className="arena-podium-info">
          <span className="arena-podium-name">{peek.name}</span>
          <span className="arena-podium-loc">
            {map.name} · {floor.name}
          </span>
          <span className="arena-podium-meta">
            <span
              className="arena-grade"
              style={{ backgroundColor: gradeTierColor(r.label) }}
              aria-label={`Grade ${r.label}`}
            >
              {r.label}
            </span>
          </span>
          <span className="arena-podium-votes">{voteLabel(votes)}</span>
        </div>
        <div className="arena-podium-block">
          <span className="arena-podium-rank">{rank}</span>
        </div>
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
      <Link
        href={`/peeks/${peek.slug}?from=underrated`}
        className="arena-climb-link"
        style={{ ["--tier"]: gradeTierColor(r.label) } as CSSProperties}
      >
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
