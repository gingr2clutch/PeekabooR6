import { ModeToggle } from "./ModeToggle";
import { SiteNav } from "./SiteNav";
import { Wordmark } from "./Wordmark";
import pkg from "../package.json";

type Props = {
  home?: boolean;
};

// Top bar shared by every public page. Logo top-left (full on the
// homepage, icon-only elsewhere), nav top-right. SiteNav handles the
// desktop inline tabs, the search icon, and the mobile hamburger + drawer. The
// version is read here (server) from package.json and passed down so the client
// menu footer never hardcodes it.
export function PageHeader({ home = false }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
      <Wordmark showText={home} />
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <ModeToggle />
        <SiteNav version={pkg.version} />
      </div>
    </header>
  );
}
