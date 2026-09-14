import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { BestPeek } from "@/components/BestPeek";
import {
  getMostVotedPeeks,
  getNewestPeeks,
  getSTierPeeks,
  type PeekWithContext,
} from "@/lib/db";
import { Fragment, type CSSProperties } from "react";
import { NitroAdSlot } from "@/components/NitroAdSlot";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

type Search = { sort?: string; tier?: string };
type Mode = "new" | "votes" | "stier";

// The homepage stats link here: Peeks → newest, Votes → most-voted, S-Tier →
// grade S only. Default (no params) is newest.
function resolveMode(sp: Search): Mode {
  if (sp?.tier === "s") return "stier";
  if (sp?.sort === "votes") return "votes";
  return "new";
}

const MODE_META: Record<Mode, { title: string; blurb: string }> = {
  new: {
    title: "Newest peeks",
    blurb: "The most recently added spawn peeks — fresh angles first.",
  },
  votes: {
    title: "Most-voted peeks",
    blurb: "The spawn peeks the community has weighed in on the most.",
  },
  stier: {
    title: "S-Tier peeks",
    blurb:
      "Only the S-graded spawn peeks — the most reliable angles on the board.",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const meta = MODE_META[resolveMode(searchParams)];
  return {
    title: meta.title,
    description: meta.blurb,
    alternates: { canonical: `${SITE_URL}/peeks` },
  };
}

export default async function PeeksPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const mode = resolveMode(searchParams);
  const peeks: PeekWithContext[] =
    mode === "votes"
      ? await getMostVotedPeeks(30)
      : mode === "stier"
        ? await getSTierPeeks(30)
        : await getNewestPeeks(30);
  const meta = MODE_META[mode];

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">
            {meta.blurb}
          </p>
        </div>

        {peeks.length === 0 ? (
          <p className="text-center text-sm text-muted">No peeks to show yet.</p>
        ) : (
          <ul className="space-y-3">
            {peeks.map((peek, i) => (
              // Vertical list, so the stagger only has to carry the rows
              // already on screen at load — capped at 6. Past that, rows
              // arrive one at a time as you scroll and a delay would just
              // read as lag.
              <Fragment key={peek.id}>
              <li
                data-reveal="quick"
                style={
                  {
                    "--reveal-delay": `${Math.min(i, 5) * 50}ms`,
                  } as CSSProperties
                }
              >
                <BestPeek peek={peek} showMap from={mode} />
              </li>
                {/* pkb-map-feed — inside the peek list, on a row boundary
                    well below the fold. */}
                {i === 5 && (
                  <li>
                    <NitroAdSlot id="pkb-map-feed" />
                  </li>
                )}
                {/* content-1 — further down the same list, with six cards of
                    content between it and map-feed so the two are never in one
                    viewport. */}
                {i === 13 && (
                  <li>
                    <NitroAdSlot id="pkb-content-1" />
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        )}

        {/* content-2 — end of the list, above the submit line. */}
        <NitroAdSlot id="pkb-content-2" className="mt-12" />
      </main>
    </>
  );
}
