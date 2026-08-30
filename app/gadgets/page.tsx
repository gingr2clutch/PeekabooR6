import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MapCardImage } from "@/components/MapCardImage";
import { LiveStats } from "@/components/LiveStats";
import {
  getGadgetOperatorNames,
  getGadgetSiteOptions,
  getGadgetStats,
  getMapIdsWithGadgetPlacements,
  getMaps,
} from "@/lib/db";
import { SubmitSpot } from "@/components/SubmitSpot";
import { GADGET_SUBMIT } from "@/lib/submit-config";

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
  const [allMaps, stats, mapsWithPlacements, siteOptions, operatorNames] =
    await Promise.all([
      getMaps(),
      getGadgetStats(),
      // One query for the whole grid, not one per card — see the reader in
      // lib/db.ts. Runs alongside the others, so it adds no round trip.
      getMapIdsWithGadgetPlacements(),
      // Selects for the submission section at the bottom. Parallel with the
      // rest, so they cost no extra wall clock.
      getGadgetSiteOptions(),
      getGadgetOperatorNames(),
    ]);
  const maps = allMaps.filter((m) => m.published);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-6 sm:pt-8">
        {/* Two lines, with the whole of "Gadget Database" carrying the blue —
            the accent reads as the mode signal (matching the logo and
            wordmark) rather than picking out one word mid-sentence. */}
        <div className="mb-6 text-center sm:mb-7">
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block text-ink">Defender</span>
            <span className="block text-blue">Gadget Database</span>
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[#6f716a] sm:text-base">
            Exact spots for cams, traps, and utilities.
          </p>

          {/* Status banner. Follows the site's callout convention — rounded-card
              radius with a tinted background and a matching border, the same
              shape used for notices elsewhere — but in a warm yellow rather
              than the brand orange, so it reads as status, not as a promo.
              Both text colours clear WCAG AA on this background (14.8:1 and
              6.6:1). Flat fill, no glow. */}
          <div
            className="mt-4 rounded-card border px-4 py-2.5 text-center"
            style={{ backgroundColor: "#fdf4d8", borderColor: "#f0e2b4" }}
          >
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink sm:text-[13px]">
              Actively being worked on
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "#6b5410" }}>
              Database coming soon
            </p>
          </div>
        </div>

        {/* Same bar the homepage uses, in the Gadgets accent. Cell ordering
            mirrors the peek version: a 2x2 on phones that resets to a single
            row at sm. Counts are real and will read 0 until content is
            published. */}
        <div className="mb-6 sm:mb-7">
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
            {maps.map((map) => {
              // Enabled purely on data: a map becomes clickable once it has a
              // publicly visible placement, and greys itself out when it has
              // none. Publishing content is the only step — no code change.
              const hasContent = mapsWithPlacements.has(map.id);

              // Shared by both branches so they cannot drift in size or
              // position. The disabled card keeps every box-affecting class;
              // only colour, opacity and interactivity differ, so swapping
              // between them can never move the grid.
              const cardBase =
                "group relative flex aspect-square items-center justify-center overflow-hidden rounded-card border-2 border-white text-center text-base font-medium elev-card";

              // published={hasContent} drives MapCardImage's existing
              // greyscale branch — the same treatment the homepage already
              // uses for its coming-soon maps, so no new styling is added.
              const cover = map.cover_image_url ? (
                <MapCardImage
                  src={map.cover_image_url}
                  published={hasContent}
                />
              ) : null;

              // Taller, deeper scrim than the peek cards: the name sits on
              // top of it, and a lighter one left thin type hard to read
              // over pale covers.
              const label = (
                <>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <span className="relative z-10 mt-auto w-full px-3 pb-2.5 text-left">
                    <span className="block truncate text-sm font-semibold text-white drop-shadow-sm sm:text-base">
                      {map.name}
                    </span>
                  </span>
                </>
              );

              if (!hasContent) {
                return (
                  <li key={map.id}>
                    {/* A div rather than a link: there is nothing to navigate
                        to, so it is unreachable by keyboard and announced as
                        disabled instead of being a focusable dead end. */}
                    <div
                      aria-disabled="true"
                      aria-label={`${map.name} — coming soon`}
                      className={`${cardBase} !cursor-default opacity-60`}
                    >
                      {cover}
                      {label}
                      <span className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-btn border border-border bg-bg/90 px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted backdrop-blur-sm">
                        Coming soon
                      </span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={map.id}>
                  <Link
                    href={`/gadgets/${map.slug}`}
                    className={`${cardBase} map-card cursor-pointer outline-none transition-all duration-[180ms] ease-out focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99]`}
                  >
                    {cover}
                    {/* Blue edge on hover/focus — the Gadgets accent, drawn
                        inside the card's overflow so it reads as a crisp ring
                        rather than a glow. */}
                    <span className="pointer-events-none absolute inset-0 rounded-card ring-0 ring-inset ring-blue transition-all duration-[180ms] ease-out group-hover:ring-2 group-focus-visible:ring-2" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Community submissions, gadget variant — same component as the
            homepage, different config. Bomb sites and operators come from the
            queries above; the map list is the published set already used by
            the grid. */}
        <SubmitSpot
          config={GADGET_SUBMIT}
          maps={maps.map((m) => ({ slug: m.slug, name: m.name }))}
          sites={siteOptions}
          operators={operatorNames}
        />
      </main>
    </>
  );
}
