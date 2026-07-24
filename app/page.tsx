import type { CSSProperties } from "react";
import Link from "next/link";
import { DiscordBanner } from "@/components/DiscordButton";
import { MapCardImage } from "@/components/MapCardImage";
import { LiveStats } from "@/components/LiveStats";
import { PageHeader } from "@/components/PageHeader";
import { getHomeStats, getMaps } from "@/lib/db";
import { getMapVoteActivity } from "@/lib/map-activity";

export const dynamic = "force-dynamic";

// TEMP: Calypso Casino "new map" highlight. Pinned to first position +
// rendered with a purple pulse glow and a "NEW MAP" badge. To remove:
// drop this constant, the pin-to-front block below, the isNewMap branch
// in the card render, and the .new-map-pulse rules in app/globals.css.
const NEW_MAP_NAME = "Calypso Casino";

export default async function Home() {
  const all = await getMaps();
  const stats = await getHomeStats();
  const activity = await getMapVoteActivity();
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
        {/* Homepage hero — a faint drifting blueprint grid sits behind the
            stats/heading area only. `isolate` keeps the -z-10 layer scoped to
            this region; it never overlaps the map grid below. */}
        <div className="relative isolate">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            {/* Near-invisible: reads as faint texture, never lowers contrast
                behind the stats/Maps heading. */}
            <div
              className="ghost-mosaic"
              style={{ "--ghost-mosaic-opacity": "0.03" } as CSSProperties}
            />
          </div>
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
              { label: "Maps", value: stats.mapsLive, cellClass: "order-3 border-t sm:order-none sm:border-t-0" },
              { label: "Peeks", value: stats.gradedPeeks, cellClass: "order-1 sm:order-none sm:border-l" },
              { label: "Votes", value: stats.communityVotes, cellClass: "order-2 border-l sm:order-none" },
              { label: "S-Tier", value: stats.sTierPeeks, cellClass: "order-4 border-t border-l sm:order-none sm:border-t-0" },
            ]}
          />
        </div>
        <div data-reveal className="mb-8 text-center">
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

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {maps.map((map) => {
            const hasCover = !!map.cover_image_url;
            const cardBase =
              "group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card text-center text-base font-medium shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-200";

            const cover = hasCover ? (
              <MapCardImage
                src={map.cover_image_url!}
                published={map.published}
              />
            ) : null;

            const label = hasCover ? (
              <>
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <span className="relative z-10 mt-auto w-full px-3 pb-3 text-left text-white drop-shadow">
                  {map.name}
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
                    className={`${cardBase} border-[3px] ${
                      isNewMap
                        ? "new-map-pulse border-white hover:border-purple-500"
                        : "border-white hover:border-brand"
                    } ${
                      hasCover ? "" : "bg-card text-ink"
                    } hover:shadow-lg motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.03]`}
                  >
                    {cover}
                    {isNewMap && (
                      <span className="absolute right-2 top-2 z-20 inline-flex items-center rounded-btn bg-purple-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        New map
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
                  className={`${cardBase} !cursor-not-allowed border-[3px] border-white ${
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
      </main>
    </>
  );
}
