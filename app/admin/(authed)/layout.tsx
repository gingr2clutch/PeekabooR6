import { Wordmark } from "@/components/Wordmark";
import { logoutAction } from "../actions";

// The header is now two things: get home, and sign out.
//
// It used to also carry AdminNav — a mode toggle plus six or eight links that,
// at phone width, wrapped into three rows of chrome above every single screen.
// Navigation moved into the hub at /admin/home and the per-screen back links in
// AdminScreen, which is why that component is gone rather than merely hidden.
export default function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Wordmark href="/admin/home" />
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Sign out
          </button>
        </form>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
