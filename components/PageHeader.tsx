import Link from "next/link";
import { Wordmark } from "./Wordmark";

type Props = {
  back?: { href: string; label?: string };
  showMenu?: boolean;
};

// Top bar shared by every public page. Three-column grid so the centre slot
// stays anchored to the page centre regardless of how wide the side slots
// are. Left = wordmark, Centre = Maps link, Right = optional Back link.
export function PageHeader({ back, showMenu = true }: Props) {
  const ghostBtn =
    "rounded-btn px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.05] hover:text-brand";

  return (
    <header className="grid grid-cols-3 items-center gap-2 px-4 pt-6 sm:px-6">
      <div className="justify-self-start">{showMenu && <Wordmark />}</div>

      <div className="justify-self-center">
        <Link href="/" className={ghostBtn}>
          Maps
        </Link>
      </div>

      <div className="justify-self-end">
        {back && (
          <Link
            href={back.href}
            className={`${ghostBtn} inline-flex items-center`}
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
