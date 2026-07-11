import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapStats } from "@/components/MapStats";
import { PageHeader } from "@/components/PageHeader";
import { RandomPeekButton } from "@/components/RandomPeekButton";
import { getFloorsForMap, getMapBySlug, getTopPeekForMap } from "@/lib/db";
import { rating } from "@/lib/rate";
import { supabasePublic } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map) return { title: "Not found" };
  return {
    title: map.name,
    description: `Spawn peek locations on ${map.name} — Rainbow Six Siege.`,
  };
}

export default async function MapPage({
  params,
}: {
  params: { slug: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  const floors = await getFloorsForMap(map.id);

  const floorIds = floors.map((f) => f.id);
  const peekCountByFloor = new Map<string, number>();
  let totalPeeks = 0;
  let mapVotes = 0; // sum of vote_count across this map's published peeks
  // Peek counts by computed grade leading letter (each spans +/base/-).
  let mapSTier = 0; // S+, S, S-
  let mapATier = 0; // A+, A, A-
  let mapBTier = 0; // B+, B, B-
  let mapCTier = 0; // C+, C, C-
  let latestPeekAt: string | null = null;
  if (floorIds.length > 0) {
    const { data: peeks } = await supabasePublic()
      .from("peeks")
      .select(
        "floor_id, created_at, vote_count, worked_votes, base_success_rate"
      )
      .in("floor_id", floorIds)
      .eq("published", true);
    for (const p of (peeks ?? []) as {
      floor_id: string;
      created_at: string;
      vote_count: number;
      worked_votes: number;
      base_success_rate: number;
    }[]) {
      peekCountByFloor.set(
        p.floor_id,
        (peekCountByFloor.get(p.floor_id) ?? 0) + 1
      );
      totalPeeks += 1;
      mapVotes += p.vote_count ?? 0;
      // Grade is computed (no stored column) — the same rating() the rest of
      // the site uses. Bucket by leading letter (S/A/B/C).
      const g = rating(
        p.base_success_rate,
        p.worked_votes,
        p.vote_count
      ).grade;
      if (g === "S") mapSTier += 1;
      else if (g === "A") mapATier += 1;
      else if (g === "B") mapBTier += 1;
      else mapCTier += 1;
      if (!latestPeekAt || p.created_at > latestPeekAt) {
        latestPeekAt = p.created_at;
      }
    }
  }

  const topPeek = await getTopPeekForMap(floorIds);

  const lastUpdatedLabel = latestPeekAt
    ? new Date(latestPeekAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const floorLabel = `${floors.length} ${floors.length === 1 ? "floor" : "floors"}`;

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-6 pb-20 pt-6">
        <div data-reveal className="mb-8 text-center">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            {map.name}
          </h1>
          <p className="mt-3 text-sm text-muted">{floorLabel}</p>
          <p className="mt-2 text-[15px] font-light italic text-muted">
            Choose your floor
          </p>
          {totalPeeks >= 2 && (
            <div className="mt-5">
              <RandomPeekButton href={`/api/maps/${map.slug}/random-peek`} />
            </div>
          )}
        </div>

        {totalPeeks > 0 && (
          <p className="mx-auto mb-8 max-w-2xl text-center text-[15px] leading-relaxed text-muted">
            Community-graded spawn peeks for {map.name} — pick a floor to see
            exact spots, watch clips, and learn the setups.
            {lastUpdatedLabel ? ` Updated ${lastUpdatedLabel}.` : ""}
          </p>
        )}

        {totalPeeks > 0 && (
          <div data-reveal className="mb-8">
            <MapStats
              peeks={totalPeeks}
              votes={mapVotes}
              grades={{ S: mapSTier, A: mapATier, B: mapBTier, C: mapCTier }}
              topPeek={topPeek}
            />
          </div>
        )}

        <ul className="space-y-3">
          {floors.map((floor, i) => {
            const n = peekCountByFloor.get(floor.id) ?? 0;
            return (
              <li
                key={floor.id}
                data-reveal
                style={
                  {
                    ["--reveal-delay"]: `${(i % 5) * 70}ms`,
                  } as React.CSSProperties
                }
              >
                <Link
                  href={`/maps/${map.slug}/${floor.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-card border-[3px] border-white bg-card px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand hover:shadow-lg sm:px-6 sm:py-5"
                >
                  <span className="text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-2xl">
                    {floor.name}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold uppercase tracking-wider text-brand">
                    {n} {n === 1 ? "peek" : "peeks"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {floors.length === 0 && (
          <p className="text-center text-muted">No floors yet for this map.</p>
        )}
      </main>
    </>
  );
}
