import { SiteNav } from "./SiteNav";
import { Wordmark } from "./Wordmark";
import { SiteSearch } from "./SiteSearch";
import pkg from "../package.json";

type Props = {
  home?: boolean;
};

// Top bar shared by every public page. Logo top-left (full on the
// homepage, icon-only elsewhere), nav top-right. SiteNav handles the
// desktop inline tabs and the mobile hamburger + drawer. The search icon sits
// at the far right (right of the profile icon) and opens a popover; its index
// loads client-side so every page stays static. The version is read here
// (server) from package.json and passed down so the client menu footer never
// hardcodes it.
export function PageHeader({ home = false }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
      <Wordmark showText={home} />
      <div className="flex items-center gap-1 sm:gap-2">
        <SiteNav version={pkg.version} />
        <SiteSearch />
      </div>
    </header>
  );
}
