import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PeekPin } from "@/components/PeekPin";
import {
  getFloorBySlug,
  getMapBySlug,
  getPublishedPeeksForFloor,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string; floor: string };
}): Promise<Metadata> {
  const map = await getMapBySlug(params.slug);
  if (!map) return { title: "Not found" };
  const floor = await getFloorBySlug(map.id, params.floor);
  if (!floor) return { title: "Not found" };
  return {
    title: `${map.name} · ${floor.name}`,
    description: `Spawn peeks on ${map.name} ${floor.name} — Rainbow Six Siege.`,
  };
}

export default async function FloorPage({
  params,
}: {
  params: { slug: string; floor: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  const floor = await getFloorBySlug(map.id, params.floor);
  if (!floor) notFound();

  const peeks = await getPublishedPeeksForFloor(floor.id);

  return (
    <>
      <PageHeader back={{ href: `/maps/${map.slug}`, label: "Back" }} />
      <main className="fade-in-up mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {map.name} · {floor.name}
          </h1>
          <p className="mt-2 text-muted">
            Spawn peeks · click any pin for details
          </p>
        </div>

        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card border border-border bg-card">
          {floor.birds_eye_url ? (
            <Image
              src={floor.birds_eye_url}
              alt={`${map.name} ${floor.name} bird's-eye view`}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="placeholder-stripes flex h-full w-full items-center justify-center">
              <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                Bird's-eye view coming soon
              </span>
            </div>
          )}

          {peeks.map((peek, i) => (
            <PeekPin
              key={peek.id}
              id={peek.id}
              name={peek.name}
              xPct={peek.x_pct}
              yPct={peek.y_pct}
              number={i + 1}
            />
          ))}
        </div>

        {peeks.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            No spawn peeks pinned to this floor yet.
          </p>
        )}
      </main>
    </>
  );
}
