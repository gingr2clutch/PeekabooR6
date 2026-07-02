import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FloorPeekList } from "@/components/FloorPeekList";
import { FloorView } from "@/components/FloorView";
import { PageHeader } from "@/components/PageHeader";
import {
  getFloorBySlug,
  getFloorsForMap,
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
  // Same query path /maps/[slug]/page.tsx uses — one extra round trip,
  // ordered by display_order ascending.
  const allFloors = await getFloorsForMap(map.id);
  const floorIdx = allFloors.findIndex((f) => f.id === floor.id);
  const prevFloor = floorIdx > 0 ? allFloors[floorIdx - 1] : null;
  const nextFloor =
    floorIdx >= 0 && floorIdx < allFloors.length - 1
      ? allFloors[floorIdx + 1]
      : null;
  const otherFloors = allFloors.filter((f) => f.id !== floor.id);

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mb-8 text-center">
          <div className="mb-3">
            <Link
              href={`/maps/${map.slug}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-btn px-2.5 py-1 text-sm font-medium text-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand"
            >
              <BackArrowIcon />
              <span>{map.name}</span>
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {map.name} · {floor.name}
          </h1>
          <p className="mt-2 text-muted">
            Spawn peeks · click any pin for details
          </p>
          {allFloors.length > 1 && (
            <nav
              aria-label="Floors"
              className="mt-5 flex flex-wrap justify-center gap-2"
            >
              {allFloors.map((f) => {
                const isCurrent = f.id === floor.id;
                const base =
                  "inline-flex items-center rounded-btn px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out";
                const state = isCurrent
                  ? "bg-brand text-white shadow-sm"
                  : "border border-border bg-card text-ink hover:border-brand hover:text-brand";
                return isCurrent ? (
                  <span
                    key={f.id}
                    aria-current="page"
                    className={`${base} ${state}`}
                  >
                    {f.name}
                  </span>
                ) : (
                  <Link
                    key={f.id}
                    href={`/maps/${map.slug}/${f.slug}`}
                    className={`${base} ${state}`}
                  >
                    {f.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <FloorView map={map} floor={floor} peeks={positioned} />

        {peeks.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            No spawn peeks pinned to this floor yet.
          </p>
        )}

        <FloorPeekList map={map} floor={floor} peeks={peeks} />

        {/* Other floors + prev/next navigation to keep users browsing. */}
        {allFloors.length > 1 && (
          <nav
            aria-label="More floors on this map"
            className="mx-auto mt-16 max-w-3xl"
          >
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Other floors on {map.name}
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {otherFloors.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/maps/${map.slug}/${f.slug}`}
                    className="group block overflow-hidden rounded-card border-[3px] border-white bg-card shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out hover:scale-[1.015] hover:border-brand/30 hover:shadow-lg"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-card">
                      {f.birds_eye_url ? (
                        <Image
                          src={f.birds_eye_url}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 50vw, 300px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="placeholder-stripes h-full w-full" />
                      )}
                    </div>
                    <div className="px-4 py-3 text-sm font-semibold text-ink group-hover:text-brand">
                      {f.name}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6 text-sm font-medium">
              {prevFloor ? (
                <Link
                  href={`/maps/${map.slug}/${prevFloor.slug}`}
                  className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-brand"
                >
                  ← {prevFloor.name}
                </Link>
              ) : (
                <span />
              )}
              <Link
                href={`/maps/${map.slug}`}
                className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-brand"
              >
                All floors
              </Link>
              {nextFloor ? (
                <Link
                  href={`/maps/${map.slug}/${nextFloor.slug}`}
                  className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-brand"
                >
                  {nextFloor.name} →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </nav>
        )}
      </main>
    </>
  );
}

function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
