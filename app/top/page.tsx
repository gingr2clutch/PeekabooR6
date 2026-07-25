import type { Metadata } from "next";
import type { CSSProperties } from "react";
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

// --- Rafter fire: decorative flame tongues + embers rising from the beam.
// Deterministic configs (no random, SSR-safe); negative delays start each one
// mid-cycle so the fire is already alive on first paint. Purely CSS-animated.
type Flame = { cls: string; left: string; w: number; h: number; dur: string; delay: string };
const FIRE_FLAMES: Flame[] = [
  // big soft background tongues — taller toward the center so the fire peaks
  // in the middle (around the title) and tapers to the edges.
  { cls: "arena-flame arena-flame--back", left: "16%", w: 78, h: 120, dur: "2.6s", delay: "-0.3s" },
  { cls: "arena-flame arena-flame--back", left: "38%", w: 98, h: 210, dur: "3.1s", delay: "-1.4s" },
  { cls: "arena-flame arena-flame--back", left: "58%", w: 90, h: 200, dur: "2.8s", delay: "-0.8s" },
  { cls: "arena-flame arena-flame--back", left: "78%", w: 80, h: 126, dur: "3.3s", delay: "-1.9s" },
  // tallest tongue dead-center, reaching up past the title
  { cls: "arena-flame arena-flame--back", left: "48%", w: 116, h: 270, dur: "3.5s", delay: "-2.2s" },
  { cls: "arena-flame arena-flame--front", left: "41%", w: 40, h: 208, dur: "1.95s", delay: "-0.6s" },
  { cls: "arena-flame arena-flame--front", left: "52%", w: 38, h: 196, dur: "1.7s", delay: "-1.45s" },
  // sharper bright front tongues (detail) — shorter at the edges
  { cls: "arena-flame arena-flame--front", left: "8%", w: 34, h: 78, dur: "1.5s", delay: "-0.2s" },
  { cls: "arena-flame arena-flame--front", left: "20%", w: 40, h: 104, dur: "1.75s", delay: "-0.95s" },
  { cls: "arena-flame arena-flame--front", left: "31%", w: 38, h: 138, dur: "1.4s", delay: "-0.5s" },
  { cls: "arena-flame arena-flame--front", left: "45%", w: 48, h: 176, dur: "1.85s", delay: "-1.25s" },
  { cls: "arena-flame arena-flame--front", left: "56%", w: 40, h: 150, dur: "1.6s", delay: "-0.4s" },
  { cls: "arena-flame arena-flame--front", left: "67%", w: 44, h: 112, dur: "1.8s", delay: "-1.05s" },
  { cls: "arena-flame arena-flame--front", left: "80%", w: 36, h: 84, dur: "1.5s", delay: "-0.7s" },
  { cls: "arena-flame arena-flame--front", left: "91%", w: 32, h: 74, dur: "1.65s", delay: "-0.25s" },
];
type Ember = { left: string; size: number; dur: string; delay: string; drift: string };
const FIRE_EMBERS: Ember[] = [
  { left: "12%", size: 3, dur: "3.2s", delay: "-0.4s", drift: "14px" },
  { left: "24%", size: 2, dur: "3.8s", delay: "-1.7s", drift: "-10px" },
  { left: "35%", size: 4, dur: "3.0s", delay: "-0.9s", drift: "8px" },
  { left: "46%", size: 2, dur: "4.1s", delay: "-2.3s", drift: "-16px" },
  { left: "54%", size: 3, dur: "3.5s", delay: "-0.2s", drift: "12px" },
  { left: "63%", size: 2, dur: "3.9s", delay: "-1.3s", drift: "-8px" },
  { left: "72%", size: 4, dur: "3.1s", delay: "-2.0s", drift: "16px" },
  { left: "84%", size: 3, dur: "3.6s", delay: "-0.7s", drift: "-12px" },
  { left: "93%", size: 2, dur: "4.0s", delay: "-1.9s", drift: "9px" },
];

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
          {/* Decorative fire rising from the beam up around the title. */}
          <div className="arena-fire" aria-hidden>
            <span className="arena-fire-glow" />
            {/* All tongues live in one group so a group-level blur + blend
                fuses them into a single continuous flame. */}
            <div className="arena-flames">
              {FIRE_FLAMES.map((f, i) => (
                <span
                  key={`f${i}`}
                  className={f.cls}
                  style={
                    {
                      left: f.left,
                      width: f.w,
                      height: f.h,
                      marginLeft: -f.w / 2,
                      "--dur": f.dur,
                      "--delay": f.delay,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            {FIRE_EMBERS.map((e, i) => (
              <span
                key={`e${i}`}
                className="arena-ember"
                style={
                  {
                    left: e.left,
                    width: e.size,
                    height: e.size,
                    "--dur": e.dur,
                    "--delay": e.delay,
                    "--drift": e.drift,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="arena-beam-top" aria-hidden />
          <div className="mx-auto max-w-3xl px-4 pb-14 pt-5 text-center sm:pt-6">
            <div className="arena-eyebrow">
              <span className="arena-eyebrow-rule" aria-hidden />
              <span>Hall of Peeks</span>
              <span className="arena-eyebrow-rule" aria-hidden />
            </div>
            <h1 className="arena-title mt-5 text-5xl sm:text-6xl">Top Peeks</h1>
            <p className="arena-subline mt-4 text-base sm:text-lg">
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
        {rank === 1 && (
          <span className="arena-crown" aria-hidden>
            👑
          </span>
        )}
        <span className={`arena-coin arena-coin--${rank}`} aria-hidden>
          {rank}
        </span>
        <span className="arena-name">{peek.name}</span>
        <span className="arena-loc">
          {map.name} · {floor.name}
        </span>
        <span className="flex items-center gap-1.5">
          {peek.is_pro_only && <ProLockBadge />}
          <span className="arena-grade" aria-label={`Grade ${r.label}`}>
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
