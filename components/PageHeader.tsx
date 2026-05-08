import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import { Wordmark } from "./Wordmark";

type Props = {
  back?: { href: string; label?: string };
  showMenu?: boolean;
};

const navLinkCls =
  "inline-flex items-center text-sm font-medium text-ink transition-colors duration-150 ease-out hover:text-brand md:text-base";

const backLinkCls =
  "inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand md:h-auto md:min-h-[44px] md:w-auto md:gap-2 md:px-3 md:py-2 md:text-base md:font-medium";

// Top bar shared by every public page.
// Mobile (<768px): [back-icon] [logo-icon] ........ [hamburger]
// Desktop (>=768px): [back+text] [logo+text] ........ [Maps] [Popular]
export function PageHeader({ back, showMenu = true }: Props) {
  return (
    <header className="relative flex items-center gap-2 px-4 pt-4 sm:gap-3 sm:px-6 sm:pt-6">
      {back && (
        <Link
          href={back.href}
          className={backLinkCls}
          aria-label={back.label ?? "Back"}
        >
          <ArrowLeftIcon />
          <span className="hidden md:inline">{back.label ?? "Back"}</span>
        </Link>
      )}
      {showMenu && <Wordmark />}

      <div className="flex-1" />

      <nav className="hidden items-center gap-3 sm:gap-4 md:flex">
        <Link href="/" className={navLinkCls}>
          <GridIcon />
          <span className="ml-1.5">Maps</span>
        </Link>
        <Link href="/popular" className={navLinkCls}>
          <FlameIcon />
          <span className="ml-1.5">Popular</span>
        </Link>
      </nav>

      <MobileMenu />
    </header>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 fill-none stroke-current md:h-5 md:w-5"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
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
      width="14"
      height="14"
      aria-hidden
      className="fill-current"
    >
      <path d="M8.5 0.5c0.4 1.6-0.2 2.7-1 3.7-0.9 1.1-2 2.1-2 4.1 0 2.5 2 4.7 4.5 4.7s4.5-2 4.5-4.7c0-2.6-1.7-4.6-2.6-5.6-0.4 0.7-1 1-1.5 0.7C9.4 3 9.2 1.6 8.5 0.5zM8 8.5c0.6 0.6 1 1 1 1.8 0 1-0.7 1.7-1.7 1.7s-1.8-0.8-1.8-1.8c0-0.7 0.4-1.2 0.8-1.6C6.7 8.2 7.2 8 7.5 7.4 7.6 7.7 7.7 8.2 8 8.5z" />
    </svg>
  );
}
