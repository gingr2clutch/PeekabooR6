import type { Metadata } from "next";
import Link from "next/link";
import { BestPeek } from "@/components/BestPeek";
import { PageHeader } from "@/components/PageHeader";
import { getUnderratedPeeks } from "@/lib/db";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Underrated peeks — hidden gems",
  description:
    "High-grade Rainbow Six Siege spawn peeks the community hasn't voted on much yet. Discover hidden gems and vote to surface them.",
  alternates: { canonical: `${SITE_URL}/underrated` },
};

export default async function UnderratedPage() {
  const peeks = await getUnderratedPeeks();

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            💎 The 10 most underrated peeks
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">
            The 10 most underrated peeks in the game right now — great peeks
            almost nobody has voted on. Discover them before everyone else.
          </p>
        </div>

        {peeks.length === 0 ? (
          <p className="text-center text-sm text-muted">
            No underrated peeks right now — they surface here once a high-grade
            peek picks up a few (but not too many) votes.
          </p>
        ) : (
          <ul className="space-y-3">
            {peeks.map((peek) => (
              <li key={peek.id}>
                <BestPeek peek={peek} showMap isGem />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
