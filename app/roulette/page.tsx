import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getMaps } from "@/lib/db";
import { supabasePublic } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Peek Roulette — spin for a random peek challenge",
  description:
    "Pick a map and spin Peek Roulette: a random spawn peek to go hit, a check-in, and a running tally. Rainbow Six Siege.",
  alternates: { canonical: `${SITE_URL}/roulette` },
};

// Published maps that have at least 2 published peeks (roulette needs variety).
// One query for the peek→map counts, joined against the published map list.
async function getRouletteMaps() {
  const maps = (await getMaps()).filter((m) => m.published);
  const { data } = await supabasePublic()
    .from("peeks")
    .select("floors!inner(map_id)")
    .eq("published", true);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as {
    floors: { map_id: string } | null;
  }[]) {
    const mapId = row.floors?.map_id;
    if (mapId) counts.set(mapId, (counts.get(mapId) ?? 0) + 1);
  }

  return maps
    .map((map) => ({ map, peekCount: counts.get(map.id) ?? 0 }))
    .filter((m) => m.peekCount >= 2)
    .sort((a, b) => b.peekCount - a.peekCount || a.map.name.localeCompare(b.map.name));
}

export default async function RouletteIndexPage() {
  const rouletteMaps = await getRouletteMaps();

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6">
        <div className="mb-10 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            🎲 Peek Roulette
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Pick your map
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted">
            Spin for a random spawn peek to go hit, log whether you landed it,
            and rack up a daily tally. Choose a map to start.
          </p>
        </div>

        {rouletteMaps.length === 0 ? (
          <p className="text-center text-muted">
            No maps are ready for roulette yet — check back soon.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {rouletteMaps.map(({ map, peekCount }, i) => {
              const hasCover = !!map.cover_image_url;
              const revealStyle = {
                ["--reveal-delay"]: `${(i % 5) * 50}ms`,
              } as React.CSSProperties;
              return (
                <li key={map.id} data-reveal style={revealStyle}>
                  <Link
                    href={`/roulette/${map.slug}`}
                    className="group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card border-[3px] border-white text-center text-base font-medium shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-200 hover:border-brand hover:shadow-lg motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.03]"
                  >
                    {hasCover ? (
                      <Image
                        src={map.cover_image_url!}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover transition-transform duration-200 ease-out motion-safe:group-hover:scale-105"
                      />
                    ) : null}
                    {hasCover ? (
                      <>
                        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        <span className="relative z-10 mt-auto w-full px-3 pb-3 text-left text-white drop-shadow">
                          {map.name}
                        </span>
                      </>
                    ) : (
                      <span className="bg-card px-3 text-ink">{map.name}</span>
                    )}
                    <span className="absolute right-2 top-2 z-20 inline-flex items-center rounded-btn bg-bg/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted shadow-sm backdrop-blur-sm">
                      {peekCount} peeks
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
