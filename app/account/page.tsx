import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFavoritePeeks } from "@/lib/db";
import { signOutAction } from "@/app/auth/actions";
import { PageHeader } from "@/components/PageHeader";
import { BestPeek } from "@/components/BestPeek";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const favorites = await getFavoritePeeks();

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-6 pb-20 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Your account
        </h1>

        <div className="mt-5 rounded-card border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Email
              </div>
              <div className="mt-1 break-all text-[15px] text-ink">
                {user.email}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Plan
              </div>
              <div className="mt-1">
                {user.isPro ? (
                  <span className="inline-flex items-center rounded-btn bg-brand/10 px-2.5 py-1 text-sm font-semibold text-brand">
                    Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-btn bg-ink/[0.06] px-2.5 py-1 text-sm font-medium text-muted">
                    Free
                  </span>
                )}
              </div>
            </div>
          </div>
          <form action={signOutAction} className="mt-5">
            <button
              type="submit"
              className="w-full rounded-btn border border-border px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand sm:w-auto sm:px-6"
            >
              Log out
            </button>
          </form>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            My favorites
          </h2>
          {favorites.length === 0 ? (
            <p className="mt-3 rounded-card border border-border bg-card p-5 text-sm text-muted">
              No favorites yet — tap the heart on any peek to save it.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {favorites.map((peek) => (
                <li key={peek.id}>
                  <BestPeek peek={peek} showMap />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
