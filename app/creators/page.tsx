import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { getApprovedCreators, type PublicCreator } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Creators",
  description:
    "Meet the Rainbow Six Siege creators contributing spawn peeks to peekabooR6.",
};

export default async function CreatorsPage() {
  const creators = await getApprovedCreators();

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Creators</h1>
          <p className="mt-2 text-muted">
            The folks behind the peeks.
          </p>
        </div>

        {creators.length === 0 ? (
          <p className="text-center text-sm text-muted">
            Creators coming soon.
          </p>
        ) : (
          <ul className="space-y-4">
            {creators.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function CreatorCard({ creator }: { creator: PublicCreator }) {
  const handle = (creator.tiktok ?? "").replace(/^@+/, "").trim();
  const tiktokUrl = handle ? `https://www.tiktok.com/@${handle}` : null;

  return (
    <li className="group flex items-start gap-4 rounded-card border border-border bg-card p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-brand hover:shadow-lg sm:gap-5 sm:p-5">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-bg sm:h-16 sm:w-16">
        {creator.profile_image_url ? (
          <Image
            src={creator.profile_image_url}
            alt={creator.display_name ?? "Creator"}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <AvatarPlaceholder />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">
          {creator.display_name ?? "Unnamed creator"}
        </h2>
        {tiktokUrl && (
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#ff6a00" }}
            className="mt-0.5 inline-block text-xs font-medium hover:underline sm:text-sm"
          >
            @{handle}
          </a>
        )}
        {creator.bio && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
            {creator.bio}
          </p>
        )}
      </div>
    </li>
  );
}

function AvatarPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-muted">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-7 w-7 fill-none stroke-current"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </div>
  );
}
