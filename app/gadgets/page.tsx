import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MapCardImage } from "@/components/MapCardImage";
import { getMaps } from "@/lib/db";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Operator gadgets by map",
  description:
    "Pick a Rainbow Six Siege map to see the operator gadgets that matter on it — what each one does, what counters it, and how to use it.",
  alternates: { canonical: `${SITE_URL}/gadgets` },
};

// Gadgets mode landing: the same map-picker flow as Peeks, so switching modes
// feels like the same site rather than two different ones.
//
// The grid wrapper is duplicated rather than shared. There is no map-grid
// component — the Peeks version is inline in app/page.tsx — and extracting it
// would mean restructuring the homepage. app/attacking/page.tsx already hit
// this and duplicated the wrapper while reusing MapCardImage; this follows that
// precedent, so the homepage stays untouched.
export default async function GadgetsIndexPage() {
  const maps = (await getMaps()).filter((m) => m.published);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            Gadgets
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-5xl">
            Gadgets
          </h1>
          <p className="mt-2 text-lg font-medium text-[#6f716a]">
            Click the map you&apos;re on
          </p>
          <p className="mt-3 inline-block rounded-btn border border-blue/30 bg-blue/[0.06] px-3 py-1 text-xs font-medium text-blue">
            Placeholder data — real gadgets land once the database is wired up
          </p>
        </div>

        {maps.length === 0 ? (
          <p className="text-center text-sm text-muted">No maps yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4">
            {maps.map((map) => (
              <li key={map.id}>
                <Link
                  href={`/gadgets/${map.slug}`}
                  className="map-card group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-white text-center text-base font-medium elev-card transition-all duration-[180ms] ease-out motion-safe:hover:scale-[1.02]"
                >
                  {map.cover_image_url ? (
                    <MapCardImage
                      src={map.cover_image_url}
                      published={map.published}
                    />
                  ) : null}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <span className="relative z-10 mt-auto w-full px-3 pb-2.5 text-left">
                    <span className="block truncate font-medium text-white drop-shadow-sm">
                      {map.name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
