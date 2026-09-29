import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FlameCrestMotion } from "@/components/FlameCrestMotion";
import {
  getLeaderboard,
  isKind,
  isPeriod,
  type Kind,
  type LeaderboardEntry,
  type Period,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Contributors",
  description:
    "The players whose clips and gadget placements made it onto PeekabooR6. Send one in and your name goes on the peek.",
  alternates: { canonical: `${SITE_URL}/contributors` },
};

// The contributor leaderboard, in the arena format Top Peeks and Underrated
// use: dark rafter header, podium, ranked list.
//
// Mode and period stay in the URL, not in client state. Switching them with
// JavaScript would leave a crawler seeing only the default view — and crawlable
// text is what the ad revenue rests on. As query params they are
// server-rendered, linkable and shareable.

type Params = {
  searchParams?: { mode?: string; period?: string };
};

const PERIOD_LABEL: Record<Period, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

function href(mode: Kind, period: Period): string {
  const q = new URLSearchParams();
  if (mode !== "peek") q.set("mode", mode);
  if (period !== "all") q.set("period", period);
  const s = q.toString();
  return s ? `/contributors?${s}` : "/contributors";
}

// Gold trophy — the Underrated page's diamond, rebuilt. Plain SVG rendered on
// the server; every bit of motion is CSS transform/opacity in globals.css.
function Trophy() {
  return (
    <svg className="arena-trophy-svg" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="trophy-cup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe79c" />
          <stop offset="45%" stopColor="#e6b422" />
          <stop offset="100%" stopColor="#b07d10" />
        </linearGradient>
        <linearGradient id="trophy-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6b422" />
          <stop offset="100%" stopColor="#8f6410" />
        </linearGradient>
        <clipPath id="trophy-clip">
          <path d="M30 18 H70 V42 A20 22 0 0 1 30 42 Z" />
        </clipPath>
      </defs>
      {/* handles */}
      <path
        d="M30 24 H20 A9 9 0 0 0 20 42 H24"
        fill="none"
        stroke="#d9a520"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M70 24 H80 A9 9 0 0 1 80 42 H76"
        fill="none"
        stroke="#d9a520"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* cup */}
      <path d="M30 18 H70 V42 A20 22 0 0 1 30 42 Z" fill="url(#trophy-cup)" />
      {/* gleam, clipped to the cup so it never paints outside it */}
      <g clipPath="url(#trophy-clip)">
        <rect
          className="arena-trophy-gleam"
          x="26"
          y="12"
          width="12"
          height="56"
          fill="rgba(255,255,255,0.75)"
          transform="rotate(18 32 40)"
        />
      </g>
      {/* rim highlight */}
      <rect x="28" y="16" width="44" height="5" rx="2.5" fill="#fff2c4" />
      {/* stem + base */}
      <rect x="45" y="62" width="10" height="12" fill="url(#trophy-base)" />
      <rect x="34" y="74" width="32" height="7" rx="2" fill="url(#trophy-base)" />
      <rect x="28" y="81" width="44" height="8" rx="3" fill="url(#trophy-base)" />
      {/* star on the cup */}
      <path
        d="M50 28 l3.2 6.6 7.3 1 -5.3 5.1 1.3 7.2 -6.5-3.4 -6.5 3.4 1.3-7.2 -5.3-5.1 7.3-1 Z"
        fill="rgba(255,255,255,0.55)"
      />
    </svg>
  );
}

