import { DesktopNav } from "./DesktopNav";
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
    // The bar is full-bleed (background + bottom rule span the viewport) but
    // its CONTENTS sit in the same shell as the page, so the logo and the
    // submit button line up with the content beneath them.
    //
    // Height is fixed at lg and set in CSS on the server, so the bar occupies
    // its final box on first paint — nothing here can shift on hydration.
    // Below lg the outer element carries no styles at all and the inner row
    // keeps the exact padding it has always had.
    <header className="lg:h-[78px] lg:border-b lg:border-border lg:bg-[#fffdf8]">
      <div className="site-shell flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6 lg:h-full lg:gap-6 lg:pb-0 lg:pt-0">
        {/* LEFT — brand, mode toggle, then the inline links. */}
        <div className="flex min-w-0 items-center gap-4 lg:h-full lg:gap-5">
          <Wordmark showText={home} large={home} />
          <ModeToggle className="reveal hidden lg:inline-flex" home={home} />
          <DesktopNav />
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 lg:gap-3">
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
      </div>
    </header>
  );
}
