import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MapCardImage } from "@/components/MapCardImage";
import { LiveStats } from "@/components/LiveStats";
import { getGadgetStats, getMaps } from "@/lib/db";

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
  const [allMaps, stats] = await Promise.all([getMaps(), getGadgetStats()]);
  const maps = allMaps.filter((m) => m.published);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        {/* One "Gadget", not two. The eyebrow used to say GADGETS above a
            headline that also said Gadgets; the blue accent carries the mode
            signal instead, matching the logo and wordmark. */}
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Defender <span className="text-blue">Gadget</span> Database
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#6f716a] sm:max-w-xl sm:text-lg">
            Pick your map. Get the exact spot for every cam, trap, and utility
            placement.
          </p>
          {/* Demoted from a blue callout box: it was competing with the
              headline for attention in the hero. */}
          <p className="mt-3 text-[11px] text-muted">
            Placeholder data while the database fills up
          </p>
        </div>

        {/* Same bar the homepage uses, in the Gadgets accent. Cell ordering
            mirrors the peek version: a 2x2 on phones that resets to a single
            row at sm. Counts are real and will read 0 until content is
            published. */}
        <div className="mb-8 sm:mb-10">
          <LiveStats
            accent="blue"
            cells={[
              { label: "Maps", value: stats.maps, icon: "pin", cellClass: "order-3 sm:order-none" },
              { label: "Placements", value: stats.placements, icon: "eye", cellClass: "order-1 sm:order-none sm:border-l" },
              { label: "Operators", value: stats.operators, icon: "check", cellClass: "order-2 border-l sm:order-none" },
              { label: "Thumbs Up", value: stats.thumbsUp, icon: "trophy", cellClass: "order-4 border-l sm:order-none" },
            ]}
          />
        </div>

        {maps.length === 0 ? (
          <p className="text-center text-sm text-muted">No maps yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4">
            {maps.map((map) => (
              <li key={map.id}>
                <Link
                  href={`/gadgets/${map.slug}`}
                  className="map-card group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-white text-center text-base font-medium elev-card outline-none transition-all duration-[180ms] ease-out focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99]"
                >
                  {map.cover_image_url ? (
                    <MapCardImage
                      src={map.cover_image_url}
                      published={map.published}
                    />
                  ) : null}
                  {/* Taller, deeper scrim than the peek cards: the name sits on
                      top of it, and a lighter one left thin type hard to read
                      over pale covers. */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  {/* Blue edge on hover/focus — the Gadgets accent, drawn
                      inside the card's overflow so it reads as a crisp ring
                      rather than a glow. */}
                  <span className="pointer-events-none absolute inset-0 rounded-card ring-0 ring-inset ring-blue transition-all duration-[180ms] ease-out group-hover:ring-2 group-focus-visible:ring-2" />
                  <span className="relative z-10 mt-auto w-full px-3 pb-2.5 text-left">
                    <span className="block truncate text-sm font-semibold text-white drop-shadow-sm sm:text-base">
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
