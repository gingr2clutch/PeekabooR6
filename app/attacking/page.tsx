import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MapCardImage } from "@/components/MapCardImage";
import { getMaps } from "@/lib/db";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

export const metadata: Metadata = {
  title: "Attacker Guides — Counter Every Spawn Peek",
  description:
    "Per-map attacker guides: every spawn peek defenders use, ranked by how dangerous it is to you. Learn the angles to clear before you die to them.",
  alternates: { canonical: `${SITE_URL}/attacking` },
};

export default async function AttackingIndexPage() {
  const maps = (await getMaps()).filter((m) => m.published);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            ⚔️ Attacker Guides
          </h1>
          <p className="mt-2 text-lg font-medium text-[#6f716a]">
            Every spawn peek, ranked by how dangerous it is to you
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {maps.map((map, i) => (
            // Stagger resets every 5 to match this grid's widest column count,
            // so each row sweeps in rather than the page-long index dragging
            // late cards behind the scroll.
            <li
              key={map.id}
              data-reveal="quick"
              style={{ "--reveal-delay": `${(i % 5) * 60}ms` } as CSSProperties}
            >
              <Link
                href={`/maps/${map.slug}/attacking`}
                className="map-card group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-white text-center text-base font-medium elev-card transition-all duration-[180ms] ease-out motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.97]"
              >
                {map.cover_image_url ? (
                  <MapCardImage src={map.cover_image_url} published={map.published} />
                ) : null}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <span className="relative z-10 mt-auto w-full px-3 pb-2.5 text-left">
                  <span className="block truncate font-medium text-white drop-shadow-sm">
                    {map.name}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
