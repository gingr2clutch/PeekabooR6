import Link from "next/link";
import { Wordmark } from "./Wordmark";

type Props = {
  back?: { href: string; label?: string };
  showMenu?: boolean;
};

// Top bar shared by every public page. Wordmark on the left, optional Back
// link pinned top-right.
export function PageHeader({ back, showMenu = true }: Props) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-6 sm:px-6">
      <div>{showMenu && <Wordmark />}</div>

      <div>
        {back && (
          <Link
            href={back.href}
            className="inline-flex items-center rounded-btn px-4 py-2 text-base font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.05] hover:text-brand"
            aria-label={back.label ?? "Back"}
          >
            <span aria-hidden>←</span>
            <span className="ml-1.5 hidden sm:inline">
              {back.label ?? "Back"}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
