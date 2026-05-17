import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  articleExcerpt,
  articleSlugFor,
  listEligibleMaps,
  loadArticleData,
} from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rainbow Six Siege spawn peek guides",
  description:
    "Per-map breakdowns of every documented spawn peek in Rainbow Six Siege, ranked by community success rate with video and step-by-step instructions.",
  alternates: { canonical: "https://peekaboor6.com/blog" },
  openGraph: {
    title: "Rainbow Six Siege spawn peek guides",
    description:
      "Per-map breakdowns of every documented spawn peek, ranked by community success rate.",
    type: "website",
    url: "https://peekaboor6.com/blog",
  },
};

export default async function BlogIndexPage() {
  const eligible = await listEligibleMaps();

  // Each excerpt is generated from the map's data fingerprint, so two
  // maps' index cards never lead with the same boilerplate sentence.
  const enriched = await Promise.all(
    eligible.map(async (e) => {
      const data = await loadArticleData(e.map.slug);
      return data ? { entry: e, data } : null;
    })
  );
  const articles = enriched.filter(
    (x): x is NonNullable<typeof x> => x !== null
  );

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-4xl px-6 pb-20 pt-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Spawn peek guides
          </h1>
          <p className="mt-2 text-muted">
            Per-map breakdowns with video, success rates, and counter-play.
          </p>
        </div>

        {articles.length === 0 && (
          <p className="text-center text-sm text-muted">
            New guides will appear here as more maps reach 3+ documented
            peeks.
          </p>
        )}

        <ul className="space-y-5">
          {articles.map(({ entry, data }) => {
            const slug = articleSlugFor(entry.map.slug);
            const cover = entry.map.cover_image_url;
            return (
              <li key={entry.map.id}>
                <Link
                  href={`/blog/${slug}`}
                  className="group flex flex-col overflow-hidden rounded-card border border-border bg-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg sm:flex-row"
                >
                  <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-bg sm:aspect-square sm:w-48">
                    {cover ? (
                      <Image
                        src={cover}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 192px"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="placeholder-stripes h-full w-full" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h2 className="text-xl font-semibold tracking-tight text-ink group-hover:text-brand">
                      Best Spawn Peeks on {entry.map.name} in Rainbow Six
                      Siege (2026 Guide)
                    </h2>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {entry.peekCount}{" "}
                      {entry.peekCount === 1 ? "peek" : "peeks"} ·{" "}
                      {entry.floorCount}{" "}
                      {entry.floorCount === 1 ? "floor" : "floors"}
                    </p>
                    <p className="text-sm leading-relaxed text-ink/80">
                      {articleExcerpt(data)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
