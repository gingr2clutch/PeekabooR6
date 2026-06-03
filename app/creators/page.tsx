import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import {
  getApprovedCreators,
  getPublishedPeekCount,
  type PublicCreator,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Creators",
  description:
    "Meet the Rainbow Six Siege creators contributing spawn peeks to peekabooR6.",
};

export default async function CreatorsPage() {
  // Site-wide peek count is only displayed on the founder card, but it's
  // cheap (head:true) and runs in parallel with the creators read.
  const [creators, publishedPeekCount] = await Promise.all([
    getApprovedCreators(),
    getPublishedPeekCount(),
  ]);

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
              <CreatorCard
                key={c.id}
                creator={c}
                publishedPeekCount={publishedPeekCount}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function CreatorCard({
  creator,
  publishedPeekCount,
}: {
  creator: PublicCreator;
  publishedPeekCount: number;
}) {
  const handle = (creator.tiktok ?? "").replace(/^@+/, "").trim();
  const tiktokUrl = handle ? `https://www.tiktok.com/@${handle}` : null;
  const isFounder = creator.is_founder === true;
  const displayName = creator.display_name ?? "Unnamed creator";

  const badges = [creator.rank, creator.region, creator.platform].filter(
    (v): v is string => !!v && v.trim() !== ""
  );

  const socials: { href: string; label: string; Icon: typeof YouTubeIcon }[] = [];
  if (creator.youtube_url)
    socials.push({ href: creator.youtube_url, label: "YouTube", Icon: YouTubeIcon });
  if (creator.twitch_url)
    socials.push({ href: creator.twitch_url, label: "Twitch", Icon: TwitchIcon });
  if (creator.x_url)
    socials.push({ href: creator.x_url, label: "X", Icon: XIcon });

  return (
    <li className="group flex items-start gap-4 rounded-card border border-border bg-card p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-brand hover:shadow-lg sm:gap-5 sm:p-5">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-bg sm:h-16 sm:w-16">
        {creator.profile_image_url ? (
          <Image
            src={creator.profile_image_url}
            alt={displayName}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <AvatarPlaceholder />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {isFounder ? (
          <h2
            className="truncate bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-base font-semibold tracking-tight text-transparent sm:text-lg"
            style={{ filter: "drop-shadow(0 0 10px rgba(217,70,239,0.35))" }}
          >
            {displayName}
          </h2>
        ) : (
          <h2 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">
            {displayName}
          </h2>
        )}
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
        {(isFounder || badges.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isFounder && (
              <span className="inline-flex items-center rounded-btn border border-pink-300/60 bg-gradient-to-r from-purple-500/[0.08] to-pink-500/[0.08] px-2 py-0.5 text-[11px] font-semibold text-pink-600">
                {publishedPeekCount} {publishedPeekCount === 1 ? "peek" : "peeks"}
              </span>
            )}
            {badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center rounded-btn border border-border bg-bg px-2 py-0.5 text-[11px] font-medium text-muted"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        {creator.bio && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
            {creator.bio}
          </p>
        )}
        {socials.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-8 w-8 items-center justify-center rounded-btn border border-border bg-bg text-muted transition-colors hover:border-brand hover:text-brand"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-current ${className ?? ""}`}
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  );
}

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-current ${className ?? ""}`}
    >
      <path d="M2.1 2 .5 6.2v15.1h5.2V24h2.9l2.8-2.7h4.3L21.5 16V2H2.1zm17.6 13.1-3.3 3.3h-5.2l-2.8 2.7v-2.7H4.3V3.7h15.4v11.4zM15.6 7.4h-1.8v5.5h1.8V7.4zm-4.7 0H9.1v5.5h1.8V7.4z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-current ${className ?? ""}`}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
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
