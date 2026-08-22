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
      {/* The Peeks/Gadgets ModeToggle used to sit here. Pulled while gadgets
          have no published data — the /gadgets routes still work if you go to
          them directly, and the admin is unaffected. Re-adding it is putting
          <ModeToggle /> back beside SiteNav; the component still exists. */}
      <Wordmark showText={home} />
      <SiteNav version={pkg.version} />
    </header>
  );
}
