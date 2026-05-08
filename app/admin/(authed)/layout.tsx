import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { logoutAction } from "../actions";

const navLinkCls =
  "text-sm font-medium text-ink transition-colors hover:text-brand sm:text-base";

export default function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Wordmark href="/admin/maps" />
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/admin/maps" className={navLinkCls}>
            Maps
          </Link>
          <Link href="/admin/peeks" className={navLinkCls}>
            Peeks
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:text-brand"
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
