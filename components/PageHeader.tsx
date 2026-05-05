import Link from "next/link";
import { Wordmark } from "./Wordmark";

type Props = {
  back?: { href: string; label?: string };
  showMenu?: boolean;
};

// Top bar shared by every page. Wordmark on the left, optional Back link on
// the right of the wordmark, no other chrome.
export function PageHeader({ back, showMenu = true }: Props) {
  return (
    <header className="flex items-center gap-4 px-6 pt-6">
      {showMenu && <Wordmark />}
      {back && (
        <Link
          href={back.href}
          className="text-sm text-muted transition-colors hover:text-brand"
        >
          ← {back.label ?? "Back"}
        </Link>
      )}
    </header>
  );
}
