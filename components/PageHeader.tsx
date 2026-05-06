import Link from "next/link";
import { Wordmark } from "./Wordmark";

type Props = {
  back?: { href: string; label?: string };
  showMenu?: boolean;
};

const linkCls =
  "inline-flex items-center text-sm font-medium text-ink transition-colors duration-150 ease-out hover:text-brand sm:text-base";

// Top bar shared by every public page. Wordmark left, optional Back link
// + persistent "Maps" link on the right.
export function PageHeader({ back, showMenu = true }: Props) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-6 sm:px-6">
      <div>{showMenu && <Wordmark />}</div>

      <nav className="flex items-center gap-3">
        {back && (
          <>
            <Link
              href={back.href}
              className={linkCls}
              aria-label={back.label ?? "Back"}
            >
              <span aria-hidden>←</span>
              <span className="ml-1.5 hidden sm:inline">
                {back.label ?? "Back"}
              </span>
            </Link>
            <span aria-hidden className="text-muted/50">
              ·
            </span>
          </>
        )}
        <Link href="/" className={linkCls}>
          <GridIcon />
          <span className="ml-1.5">Maps</span>
        </Link>
      </nav>
    </header>
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
