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
      {/* LEFT — brand, then the mode toggle. It is navigation, so from lg it
          sits with the wordmark rather than competing with the buttons on the
          right. */}
      <div className="flex min-w-0 items-center gap-4">
        <Wordmark showText={home} large={home} />
        <ModeToggle className="reveal hidden lg:inline-flex" home={home} />
      </div>

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        {/* The same toggle, kept on the right below lg. Rendered twice with
            complementary gates rather than moved, because the two positions
            live in different flex containers and only one can hold it: sm–lg
            would otherwise lose the toggle entirely, which is a regression at
            tablet widths. Exactly one of the pair is ever displayed. */}
        <ModeToggle
          className="reveal hidden sm:inline-flex lg:hidden"
          home={home}
        />
        <SiteNav version={pkg.version} home={home} />
      </div>
    </header>
  );
}
