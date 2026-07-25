import type { CSSProperties } from "react";
import Link from "next/link";
import { DiscordBanner } from "@/components/DiscordButton";
import { MapCardImage } from "@/components/MapCardImage";
import { LiveStats } from "@/components/LiveStats";
import { PageHeader } from "@/components/PageHeader";
import { getHomeStats, getMaps } from "@/lib/db";
import {
  getMapPeekCounts,
  getMapVoteActivity,
  getRecentPeekCountsByMap,
} from "@/lib/map-activity";
import { BackToTop } from "@/components/BackToTop";

export const dynamic = "force-dynamic";

// TEMP: Calypso Casino "new map" highlight. Pinned to first position +
// rendered with a soft static orange glow and a "NEW MAP" badge. To remove:
// drop this constant, the pin-to-front block below, the isNewMap branch
// in the card render, and the .new-map-glow rules in app/globals.css.
const NEW_MAP_NAME = "Calypso Casino";

export default async function Home() {
  const all = await getMaps();
  const stats = await getHomeStats();
  const activity = await getMapVoteActivity();
  // Peeks added per map in the last 72h → the "N new" accent on fresh maps.
  const recentPeeks = await getRecentPeekCountsByMap(72);
  // Published-peek counts per map → the map card status line ("N peeks · N S-tier").
  const mapPeekCounts = await getMapPeekCounts();
  const votesFor = (id: string) =>
    activity.get(id) ?? { sevenDayVotes: 0, allTimeVotes: 0 };

  // Activity-driven order: most votes in the last 7 days first (a rolling
  // window off the daily snapshots, so it shifts with player activity), tie-
  // broken by all-time votes, then name. Published maps rank above unpublished.
  const maps = [...all].sort((a, b) => {
    if (a.published !== b.published) return a.published ? -1 : 1;
    if (!a.published) return a.name.localeCompare(b.name);
    const av = votesFor(a.id);
    const bv = votesFor(b.id);
    if (av.sevenDayVotes !== bv.sevenDayVotes)
      return bv.sevenDayVotes - av.sevenDayVotes;
    if (av.allTimeVotes !== bv.allTimeVotes)
      return bv.allTimeVotes - av.allTimeVotes;
    return a.name.localeCompare(b.name);
  });

  // TEMP: pull the new-map card to position 0 if it's published. No-op
  // if it isn't found or isn't published (keeps sort behaviour intact).
  const newMapIdx = maps.findIndex(
    (m) => m.name === NEW_MAP_NAME && m.published
  );
  if (newMapIdx > 0) {
    const [pinned] = maps.splice(newMapIdx, 1);
    maps.unshift(pinned);
  }

  return (
    <>
      <PageHeader home />
      <main className="fade-in-up mx-auto max-w-6xl px-6 pb-20 pt-10">
        {/* Homepage hero. The drifting map filmstrip is anchored to the Maps
            heading below (not here) so it stays clear of the stats card. */}
        <div>
          <div data-reveal className="mb-6">
            <DiscordBanner />
        </div>
        <div className="mb-5">
          {/* DOM/source order stays Maps, Peeks, Votes, S-Tier (keeps the
              desktop single-row order); the `order-*` classes reshuffle the
              mobile 2x2 to Peeks | Votes (top) / Maps | S-Tier (bottom), and
              `sm:` resets both order and dividers to the source-order row. */}
          <LiveStats
            cells={[
              { label: "Maps", value: stats.mapsLive, icon: "pin", cellClass: "order-3 sm:order-none" },
              { label: "Peeks", value: stats.gradedPeeks, icon: "eye", cellClass: "order-1 sm:order-none sm:border-l" },
              { label: "Votes", value: stats.communityVotes, icon: "check", cellClass: "order-2 border-l sm:order-none" },
              { label: "S-Tier", value: stats.sTierPeeks, icon: "trophy", cellClass: "order-4 border-l sm:order-none" },
            ]}
          />
        </div>
        <div data-reveal className="relative isolate mb-8 text-center">
          {/* Drifting map filmstrip — anchored to the heading so it sits behind
              the Maps title and eases down toward the grid, never up into the
              stats. Opacity is the one tunable knob. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-6 bottom-[-24px] -z-10 overflow-hidden"
          >
            <div
              className="ghost-mosaic"
              style={{ "--ghost-mosaic-opacity": "0.11" } as CSSProperties}
            />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Maps</h1>
          <p className="mt-2 text-[#6f716a]">Click the map you're on</p>
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span>New peeks daily</span>
          </div>
        </div>
        </div>

        <ul
          id="maps"
          className="grid scroll-mt-24 grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4"
        >
          {maps.map((map) => {
            const hasCover = !!map.cover_image_url;
            // Peeks added on this map in the last 72h (accent shown when > 0).
            const recentCount = recentPeeks.get(map.id) ?? 0;
            // Live per-map counts → one short status line under the name.
            const counts = mapPeekCounts.get(map.id);
            const statusParts: string[] = [];
            if (counts && counts.peeks > 0) {
              statusParts.push(
                `${counts.peeks} ${counts.peeks === 1 ? "peek" : "peeks"}`
              );
              if (counts.sTier > 0) statusParts.push(`${counts.sTier} S-tier`);
            }
            const statusLine = statusParts.join(" · ");
            const cardBase =
              "group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card text-center text-base font-medium elev-card transition-all duration-[180ms] ease-out";

            const cover = hasCover ? (
              <MapCardImage
                src={map.cover_image_url!}
                published={map.published}
              />
            ) : null;

            const label = hasCover ? (
              <>
                {/* Soft bottom-up scrim (dark→transparent) so the name reads on
                    any image — a smooth fade, never a hard label bar. */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <span className="relative z-10 mt-auto w-full px-3 pb-2.5 text-left">
                  <span className="block truncate font-medium text-white drop-shadow-sm">
                    {map.name}
                  </span>
                  {statusLine && (
                    <span className="mt-0.5 block truncate whitespace-nowrap text-[11px] font-medium text-white/70">
                      {statusLine}
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="px-3">{map.name}</span>
            );

            if (map.published) {
              // TEMP: Calypso Casino new-map highlight branch.
              const isNewMap = map.name === NEW_MAP_NAME;
              return (
                <li key={map.id}>
                  <Link
                    href={`/maps/${map.slug}`}
                    className={`${cardBase} map-card border-2 border-white ${
                      isNewMap ? "new-map-glow" : ""
                    } ${
                      hasCover ? "" : "bg-card text-ink"
                    } motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.97]`}
                  >
                    {cover}
                    {isNewMap && (
                      <span className="absolute right-1.5 top-1.5 z-20 inline-flex items-center rounded-btn bg-purple-600 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                        New map
                      </span>
                    )}
                    {/* Fresh-peeks accent — top-LEFT so it never collides with
                        the top-right NEW MAP badge. Suppressed on the new-map
                        card (redundant there) and when there are none. */}
                    {!isNewMap && recentCount > 0 && (
                      <span className="absolute left-1.5 top-1.5 z-20 inline-flex items-center rounded-btn bg-brand px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                        {recentCount} new
                      </span>
                    )}
                    {label}
                  </Link>
                </li>
              );
            }

            return (
              <li key={map.id}>
                <div
                  aria-disabled="true"
                  className={`${cardBase} !cursor-not-allowed border-2 border-white ${
                    hasCover ? "opacity-60" : "bg-card/60 text-muted"
                  }`}
                >
                  {cover}
                  {label}
                  <span className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-btn border border-border bg-bg/90 px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted backdrop-blur-sm">
                    Coming soon
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Scroll-completion note after the last row. Static (no animation),
            muted. Count reflects the live maps shown in the stats. */}
        <div className="mt-10 text-center text-sm">
          <p className="font-medium text-ink/70">
            ✓ You&apos;ve explored all {stats.mapsLive} maps
          </p>
          <p className="mt-1 text-muted">More peeks added every week.</p>
        </div>
      </main>
      <BackToTop />
    </>
  );
}
