import { MobileMenu, MobileMenuBack, MobileMenuLink } from "./MobileMenu";
import { Wordmark } from "./Wordmark";

type Props = {
  home?: boolean;
};

// Top bar shared by every public page.
// Logo top-left (full on the homepage, icon-only elsewhere).
// Hamburger menu top-right; all navigation lives inside it.
export function PageHeader({ home = false }: Props) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
      <Wordmark showText={home} />
      <MobileMenu>
        <MobileMenuLink href="/" icon={<GridIcon />}>
          Maps
        </MobileMenuLink>
        <MobileMenuLink href="/popular" icon={<FlameIcon />}>
          Popular
        </MobileMenuLink>
        {!home && <MobileMenuBack />}
      </MobileMenu>
    </header>
  );
}

function GridIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className="fill-current"
    >
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className="fill-current"
    >
      <path d="M8.5 0.5c0.4 1.6-0.2 2.7-1 3.7-0.9 1.1-2 2.1-2 4.1 0 2.5 2 4.7 4.5 4.7s4.5-2 4.5-4.7c0-2.6-1.7-4.6-2.6-5.6-0.4 0.7-1 1-1.5 0.7C9.4 3 9.2 1.6 8.5 0.5zM8 8.5c0.6 0.6 1 1 1 1.8 0 1-0.7 1.7-1.7 1.7s-1.8-0.8-1.8-1.8c0-0.7 0.4-1.2 0.8-1.6C6.7 8.2 7.2 8 7.5 7.4 7.6 7.7 7.7 8.2 8 8.5z" />
    </svg>
  );
}
