import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import {
  ADMIN_COOKIE,
  cookieIsValid,
} from "@/lib/admin-auth";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "bad-password": "Wrong password.",
  "missing-config":
    "ADMIN_PASSWORD is not set on the server. Add it to .env.local and restart.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  // If already signed in, jump straight to the dashboard.
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  if (await cookieIsValid(cookie, process.env.ADMIN_PASSWORD)) {
    redirect(searchParams.next?.startsWith("/admin/")
      ? searchParams.next
      : "/admin/maps");
  }

  const errorMessage = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <>
      <header className="flex items-center px-6 pt-6">
        <Wordmark />
      </header>
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Admin sign in
        </h1>
        <p className="mb-6 text-sm text-muted">
          Enter the admin password to manage maps, floors, and peeks.
        </p>

        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={searchParams.next ?? ""} />
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-btn border border-border bg-card px-3 py-2 text-base outline-none transition-colors focus:border-brand"
            />
          </div>

          {errorMessage && (
            <p className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95"
          >
            Sign in
          </button>
        </form>
      </main>
    </>
  );
}
