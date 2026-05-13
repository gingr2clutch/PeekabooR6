import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BirdsEyeWatermark } from "@/components/BirdsEyeWatermark";
import { PageHeader } from "@/components/PageHeader";
import { PeekPin } from "@/components/PeekPin";
import {
  getFloorBySlug,
  getMapBySlug,
  getPublishedPeeksForFloor,
} from "@/lib/db";

export const dynamic = "force-dynamic";

// When two or more peeks share the same (x_pct, y_pct), they render on top of
// each other and only the topmost is visible. We push duplicates onto a small
// circle around the shared point so every pin remains tappable. Order in the
// returned array is preserved (so pin numbers still match success-rate rank).
function fanOutCoincidentPins<
  T extends { x_pct: number; y_pct: number },
>(peeks: T[]): Array<T & { displayX: number; displayY: number }> {
  const seen = new Map<string, number>();
  return peeks.map((peek) => {
    // Bucket to ~0.5% so near-coincident points still cluster.
    const key = `${Math.round(peek.x_pct * 2)},${Math.round(peek.y_pct * 2)}`;
    const idx = seen.get(key) ?? 0;
    seen.set(key, idx + 1);
    if (idx === 0) {
      return { ...peek, displayX: peek.x_pct, displayY: peek.y_pct };
    }
    // Spiral outward in 60° steps. Radius grows slowly so big clusters
    // still stay near the original point.
    const angle = (Math.PI / 3) * (idx - 1);
    const radius = 3 + Math.floor((idx - 1) / 6) * 1.5;
    return {
      ...peek,
      displayX: peek.x_pct + radius * Math.cos(angle),
      displayY: peek.y_pct + radius * Math.sin(angle),
    };
  });
}

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
  const positioned = fanOutCoincidentPins(peeks);

  return (
    <>
      <PageHeader />
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
            <>
              <Image
                src={floor.birds_eye_url}
                alt={`${map.name} ${floor.name} bird's-eye view`}
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
                priority
              />
              <BirdsEyeWatermark />
            </>
          ) : (
            <div className="placeholder-stripes flex h-full w-full items-center justify-center">
              <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                Bird's-eye view coming soon
              </span>
            </div>
          )}

          {positioned.map((peek, i) => (
            <PeekPin
              key={peek.id}
              slug={peek.slug}
              name={peek.name}
              xPct={peek.displayX}
              yPct={peek.displayY}
              number={i + 1}
            />
          ))}
        </div>

        {peeks.length > 0 && (
          <p className="mt-3 text-center text-[13px] text-muted">
            Ranked by success rate
          </p>
        )}

        {peeks.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            No spawn peeks pinned to this floor yet.
          </p>
        )}
      </main>
    </>
  );
}
