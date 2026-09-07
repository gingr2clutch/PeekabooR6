import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getContributorProfile } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await getContributorProfile(params.slug);
  if (!c) return { title: "Contributor not found" };

  const total = c.peekCount + c.gadgetCount;
  return {
    title: `${c.displayName} — contributor`,
    description: `${c.displayName} has ${total} approved contribution${
      total === 1 ? "" : "s"
    } on PeekabooR6.`,
    alternates: { canonical: `${SITE_URL}/contributors/${c.slug}` },
  };
}

// One contributor's public page.
//
// getContributorProfile returns null for a hidden contributor as well as an
// unknown one, so hiding somebody removes the page too rather than just
// delisting them from the board — otherwise the URL stays guessable.
export default async function ContributorPage({ params }: Params) {
  const c = await getContributorProfile(params.slug);
  if (!c) notFound();

  const letter = (c.displayName.trim()[0] ?? "?").toUpperCase();
  const peeks = c.items.filter((i) => i.kind === "peek");
  const gadgets = c.items.filter((i) => i.kind === "gadget");

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href="/contributors"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-brand"
        >
          <span aria-hidden>←</span> Contributors
        </Link>

        <header className="mt-6 text-center">
          <span
            className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand text-2xl font-bold text-white"
            style={
              c.avatarUrl
                ? {
                    backgroundImage: `url(${c.avatarUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!c.avatarUrl && letter}
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">
            {c.displayName}
          </h1>
          {c.linkUrl && (
            <a
              href={c.linkUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-1 inline-block break-all text-sm text-brand hover:underline"
            >
              {c.linkUrl}
            </a>
          )}

          <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-3">
            <Stat n={c.peekCount} k="Clips" tone="brand" />
            <Stat n={c.gadgetCount} k="Placements" tone="blue" />
          </div>
        </header>

        {c.items.length === 0 ? (
          <p className="mt-8 rounded-card border border-border bg-card p-8 text-center text-sm text-muted">
            Nothing approved yet.
          </p>
        ) : (
          <div className="mt-8 space-y-8">
            <Section title="Their peeks" items={peeks} tone="brand" />
            <Section title="Their gadgets" items={gadgets} tone="blue" />
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          Every one of these was submitted and approved.
        </p>
      </main>
    </>
  );
}

function Stat({
  n,
  k,
  tone,
}: {
  n: number;
  k: string;
  tone: "brand" | "blue";
}) {
  return (
    <div className="rounded-card border border-border bg-card p-3 text-center">
      <span className="block text-2xl font-semibold tabular-nums text-ink">
        {n}
      </span>
      <span
        className={`mt-0.5 block text-[10px] font-bold uppercase tracking-[0.09em] ${
          tone === "blue" ? "text-blue" : "text-brand"
        }`}
      >
        {k}
      </span>
    </div>
  );
}

function Section({
  title,
  items,
  tone,
}: {
  title: string;
  items: {
    id: string;
    spotName: string;
    map: string;
    isNewSpot: boolean;
    peekSlug: string | null;
  }[];
  tone: "brand" | "blue";
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((i) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">
                  {i.spotName}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{i.map}</span>
              </span>
              {i.isNewSpot && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    tone === "blue"
                      ? "bg-blue/10 text-blue"
                      : "bg-brand/10 text-brand"
                  }`}
                >
                  First find
                </span>
              )}
            </>
          );

          // Only a published peek gets a link. A credit whose peek is still a
          // draft, or which never became one, still shows — the work happened —
          // but it is plain text rather than a link into a 404.
          return (
            <li key={i.id}>
              {i.peekSlug ? (
                <Link
                  href={`/peeks/${i.peekSlug}`}
                  className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 transition-colors hover:border-brand"
                >
                  {body}
                  <span aria-hidden className="shrink-0 text-muted">
                    →
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
