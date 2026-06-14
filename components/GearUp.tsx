// GearUP affiliate link. Tracks under affid=aff700160 — every click on
// the peek-detail banner or the homepage card credits that affiliate ID.
// Replace if/when the affiliate relationship changes; this is the only
// place the URL is defined.
const GEARUP_AFFILIATE_URL =
  "https://www.gearupbooster.com/?affid=aff700160";

// rel="sponsored" is the Google-recommended attribute for affiliate
// links and tells crawlers this is a paid placement (kept alongside
// noopener/noreferrer for tab-open safety). Sponsored disclosure inside
// the card itself satisfies the FTC endorsement guidelines.
const LINK_REL = "noopener noreferrer sponsored";

// Full-width banner placed above the instructions section on every peek
// detail page. Stacks vertically on mobile, side-by-side on >=sm so the
// CTA stays prominent on larger screens.
export function GearUpBanner() {
  return (
    <a
      href={GEARUP_AFFILIATE_URL}
      target="_blank"
      rel={LINK_REL}
      aria-label="Try GearUP free (affiliate link, opens in new tab)"
      className="group block overflow-hidden rounded-card bg-[#1a1a2e] p-4 text-left transition-all duration-150 ease-out hover:shadow-lg active:scale-[0.995] sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white sm:text-lg">
            Lagging in ranked?
          </h3>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            GearUP Booster reduces your ping so you can focus on the peek
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-brand/90 group-active:scale-[0.99]">
          Try GearUP Free
        </span>
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Sponsored · affiliate link
      </p>
    </a>
  );
}

// Subtle one-line variant for the homepage, below the map grid. Single
// row on every breakpoint so it doesn't dominate the page; the link
// itself is the whole row, with the bolt emoji as the leading visual.
export function GearUpHomeCard() {
  return (
    <a
      href={GEARUP_AFFILIATE_URL}
      target="_blank"
      rel={LINK_REL}
      aria-label="Lower your ping in R6 with GearUP (affiliate link, opens in new tab)"
      className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-card bg-[#1a1a2e] px-4 py-2.5 text-sm transition-all duration-150 ease-out hover:shadow-md active:scale-[0.995]"
    >
      <span aria-hidden className="text-lg leading-none">
        ⚡
      </span>
      <span className="min-w-0 flex-1 text-white">Lower your ping in R6</span>
      <span className="shrink-0 font-semibold text-brand">Try free →</span>
    </a>
  );
}
