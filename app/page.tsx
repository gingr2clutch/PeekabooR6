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
import PeekabooIntro from "@/components/PeekabooIntro";
import { SubmitSpot } from "@/components/SubmitSpot";
import { NitroAdSlot } from "@/components/NitroAdSlot";
import { PEEK_SUBMIT } from "@/lib/submit-config";
import { nitroEnabled } from "@/lib/ad-env";
import { Fragment, type CSSProperties } from "react";

// In-grid ad slot placement.
//
// The slot goes after the 8th map, which is a clean row boundary at 2 columns
// (4 rows) and at 4 columns (2 rows) but NOT at 3 columns, where 8 leaves a row
// two-thirds full. At 3 columns it therefore moves to the nearest complete row
// instead — after the 9th card, one card away rather than two.
//
// Position is driven by CSS `order`, not by source position or an explicit
// grid-row. Order participates in auto-placement, so the slot stays an ordinary
// grid item that simply starts a new row because it spans every column. An
// explicit grid-row would place it out of flow and leave the cards to fill
// around it, which is exactly how holes appear. Cards take even order values so
// the slot can sit in the gap between two of them without ever tying.
// The order values themselves are literals at the call site (order-[15],
// sm:order-[17]) because Tailwind cannot see a computed class name. They are
// (8 * STEP - 1) and (9 * STEP - 1): odd, so they slot between two even cards.
const CARD_ORDER_STEP = 2;

// Below this many maps there is no row boundary to sit on at every width, so
// the slot goes after the grid instead of inside it.
const MIN_MAPS_FOR_GRID_AD = 8;

export const dynamic = "force-dynamic";

