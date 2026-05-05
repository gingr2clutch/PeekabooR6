import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { logoutAction } from "../actions";

export default function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-card px-6 py-3">
        <Wordmark href="/admin/maps" />
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/admin/maps"
            className="text-ink transition-colors hover:text-brand"
          >
            Maps
          </Link>
          <Link
            href="/admin/peeks"
            className="text-ink transition-colors hover:text-brand"
          >
            Peeks
          </Link>
        </nav>
        <form action={logoutAction} className="ml-auto">
          <button
            type="submit"
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Sign out
          </button>
        </form>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </>
  );
}
