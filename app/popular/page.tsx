import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getTopPeeks, type PeekWithContext } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Popular peeks",
  description:
    "The top spawn peeks across every map in Rainbow Six Siege, ranked by community success rate.",
};

export default async function PopularPage() {
  const peeks = await getTopPeeks(5);

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Popular peeks
          </h1>
          <p className="mt-2 text-muted">Top 5 by success rate</p>
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

  return (
    <li>
      <Link
        href={`/peeks/${peek.id}`}
        className="group flex items-center gap-4 rounded-card border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg sm:gap-5 sm:p-5"
      >
        <span
          aria-label={`Rank ${rank}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white sm:h-12 sm:w-12 sm:text-lg"
        >
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold tracking-tight text-ink group-hover:text-brand sm:text-lg">
            {peek.name}
          </h2>
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
