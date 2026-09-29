import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ComparePicker, type PickerMap } from "@/components/ComparePicker";
import { getComparisonMaps } from "@/lib/compare";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Compare maps — which has the better spawn peeks?",
  description:
    "Head-to-head Rainbow Six Siege map comparisons. See which map has more S-tier spawn peeks, a higher average grade, and more community votes.",
  alternates: { canonical: `${SITE_URL}/compare` },
};

export default async function CompareIndexPage() {
  const maps = await getComparisonMaps();

  // Only what the picker needs. The full MapCompareStats carries every peek on
  // the map, and shipping that to the client would be a lot of JSON for a
  // control that renders a name and a cover.
  const pickerMaps: PickerMap[] = maps.map((s) => ({
    slug: s.map.slug,
    name: s.map.name,
    cover: s.map.cover_image_url ?? null,
  }));

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-4 pb-8 pt-6 sm:px-6">
        <div className="mb-10 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            Map comparisons
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Which map has the better peeks?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
            Every matchup is scored from real community data — S-tier counts,
            average grade, and total votes. Pick two maps and settle it.
          </p>
        </div>

        {pickerMaps.length < 2 ? (
          <p className="text-center text-muted">
            Not enough graded maps to compare yet — check back soon.
          </p>
        ) : (
          <ComparePicker maps={pickerMaps} />
        )}
      </main>
    </>
  );
}
