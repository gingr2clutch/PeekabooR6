import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getFloorsForMap, getMapBySlug } from "@/lib/db";
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
  if (floorIds.length > 0) {
    const { data: peeks } = await supabasePublic()
      .from("peeks")
      .select("floor_id")
      .in("floor_id", floorIds)
      .eq("published", true);
    for (const p of (peeks ?? []) as { floor_id: string }[]) {
      peekCountByFloor.set(
        p.floor_id,
        (peekCountByFloor.get(p.floor_id) ?? 0) + 1
      );
      totalPeeks += 1;
    }
  }

  const floorLabel = `${floors.length} ${floors.length === 1 ? "floor" : "floors"}`;
  const peekLabel = `${totalPeeks} total ${totalPeeks === 1 ? "peek" : "peeks"}`;

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-6 pb-20 pt-6">
        <div className="mb-8">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            {map.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {floorLabel} · {peekLabel}
          </p>
        </div>

        <ul className="space-y-6">
          {floors.map((floor) => (
            <li key={floor.id}>
              <Link
                href={`/maps/${map.slug}/${floor.slug}`}
                className="group block overflow-hidden rounded-card border border-border bg-card transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-bg">
                  {floor.birds_eye_url ? (
                    <Image
                      src={floor.birds_eye_url}
                      alt={`${map.name} ${floor.name} bird's-eye view`}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="placeholder-stripes flex h-full w-full items-center justify-center">
                      <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                        Bird's-eye view coming soon
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold tracking-tight">
                      {floor.name}
                    </div>
                    <div className="mt-0.5 text-sm text-muted">
                      {(() => {
                        const n = peekCountByFloor.get(floor.id) ?? 0;
                        return `${n} ${n === 1 ? "peek" : "peeks"}`;
                      })()}
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="text-xl text-muted opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-brand group-hover:opacity-100"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {floors.length === 0 && (
          <p className="text-center text-muted">No floors yet for this map.</p>
        )}
      </main>
    </>
  );
}
