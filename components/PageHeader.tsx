import { SiteNav } from "./SiteNav";
import { Wordmark } from "./Wordmark";
import { SiteSearch } from "./SiteSearch";
import pkg from "../package.json";

type Props = {
  home?: boolean;
};

// Desktop: inline search, right of the nav, capped at 280px. Mobile: a
// full-width search bar under the header (below). The widget loads its index
// client-side so every page stays static.
const DESKTOP_SEARCH_CLS = "hidden md:block w-[220px] lg:w-[280px]";

// Top bar shared by every public page. Logo top-left (full on the
// homepage, icon-only elsewhere), nav top-right. SiteNav handles the
// desktop inline tabs and the mobile hamburger + drawer. The version is read
// here (server) from package.json and passed down so the client menu footer
// never hardcodes it.
export function PageHeader({ home = false }: Props) {
  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <Wordmark showText={home} />
        <div className="flex items-center gap-3">
          <SiteSearch className={DESKTOP_SEARCH_CLS} />
          <SiteNav version={pkg.version} />
        </div>
      </header>
      {/* Mobile: full-width search bar directly under the header, always visible. */}
      <div className="px-4 pt-3 sm:px-6 md:hidden">
        <SiteSearch className="w-full" />
      </div>
    </>
  );
}
