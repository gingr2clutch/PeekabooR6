import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PlaceholderBox } from "@/components/PlaceholderBox";
import { SuccessRateVoter } from "@/components/SuccessRateVoter";
import { supabasePublic } from "@/lib/supabase";
import type { Floor, Map, Peek } from "@/lib/db";

export const dynamic = "force-dynamic";

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
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{peek.name}</h1>
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Where to look">
            {peek.screenshot_url ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner">
                <Image
                  src={peek.screenshot_url}
                  alt={`Screenshot for ${peek.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
            ) : (
              <PlaceholderBox label="Screenshot will appear here" />
            )}
          </Card>

          <Card title="How to do it">
            {steps.length > 0 ? (
              <ol className="flex flex-1 list-decimal flex-col justify-between gap-3 pl-5 text-[15px] leading-relaxed">
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">
                Step-by-step instructions will appear here.
              </p>
            )}
          </Card>

          <Card title="Rating">
            <RatingCard
              peekId={peek.id}
              successRate={peek.success_rate}
              difficulty={peek.difficulty}
              risk={peek.risk}
              tip={peek.tip}
            />
          </Card>

          <Card title="Watch it">
            {peek.video_url ? (
              <video
                src={peek.video_url}
                controls
                playsInline
                className="aspect-[16/10] w-full rounded-inner bg-black"
              />
            ) : (
              <PlaceholderBox label="Video clip will appear here" />
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-card border border-border bg-card p-5 ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RatingCard({
  peekId,
  successRate,
  difficulty,
  risk,
  tip,
}: {
  peekId: string;
  successRate: number;
  difficulty: number;
  risk: string;
  tip: string | null;
}) {
  const riskColor =
    risk === "low"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : risk === "high"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div className="flex flex-1 flex-col justify-between gap-4 text-[15px]">
      <SuccessRateVoter peekId={peekId} initialRate={successRate} />

      <div className="flex items-center gap-3">
        <span className="w-20 text-sm text-muted">Difficulty</span>
        <div className="flex gap-1.5">
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

      <div className="flex items-center gap-3">
        <span className="w-20 text-sm text-muted">Risk</span>
        <span
          className={`inline-flex items-center rounded-btn border px-2 py-0.5 text-xs font-medium capitalize ${riskColor}`}
        >
          {risk}
        </span>
      </div>

      {tip && (
        <div className="border-t border-border pt-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
            Pro tip
          </p>
          <p className="text-sm leading-relaxed">{tip}</p>
        </div>
      )}
    </div>
  );
}
