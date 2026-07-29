import { DiscordBanner } from "@/components/DiscordButton";
import { MapCardImage } from "@/components/MapCardImage";
import { MapCardLink } from "@/components/MapCardLink";
import { LiveStats } from "@/components/LiveStats";
import { PageHeader } from "@/components/PageHeader";
import { getHomeStats, getMaps } from "@/lib/db";
import {
  getMapPeekCounts,
  getMapVoteActivity,
} from "@/lib/map-activity";
import { BackToTop } from "@/components/BackToTop";

export const dynamic = "force-dynamic";

export default async function Home() {
  const all = await getMaps();
  const stats = await getHomeStats();
  const activity = await getMapVoteActivity();
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
              { label: "S/A Tier", value: stats.saTierPeeks, icon: "trophy", cellClass: "order-4 border-l sm:order-none" },
            ]}
          />
        </div>
        <div data-reveal className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Maps</h1>
          <p className="mt-2 text-lg font-medium text-[#6f716a]">Click the map you're on</p>
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span>New peeks weekly</span>
          </div>
        </div>
        </div>

        <ul
          id="maps"
          className="grid scroll-mt-24 grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5"
        >
          {maps.map((map) => {
            const hasCover = !!map.cover_image_url;
            // Live per-map counts → one short status line under the name.
            const counts = mapPeekCounts.get(map.id);
            const statusParts: string[] = [];
            if (counts && counts.peeks > 0) {
              statusParts.push(
                `${counts.peeks} ${counts.peeks === 1 ? "peek" : "peeks"}`
              );
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
              return (
                <li key={map.id}>
                  <MapCardLink
                    href={`/maps/${map.slug}`}
                    className={`${cardBase} map-card border-2 border-white ${
                      hasCover ? "" : "bg-card text-ink"
                    } motion-safe:hover:scale-[1.02]`}
                  >
                    {cover}
                    {label}
                  </MapCardLink>
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
