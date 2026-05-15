import { SiteNav } from "./SiteNav";
import { Wordmark } from "./Wordmark";

type Props = {
  home?: boolean;
};

// Top bar shared by every public page. Logo top-left (full on the
// homepage, icon-only elsewhere), nav top-right. SiteNav handles the
// desktop inline tabs and the mobile hamburger + drawer.
export function PageHeader({ home = false }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
      <Wordmark showText={home} />
      <SiteNav />
    </header>
  );
}
