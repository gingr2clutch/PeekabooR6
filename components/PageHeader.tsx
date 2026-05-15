import Link from "next/link";
import { BookOpen, Flame, Map, Sparkles } from "lucide-react";
import { Wordmark } from "./Wordmark";

type Props = {
  home?: boolean;
};

const navLinkCls =
  "inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:text-brand sm:text-base";

// Top bar shared by every public page.
// Logo top-left (full on the homepage, icon-only elsewhere).
// Lucide icons for every nav tab — same size, stroke width, and
// currentColor behavior so the four read as one consistent set.
const ICON_SIZE = 16;
const ICON_STROKE = 2;

export function PageHeader({ home = false }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
      <Wordmark showText={home} />
      <nav className="flex items-center gap-4 sm:gap-6">
        <Link href="/" className={navLinkCls}>
          <Map size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          <span>Maps</span>
        </Link>
        <Link href="/popular" className={navLinkCls}>
          <Flame size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          <span>Popular</span>
        </Link>
        <Link href="/whats-new" className={navLinkCls}>
          <Sparkles size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          <span>New</span>
        </Link>
        <Link href="/blog" className={navLinkCls}>
          <BookOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
          <span>Guides</span>
        </Link>
      </nav>
    </header>
  );
}
