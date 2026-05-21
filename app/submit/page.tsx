import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SubmitPeekForm } from "@/components/SubmitPeekForm";
import { supabasePublic } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a spawn peek",
  description:
    "Know a peek that's not on the site yet? Send it over and we'll add it after review.",
};

type FloorRow = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  birds_eye_url: string | null;
};
type MapWithFloors = {
  id: string;
  slug: string;
  name: string;
  floors: FloorRow[];
};

async function loadMapsWithFloors(): Promise<MapWithFloors[]> {
  const { data, error } = await supabasePublic()
    .from("maps")
    .select(
      "id, slug, name, floors(id, slug, name, display_order, birds_eye_url)"
    )
    .eq("published", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as MapWithFloors[]).map((m) => ({
    ...m,
    floors: [...(m.floors ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    ),
  }));
}

export default async function SubmitPage() {
  const maps = await loadMapsWithFloors();

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-6 pb-20 pt-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Submit a spawn peek
          </h1>
          <p className="mt-2 text-muted">
            Know a peek that&apos;s not on the site yet? Send it over and
            we&apos;ll add it after review.
          </p>
        </div>
        <SubmitPeekForm maps={maps} />
      </main>
    </>
  );
}
