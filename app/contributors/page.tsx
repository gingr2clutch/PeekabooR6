import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
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

// The contributor leaderboard.
//
// Two decisions differ from the prototype, both on purpose.
//
// Mode and period live in the URL, not in client state. The prototype switched
// them with JavaScript, which would leave a crawler seeing only the default
// view — and crawlable text is what the ad revenue rests on. As query params
// they are server-rendered, linkable and shareable, the same reasoning behind
// ?tab= on the admin submissions queue.
//
// The prototype's 3D podium canvas is not here. It is a hand-written software
// renderer — geometry, painter's-algorithm sorting, an animation loop — and it
// is decoration on a page that carries ads. Same call as the font: zero extra
// bytes beats pixel-faithful.

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
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            Top{" "}
            <span className={accent}>
              {gadget ? "gadget minds" : "contributors"}
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Players who sent in a {noun} that made the site. Their name stays on
            the {gadget ? "pin" : "peek"}.
          </p>
          <Link
            href={gadget ? "/gadgets#submit" : "/#submit"}
            className={`mt-4 inline-block rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors ${
              gadget ? "hover:border-blue" : "hover:border-brand"
            }`}
          >
            + Submit a {noun}
          </Link>
        </header>

        {/* Mode switch. Real links, so both halves are crawlable and either can
            be shared directly. */}
        <nav
          aria-label="Leaderboard type"
          className="mx-auto mt-8 grid w-full max-w-xs grid-cols-2 gap-1 rounded-full bg-ink/[0.06] p-1"
        >
          {(["peek", "gadget"] as Kind[]).map((m) => (
            <Link
              key={m}
              href={href(m, period)}
              aria-current={m === mode ? "page" : undefined}
              className={`rounded-full px-3 py-2 text-center text-sm font-semibold transition-colors ${
                m === mode
                  ? "bg-card text-ink elev-card"
                  : "text-muted hover:text-ink"
              }`}
            >
              {m === "peek" ? "Peeks" : "Gadgets"}
            </Link>
          ))}
        </nav>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat
            n={board.totalContributions}
            k={gadget ? "Community placements" : "Community clips"}
            accent={accent}
          />
          <Stat n={board.totalContributors} k="Contributors" accent={accent} />
        </div>

        <nav
          aria-label="Time period"
          className="mt-5 flex flex-wrap justify-center gap-2"
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
            {/* Podium. Second, first, third — the visual order, not the rank
                order, so first sits in the middle. */}
            <div className="mt-8 grid grid-cols-3 items-end gap-2">
              {second && <Podium entry={second} rank={2} gadget={gadget} />}
              {first && <Podium entry={first} rank={1} gadget={gadget} />}
              {third && <Podium entry={third} rank={3} gadget={gadget} />}
            </div>

            {rest.length > 0 && (
              <ol className="mt-4 overflow-hidden rounded-card border border-border bg-card">
                {rest.map((e, i) => (
                  <li key={e.slug} className="border-b border-border last:border-0">
                    <Link
                      href={`/contributors/${e.slug}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg"
                    >
                      <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted">
                        {i + 4}
                      </span>
                      <Avatar
                        name={e.displayName}
                        url={e.avatarUrl}
                        className="h-8 w-8 text-xs"
                        gadget={gadget}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">
                          {e.displayName}
                        </span>
                        {e.firstFinds > 0 && (
                          <span className="mt-0.5 block text-xs text-muted">
                            {e.firstFinds} first find
                            {e.firstFinds === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-base font-semibold tabular-nums text-ink">
                        {e.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Stat({
  n,
  k,
  accent,
}: {
  n: number;
  k: string;
  accent: string;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4 text-center">
      <span className="block text-2xl font-semibold tabular-nums text-ink">
        {n.toLocaleString()}
      </span>
      <span
        className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.09em] ${accent}`}
      >
        {k}
      </span>
    </div>
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
  // Gold / silver / bronze are the only place on the site these three colours
  // appear, so they are literals here rather than tokens in the palette.
  const medal =
    rank === 1 ? "bg-[#e0a92e]" : rank === 2 ? "bg-[#a9a49a]" : "bg-[#c07a45]";

  return (
    <Link
      href={`/contributors/${entry.slug}`}
      className={`relative block rounded-card border border-border bg-card px-2 pb-3 text-center transition-colors hover:border-brand ${
        rank === 1 ? "pt-6" : "pt-5"
      }`}
    >
      <span
        className={`absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full text-xs font-bold text-white ${medal}`}
      >
        {rank}
      </span>
      <Avatar
        name={entry.displayName}
        url={entry.avatarUrl}
        className="mx-auto h-11 w-11 text-lg"
        gadget={gadget}
      />
      <span className="mt-2 block truncate text-sm font-semibold text-ink">
        {entry.displayName}
      </span>
      <span className="mt-0.5 block text-xs text-muted">
        <b className="font-semibold text-ink">{entry.count}</b>{" "}
        {gadget ? "placement" : "clip"}
        {entry.count === 1 ? "" : "s"}
      </span>
      {entry.firstFinds > 0 && (
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            gadget ? "bg-blue/10 text-blue" : "bg-brand/10 text-brand"
          }`}
        >
          {entry.firstFinds} first find{entry.firstFinds === 1 ? "" : "s"}
        </span>
      )}
    </Link>
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
