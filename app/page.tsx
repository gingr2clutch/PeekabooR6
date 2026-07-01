import Image from "next/image";
import Link from "next/link";
import { DiscordBanner } from "@/components/DiscordButton";
import { LiveStats } from "@/components/LiveStats";
import { PageHeader } from "@/components/PageHeader";
import { getHomeStats, getMaps } from "@/lib/db";

export const dynamic = "force-dynamic";

// Pinned order for published maps. Anything published but not listed here
// comes after these in alphabetical order. Unpublished maps come last,
// alphabetical.
const FEATURED_ORDER = ["Oregon", "Clubhouse", "Nighthaven Labs"];

// TEMP: Calypso Casino "new map" highlight. Pinned to first position +
// rendered with a purple pulse glow and a "NEW MAP" badge. To remove:
// drop this constant, the pin-to-front block below, the isNewMap branch
// in the card render, and the .new-map-pulse rules in app/globals.css.
const NEW_MAP_NAME = "Calypso Casino";

export default async function Home() {
  const all = await getMaps();
  const stats = await getHomeStats();
  const maps = [...all].sort((a, b) => {
    if (a.published !== b.published) return a.published ? -1 : 1;
    if (!a.published) return a.name.localeCompare(b.name);
    const ai = FEATURED_ORDER.indexOf(a.name);
    const bi = FEATURED_ORDER.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
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
        <div data-reveal className="mb-10">
          <DiscordBanner />
        </div>
        <div className="mb-6">
          <LiveStats
            mapsLive={stats.mapsLive}
            gradedPeeks={stats.gradedPeeks}
            communityVotes={stats.communityVotes}
            sTierPeeks={stats.sTierPeeks}
          />
        </div>
        <div data-reveal className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Maps</h1>
          <p className="mt-2 text-muted">Click the map you're on</p>
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span>New peeks daily</span>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {maps.map((map, i) => {
            const hasCover = !!map.cover_image_url;
            // Cascade within each row; modulo keeps the delay small so cards
            // never sit waiting long after they've scrolled into view.
            const revealStyle = {
              ["--reveal-delay"]: `${(i % 5) * 50}ms`,
            } as React.CSSProperties;
            const cardBase =
              "group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card text-center text-base font-medium shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-200";

            const cover = hasCover ? (
              <Image
                src={map.cover_image_url!}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className={`object-cover ${
                  map.published
                    ? "transition-transform duration-200 ease-out motion-safe:group-hover:scale-105"
                    : "grayscale"
                }`}
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
                <li key={map.id} data-reveal style={revealStyle}>
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
                      <span className="absolute right-2 top-2 z-20 inline-flex items-center rounded-btn bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        New map
                      </span>
                    )}
                    {label}
                  </Link>
                </li>
              );
            }

            return (
              <li key={map.id} data-reveal style={revealStyle}>
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
