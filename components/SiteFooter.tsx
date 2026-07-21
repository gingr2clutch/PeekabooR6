import Link from "next/link";

const linkCls =
  "transition-colors hover:text-brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border px-4 py-6 text-xs text-muted sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
        <Link href="/privacy-policy" className={linkCls}>
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className={linkCls}>
          Terms
        </Link>
        <span aria-hidden>·</span>
        <Link href="/about" className={linkCls}>
          About
        </Link>
        <span aria-hidden>·</span>
        <Link href="/sponsor" className={linkCls}>
          Partner With Us
        </Link>
        <span aria-hidden>·</span>
        <Link href="/contact" className={linkCls}>
          Contact
        </Link>
        <span aria-hidden>·</span>
        <Link href="/compare" className={linkCls}>
          Compare Maps
        </Link>
        <span aria-hidden>·</span>
        <span>© 2026 peekabooR6</span>
      </div>
    </footer>
  );
}
