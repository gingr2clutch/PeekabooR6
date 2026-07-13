import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AuthShell title="Your account">
      <div className="space-y-5">
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

        <form action={signOutAction} className="pt-2">
          <button
            type="submit"
            className="w-full rounded-btn border border-border px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Log out
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
