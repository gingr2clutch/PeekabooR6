import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getFloorsForMap, getMapBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MapPage({
  params,
}: {
  params: { slug: string };
}) {
  const map = await getMapBySlug(params.slug);
  if (!map || !map.published) notFound();

  const floors = await getFloorsForMap(map.id);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-10">
        <h1 className="mb-10 text-center text-3xl font-semibold tracking-tight">
          {map.name}
        </h1>

        <ul className="space-y-6">
          {floors.map((floor) => (
            <li key={floor.id}>
              <Link
                href={`/maps/${map.slug}/${floor.slug}`}
                className="group relative block overflow-hidden rounded-card border border-border bg-card transition-all duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
              >
                <div className="relative aspect-[16/10] w-full">
                  {floor.birds_eye_url ? (
                    <Image
                      src={floor.birds_eye_url}
                      alt={`${map.name} ${floor.name} bird's-eye view`}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="placeholder-stripes flex h-full w-full items-center justify-center">
                      <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                        Bird's-eye view coming soon
                      </span>
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-6 py-5">
                    <span className="text-4xl font-semibold leading-none tracking-tight text-white drop-shadow sm:text-5xl">
                      {floor.name}
                    </span>
                    <span className="text-xl font-medium text-white/90 drop-shadow transition-colors group-hover:text-brand sm:text-2xl">
                      Open →
                    </span>
                  </div>
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
