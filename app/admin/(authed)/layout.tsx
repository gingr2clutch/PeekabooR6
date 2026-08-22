import { Wordmark } from "@/components/Wordmark";
import { logoutAction } from "../actions";
import { AdminNav } from "./AdminNav";

export default function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Wordmark href="/admin/maps" />
        <div className="flex items-center gap-4 sm:gap-6">
          <AdminNav />
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:text-brand"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
