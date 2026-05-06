import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimatedRate } from "@/components/AnimatedRate";
import { PageHeader } from "@/components/PageHeader";
import { PeekMedia } from "@/components/PeekMedia";
import { VoteButtons } from "@/components/VoteButtons";
import { supabasePublic } from "@/lib/supabase";
import type { Floor, Map, Peek } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const peek = await getPeekWithContext(params.id);
  if (!peek || !peek.floors || !peek.floors.maps) {
    return { title: "Not found" };
  }
  const { floors: floor } = peek;
  const { maps: map } = floor;
  return {
    title: `${map.name} · ${floor.name} · ${peek.name}`,
    description: `${peek.name} — spawn peek on ${map.name} ${floor.name}.`,
  };
}

type Joined = Peek & {
  floors: (Floor & { maps: Map }) | null;
};

async function getPeekWithContext(id: string): Promise<Joined | null> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(
      "id, floor_id, name, x_pct, y_pct, video_url, poster_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, published, floors(id, map_id, slug, name, display_order, birds_eye_url, maps(id, slug, name, published))"
    )
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Joined | null;
}

export default async function PeekDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const peek = await getPeekWithContext(params.id);
  if (!peek || !peek.floors || !peek.floors.maps || !peek.floors.maps.published)
    notFound();

  const floor = peek.floors;
  const map = floor.maps;
  const backHref = `/maps/${map.slug}/${floor.slug}`;
  const steps = Array.isArray(peek.instructions) ? peek.instructions : [];

  return (
    <>
      <PageHeader back={{ href: backHref, label: "Back" }} />
      <main className="fade-in-up mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
        {/* Page header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            {peek.name}
          </h1>
          <p className="mt-3 text-sm text-muted">
            <Link href={`/maps/${map.slug}`} className="hover:text-brand">
              {map.name}
            </Link>{" "}
            ›{" "}
            <Link href={backHref} className="hover:text-brand">
              {floor.name}
            </Link>{" "}
            › {peek.name}
          </p>
        </div>

        {/* Hero stats card — 32px below header */}
        <section className="mt-6 rounded-card border border-border bg-card p-4 md:mt-8 md:p-8">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatCell label="Success rate">
              <AnimatedRate
                value={peek.success_rate}
                className="text-4xl font-bold leading-none tracking-tight text-brand md:text-[72px]"
              />
            </StatCell>
            <StatCell label="Difficulty">
              <DifficultyDots difficulty={peek.difficulty} />
            </StatCell>
            <StatCell label="Risk">
              <RiskPill risk={peek.risk} />
            </StatCell>
          </div>
        </section>

        {/* Vote buttons — 16px below stats card */}
        <div className="mt-4 flex justify-center">
          <VoteButtons peekId={peek.id} />
        </div>

        {/* Content section — 64px below buttons */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
          <PeekMedia videoUrl={peek.video_url} name={peek.name} />
          <Instructions steps={steps} tip={peek.tip} />
        </div>
      </main>
    </>
  );
}

function StatCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-start gap-2 px-2 py-4 md:gap-4 md:px-4 md:py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted md:text-[11px]">
        {label}
      </span>
      <div className="flex min-h-[44px] flex-1 items-center md:min-h-[72px]">
        {children}
      </div>
    </div>
  );
}

function DifficultyDots({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-1 md:gap-2.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2 w-2 rounded-full md:h-4 md:w-4 ${
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
      className={`inline-flex items-center rounded-btn border px-2 py-0.5 text-xs font-medium capitalize md:px-4 md:py-2 md:text-lg ${riskColor}`}
    >
      {risk}
    </span>
  );
}

function Instructions({
  steps,
  tip,
}: {
  steps: string[];
  tip: string | null;
}) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        How to do it
      </h2>

      {steps.length > 0 ? (
        <ol className="mt-4 list-decimal space-y-5 pl-5 text-[16px] leading-[1.6]">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Step-by-step instructions will appear here.
        </p>
      )}

      {tip && (
        <>
          <hr className="my-6 border-border" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Pro tip
          </span>
          <p className="mt-2 text-[16px] leading-[1.6]">{tip}</p>
        </>
      )}
    </div>
  );
}
