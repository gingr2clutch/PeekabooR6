import Link from "next/link";
import {
  MobileMenu,
  MobileMenuButton,
  MobileMenuLink,
} from "@/components/MobileMenu";
import { Wordmark } from "@/components/Wordmark";
import { logoutAction } from "../actions";

export default function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center gap-x-6 gap-y-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Wordmark href="/admin/maps" />
        <nav className="hidden items-center gap-4 text-sm md:flex">
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
        <form action={logoutAction} className="ml-auto hidden md:block">
          <button
            type="submit"
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Sign out
          </button>
        </form>

        <div className="ml-auto md:hidden">
          <MobileMenu>
            <MobileMenuLink href="/admin/maps">Maps</MobileMenuLink>
            <MobileMenuLink href="/admin/peeks">Peeks</MobileMenuLink>
            <form action={logoutAction}>
              <MobileMenuButton>Sign out</MobileMenuButton>
            </form>
          </MobileMenu>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
