import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

// Centered, themed shell for the auth screens (login / signup / reset / etc.).
// Presentational only, so pages stay server components. Cream page bg (from the
// body) with a white card, matching the site.
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="fade-in-up mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-6 flex justify-center">
        <Wordmark showText />
      </div>
      <div className="rounded-card border border-border bg-card p-6 shadow-sm sm:p-7">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/" className="transition-colors hover:text-brand">
          ← Back to peekabooR6
        </Link>
      </p>
    </main>
  );
}
