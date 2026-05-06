import Link from "next/link";
import { Wordmark } from "./Wordmark";

type Props = {
  back?: { href: string; label?: string };
  showMenu?: boolean;
};

const navLinkCls =
  "inline-flex items-center text-sm font-medium text-ink transition-colors duration-150 ease-out hover:text-brand sm:text-base";

const backLinkCls =
  "inline-flex min-h-[44px] items-center gap-2 rounded-btn px-3 py-2 text-base font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand";

// Top bar shared by every public page. Back link (when present) is the
// first thing on the left so it's the largest tap target. Wordmark sits to
// its right; "Maps" nav stays anchored on the right edge.
export function PageHeader({ back, showMenu = true }: Props) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="flex items-center gap-2 sm:gap-3">
        {back && (
          <Link
            href={back.href}
            className={backLinkCls}
            aria-label={back.label ?? "Back"}
          >
            <ArrowLeftIcon />
            <span>{back.label ?? "Back"}</span>
          </Link>
        )}
        {showMenu && <Wordmark />}
      </div>

      <nav className="flex items-center gap-3">
        <Link href="/" className={navLinkCls}>
          <GridIcon />
          <span className="ml-1.5">Maps</span>
        </Link>
      </nav>
    </header>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 fill-none stroke-current sm:h-5 sm:w-5"
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