export default async function Home() {
  // All four are independent — none takes another's output — so they run
  // together rather than in series. Matches how /gadgets already does it.
  const [all, stats, activity, mapPeekCounts] = await Promise.all([
    getMaps(),
    getHomeStats(),
    getMapVoteActivity(),
    // Published-peek counts per map → the map card status line ("N peeks").
    getMapPeekCounts(),
  ]);
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

  // Enough maps for the slot to sit on a row boundary inside the grid? If not
  // it goes after the grid, where any card count is fine.
  const gridAd = maps.length > MIN_MAPS_FOR_GRID_AD;

  return (
    <>
      {/* Cinematic lock-on intro. Plays once per session, skips itself under
          prefers-reduced-motion and on hash arrivals (/#submit must land on
          the form). Replaces the pin-drop load animation — two session-gated
          load-ins fighting over the same blocks made no sense, so the reveal
          stagger below is now the only homepage entrance. */}
      <PeekabooIntro
        stats={{
          maps: stats.mapsLive,
          peeks: stats.gradedPeeks,
          votes: stats.communityVotes,
          tier: stats.saTierPeeks,
        }}
      />
      <PageHeader home />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        {/* Homepage hero. The drifting map filmstrip is anchored to the Maps
            heading below (not here) so it stays clear of the stats card. */}
        <div>
          {/* lg: hides this bar — on desktop the Discord link lives in the top
              nav next to the profile icon (components/SiteNav.tsx) instead. */}
          <div className="reveal mb-5 lg:hidden" style={{ "--i": 1 } as CSSProperties}>
            <DiscordBanner />
        </div>
        <div data-intro-target="stats" className="mb-5">
          {/* DOM/source order stays Maps, Peeks, Votes, S-Tier (keeps the
              desktop single-row order); the `order-*` classes reshuffle the
              mobile 2x2 to Peeks | Votes (top) / Maps | S-Tier (bottom), and
              `sm:` resets both order and dividers to the source-order row. */}
          <LiveStats
            entrance={false}
            cells={[
              { label: "Maps", value: stats.mapsLive, icon: "pin", cellClass: "order-3 sm:order-none" },
              { label: "Peeks", value: stats.gradedPeeks, icon: "eye", cellClass: "order-1 sm:order-none sm:border-l" },
              { label: "Votes", value: stats.communityVotes, icon: "check", cellClass: "order-2 border-l sm:order-none" },
              { label: "S/A+ Tier", value: stats.saTierPeeks, icon: "trophy", cellClass: "order-4 border-l sm:order-none" },
            ]}
          />
        </div>
        <div className="mb-8 text-center lg:mb-10">
          <h1 className="reveal text-3xl font-semibold tracking-tight lg:text-5xl" style={{ "--i": 2 } as CSSProperties}>Maps</h1>
          <p className="reveal mt-2 text-lg font-medium text-[#6f716a] lg:mt-3 lg:text-[1.75rem]" style={{ "--i": 3 } as CSSProperties}>Click the map you're on</p>
          <div className="reveal mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand lg:mt-4 lg:text-sm" style={{ "--i": 4 } as CSSProperties}>
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span>New peeks weekly</span>
          </div>
        </div>
        </div>

        <ul
          id="maps"
          className="grid scroll-mt-24 grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4"
        >
          {maps.map((map, i) => {
            // Stagger resets every 4 cards so rows sweep in together — a
            // running index would put the last card ~2s behind for no one to
            // see (it is below the fold when the intro hands off).
            const revealStyle = {
              "--i": 5 + (i % 4),
              // Even slots, so the ad can take an odd one between any two.
              order: i * CARD_ORDER_STEP,
            } as CSSProperties;
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

            const cardLi = map.published ? (
              <li className="reveal" style={revealStyle}>
                <MapCardLink
                  href={`/maps/${map.slug}`}
                  className={`${cardBase} map-card border-2 border-white ${
                    hasCover ? "" : "bg-card text-ink"
                  } motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.97]`}
                >
                  {cover}
                  {label}
                </MapCardLink>
              </li>
            ) : (
              <li className="reveal" style={revealStyle}>
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

            // Both branches above produce the same shape, so the slot is
            // injected in one place rather than in each return. Source position
            // is after card 8; `order` is what actually decides where it lands
            // at each width.
            if (i !== MIN_MAPS_FOR_GRID_AD - 1 || !gridAd) {
              return <Fragment key={map.id}>{cardLi}</Fragment>;
            }

            return (
              <Fragment key={map.id}>
                {cardLi}
                {/* content-1 — a full-width row inside the grid. An <li>
                    because it is a child of <ul id="maps">; col-span-full so it
                    is its own row at every column count.

                    order puts it after card 8 at 2 and 4 columns, and after
                    card 9 at 3 columns, which are the complete-row boundaries
                    at those widths. No `reveal` class — an ad must not animate
                    in, and its height has to be committed at first paint. */}
                <li className="col-span-full order-[15] sm:order-[17] md:order-[15]">
                  <NitroAdSlot id="pkb-content-1" className="my-2" />
                </li>
              </Fragment>
            );
          })}
        </ul>

        {/* Fallback placement: too few maps for a row boundary inside the
            grid, so the slot sits directly under it. */}
        {!gridAd && <NitroAdSlot id="pkb-content-1" className="mt-8 md:mt-7" />}

        {/* Scroll-completion note after the last row. Static and not part of
            the pin drop — it sits below the fold on every viewport. */}
        <div className="mt-10 text-center text-sm">
          <p className="font-medium text-ink/70">
            ✓ You&apos;ve explored all {stats.mapsLive} maps
          </p>
          <p className="mt-1 text-muted">More peeks added every week.</p>
        </div>


        {/* Community submissions. Below the maps grid and above the footer, and
            deliberately outside the pin drop: it is far below the fold on every
            viewport, so animating it in would be motion nobody sees.

            `maps` is already loaded for the grid above, so this adds no query.
            Suggestions are fetched on demand from /api/submissions/suggestions
            once someone reaches step 2, which keeps the homepage's payload and
            query count exactly as they were. */}
        {/* Lead-in, so the form reads as an invitation rather than something
            trailing off the end of the page. Static markup above a section
            that was already there — it reserves its own space and shifts
            nothing. */}
        {/* content-2 — closes out the maps section, directly above the "Your
            turn" divider. mt-12 matches the gap the map and peek pages give
            their slots, and the divider's own mt-16 keeps the submission form
            well clear below. */}
        <NitroAdSlot id="pkb-content-2" className="my-8 md:my-7" />

        <div className="mx-auto mt-16 max-w-[620px] text-center">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
              Your turn
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>

        <SubmitSpot
          config={PEEK_SUBMIT}
          maps={maps
            .filter((m) => m.published)
            .map((m) => ({ slug: m.slug, name: m.name }))}
        />
        {/* Nitro's CCPA opt-out. Empty until __uspapi injects into it, so it
            sits on its own line below the form with a committed height — an
            injection here cannot move the form above it. */}
        {nitroEnabled() && (
          <div className="mt-10 flex min-h-[1.25rem] items-center justify-center text-xs text-muted">
            <span data-ccpa-link="1" />
          </div>
        )}
      </main>
      <BackToTop />
    </>
  );
}
