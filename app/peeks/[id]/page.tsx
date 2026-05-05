import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PeekMedia } from "@/components/PeekMedia";
import { SuccessRateVoter } from "@/components/SuccessRateVoter";
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
      "id, floor_id, name, x_pct, y_pct, screenshot_url, video_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, published, floors(id, map_id, slug, name, display_order, birds_eye_url, maps(id, slug, name, published))"
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
      <main className="fade-in-up mx-auto max-w-5xl px-6 pb-20 pt-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {peek.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
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

        <div className="mb-12 flex flex-wrap items-start justify-center gap-x-12 gap-y-8">
          <SuccessRateVoter
            peekId={peek.id}
            initialRate={peek.success_rate}
          />
          <DifficultyStat difficulty={peek.difficulty} />
          <RiskStat risk={peek.risk} />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <PeekMedia
            screenshotUrl={peek.screenshot_url}
            videoUrl={peek.video_url}
            name={peek.name}
          />
          <Instructions steps={steps} tip={peek.tip} />
        </div>
      </main>
    </>
  );
}

function DifficultyStat({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Difficulty
      </span>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-2.5 w-2.5 rounded-full ${
              n <= difficulty ? "bg-ink" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function RiskStat({ risk }: { risk: string }) {
  const riskColor =
    risk === "low"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : risk === "high"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Risk
      </span>
      <span
        className={`mt-3 inline-flex items-center rounded-btn border px-2.5 py-1 text-xs font-medium capitalize ${riskColor}`}
      >
        {risk}
      </span>
    </div>
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
        <div className="mt-8 border-t border-border pt-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Pro tip
          </span>
          <p className="mt-2 text-[16px] leading-[1.6]">{tip}</p>
        </div>
      )}
    </div>
  );
}
