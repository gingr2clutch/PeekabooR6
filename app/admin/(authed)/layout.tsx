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
      <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Wordmark href="/admin/maps" />
        <MobileMenu>
          <MobileMenuLink href="/admin/maps">Maps</MobileMenuLink>
          <MobileMenuLink href="/admin/peeks">Peeks</MobileMenuLink>
          <form action={logoutAction}>
            <MobileMenuButton>Sign out</MobileMenuButton>
          </form>
        </MobileMenu>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
