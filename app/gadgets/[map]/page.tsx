import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SubmitCta } from "@/components/SubmitCta";
import { getMaps } from "@/lib/db";
import { getGadgetSitesForMap } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { map: string } };

async function findMap(slug: string) {
  const maps = await getMaps();
  return maps.find((m) => m.slug === slug && m.published) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const map = await findMap(params.map);
  if (!map) return { title: "Not found" };
  return {
    title: `${map.name} bomb sites — gadgets`,
    description: `Pick a bomb site on ${map.name} to see gadget placements for each operator.`,
  };
}

// Step 2 of the gadget flow: map -> SITE -> operator -> placements.
// Sites come from gadget_sites via supabasePublic(), so RLS returns published
// rows only. An unknown or unpublished map slug 404s the same way the peek map
// pages do.
export default async function MapSitesPage({ params }: Params) {
  const map = await findMap(params.map);
  if (!map) notFound();

  const sites = await getGadgetSitesForMap(map.id);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href="/gadgets"
          className="text-sm font-medium text-muted transition-colors hover:text-blue"
        >
          ← All maps
        </Link>

        <header className="mt-4 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            Gadgets
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
            {map.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-[#6f716a]">
            Pick the bomb site
          </p>
        </header>

        {sites.length === 0 ? (
          <p className="mt-8 rounded-card border border-border bg-card p-4 text-center text-sm text-muted">
            No bomb sites published for {map.name} yet.
          </p>
        ) : (
        /* Thumbnail cards matching the map picker. The thumbnail is the site's
           own uploaded photo, falling back to the linked floor's blueprint
           when there isn't one — so a site without a photo still shows
           something, and two sites on the same floor only look alike until
           one gets a photo.

           Rendered with plain next/image rather than MapCardImage: that
           component routes through coverThumb, which is deliberately scoped to
           map covers only (blueprints are already compressed WebP at upload,
           and the narrow scope keeps a proxy hiccup away from them). Site
           photos are compressed to WebP on upload for the same reason. */
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {sites.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/gadgets/${map.slug}/${s.slug}`}
                className="map-card group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-white text-center elev-card outline-none transition-all duration-[180ms] ease-out focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99]"
              >
                {s.preview_image_url ?? s.floor?.birds_eye_url ? (
                  <Image
                    src={(s.preview_image_url ?? s.floor?.birds_eye_url)!}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="placeholder-stripes absolute inset-0" />
                )}

                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <span className="pointer-events-none absolute inset-0 rounded-card ring-0 ring-inset ring-blue transition-all duration-[180ms] ease-out group-hover:ring-2 group-focus-visible:ring-2" />

                <span className="relative z-10 mt-auto w-full px-3 pb-2.5 text-left">
                  <span className="block truncate text-sm font-semibold text-white drop-shadow-sm sm:text-base">
                    {s.name}
                  </span>
                  {s.floor?.name && (
                    <span className="block truncate text-[11px] text-white/70">
                      {s.floor.name}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        )}

        <p className="mt-12 text-center text-sm text-muted">
          Looking for spawn peeks instead?{" "}
          <Link
            href={`/maps/${map.slug}`}
            className="font-medium text-brand hover:underline"
          >
            {map.name} peeks →
          </Link>
        </p>
        <SubmitCta variant="banner" gadgets />
        <SubmitCta variant="floating" gadgets />
      </main>
    </>
  );
}
