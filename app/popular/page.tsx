import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { NewBadge } from "@/components/NewBadge";
import { PageHeader } from "@/components/PageHeader";
import { getTopPeeks, type PeekWithContext } from "@/lib/db";
import { isPeekNew } from "@/lib/peek-recency";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Popular peeks",
  description:
    "The top spawn peeks across every map in Rainbow Six Siege, ranked by community success rate.",
};

type Medal = {
  circleBg: string;
  circleBorder: string;
  iconColor: string;
  cardBorder: string;
  cardClass: string;
};

const MEDALS: Record<number, Medal> = {
  1: {
    circleBg: "#FFD700",
    circleBorder: "#DAA520",
    iconColor: "#FFD700",
    cardBorder: "rgba(218, 165, 32, 0.55)",
    cardClass: "border-2 peek-glow-gold",
  },
  2: {
    circleBg: "#C0C0C0",
    circleBorder: "#A8A8A8",
    iconColor: "#C0C0C0",
    cardBorder: "rgba(168, 168, 168, 0.6)",
    cardClass: "border hover:shadow-lg",
  },
  3: {
    circleBg: "#CD7F32",
    circleBorder: "#A0522D",
    iconColor: "#CD7F32",
    cardBorder: "rgba(160, 82, 45, 0.45)",
    cardClass: "border hover:shadow-lg",
  },
};

export default async function PopularPage() {
  const peeks = await getTopPeeks(5);

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="inline-flex items-center gap-2.5 text-3xl font-semibold tracking-tight">
            <FlameIcon className="h-7 w-7 text-brand" />
            <span>Popular peeks</span>
          </h1>
          <p className="mt-2 text-muted">Top 5 by success rate</p>
          <p className="mt-1 text-xs text-muted/70">Player voted</p>
        </div>

        {peeks.length === 0 ? (
          <p className="text-center text-sm text-muted">
            Once peeks start collecting votes they&apos;ll show up here.
          </p>
        ) : (
          <ol className="space-y-4">
            {peeks.map((peek, i) => (
              <PeekRow key={peek.id} peek={peek} rank={i + 1} />
            ))}
          </ol>
        )}
      </main>
    </>
  );
}

function PeekRow({ peek, rank }: { peek: PeekWithContext; rank: number }) {
  const floor = peek.floors!;
  const map = floor.maps;
  const rate = Math.round(peek.success_rate);
  const medal = MEDALS[rank];

  const cardStyle: CSSProperties | undefined = medal
    ? { borderColor: medal.cardBorder }
    : undefined;
  const circleStyle: CSSProperties = medal
    ? { backgroundColor: medal.circleBg, borderColor: medal.circleBorder }
    : { backgroundColor: "#ff6a00", borderColor: "transparent" };

  const cardCls = medal
    ? medal.cardClass
    : "border border-border hover:border-brand hover:shadow-lg";

  return (
    <li>
      <Link
        href={`/peeks/${peek.slug}`}
        style={cardStyle}
        className={`group flex items-center gap-4 rounded-card bg-card p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 sm:gap-5 sm:p-5 ${cardCls}`}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12">
          {medal && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              {rank === 1 ? (
                <TrophyIcon
                  className="peek-trophy-pulse h-20 w-20 sm:h-24 sm:w-24"
                  style={{ color: medal.iconColor, opacity: 0.18 }}
                />
              ) : (
                <MedalIcon
                  className="h-20 w-20 sm:h-24 sm:w-24"
                  style={{ color: medal.iconColor, opacity: 0.18 }}
                />
              )}
            </span>
          )}
          <span
            aria-label={`Rank ${rank}`}
            style={circleStyle}
            className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-semibold text-white sm:h-12 sm:w-12 sm:text-lg"
          >
            {rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-ink group-hover:text-brand sm:text-lg">
              {peek.name}
            </h2>
            {isPeekNew(peek.created_at) && <NewBadge size="xs" />}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">
            {map.name} · {floor.name}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <DifficultyDots difficulty={peek.difficulty} />
            <RiskPill risk={peek.risk} />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold leading-none tracking-tight text-brand sm:text-3xl">
            {rate}%
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Success
          </div>
        </div>
      </Link>
    </li>
  );
}

function DifficultyDots({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-1" aria-label={`Difficulty ${difficulty} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-1.5 rounded-full ${
            n <= difficulty ? "bg-ink" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function RiskPill({ risk }: { risk: string }) {
  const riskColor =
    risk === "low"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : risk === "high"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-btn border px-2 py-0.5 text-[11px] font-medium capitalize ${riskColor}`}
    >
      {risk}
    </span>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-current ${className ?? ""}`}
    >
      <path d="M12.5 2.5c.5 2.4-.4 4-1.5 5.4-1.3 1.6-3 3-3 5.9 0 3.6 3 6.7 6.5 6.7s6.5-2.9 6.5-6.7c0-3.7-2.5-6.5-3.7-7.9-.6 1-1.4 1.4-2.2 1-.6-.4-.9-2.4-2.6-4.4zm-.3 11.5c.8.9 1.4 1.4 1.4 2.6 0 1.4-1 2.4-2.4 2.4s-2.6-1.1-2.6-2.6c0-1 .6-1.7 1.1-2.3.5-.4 1.2-.6 1.6-1.5.2.4.4 1 .9 1.4z" />
    </svg>
  );
}

type IconProps = { className?: string; style?: CSSProperties };

function TrophyIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-none stroke-current ${className ?? ""}`}
      style={style}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function MedalIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-none stroke-current ${className ?? ""}`}
      style={style}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
      <path d="M11 12 5.12 2.2" />
      <path d="m13 12 5.88-9.8" />
      <path d="M8 7h8" />
      <circle cx="12" cy="17" r="5" />
      <path d="M12 18v-2h-.5" />
    </svg>
  );
}