export default async function ContributorsPage({ searchParams }: Params) {
  const mode: Kind = isKind(searchParams?.mode) ? searchParams.mode : "peek";
  const period: Period = isPeriod(searchParams?.period)
    ? searchParams.period
    : "all";
  const gadget = mode === "gadget";

  const board = await getLeaderboard(mode, period);
  const [first, second, third] = board.entries;
  const rest = board.entries.slice(3);

  const accent = gadget ? "text-blue" : "text-brand";
  const noun = gadget ? "placement" : "clip";

  return (
    <>
      <PageHeader />
      <main className="arena fade-in-up pb-8">
        {/* Same rafter shell as Top Peeks and Underrated. No eyebrow, matching
            those two; the trophy stands in for Underrated's diamond. */}
        <section className="arena-rafter">
          <div className="site-shell mx-auto max-w-3xl px-4 pb-14 pt-8 text-center sm:pt-10">
            <div className="arena-trophy-stage" aria-hidden>
              {/* FlameCrestMotion only flips a data attribute — the SVG stays
                  server-rendered — and it pauses the animation while the header
                  is off screen, exactly as it does for the flame crest. */}
              <FlameCrestMotion>
                <div className="arena-trophy">
                  <Trophy />
                </div>
                <span className="arena-trophy-spark arena-trophy-spark--1" />
                <span className="arena-trophy-spark arena-trophy-spark--2" />
                <span className="arena-trophy-spark arena-trophy-spark--3" />
              </FlameCrestMotion>
            </div>
            <h1 className="arena-title mt-4 text-5xl sm:text-6xl">
              Top{" "}
              <span className={accent}>
                {gadget ? "gadget minds" : "contributors"}
              </span>
            </h1>
            <p className="arena-subline mt-4 text-base sm:text-lg">
              Players who sent in a {noun} that made the site. Their name stays
              on the {gadget ? "pin" : "peek"}.
            </p>
          </div>
        </section>

        <div className="site-shell mx-auto max-w-3xl px-4">
          {/* Mode switch. Real links, so both halves are crawlable and either
              can be shared directly. */}
          <nav
            aria-label="Leaderboard type"
            className="mx-auto mt-2 grid w-full max-w-sm grid-cols-2 gap-1 rounded-[16px] border border-border bg-card p-[5px] shadow-sm"
          >
            {(["peek", "gadget"] as Kind[]).map((m) => (
              <Link
                key={m}
                href={href(m, period)}
                aria-current={m === mode ? "page" : undefined}
                className={`rounded-[12px] px-4 py-3 text-center text-[16px] font-semibold transition-colors lg:text-[18px] ${
                  m === mode
                    ? gadget
                      ? "bg-blue text-white"
                      : "bg-brand text-white"
                    : "text-muted hover:text-ink"
                }`}
              >
                {m === "peek" ? "Peeks" : "Gadgets"}
              </Link>
            ))}
          </nav>

          <nav
            aria-label="Time period"
            className="mt-4 flex flex-wrap justify-center gap-2"
          >
            {(["week", "month", "all"] as Period[]).map((p) => (
              <Link
                key={p}
                href={href(mode, p)}
                aria-current={p === period ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  p === period
                    ? "bg-ink text-white"
                    : "text-muted hover:bg-ink/[0.06] hover:text-ink"
                }`}
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </nav>

          {/* One slim line instead of two big stat cards. The numbers are
              context for the board below, not the headline. */}
          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {board.totalContributions.toLocaleString()}{" "}
            {gadget ? "community placements" : "community clips"} ·{" "}
            {board.totalContributors.toLocaleString()}{" "}
            {board.totalContributors === 1 ? "contributor" : "contributors"}
          </p>

          {board.entries.length === 0 ? (
            <div className="mt-8 rounded-card border border-border bg-card p-8 text-center">
              <p className="text-base font-semibold text-ink">
                Nobody on the board yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                {period === "all"
                  ? `No ${noun}s have been credited yet. Be the first — send one in and your name goes here.`
                  : `Nothing in this window. Try ${PERIOD_LABEL.all.toLowerCase()}.`}
              </p>
            </div>
          ) : (
            <>
              {/* Podium. Second, first, third — visual order, not rank order,
                  so first sits raised in the middle. */}
              <ol className="lb-podium mt-8">
                {second && <Podium entry={second} rank={2} gadget={gadget} />}
                {first && <Podium entry={first} rank={1} gadget={gadget} />}
                {third && <Podium entry={third} rank={3} gadget={gadget} />}
              </ol>

              {rest.length > 0 && (
                <ol className="lb-list mt-6" start={4}>
                  {rest.map((e, i) => (
                    <li key={e.slug} className="arena-climb">
                      <Link
                        href={`/contributors/${e.slug}`}
                        className="arena-climb-link"
                        style={{
                          ["--tier" as string]: gadget ? "#2a75b8" : "#f2640e",
                        }}
                      >
                        <span className="arena-climb-rank">{i + 4}</span>
                        <Avatar
                          name={e.displayName}
                          url={e.avatarUrl}
                          className="h-9 w-9 text-sm"
                          gadget={gadget}
                        />
                        <span className="arena-climb-main">
                          <span className="arena-climb-name">
                            <span className="arena-climb-nametext">
                              {e.displayName}
                            </span>
                          </span>
                          {e.firstFinds > 0 && (
                            <span className="arena-climb-loc">
                              {e.firstFinds} first find
                              {e.firstFinds === 1 ? "" : "s"}
                            </span>
                          )}
                        </span>
                        <span className="arena-climb-votes">
                          {e.count} {gadget ? "placement" : "clip"}
                          {e.count === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Podium({
  entry,
  rank,
  gadget,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  gadget: boolean;
}) {
  return (
    <li className={`lb-pod lb-pod--${rank}`}>
      <Link href={`/contributors/${entry.slug}`} className="lb-card">
        <span className="lb-medal" aria-hidden>
          {rank}
        </span>
        <Avatar
          name={entry.displayName}
          url={entry.avatarUrl}
          className="lb-avatar"
          gadget={gadget}
        />
        <span className="lb-name">{entry.displayName}</span>
        <span className="lb-count">
          <b>{entry.count}</b> {gadget ? "placement" : "clip"}
          {entry.count === 1 ? "" : "s"}
        </span>
        {entry.firstFinds > 0 && (
          <span className={`lb-pill${gadget ? " lb-pill--gadget" : ""}`}>
            {entry.firstFinds} first find{entry.firstFinds === 1 ? "" : "s"}
          </span>
        )}
      </Link>
      <span className="lb-step" aria-hidden />
    </li>
  );
}

/**
 * Initial disc, or the uploaded avatar once there is one. No contributor has an
 * avatar_url today — nothing writes that column yet — so the disc is what
 * actually renders, and it must look deliberate rather than like a gap.
 */
function Avatar({
  name,
  url,
  className,
  gadget,
}: {
  name: string;
  url: string | null;
  className: string;
  gadget: boolean;
}) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${
        gadget ? "bg-blue" : "bg-brand"
      } ${className}`}
      style={
        url
          ? {
              backgroundImage: `url(${url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {!url && letter}
    </span>
  );
}
