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
    }
  }

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-6 pb-20 pt-10">
        <h1 className="mb-10 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
          {map.name}
        </h1>

        <ul className="space-y-6">
          {floors.map((floor) => (
            <li key={floor.id}>
              <Link
                href={`/maps/${map.slug}/${floor.slug}`}
                className="group relative block cursor-pointer overflow-hidden rounded-card border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-brand hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  {floor.birds_eye_url ? (
                    <>
                      <Image
                        src={floor.birds_eye_url}
                        alt=""
                        aria-hidden
                        fill
                        sizes="(max-width: 768px) 100vw, 768px"
                        className="scale-125 object-cover blur-[24px]"
                      />
                      <Image
                        src={floor.birds_eye_url}
                        alt={`${map.name} ${floor.name} bird's-eye view`}
                        fill
                        sizes="(max-width: 768px) 100vw, 768px"
                        className="object-cover"
                        style={{
                          WebkitMaskImage:
                            "radial-gradient(ellipse at center, black 45%, transparent 100%)",
                          maskImage:
                            "radial-gradient(ellipse at center, black 45%, transparent 100%)",
                        }}
                      />
                    </>
                  ) : (
                    <div className="placeholder-stripes flex h-full w-full items-center justify-center">
                      <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                        Bird's-eye view coming soon
                      </span>
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[62px] -translate-y-1/2 bg-brand/90 md:h-[104px]" />

                  <div className="absolute inset-0 flex items-center justify-center px-6">
                    <span className="flex flex-col items-center gap-0.5 text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] md:gap-1">
                      <span className="text-2xl font-semibold leading-none tracking-tight text-white md:text-4xl">
                        {floor.name}
                      </span>
                      <span className="text-xs font-normal text-white/80 md:text-lg">
                        {(() => {
                          const n = peekCountByFloor.get(floor.id) ?? 0;
                          return `${n} ${n === 1 ? "peek" : "peeks"}`;
                        })()}
                      </span>
                    </span>
                  </div>

                  <span className="absolute bottom-5 right-6 text-xl font-medium text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] transition-colors group-hover:text-brand sm:text-2xl">
                    Open →
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
