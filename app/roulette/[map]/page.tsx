import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RouletteGame } from "@/components/RouletteGame";
import {
  getFloorsForMap,
  getMapBySlug,
  getPublishedPeeksForFloor,
} from "@/lib/db";
import type { RoulettePeek } from "@/lib/roulette";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { map: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.map);
  if (!map?.published) return { title: "Not found" };
  return {
    title: `Peek Roulette — ${map.name}`,
    description: `Spin for a random spawn peek challenge on ${map.name}. Hit it or miss it, then spin again. Rainbow Six Siege.`,
  };
}

export default async function MapRoulettePage({
  params,
}: {
  params: { map: string };
}) {
  const map = await getMapBySlug(params.map);
  if (!map || !map.published) notFound();

  // Flatten every published peek on this map into the serializable shape the
  // client game needs (grade is computed client-side from the raw inputs).
  const floors = await getFloorsForMap(map.id);
  const peeks: RoulettePeek[] = [];
  for (const floor of floors) {
    const floorPeeks = await getPublishedPeeksForFloor(floor.id);
    for (const p of floorPeeks) {
      peeks.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        floorName: floor.name,
        videoUrl: p.video_url,
        posterUrl: p.poster_url ?? map.cover_image_url,
        baseSuccessRate: p.base_success_rate,
        workedVotes: p.worked_votes,
        voteCount: p.vote_count,
      });
    }
  }

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6">
        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            🎲 Peek Roulette
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {map.name}
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            Spin for a random peek, go hit it in-game, then log it. Repeat.
          </p>
          <div className="mt-3">
            <Link
              href="/roulette"
              className="text-sm font-semibold text-brand hover:underline"
            >
              ← Pick a different map
            </Link>
          </div>
        </div>

        {peeks.length === 0 ? (
          <p className="text-center text-muted">
            No spawn peeks on {map.name} yet — check back soon.
          </p>
        ) : (
          <RouletteGame map={{ slug: map.slug, name: map.name }} peeks={peeks} />
        )}
      </main>
    </>
  );
}
